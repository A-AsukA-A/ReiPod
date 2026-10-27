import { useSyncExternalStore } from "react";

export type TextDocument = { id: string; title: string; text: string };
export type TextSource = {
  id: string;
  title: string;
  text?: string;
  path?: string;
};
export const builtinDocuments: Record<string, TextSource> = {
  "reader-guide": {
    id: "reader-guide",
    title: "阅读说明",
    text: "文本阅读器\n\n转动转轮逐行滚动，左右键翻页。中心键打开阅读选项，MENU 返回。\n\n选择“导入文本”可加入 TXT、Markdown 或 TEXT 文件。Markdown 按纯文本显示。支持 UTF-8、带 BOM 的 UTF-16 和常见中文 GB 编码，每个文件最多 2 MB。\n\n文本保存在当前浏览器中，阅读位置会自动记住。切换设备或清除网站数据后需要重新导入。\n\n设置中的开源许可和试听曲目版权也可以直接在 LCD 内阅读。链接仅作为文字显示。",
  },
  "third-party-licenses.txt": {
    id: "third-party-licenses.txt",
    title: "开源许可",
    path: "third-party-licenses.txt",
  },
  "music/credits.txt": {
    id: "music/credits.txt",
    title: "试听曲目版权",
    path: "music/credits.txt",
  },
  "music-metadata-license.txt": {
    id: "music-metadata-license.txt",
    title: "音频解析器许可",
    path: "music-metadata-license.txt",
  },
  "fonts/OFL-NotoSansSC.txt": {
    id: "fonts/OFL-NotoSansSC.txt",
    title: "字体许可",
    path: "fonts/OFL-NotoSansSC.txt",
  },
};

export function decodeText(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let text: string;
  if (bytes[0] === 0xff && bytes[1] === 0xfe)
    text = new TextDecoder("utf-16le", { fatal: true }).decode(bytes);
  else if (bytes[0] === 0xfe && bytes[1] === 0xff)
    text = new TextDecoder("utf-16be", { fatal: true }).decode(bytes);
  else {
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      text = new TextDecoder("gb18030", { fatal: true }).decode(bytes);
    }
  }
  if (/[\u0000-\u0008\u000e-\u001f]/.test(text)) throw new Error("非文本文件");
  return text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
}

let documents: TextDocument[] = [];
const sessionOnly = new Set<string>();
const listeners = new Set<() => void>();
const publish = () => listeners.forEach((listener) => listener());
let opening: Promise<IDBDatabase> | undefined;
function database() {
  return (opening ??= new Promise((resolve, reject) => {
    const request = indexedDB.open("reipod-texts", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("texts", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      opening = undefined;
      reject(request.error);
    };
  }));
}
let restoring: Promise<void> | undefined;
export function restoreTexts() {
  return (restoring ??= database()
    .then(
      (db) =>
        new Promise<TextDocument[]>((resolve, reject) => {
          const request = db.transaction("texts").objectStore("texts").getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        }),
    )
    .then((saved) => {
      documents = [
        ...documents,
        ...saved.filter((item) => !documents.some((doc) => doc.id === item.id)),
      ];
      publish();
    })
    .catch(() => {}));
}
export async function importTexts(files: File[]) {
  await restoreTexts();
  const added: TextDocument[] = [];
  let rejected = 0;
  for (const file of files) {
    if (!/\.(txt|md|text)$/i.test(file.name) || file.size > 2 * 1024 ** 2) {
      rejected++;
      continue;
    }
    const id = `text:${file.name}:${file.size}:${file.lastModified}`;
    if (
      documents.some((doc) => doc.id === id) ||
      added.some((doc) => doc.id === id)
    )
      continue;
    try {
      added.push({
        id,
        title: file.name,
        text: decodeText(await file.arrayBuffer()),
      });
    } catch {
      rejected++;
    }
  }
  documents = [...documents, ...added];
  publish();
  let persisted = true;
  if (added.length)
    try {
      const db = await database();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("texts", "readwrite");
        added.forEach((doc) => tx.objectStore("texts").put(doc));
        tx.oncomplete = () => resolve();
        tx.onabort = tx.onerror = () => reject(tx.error);
      });
    } catch {
      persisted = false;
      added.forEach((doc) => sessionOnly.add(doc.id));
    }
  return { added: added.length, rejected, persisted, firstId: added[0]?.id };
}
export async function deleteText(id: string) {
  try {
    if (!sessionOnly.has(id)) {
      const db = await database();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("texts", "readwrite");
        tx.objectStore("texts").delete(id);
        tx.oncomplete = () => resolve();
        tx.onabort = tx.onerror = () => reject(tx.error);
      });
    }
    documents = documents.filter((doc) => doc.id !== id);
    sessionOnly.delete(id);
    saveReadingPosition(id, 0);
    publish();
    return true;
  } catch {
    return false;
  }
}
export const useTexts = () =>
  useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
    () => documents,
  );

const positions = new Map<string, number>();
export function readingPosition(id: string) {
  if (positions.has(id)) return positions.get(id)!;
  try {
    const value = Number(localStorage.getItem(`reipod-reading:${id}`));
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
  } catch {
    return 0;
  }
}
export function saveReadingPosition(id: string, value: number) {
  const position = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
  positions.set(id, position);
  try {
    localStorage.setItem(`reipod-reading:${id}`, String(position));
  } catch {
    /* Session position still works. */
  }
}
