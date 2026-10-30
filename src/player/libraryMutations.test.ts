import { expect, it, vi } from "vitest";
import { Player, type Track } from "./Player";
import type { AudioPort } from "./ports";
import { createLibraryMutations } from "./libraryMutations";

function deferred() {
  let resolve!: () => void, reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const track = (url = "blob:one"): Track => ({ id: "one", title: "One", filename: "one.m4a", size: 1, url, kind: "local" });
function fixture() {
  const revoke = vi.fn();
  const player = new Player((): AudioPort => ({ src: "", preload: "", paused: true, volume: 1,
    currentTime: 0, duration: 100, error: null, play: async () => {}, pause() {}, load() {},
    removeAttribute() {}, addEventListener() {}, removeEventListener() {},
  }), revoke);
  player.add([track(), { ...track("blob:two"), id: "two" }]);
  const ratings = new Map([["one", 5], ["two", 3]]), playlist = new Set(["one", "two"]);
  const library = { forget: vi.fn(), invalidate: vi.fn() };
  const clearSavedSession = vi.fn(), notify = vi.fn();
  const removeSavedTrack = vi.fn(async (_track: Track) => {}), clearSavedFiles = vi.fn(async () => {});
  const hideDemos = vi.fn();
  const removeRating = vi.fn((id: string) => { ratings.delete(id); return true; });
  const removeFromPlaylists = vi.fn((id: string) => { playlist.delete(id); return true; });
  const clearRatings = vi.fn(() => { ratings.clear(); return true; });
  const clearPlaylists = vi.fn(() => { playlist.clear(); return true; });
  const mutations = createLibraryMutations({ player, library, clearSavedSession, removeSavedTrack,
    clearSavedFiles, hideDemos, removeRating, removeFromPlaylists, clearRatings, clearPlaylists, notify });
  return { player, revoke, ratings, playlist, library, clearSavedSession, notify, removeSavedTrack,
    clearSavedFiles, hideDemos, removeRating, removeFromPlaylists, clearRatings, clearPlaylists, mutations };
}

it("coalesces duplicate deletion for the same resource and keeps related data until storage succeeds", async () => {
  const f = fixture(), saving = deferred();
  f.removeSavedTrack.mockReturnValueOnce(saving.promise);
  f.player.setFavorites(["one", "two"]);
  const first = f.mutations.removeTrack("one"), duplicate = f.mutations.removeTrack("one");
  expect(duplicate).toBe(first); expect(f.removeSavedTrack).toHaveBeenCalledOnce();
  expect(f.ratings.get("one")).toBe(5); expect(f.playlist.has("one")).toBe(true);
  saving.resolve(); expect(await first).toEqual({ removed: true });
  expect(f.player.getSnapshot()).toMatchObject({ queue: ["two"], favorites: ["two"] });
  expect(f.ratings.has("one")).toBe(false); expect([...f.playlist]).toEqual(["two"]);
  expect(f.library.forget).toHaveBeenCalledWith("one");
  expect(f.revoke).toHaveBeenCalledWith("blob:one");
});

it("a failed deletion preserves the song and related data and permits retry", async () => {
  const f = fixture(); f.removeSavedTrack.mockRejectedValueOnce(new Error("storage unavailable"));
  expect(await f.mutations.removeTrack("one")).toEqual({ removed: false, persistenceError: "track" });
  expect(f.player.getSnapshot().tracks).toHaveLength(2); expect(f.ratings.get("one")).toBe(5);
  expect(f.removeFromPlaylists).not.toHaveBeenCalled(); expect(f.library.forget).not.toHaveBeenCalled();
  expect(await f.mutations.removeTrack("one")).toEqual({ removed: true });
  expect(f.removeSavedTrack).toHaveBeenCalledTimes(2);
});

it.each([false, true])("a cleared generation's late deletion cannot affect reimported ratings/playlists (reject=%s)", async reject => {
  const f = fixture(), saving = deferred(); f.removeSavedTrack.mockReturnValueOnce(saving.promise);
  const removing = f.mutations.removeTrack("one");
  await f.mutations.clearLibrary();
  // Demo resources can reuse the same URL across library generations.
  f.player.add([track()]); f.ratings.set("one", 4); f.playlist.add("one");
  if (reject) saving.reject(new Error("old failure")); else saving.resolve();
  expect(await removing).toEqual({ removed: false });
  expect(f.player.getSnapshot().tracks[0].url).toBe("blob:one");
  expect(f.ratings.get("one")).toBe(4); expect(f.playlist.has("one")).toBe(true);
  expect(f.removeRating).not.toHaveBeenCalled(); expect(f.notify).not.toHaveBeenCalled();
});

it("an old operation cannot evict the pending deletion for a replacement resource", async () => {
  const f = fixture(), old = deferred(), fresh = deferred();
  f.removeSavedTrack.mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
  const first = f.mutations.removeTrack("one");
  f.player.remove("one"); f.player.add([track("blob:replacement")]);
  const second = f.mutations.removeTrack("one"); old.resolve();
  expect(await first).toEqual({ removed: false });
  expect(f.mutations.removeTrack("one")).toBe(second); expect(f.removeSavedTrack).toHaveBeenCalledTimes(2);
  fresh.resolve(); expect(await second).toEqual({ removed: true });
});

it("metadata changes on the same resource do not invalidate deletion", async () => {
  const f = fixture(), saving = deferred(); f.removeSavedTrack.mockReturnValueOnce(saving.promise);
  const removing = f.mutations.removeTrack("one"); f.player.updateTrack("one", { title: "Decoded title" });
  saving.resolve(); expect(await removing).toEqual({ removed: true });
  expect(f.player.getSnapshot().tracks.map(item => item.id)).toEqual(["two"]);
});

it("attempts both related-data cleanups and reports partial persistence without undoing deletion", async () => {
  const f = fixture(); f.removeRating.mockReturnValueOnce(false);
  f.removeFromPlaylists.mockImplementationOnce(() => { throw new Error("storage error"); });
  expect(await f.mutations.removeTrack("one")).toEqual({ removed: true, persistenceError: "related-data" });
  expect(f.removeRating).toHaveBeenCalledWith("one"); expect(f.removeFromPlaylists).toHaveBeenCalledWith("one");
  expect(f.player.getSnapshot().tracks.map(item => item.id)).toEqual(["two"]);
});

it("clears memory immediately and reports combined failures only after storage settles", async () => {
  const f = fixture(), clearing = deferred();
  f.clearSavedFiles.mockReturnValueOnce(clearing.promise); f.clearRatings.mockReturnValueOnce(false);
  f.hideDemos.mockImplementationOnce(() => { throw new Error("preference storage unavailable"); });
  const complete = f.mutations.clearLibrary();
  expect(f.player.getSnapshot()).toMatchObject({ tracks: [], queue: [], currentId: null });
  expect(f.library.invalidate).toHaveBeenCalledOnce(); expect(f.clearSavedSession).toHaveBeenCalledOnce();
  expect(f.clearPlaylists).toHaveBeenCalledOnce(); expect(f.notify).not.toHaveBeenCalled();
  clearing.reject(new Error("database unavailable")); expect(await complete).toBe(false);
  expect(f.notify).toHaveBeenCalledWith("曲库文件及部分评级、歌单或试听偏好未能清理保存，请重试");
});

it.each([false, true])("reports the current clear failure without erasing songs imported afterward (filesFail=%s)", async filesFail => {
  const f = fixture(), clearing = deferred(); f.clearSavedFiles.mockReturnValueOnce(clearing.promise);
  if (!filesFail) f.clearPlaylists.mockReturnValueOnce(false);
  const complete = f.mutations.clearLibrary(); f.player.add([track("blob:fresh")]);
  f.ratings.set("one", 4); f.playlist.add("one");
  if (filesFail) clearing.reject(new Error("failed clear")); else clearing.resolve();
  expect(await complete).toBe(false);
  expect(f.player.getSnapshot().tracks[0].url).toBe("blob:fresh");
  expect(f.ratings.get("one")).toBe(4); expect(f.playlist.has("one")).toBe(true);
  expect(f.notify).toHaveBeenCalledWith(filesFail ? "曲库保存状态清理失败，请重试" : "部分评级、歌单或试听偏好未能保存，本次清空仍生效");
});

it("a newer clear supersedes an older failure and disposal suppresses pending feedback", async () => {
  const f = fixture(), old = deferred(), latest = deferred();
  f.clearSavedFiles.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise);
  const first = f.mutations.clearLibrary(), second = f.mutations.clearLibrary();
  old.reject(new Error("old clear")); expect(await first).toBe(false); expect(f.notify).not.toHaveBeenCalled();
  f.player.add([track("blob:new")]); const removing = f.mutations.removeTrack("one");
  f.mutations.dispose(); latest.reject(new Error("disposed clear"));
  expect(await second).toBe(false); expect(await removing).toEqual({ removed: false });
  expect(f.notify).not.toHaveBeenCalled(); expect(f.player.getSnapshot().tracks).toHaveLength(1);
});

it("handles synchronous persistence failure and absent songs without uncaught rejection", async () => {
  const f = fixture(); f.removeSavedTrack.mockImplementationOnce(() => { throw new Error("demo preference failed"); });
  expect(await f.mutations.removeTrack("one")).toEqual({ removed: false, persistenceError: "track" });
  expect(await f.mutations.removeTrack("missing")).toEqual({ removed: false });
  f.clearSavedFiles.mockImplementationOnce(() => { throw new Error("database unavailable"); });
  expect(await f.mutations.clearLibrary()).toBe(false);
  expect(f.notify).toHaveBeenCalledWith("曲库保存状态清理失败，请重试");
});
