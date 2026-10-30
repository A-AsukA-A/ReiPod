import { expect, it, vi } from "vitest";
import type { PlayerState, Track } from "../player/Player";
import type { Page } from "./navigation";
import { createClassicInputController } from "./classicInputController";

const song: Track = { id: "song", title: "Song", filename: "song.mp3", url: "blob:song", size: 1 };
function fixture(page: Page = "playing") {
  const snapshot: PlayerState = {
    tracks: [song], queue: [song.id], currentId: song.id, shuffle: false,
    repeat: "off", favorites: [], position: 10, duration: 100, volume: 0.5,
    volumeControl: true, status: "playing", error: null,
  };
  const player = {
    getSnapshot: vi.fn(() => snapshot), seek: vi.fn(), setShuffle: vi.fn(), setVolume: vi.fn(),
    pause: vi.fn(), play: vi.fn(), toggle: vi.fn(), next: vi.fn(), previous: vi.fn(),
  };
  const action = vi.fn();
  const context: Parameters<typeof createClassicInputController>[0] = {
    device: { held: false, sleeping: false, activate: vi.fn(), setSleeping: vi.fn() },
    navigation: { page, groupKey: "group", selectedKey: song.id,
      dispatch: vi.fn(), open: vi.fn(), back: vi.fn(), capture: vi.fn(), setNotice: vi.fn() },
    menu: { rows: [{ key: song.id, label: song.title, action }],
      focusedRow: { key: song.id, label: song.title, action },
      isTrackList: false, visibleIds: new Set([song.id]), visibleTracks: [song],
      accountAuthorized: false, feedback: vi.fn() },
    playback: { player, state: snapshot, current: song, playView: "art", ratings: {},
      setRating: vi.fn(() => true), toggleFavorite: vi.fn(), cyclePlayView: vi.fn(),
      scrollLyrics: vi.fn(), showVolume: vi.fn(), showTransportHint: vi.fn(), trackOptions: vi.fn() },
    library: { trackById: new Map([[song.id, song]]), musicTracks: [song], browseTracks: [song],
      albums: [{ id: "album" }], playTrack: vi.fn(), playAlbum: vi.fn(), playDefault: vi.fn() },
    photos: { activePhotos: [{ id: "first" }, { id: "last" }], photoIndex: 0,
      slideshow: false, setSlideshow: vi.fn() },
    text: { query: "", playlistName: "New", textEntry: { editing: false,
      rotate: vi.fn(), pick: vi.fn(() => null), setEditing: vi.fn() },
      setQuery: vi.fn(), setPlaylistName: vi.fn(), saveName: vi.fn(),
      reader: { current: { scroll: vi.fn(), edge: vi.fn(), retry: vi.fn(() => false) } } },
    settings: { prefs: { brightness: 0.5, volumeLimit: 1 }, setPreferences: vi.fn() },
  };
  return { context, player, snapshot, action, input: () => createClassicInputController(context) };
}

it("HOLD suppresses wheel and every command before activation or playback", () => {
  const f = fixture();
  f.context.device.held = true;
  const input = f.input();
  input.rotate(1);
  for (const value of ["menu", "home", "favorite", "options", "previous", "next", "play", "select",
    "seek-forward", "seek-backward", "sleep"] as const) input.command(value);
  expect(f.context.device.activate).not.toHaveBeenCalled();
  expect(f.player.getSnapshot).not.toHaveBeenCalled();
  expect(f.player.pause).not.toHaveBeenCalled();
  expect(f.context.navigation.dispatch).not.toHaveBeenCalled();
});

it("the first wheel or play event only wakes; the next play uses the live session", () => {
  for (const kind of ["rotate", "play"] as const) {
    const f = fixture();
    f.context.device.sleeping = true;
    if (kind === "rotate") f.input().rotate(1);
    else f.input().command("play");
    expect(f.context.device.setSleeping).toHaveBeenCalledWith(false);
    expect(f.player.toggle).not.toHaveBeenCalled();
    expect(f.player.setVolume).not.toHaveBeenCalled();
    f.context.device.sleeping = false;
    f.input().command("play");
    expect(f.player.toggle).toHaveBeenCalledOnce();
  }
});

it("photo paging, endpoint seeking and slideshow never invoke music transport", () => {
  const f = fixture("photo-grid");
  f.input().command("next");
  expect(f.context.navigation.dispatch).toHaveBeenLastCalledWith({ type: "select", key: "last" });
  f.input().command("seek-forward");
  expect(f.context.navigation.capture).toHaveBeenCalledWith("replace");
  expect(f.context.navigation.dispatch).toHaveBeenLastCalledWith({ type: "select", key: "last" });
  f.input().command("play");
  expect(f.context.navigation.open).toHaveBeenCalledWith("photo-full", "first", "group");
  expect(f.context.photos.setSlideshow).toHaveBeenLastCalledWith(true);
  expect(f.player.next).not.toHaveBeenCalled();
  expect(f.player.seek).not.toHaveBeenCalled();
  expect(f.player.toggle).not.toHaveBeenCalled();
});

