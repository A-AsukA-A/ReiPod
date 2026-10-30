import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { transformWithOxc } from "vite";
import type { createFileStorage } from "../../src/player/storage";

declare global {
  interface Window { storageTest: { createFileStorage: typeof createFileStorage }; }
}
// Exercise the adapter itself with native IndexedDB, without exporting test hooks in the app.
let source: string;
test.beforeAll(async () => {
  source = (await transformWithOxc(readFileSync("src/player/storage.ts", "utf8"), "storage.ts")).code;
});
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async code => {
    const url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
    try { window.storageTest = await import(/* @vite-ignore */ url); }
    finally { URL.revokeObjectURL(url); }
  }, source);
});

test("file storage preserves submission order through save, read, delete, clear and reimport", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const store = window.storageTest.createFileStorage(() => indexedDB.open("storage-order", 1));
    const file = new File(["music"], "one.m4a", { type: "audio/mp4", lastModified: 12 });
    const saving = store.saveFiles([file]);
    const first = store.readFiles();
    const deleting = store.removeFile(`${file.name}:${file.size}:${file.lastModified}`);
    const second = store.readFiles();
    const savingAgain = store.saveFiles([file]);
    const clearing = store.clearFiles();
    const third = store.readFiles();
    const fresh = new File(["new"], "two.m4a", { lastModified: 13 });
    const lastSave = store.saveFiles([fresh]);
    const last = store.readFiles();
    await Promise.all([saving, deleting, savingAgain, clearing, lastSave]);
    const restored = (await first)[0];
    return { first: { name: restored.file.name, type: restored.file.type, modified: restored.file.lastModified,
      text: await restored.file.text(), importedAt: restored.importedAt },
      second: (await second).length, third: (await third).length, last: (await last).map(record => record.file.name) };
  });
  expect(result).toMatchObject({ first: { name: "one.m4a", type: "audio/mp4", modified: 12, text: "music" },
    second: 0, third: 0, last: ["two.m4a"] });
  expect(result.first.importedAt).toBeGreaterThan(0);
});

test("a synchronous clone failure rolls back the whole batch and does not poison later operations", async ({ page }) => {
  expect(await page.evaluate(async () => {
    const store = window.storageTest.createFileStorage(() => indexedDB.open("storage-rollback", 1));
    const good = new File(["good"], "good.m4a");
    const bad = { name: "bad.m4a", size: 1, lastModified: 1, type: "audio/mp4", uncloneable() {} } as unknown as File;
    const error = await store.saveFiles([good, bad]).then(() => "unexpected success", (error: DOMException) => error.name);
    const afterFailure = await store.readFiles();
    await store.saveFiles([good]);
    return { error, afterFailure: afterFailure.length, recovered: (await store.readFiles()).map(record => record.file.name) };
  })).toEqual({ error: "DataCloneError", afterFailure: 0, recovered: ["good.m4a"] });
});

test("a synchronous open failure is retried on the next operation", async ({ page }) => {
  expect(await page.evaluate(async () => {
    let calls = 0;
    const store = window.storageTest.createFileStorage(() => {
      if (++calls === 1) throw new DOMException("Unavailable", "SecurityError");
      return indexedDB.open("storage-sync-retry", 1);
    });
    const error = await store.readFiles().then(() => "unexpected success", (error: DOMException) => error.name);
    await store.saveFiles([new File(["music"], "retry.m4a")]);
    return { error, calls, count: (await store.readFiles()).length };
  })).toEqual({ error: "SecurityError", calls: 2, count: 1 });
});

test("an asynchronous open error is retried without discarding saved data", async ({ page }) => {
  expect(await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("storage-async-retry", 2);
      request.onupgradeneeded = () => request.result.createObjectStore("files", { keyPath: "id" });
      request.onsuccess = () => { request.result.close(); resolve(); };
      request.onerror = () => reject(request.error);
    });
    let calls = 0;
    const store = window.storageTest.createFileStorage(() => indexedDB.open("storage-async-retry", ++calls === 1 ? 1 : 2));
    const error = await store.readFiles().then(() => "unexpected success", (error: DOMException) => error.name);
    await store.saveFiles([new File(["music"], "retry.m4a")]);
    return { error, calls, count: (await store.readFiles()).length };
  })).toEqual({ error: "VersionError", calls: 2, count: 1 });
});

test("a blocked attempt is abandoned and cannot leak a late connection or evict a newer attempt", async ({ page }) => {
  expect(await page.evaluate(async () => {
    const blocker = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("storage-blocked", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    let calls = 0;
    const store = window.storageTest.createFileStorage(() => { calls++; return indexedDB.open("storage-blocked", 2); });
    const error = await store.readFiles().then(() => "unexpected success", (error: Error) => error.message);
    const retry = store.saveFiles([new File(["music"], "retry.m4a")]);
    blocker.close();
    await retry;
    const count = (await store.readFiles()).length;
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase("storage-blocked");
      request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
    });
    return { error, calls, count };
  })).toEqual({ error: "Library database blocked", calls: 2, count: 1 });
});

test("versionchange releases the cached connection and the next operation reopens it", async ({ page }) => {
  expect(await page.evaluate(async () => {
    let calls = 0;
    const store = window.storageTest.createFileStorage(() => { calls++; return indexedDB.open("storage-version", 1); });
    await store.saveFiles([new File(["old"], "old.m4a")]);
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase("storage-version");
      request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
    });
    await store.saveFiles([new File(["fresh"], "fresh.m4a")]);
    return { calls, files: (await store.readFiles()).map(record => record.file.name) };
  })).toEqual({ calls: 2, files: ["fresh.m4a"] });
});

test("a silently closed cached connection is reopened before submitting requests", async ({ page }) => {
  expect(await page.evaluate(async () => {
    let calls = 0, connection!: IDBDatabase;
    const store = window.storageTest.createFileStorage(() => {
      calls++;
      const request = indexedDB.open("storage-closed", 1);
      request.addEventListener("success", () => { connection = request.result; });
      return request;
    });
    await store.saveFiles([new File(["one"], "one.m4a")]); connection.close();
    await store.saveFiles([new File(["two"], "two.m4a")]);
    return { calls, count: (await store.readFiles()).length };
  })).toEqual({ calls: 2, count: 2 });
});

test("a read rejects if its transaction aborts after request success and later reads recover", async ({ page }) => {
  expect(await page.evaluate(async () => {
    const store = window.storageTest.createFileStorage(() => indexedDB.open("storage-read-abort", 1));
    await store.saveFiles([new File(["one"], "one.m4a")]);
    const original = IDBObjectStore.prototype.getAll;
    IDBObjectStore.prototype.getAll = function (...args) {
      const request = original.apply(this, args);
      if (this.transaction.db.name === "storage-read-abort") request.addEventListener("success", () => this.transaction.abort());
      return request;
    };
    let error: string;
    try { error = await store.readFiles().then(() => "unexpected success", (error: DOMException) => error.name); }
    finally { IDBObjectStore.prototype.getAll = original; }
    return { error, count: (await store.readFiles()).length };
  })).toEqual({ error: "AbortError", count: 1 });
});
