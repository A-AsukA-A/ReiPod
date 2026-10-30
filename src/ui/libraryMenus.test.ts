import { expect, it, vi } from "vitest";
import { createLibraryMenus } from "./libraryMenus";
import type { PlayerState, Track } from "../player/Player";

const track: Track = { id: "local", title: "Song", filename: "song.mp3", size: 1, url: "blob:song" };
function fixture() {
  const state: PlayerState = { tracks: [track], queue: [], currentId: null, status: "idle",
    position: 0, duration: 0, volume: 1, volumeControl: true, shuffle: false, repeat: "off", favorites: [], error: null };
  const operations = { deletePlaylist: vi.fn(() => true), togglePlaylistTrack: vi.fn(() => false),
    removePlaylistTrack: vi.fn(() => true), addToOnTheGo: vi.fn(() => ({ persisted: true, added: true })),
    removeTrack: vi.fn(async () => true), playNext: vi.fn() };
  const context: Parameters<typeof createLibraryMenus>[0] = {
    operations, page: "playlist-add-tracks", groupKey: "list", playlists: [{ id: "list", name: "List", trackIds: [track.id] }],
    state, musicTracks: [track], visibleTracks: [track], playlistTrackIds: new Set([track.id]),
    optionTrack: track, contextPlaylist: null, deleting: false, editName: vi.fn(), saveName: vi.fn(),
    beginText: vi.fn(), setDeleting: vi.fn(), setNotice: vi.fn(), open: vi.fn(), back: vi.fn(),
    navigationRef: { current: { screen: { page: "confirm-delete-track", groupKey: "list", selectedKey: "confirm" }, history: [], remembered: {} } },
    playTrack: vi.fn(), toggleFavorite: vi.fn(),
  };
  return { context, operations, menus: () => createLibraryMenus(context) };
}

it("building menus has no storage effects and membership edits use the supplied playlist port", () => {
  const f = fixture();
  const rows = f.menus();
  expect(f.operations.togglePlaylistTrack).not.toHaveBeenCalled();
  expect(rows["playlist-add-tracks"]?.[0].value).toBe("✓");
  rows["playlist-add-tracks"]?.[0].action();
  expect(f.operations.togglePlaylistTrack).toHaveBeenCalledWith("list", track.id);
  expect(f.context.setNotice).toHaveBeenCalledWith("更改未能保存，本次仍生效");
  f.context.groupKey = track.id;
  f.menus()["pick-playlist"]?.[0].action();
  expect(f.operations.togglePlaylistTrack).toHaveBeenCalledOnce();
  expect(f.context.setNotice).toHaveBeenLastCalledWith("歌曲已在歌单中");
});

it("local queue and On-The-Go actions use independent ports without starting a song", () => {
  const f = fixture();
  const rows = f.menus()["track-options"]!;
  rows.find(row => row.key === "play-next")!.action();
  expect(f.operations.playNext).toHaveBeenCalledWith(track.id);
  rows.find(row => row.key === "on-the-go")!.action();
  expect(f.operations.addToOnTheGo).toHaveBeenCalledWith(track.id);
  expect(f.context.playTrack).not.toHaveBeenCalled();
});

it("playlist deletion preserves songs and reports a non-persisted edit", () => {
  const f = fixture();
  f.operations.deletePlaylist.mockReturnValue(false);
  f.menus()["confirm-delete-playlist"]?.[1].action();
  expect(f.operations.deletePlaylist).toHaveBeenCalledWith("list");
  expect(f.operations.removeTrack).not.toHaveBeenCalled();
  expect(f.context.back).toHaveBeenCalledWith(3);
  expect(f.context.setNotice).toHaveBeenCalledWith("删除未能保存，本次仍生效");
});

it("late song deletion does not navigate away from a different page", async () => {
  const f = fixture();
  let complete!: (value: boolean) => void;
  f.operations.removeTrack.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  f.menus()["confirm-delete-track"]?.[1].action();
  f.context.navigationRef.current.screen = { page: "home", selectedKey: "music" };
  complete(true);
  await vi.waitFor(() => expect(f.context.setDeleting).toHaveBeenLastCalledWith(false));
  expect(f.context.back).not.toHaveBeenCalled();
  expect(f.context.setNotice).toHaveBeenCalledWith("歌曲已从曲库删除");
});

it("a rejected deletion releases the busy state and permits retry", async () => {
  const f = fixture();
  f.operations.removeTrack.mockRejectedValueOnce(new Error("storage failed"));
  f.menus()["confirm-delete-track"]?.[1].action();
  await vi.waitFor(() => expect(f.context.setDeleting).toHaveBeenLastCalledWith(false));
  expect(f.context.setNotice).toHaveBeenCalledWith("删除失败，请重试");
  expect(f.context.back).not.toHaveBeenCalled();
  f.menus()["confirm-delete-track"]?.[1].action();
  await vi.waitFor(() => expect(f.context.back).toHaveBeenCalledWith(2));
});
