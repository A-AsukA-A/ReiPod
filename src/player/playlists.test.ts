import { expect, it } from "vitest";
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
