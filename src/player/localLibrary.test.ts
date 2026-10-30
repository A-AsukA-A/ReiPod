import { expect, it, vi } from "vitest";
import { Player } from "./Player";
import { createLocalLibrary, type ImportFile, type LocalMetadata } from "./localLibrary";
import type { AudioPort } from "./ports";

function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const file = (name = "song.m4a"): ImportFile => ({ name, size: 10, lastModified: 1, type: "", text: async () => "[00:01]sidecar" });
const id = (entry: ImportFile) => `${entry.name}:${entry.size}:${entry.lastModified}`;
const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
function fixture() {
  const revoke = vi.fn();
  const player = new Player((): AudioPort => ({
    src: "", preload: "", paused: true, volume: 1, currentTime: 0, duration: 100, error: null,
    play: async () => {}, pause() {}, load() {}, removeAttribute() {}, addEventListener() {}, removeEventListener() {},
  }), revoke);
  let url = 0;
  const createUrl = vi.fn(() => `blob:import-${++url}`);
  const readMetadata = vi.fn(async (_file: ImportFile): Promise<LocalMetadata> => ({}));
  const readFiles = vi.fn(async (): Promise<{ file: ImportFile; importedAt: number }[]> => []);
  const saveFiles = vi.fn(async (_files: ImportFile[]) => {});
  const finishRestore = vi.fn(), notify = vi.fn();
  const library = createLocalLibrary({ player, createUrl, revokeUrl: revoke,
    readMetadata, readFiles, saveFiles, finishRestore, notify, now: () => 42 });
  return { player, library, revoke, createUrl, readMetadata, readFiles, saveFiles, finishRestore, notify };
}

it("decodes duplicate imports once, releases their unused URLs and continues after a bad tag", async () => {
  const f = fixture(), one = file(), two = file("two.flac");
  f.readMetadata.mockRejectedValueOnce(new Error("bad tag")).mockResolvedValueOnce({ title: "Two" });
  expect(f.library.importFiles([one, one, file("bad.txt"), two])).toEqual({ added: 2, rejected: 1, lyrics: 0 });
  await settle();
  expect(f.readMetadata.mock.calls.map(([entry]) => entry.name)).toEqual([one.name, two.name]);
  expect(f.revoke).toHaveBeenCalledWith("blob:import-2");
  expect(f.player.getSnapshot().tracks.map(track => track.title)).toEqual(["song", "Two"]);
});

it("discards metadata for a removed/reimported ID and releases its late cover", async () => {
  const f = fixture(), entry = file(), old = deferred<LocalMetadata>();
  f.readMetadata.mockReturnValueOnce(old.promise).mockResolvedValueOnce({ title: "New" });
  f.library.importFiles([entry]); await settle();
  f.library.forget(id(entry)); f.player.remove(id(entry)); f.library.importFiles([entry]);
  old.resolve({ title: "Old", artwork: "blob:old-cover" }); await settle();
  expect(f.player.getSnapshot().tracks[0]).toMatchObject({ title: "New", url: "blob:import-2" });
  expect(f.revoke).toHaveBeenCalledWith("blob:old-cover");
});

it("lets a new library decode without waiting for an abandoned metadata job", async () => {
  const f = fixture(), old = deferred<LocalMetadata>();
  f.readMetadata.mockReturnValueOnce(old.promise).mockResolvedValueOnce({ title: "Fresh" });
  f.library.importFiles([file()]); await settle();
  f.library.invalidate(); f.player.clear(); f.library.importFiles([file()]); await settle();
  expect(f.player.getSnapshot().tracks[0].title).toBe("Fresh");
  old.resolve({ title: "Stale", artwork: "blob:stale-cover" }); await settle();
  expect(f.player.getSnapshot().tracks[0].title).toBe("Fresh");
  expect(f.revoke).toHaveBeenCalledWith("blob:stale-cover");
});

it("keeps imported sidecar lyrics when embedded lyrics finish later", async () => {
  const f = fixture(), tags = deferred<LocalMetadata>();
  f.readMetadata.mockReturnValueOnce(tags.promise);
  f.library.importFiles([file(), file("song.lrc")]); await settle();
  tags.resolve({ lyrics: [{ time: 1, text: "embedded" }] }); await settle();
  expect(f.player.getSnapshot().tracks[0].lyrics?.[0].text).toBe("sidecar");
});

