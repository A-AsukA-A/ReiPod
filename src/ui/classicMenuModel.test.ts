import { expect, it, vi } from "vitest";
import { createClassicMenuModel } from "./classicMenuModel";
import type { Track } from "../player/Player";
const track: Track = { id: "song", title: "Song", filename: "song.mp3", size: 1, url: "blob:song" };
function fixture() {
  const context: Parameters<typeof createClassicMenuModel>[0] = {
    page: "albums", selectedKey: null, managedRows: {}, primaryRows: { home: [], music: [], playlists: [], settings: [], "confirm-clear": [] },
    browseAlbums: [{ id: "scoped", title: "Scoped", artist: "Alpha", tracks: [track] }],
    flowAlbums: [{ id: "other", title: "Other", artist: "Zulu", tracks: [{ ...track, id: "other-song" }] }],
    browseTracks: [track], artists: ["Alpha", "Zulu"], visibleTracks: [track], isTrackList: false,
    accountSyncing: false, emptyItems: [{ key: "import", label: "Import", action: vi.fn() }],
    open: vi.fn(), playTrack: vi.fn(), beginText: vi.fn(),
  };
  return { context, model: () => createClassicMenuModel(context) };
}

it("scoped albums keep their own count, tracks and artist when opened", () => {
  const f = fixture();
  f.context.browseArtist = "Alpha";
  const { rows } = f.model();
  expect(rows.map(row => row.key)).toEqual(["all-songs", "scoped"]);
  expect(rows.map(row => row.detail)).toEqual(["1 首歌曲", "1 首歌曲"]);
  rows[0].action();
  expect(f.context.open).toHaveBeenLastCalledWith("artist-tracks", undefined, "Alpha");
  rows[1].action();
  expect(f.context.open).toHaveBeenLastCalledWith("album-tracks", track.id, "scoped", "Alpha");
  f.context.browseArtist = "";
  f.model().rows[0].action();
  expect(f.context.open).toHaveBeenLastCalledWith("artist-tracks", undefined, "");
});

it("Cover Flow consumes flow order and does not inherit the album browser's artist scope", () => {
  const f = fixture();
  f.context.page = "coverflow";
  f.context.browseArtist = "Alpha";
  f.context.selectedKey = "other";
  const model = f.model();
  expect(model.rows.map(row => row.key)).toEqual(["other"]);
  expect(model.focusedRow?.key).toBe("other");
  model.rows[0].action();
  expect(f.context.open).toHaveBeenCalledWith("coverflow-album", "other-song", "other", undefined);
});

it("artist navigation distinguishes all albums from one artist without playing anything", () => {
  const f = fixture();
  f.context.page = "artists";
  const rows = f.model().rows;
  expect(rows.map(row => row.key)).toEqual(["all-albums", "Alpha", "Zulu"]);
  rows[0].action();
  expect(f.context.open).toHaveBeenLastCalledWith("albums");
  rows[2].action();
  expect(f.context.open).toHaveBeenLastCalledWith("albums", undefined, undefined, "Zulu");
  expect(f.context.playTrack).not.toHaveBeenCalled();
});

it("an explicit empty managed menu wins over primary and browse fallbacks", () => {
  const f = fixture();
  f.context.managedRows.albums = [];
  expect(f.model().rows).toEqual([]);
  f.context.page = "home";
  f.context.primaryRows.home = [{ key: "music", label: "Music", action: vi.fn() }];
  expect(f.model().rows[0].key).toBe("music");
  f.context.managedRows.home = [];
  expect(f.model().rows).toEqual([]);
});

it("search keeps supplied track order and metadata fallbacks plus a reachable edit command", () => {
  const f = fixture();
  f.context.page = "search";
  f.context.isTrackList = true;
  f.context.visibleTracks = [{ ...track, id: "2", album: "Album" }, track];
  const rows = f.model().rows;
  expect(rows.map(row => row.key)).toEqual(["2", "song", "edit-search"]);
  expect(rows.map(row => row.detail)).toEqual(["Album", "song.mp3", undefined]);
  rows[0].action();
  expect(f.context.playTrack).toHaveBeenCalledWith("2");
  rows[2].action();
  expect(f.context.beginText).toHaveBeenCalledOnce();
  f.context.visibleTracks = [];
  expect(f.model().rows.map(row => row.key)).toEqual(["edit-search"]);
  f.context.page = "favorites";
  expect(f.model().rows).toEqual([]);
});

it("empty browse pages keep import actions while an active playing page needs no fallback rows", () => {
  const f = fixture();
  f.context.browseAlbums = [];
  expect(f.model().rows).toBe(f.context.emptyItems);
  f.context.page = "playing";
  f.context.current = track;
  expect(f.model().rows).toEqual([]);
  f.context.current = undefined;
  expect(f.model().rows).toBe(f.context.emptyItems);
});

it("only syncing account menus retain disabled focus, without changing remembered selection", () => {
  const f = fixture();
  const refresh = { key: "refresh", label: "Refresh", disabled: true, action: vi.fn() };
  const logout = { key: "logout", label: "Logout", action: vi.fn() };
  f.context.page = "music-account";
  f.context.selectedKey = "refresh";
  f.context.managedRows["music-account"] = [refresh, logout];
  expect(f.model().focusedRow).toBe(logout);
  f.context.accountSyncing = true;
  expect(f.model().focusedRow).toBe(refresh);
  expect(f.context.selectedKey).toBe("refresh");
  f.context.page = "settings";
  f.context.managedRows.settings = [refresh, logout];
  expect(f.model().focusedRow).toBe(logout);
  f.context.managedRows.settings = [refresh];
  expect(f.model().focusedRow).toBeUndefined();
});
