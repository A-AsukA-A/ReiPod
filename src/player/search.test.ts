import { expect, it } from "vitest";
import { searchTracks } from "./search";
import type { Track } from "./Player";
const tracks: Track[] = [
  {
    id: "a",
    title: "Ｍｏｏｎ",
    artist: "李健",
    album: "夜航",
    filename: "01.flac",
    url: "",
    size: 1,
  },
  {
    id: "b",
    title: "Sun",
    artist: "Kevin",
    album: "Morning",
    filename: "demo.mp3",
    url: "",
    size: 1,
  },
];
it("matches normalized multi-field queries and requires every word", () => {
  expect(searchTracks(tracks, " moon 李健 ").map((t) => t.id)).toEqual(["a"]);
  expect(searchTracks(tracks, "KEVIN morning").map((t) => t.id)).toEqual(["b"]);
  expect(searchTracks(tracks, "01.flac")).toEqual([tracks[0]]);
  expect(searchTracks(tracks, "moon Kevin")).toEqual([]);
  expect(searchTracks(tracks, "  ")).toEqual(tracks);
});
