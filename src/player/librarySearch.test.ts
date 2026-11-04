import { expect, it } from "vitest";
import type { Track } from "./Player";
import { searchLibrary } from "./librarySearch";

const song: Track = { id: "song", title: "My Abacus", artist: "Alpha", album: "Dawn", filename: "private-filename.mp3", url: "blob:song", size: 1, lyrics: [{ time: 0, text: "secret lyrics" }] };
const tracks = [song, { ...song, id: "second", title: "B side", artist: "Beta" }];
const playlists = [{ id: "list", name: "Dawn Walk", trackIds: [song.id] }];
const podcasts = [{ ...song, id: "podcast", title: "Morning Audio", album: "Talk" }];

it("matches live contiguous name fragments case-insensitively, without searching filenames or lyrics", () => {
  expect(searchLibrary(tracks, [], [], "")).toEqual([]);
  expect(searchLibrary(tracks, [], [], "  ")).toEqual([]);
  expect(searchLibrary(tracks, [], [], "ＡＢ").map(r => r.key)).toEqual([song.id]);
  expect(searchLibrary(tracks, [], [], "my cus")).toEqual([]);
  expect(searchLibrary(tracks, [], [], "private-filename")).toEqual([]);
  expect(searchLibrary(tracks, [], [], "secret lyrics")).toEqual([]);
  expect(searchLibrary(tracks, [], [], "alpha").map(r => r.kind)).toEqual(["artist"]);
});

it("indexes collection names, keeps same-titled albums distinct and includes audio podcasts", () => {
  const results = searchLibrary(tracks, playlists, podcasts, "dawn");
  expect(results.map(r => r.kind)).toEqual(["album", "album", "playlist"]);
  expect(new Set(results.map(r => r.key)).size).toBe(3);
  expect(results.slice(0, 2).map(r => JSON.parse(r.target!))).toEqual([["Alpha", "Dawn"], ["Beta", "Dawn"]]);
  expect(searchLibrary(tracks, playlists, podcasts, "audio")).toMatchObject([{ kind: "podcast", track: { id: "podcast" } }]);
  expect(searchLibrary([], [], [], "dawn")).toEqual([]);
});

it("retains Unicode names and leaves the supplied library and playlist snapshots untouched", () => {
  const local = Object.freeze([Object.freeze({ ...song, title: "听海🙂", artist: "歌手" })]);
  expect(searchLibrary(local, Object.freeze(playlists), [], "🙂").map(r => r.title)).toEqual(["听海🙂"]);
  expect(searchLibrary(local, [], [], "歌手").map(r => r.kind)).toEqual(["artist"]);
});