it.each([false, true])("ignores a removed instance's late sidecar result or failure (reject=%s)", async reject => {
  const f = fixture(), entry = file(), lyrics = deferred<string>();
  f.library.importFiles([entry, { ...file("song.lrc"), text: () => lyrics.promise }]); await settle();
  f.library.forget(id(entry)); f.player.remove(id(entry)); f.library.importFiles([entry]);
  if (reject) lyrics.reject(new Error("old read")); else lyrics.resolve("[00:01]old");
  await settle();
  expect(f.player.getSnapshot().tracks[0].lyrics).toBeUndefined();
  expect(f.notify).not.toHaveBeenCalled();
});

it("suppresses stale failures after clear but reports current storage and unmatched lyrics failures", async () => {
  const f = fixture(), saving = deferred<void>(), lyrics = deferred<string>();
  f.saveFiles.mockReturnValueOnce(saving.promise);
  f.library.importFiles([file(), { ...file("song.lrc"), text: () => lyrics.promise }]);
  f.library.invalidate(); f.player.clear();
  saving.reject(new Error("old save")); lyrics.reject(new Error("old lyrics")); await settle();
  expect(f.notify).not.toHaveBeenCalled();
  f.saveFiles.mockRejectedValueOnce(new Error("current save"));
  f.library.importFiles([file("missing.lrc")]); await settle();
  expect(f.notify.mock.calls.map(([message]) => message)).toEqual([
    "歌词「missing.lrc」未找到同名歌曲", "浏览器未能保存文件，本次仍可播放",
  ]);
});

it("does not resurrect a removed song or overwrite a fresh import's timestamp from a late restore", async () => {
  const f = fixture(), records = deferred<{ file: ImportFile; importedAt: number }[]>();
  const removed = file("removed.m4a"), fresh = file("fresh.m4a"), restored = file("restored.m4a");
  f.readFiles.mockReturnValueOnce(records.promise);
  const restoring = f.library.initialize();
  f.library.importFiles([removed, fresh]);
  f.library.forget(id(removed)); f.player.remove(id(removed));
  records.resolve([removed, fresh, restored].map(entry => ({ file: entry, importedAt: 5 })));
  await restoring; await settle();
  expect(f.player.getSnapshot().tracks.map(track => [track.id, track.importedAt])).toEqual([[id(fresh), 42], [id(restored), 5]]);
  expect(f.createUrl).toHaveBeenCalledTimes(3);
  expect(f.finishRestore).toHaveBeenCalledOnce();
});

it("preserves the user's selected queue while adding restored songs", async () => {
  const f = fixture(), records = deferred<{ file: ImportFile; importedAt: number }[]>();
  const one = file(), two = file("two.m4a");
  f.readFiles.mockReturnValueOnce(records.promise);
  const restoring = f.library.initialize();
  f.library.importFiles([one, two]); f.player.setQueue([id(two)]); f.player.select(id(two), false);
  records.resolve([{ file: file("restored.m4a"), importedAt: 3 }]); await restoring;
  expect(f.player.getSnapshot()).toMatchObject({ currentId: id(two), queue: [id(two)] });
  expect(f.player.getSnapshot().tracks).toHaveLength(3);
});

it("does not replay an older sidecar snapshot over lyrics imported during restore", async () => {
  const f = fixture(), records = deferred<{ file: ImportFile; importedAt: number }[]>();
  f.readFiles.mockReturnValueOnce(records.promise);
  const restoring = f.library.initialize();
  f.library.importFiles([file(), file("song.lrc")]); await settle();
  const oldLyrics = { ...file("song.lrc"), text: vi.fn(async () => "[00:01]old") };
  records.resolve([{ file: oldLyrics, importedAt: 1 }]); await restoring; await settle();
  expect(f.player.getSnapshot().tracks[0].lyrics?.[0].text).toBe("sidecar");
  expect(oldLyrics.text).not.toHaveBeenCalled();
});

it("initializes once, tolerates a failed read and ignores restoration invalidated by clear", async () => {
  const f = fixture(); f.readFiles.mockRejectedValueOnce(new Error("no database"));
  const first = f.library.initialize(); expect(f.library.initialize()).toBe(first);
  await first; f.library.importFiles([file()]); await settle();
  expect(f.finishRestore).toHaveBeenCalledOnce(); expect(f.readFiles).toHaveBeenCalledOnce();
  expect(f.player.getSnapshot().tracks).toHaveLength(1);
  const g = fixture(), records = deferred<{ file: ImportFile; importedAt: number }[]>();
  g.readFiles.mockReturnValueOnce(records.promise);
  const pending = g.library.initialize(); g.library.invalidate(); g.player.clear();
  records.resolve([{ file: file(), importedAt: 3 }]); await pending;
  expect(g.player.getSnapshot().tracks).toEqual([]); expect(g.finishRestore).not.toHaveBeenCalled();
});
