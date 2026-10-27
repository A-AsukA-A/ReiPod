import { useSyncExternalStore } from "react";
export type Photo = {
  id: string;
  name: string;
  album: string;
  url: string;
  file: File;
};
let photos: Photo[] = [];
const listeners = new Set<() => void>();
const publish = () => listeners.forEach((fn) => fn());
let opening: Promise<IDBDatabase> | null = null;
function database() {
  return (opening ??= new Promise((resolve, reject) => {
    const request = indexedDB.open("reipod-photos", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("photos", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      opening = null;
      reject(request.error);
    };
  }));
}
function makePhoto(file: File, album: string): Photo {
  return {
    id: `${file.name}:${file.size}:${file.lastModified}`,
    name: file.name,
    album,
    url: URL.createObjectURL(file),
    file,
  };
}
export async function importPhotos(files: File[]) {
  const valid = files.filter((file) =>
    /\.(jpe?g|png|webp|gif|avif|bmp)$/i.test(file.name),
  );
  const added = valid
    .map((file) =>
      makePhoto(
        file,
        file.webkitRelativePath?.split("/").slice(0, -1).pop() || "照片图库",
      ),
    )
    .filter((photo) => {
      if (photos.some((item) => item.id === photo.id)) {
        URL.revokeObjectURL(photo.url);
        return false;
      }
      return true;
    });
  photos = [...photos, ...added];
  publish();
  try {
    const db = await database();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("photos", "readwrite");
      for (const photo of added)
        tx.objectStore("photos").put({
          id: photo.id,
          file: photo.file,
          album: photo.album,
        });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return { added: added.length, persisted: true };
  } catch {
    return { added: added.length, persisted: false };
  }
}
let restoration: Promise<void> | null = null;
export function restorePhotos() {
  return (restoration ??= database()
    .then(
      (db) =>
        new Promise<{ file: File; album: string }[]>((resolve, reject) => {
          const request = db
            .transaction("photos")
            .objectStore("photos")
            .getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        }),
    )
    .then((records) => {
      for (const record of records) {
        const photo = makePhoto(record.file, record.album);
        if (photos.some((item) => item.id === photo.id))
          URL.revokeObjectURL(photo.url);
        else photos.push(photo);
      }
      photos = [...photos];
      publish();
    })
    .catch(() => {}));
}
export async function deletePhoto(id: string) {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("photos", "readwrite");
    tx.objectStore("photos").delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  photos
    .filter((photo) => photo.id === id)
    .forEach((photo) => URL.revokeObjectURL(photo.url));
  photos = photos.filter((photo) => photo.id !== id);
  publish();
}
export const usePhotos = () =>
  useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
    () => photos,
  );
