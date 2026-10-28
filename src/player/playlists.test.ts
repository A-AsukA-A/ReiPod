import { expect, it, vi } from "vitest";
import {
  parsePlaylists,
  createPlaylist,
  renamePlaylist,
  togglePlaylistTrack,
  removeFromPlaylists,
  deletePlaylist,
  clearPlaylists,
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
