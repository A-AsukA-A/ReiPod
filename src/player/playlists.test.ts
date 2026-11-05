import { expect, it, vi } from "vitest";
import {
  parsePlaylists,
  createPlaylist,
  renamePlaylist,
  togglePlaylistTrack,
  removeFromPlaylists,
  deletePlaylist,
  clearPlaylists,
  getPlaylists, withOnTheGo, addToOnTheGo, saveOnTheGo, clearOnTheGo, removePlaylistTrack,
} from "./playlists";
it("recovers valid playlists from partial or malformed saved data", () => {
  expect(parsePlaylists({})).toEqual([]);
  expect(
    parsePlaylists([
      null,
      { id: "a", name: "  夜航  ", trackIds: ["1", "1", 7] },
      { id: "a", name: "duplicate" },
      { id: "b", name: "  " },
    ]),
  ).toEqual([{ id: "a", name: "夜航", trackIds: ["1"] }]);
});

it("adds collections once, saves numbered immutable copies and clears only the working list", () => {
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", { setItem: (key: string, value: string) => storage.set(key, value) });
  try {
    clearPlaylists();
    expect(withOnTheGo(getPlaylists())).toEqual([{ id: "on-the-go", name: "On-The-Go", trackIds: [] }]);
    expect(getPlaylists()).toEqual([]);
    addToOnTheGo(["b", "a", "b"]);
    expect(addToOnTheGo("a")).toEqual({ added: false, persisted: true });
    const first = saveOnTheGo();
    expect(first).toMatchObject({ persisted: true, playlist: { name: "New Playlist 1", trackIds: ["b", "a"], savedOnTheGo: 1 } });
    expect(getPlaylists().find(item => item.id === "on-the-go")!.trackIds).toEqual([]);
    expect(togglePlaylistTrack(first.playlist!.id, "new")).toBe(false);
    expect(removePlaylistTrack(first.playlist!.id, "a")).toBe(false);
    expect(renamePlaylist(first.playlist!.id, "Edit")).toBe(false);
    addToOnTheGo("c");
    expect(saveOnTheGo().playlist?.name).toBe("New Playlist 2");
    addToOnTheGo("d"); expect(clearOnTheGo()).toBe(true);
    const restored = parsePlaylists(JSON.parse(storage.get("reipod-playlists")!));
    expect(restored.filter(item => item.savedOnTheGo).map(item => item.trackIds)).toEqual([["b", "a"], ["c"]]);
    expect(restored.find(item => item.id === "on-the-go")?.trackIds).toEqual([]);
  } finally { clearPlaylists(); vi.unstubAllGlobals(); }
});
it("failed save/clear does not consume the working list or publish a phantom saved playlist", () => {
  const setItem = vi.fn();
  vi.stubGlobal("localStorage", { setItem });
  try {
    clearPlaylists(); addToOnTheGo(["a", "b"]);
    const before = getPlaylists();
    setItem.mockImplementation(() => { throw new Error("quota"); });
    expect(saveOnTheGo()).toEqual({ playlist: null, persisted: false });
    expect(clearOnTheGo()).toBe(false);
    expect(getPlaylists()).toBe(before);
    setItem.mockImplementation(() => {});
    expect(saveOnTheGo().playlist?.name).toBe("New Playlist 1");
  } finally { clearPlaylists(); vi.unstubAllGlobals(); }
});
it("keeps in-memory editing usable when persistent storage is unavailable", () => {
  clearPlaylists();
  expect(createPlaylist(" ")).toBeNull();
  const result = createPlaylist("夜航")!;
  expect(result.playlist.trackIds).toEqual([]);
  expect(result.persisted).toBe(false); // Node has no browser localStorage.
  expect(renamePlaylist(result.playlist.id, " ")).toBe(false);
  expect(() => {
    togglePlaylistTrack(result.playlist.id, "track");
    removeFromPlaylists("track");
    deletePlaylist(result.playlist.id);
  }).not.toThrow();
});
it("creates distinct local playlists when WebKit has no randomUUID", () => {
  const getRandomValues = crypto.getRandomValues.bind(crypto);
  vi.stubGlobal("crypto", { getRandomValues });
  try {
    const first = createPlaylist("手机歌单")!;
    const second = createPlaylist("第二个歌单")!;
    expect(first.playlist.id).toMatch(/^[0-9a-f]{32}$/);
    expect(second.playlist.id).not.toBe(first.playlist.id);
  } finally {
    vi.unstubAllGlobals();
    clearPlaylists();
  }
});
