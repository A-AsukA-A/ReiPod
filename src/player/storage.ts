type SavedFile = {
  id: string;
  name: string;
  type: string;
  lastModified: number;
  blob: Blob;
  importedAt: number;
};

/** Browser file adapter. Reads and writes share one submission order. */
export function createFileStorage(open = () => indexedDB.open("reipod-library", 1)) {
  let opening: Promise<IDBDatabase> | null = null;
  let operations = Promise.resolve();
  function database() {
    if (opening) return opening;
    const attempt = new Promise<IDBDatabase>((resolve, reject) => {
      // A synchronous SecurityError also rejects this attempt and permits retry.
      const request = open();
      let abandoned = false;
      request.onupgradeneeded = () => {
        if (abandoned) request.transaction?.abort();
        else request.result.createObjectStore("files", { keyPath: "id" });
      };
      request.onblocked = () => {
        abandoned = true;
        reject(new Error("Library database blocked"));
      };
      request.onerror = () => reject(request.error ?? new Error("Library database open failed"));
      request.onsuccess = () => {
        const db = request.result;
        // An open request cannot be cancelled; close any late successful result.
        if (abandoned) { db.close(); return; }
        const forget = () => { if (opening === attempt) opening = null; };
        db.onversionchange = () => { forget(); db.close(); };
        db.onclose = forget;
        resolve(db);
      };
    });
    opening = attempt;
    void attempt.catch(() => { if (opening === attempt) opening = null; });
    return attempt;
  }
  async function begin(mode: IDBTransactionMode) {
    const db = await database();
    try { return db.transaction("files", mode); }
    catch (error) {
      if (!(error instanceof DOMException) || error.name !== "InvalidStateError") throw error;
      // Retry only before any requests were submitted; never replay a failed write.
      opening = null;
      db.close();
      return (await database()).transaction("files", mode);
    }
  }
  async function transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => () => T) {
    const tx = await begin(mode);
    return new Promise<T>((resolve, reject) => {
      let result: () => T;
      let failure: unknown;
      tx.oncomplete = () => resolve(result());
      tx.onabort = () => reject(failure ?? tx.error ?? new DOMException("Library transaction aborted", "AbortError"));
      try { result = action(tx.objectStore("files")); }
      catch (error) {
        failure = error;
        // A synchronous put failure must roll back earlier requests in this batch.
        try { tx.abort(); } catch { reject(error); }
      }
    });
  }
  function enqueue<T>(action: () => Promise<T>) {
    const next = operations.then(action);
    operations = next.then(() => {}, () => {});
    return next;
  }
  return {
    saveFiles(files: File[]) {
      const batch = [...files];
      return enqueue(() => transaction("readwrite", store => {
        for (const file of batch) store.put({
          id: `${file.name}:${file.size}:${file.lastModified}`,
          name: file.name, type: file.type, lastModified: file.lastModified,
          blob: file, importedAt: Date.now(),
        } satisfies SavedFile);
        return () => {};
      }));
    },
    removeFile(id: string) {
      return enqueue(() => transaction("readwrite", store => { store.delete(id); return () => {}; }));
    },
    clearFiles() {
      return enqueue(() => transaction("readwrite", store => { store.clear(); return () => {}; }));
    },
    readFiles() {
      return enqueue(async () => {
        const records = await transaction("readonly", store => {
          const request = store.getAll();
          return () => request.result as SavedFile[];
        });
        return records.map(record => ({
          file: new File([record.blob], record.name, { type: record.type, lastModified: record.lastModified }),
          importedAt: record.importedAt ?? record.lastModified,
        }));
      });
    },
  };
}

export const { saveFiles, removeFile, clearFiles, readFiles } = createFileStorage();
