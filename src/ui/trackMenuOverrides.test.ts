import { expect, it, vi } from "vitest";
import { createTrackMenuOverrides } from "./trackMenuOverrides";
import type { Track } from "../player/Player";
const track: Track = { id: "song", title: "Song", filename: "song.mp3", size: 1, url: "blob:song" };
function fixture() {
  const context: Parameters<typeof createTrackMenuOverrides>[0] = {
    cloud: true, optionTrack: track, localTrack: false, localFavorites: [track.id],
    visibleTracks: [], baseOptions: [{ key: "local-only", label: "Local", action: vi.fn() }], showLyrics: true,
    open: vi.fn(), back: vi.fn(), playTrack: vi.fn(), playNext: vi.fn(), toggleFavorite: vi.fn(), onLyrics: vi.fn(),
  };
  return { context, menus: () => createTrackMenuOverrides(context) };
}
it("remote tracks exclude local mutation commands, keep lyrics first, and delegate queue changes", () => {
  const f = fixture();
  const rows = f.menus()["track-options"]!;
  expect(rows.map(row => row.key)).toEqual(["lyrics", "queue", "play-next"]);
  rows[0].action();
  expect(f.context.onLyrics).toHaveBeenCalledWith(track);
  rows[2].action();
  expect(f.context.playNext).toHaveBeenCalledWith(track.id);
  expect(f.context.back).toHaveBeenCalledOnce();
  expect(f.context.toggleFavorite).not.toHaveBeenCalled();
});
it("local songs browsed under a cloud service retain local favorites and deletion", () => {
  const f = fixture();
  f.context.localTrack = true;
  f.context.showLyrics = false;
  const rows = f.menus()["track-options"]!;
  expect(rows.map(row => row.key)).toEqual(["favorite", "queue", "play-next", "delete"]);
  expect(rows[0].label).toBe("取消本地收藏");
  rows[3].action();
  expect(f.context.open).toHaveBeenCalledWith("confirm-delete-track", "cancel", track.id);
  f.context.cloud = false;
  f.context.showLyrics = true;
  expect(f.menus()["track-options"]?.map(row => row.key)).toEqual(["lyrics", "local-only"]);
});
it("remote empty playlists expose no local management actions and preserve provider track order", () => {
  const f = fixture();
  expect(f.menus()["playlist-tracks"]?.map(row => [row.key, row.disabled])).toEqual([["empty", true]]);
  f.context.visibleTracks = [{ ...track, id: "qq:2" }, { ...track, id: "qq:1" }];
  const rows = f.menus()["playlist-tracks"]!;
  expect(rows.map(row => row.key)).toEqual(["qq:2", "qq:1"]);
  rows[0].action();
  expect(f.context.playTrack).toHaveBeenCalledWith("qq:2");
  f.context.cloud = false;
  expect(f.menus()["playlist-tracks"]).toBeUndefined();
});
