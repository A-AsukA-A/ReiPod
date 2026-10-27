type SavedFile = {
  id: string;
  name: string;
  type: string;
  lastModified: number;
  blob: Blob;
  importedAt: number;
};
let database: Promise<IDBDatabase> | null = null;
let writes = Promise.resolve();
function openDatabase() {
  database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open("reipod-library", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("files", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      database = null;
      reject(request.error);
    };
    request.onblocked = () => {
      database = null;
      reject(new Error("Library database blocked"));
    };
  });
  return database;
}
async function transaction(action: (store: IDBObjectStore) => void) {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("files", "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
    action(tx.objectStore("files"));
  });
}
function enqueue(action: () => Promise<void>) {
  const next = writes.catch(() => {}).then(action);
  writes = next.catch(() => {});
  return next;
}
export const saveFiles = (files: File[]) =>
  enqueue(() =>
    transaction((store) => {
      for (const file of files)
        store.put({
          id: `${file.name}:${file.size}:${file.lastModified}`,
          name: file.name,
          type: file.type,
          lastModified: file.lastModified,
          blob: file,
          importedAt: Date.now(),
        } satisfies SavedFile);
    }),
  );
export const removeFile = (id: string) =>
  enqueue(() =>
    transaction((store) => {
      store.delete(id);
    }),
  );
export const clearFiles = () =>
  enqueue(() =>
    transaction((store) => {
      store.clear();
    }),
  );
export async function readFiles() {
  const db = await openDatabase();
  const records = await new Promise<SavedFile[]>((resolve, reject) => {
    const request = db
      .transaction("files", "readonly")
      .objectStore("files")
      .getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return records.map((record) => ({
    file: new File([record.blob], record.name, {
      type: record.type,
      lastModified: record.lastModified,
    }),
    importedAt: record.importedAt ?? record.lastModified,
  }));
}