it("reader retry and edges take precedence, while sleep still pauses playback", () => {
  const f = fixture("text-reader");
  const reader = f.context.text.reader.current!;
  vi.mocked(reader.retry).mockReturnValueOnce(true);
  f.input().command("select");
  expect(f.context.navigation.open).not.toHaveBeenCalled();
  f.input().command("options");
  expect(f.context.navigation.open).toHaveBeenCalledWith("text-options", "resume", "group");
  f.input().command("next");
  f.input().command("seek-backward");
  expect(reader.scroll).toHaveBeenCalledWith(1, true);
  expect(reader.edge).toHaveBeenCalledWith(false);
  expect(f.player.next).not.toHaveBeenCalled();
  expect(f.player.seek).not.toHaveBeenCalled();
  f.input().command("sleep");
  expect(f.player.pause).toHaveBeenCalledOnce();
  expect(f.context.device.setSleeping).toHaveBeenCalledWith(true);
});

it("text confirmation completes editing without activating the focused row; MENU only ends editing", () => {
  const f = fixture("search");
  f.context.text.textEntry.editing = true;
  f.context.menu.visibleTracks = [];
  f.input().rotate(2);
  expect(f.context.text.textEntry.rotate).toHaveBeenCalledWith(2);
  f.input().command("select");
  expect(f.context.navigation.dispatch).toHaveBeenCalledWith({ type: "select", key: "edit-search" });
  f.input().command("menu");
  expect(f.context.navigation.back).not.toHaveBeenCalled();
  expect(f.action).not.toHaveBeenCalled();
  f.context.navigation.page = "playlist-name";
  f.input().command("select");
  expect(f.context.text.saveName).toHaveBeenCalledOnce();
});

it("seek repeats read live position and lyrics/native-volume routes do not change volume", () => {
  const f = fixture();
  f.context.playback.playView = "seek";
  const input = f.input();
  input.rotate(2);
  expect(f.player.seek).toHaveBeenLastCalledWith(14);
  f.snapshot.position = 40;
  input.rotate(2);
  expect(f.player.seek).toHaveBeenLastCalledWith(44);
  f.context.playback.playView = "lyrics";
  f.input().rotate(-2);
  expect(f.context.playback.scrollLyrics).toHaveBeenCalledWith(-2);
  f.context.playback.playView = "art";
  f.snapshot.volumeControl = false;
  f.input().rotate(1);
  expect(f.player.setVolume).not.toHaveBeenCalled();
  expect(f.context.navigation.setNotice).toHaveBeenCalledWith("侧键调音量 · 中心键调进度");
});

it("authorized account refresh can retain focus during sync but cannot execute while disabled", () => {
  const f = fixture("music-account");
  const refresh = { key: "refresh", label: "Refresh", disabled: true, action: f.action };
  f.context.menu.rows = [refresh, { key: "logout", label: "Logout", action: vi.fn() }];
  f.context.menu.focusedRow = refresh;
  f.context.menu.accountAuthorized = true;
  f.input().rotate(1);
  expect(f.context.navigation.dispatch).toHaveBeenLastCalledWith({ type: "move", keys: ["refresh", "logout"], steps: 1 });
  f.input().command("select");
  expect(f.action).not.toHaveBeenCalled();
  f.context.menu.accountAuthorized = false;
  f.input().rotate(1);
  expect(f.context.navigation.dispatch).toHaveBeenLastCalledWith({ type: "move", keys: ["logout"], steps: 1 });
});

it("long Center only opens options for a visible song, and play toggles the current song", () => {
  const f = fixture("songs");
  f.context.menu.isTrackList = true;
  f.context.menu.focusedRow = { key: "import", label: "Import", action: f.action };
  f.input().command("options");
  expect(f.context.playback.trackOptions).not.toHaveBeenCalled();
  f.context.menu.focusedRow = f.context.menu.rows[0];
  f.input().command("options");
  expect(f.context.playback.trackOptions).toHaveBeenCalledWith(song.id);
  f.input().command("play");
  expect(f.player.toggle).toHaveBeenCalledOnce();
  expect(f.action).not.toHaveBeenCalled();
});

it("play from add-to-playlist uses the existing track order instead of changing membership", () => {
  const f = fixture("playlist-add-tracks");
  f.snapshot.tracks = [{ ...song, id: "second" }, song];
  f.input().command("play");
  expect(f.context.library.playTrack).toHaveBeenCalledWith(song.id, ["second", song.id]);
  expect(f.action).not.toHaveBeenCalled();
  expect(f.context.library.playDefault).not.toHaveBeenCalled();
});

it("only an empty live session delegates default playback to the application", () => {
  const f = fixture("home");
  f.snapshot.currentId = null;
  f.input().command("play");
  expect(f.context.library.playDefault).toHaveBeenCalledOnce();
  expect(f.player.toggle).not.toHaveBeenCalled();
  f.snapshot.currentId = song.id;
  f.input().command("play");
  expect(f.context.library.playDefault).toHaveBeenCalledOnce();
  expect(f.player.toggle).toHaveBeenCalledOnce();
});
