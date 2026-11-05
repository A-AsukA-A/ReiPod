import { describe, expect, it } from "vitest";
import { shuffleAfterCurrent, shuffleAlbums } from "./ordering";
import type { Track } from "./Player";

describe("shuffle queue", () => {
  it("keeps played history and current song, shuffling the remainder exactly once", () => {
    const ids = ["a", "b", "c", "d", "e"];
    const result = shuffleAfterCurrent(ids, "b", () => 0);
    expect(result.slice(0, 2)).toEqual(["a", "b"]);
    expect(new Set(result)).toEqual(new Set(ids));
    expect(result.slice(2)).not.toEqual(ids.slice(2));
    expect(ids).toEqual(["a", "b", "c", "d", "e"]);
  });
});

const tracks: Track[] = [
  ["a2", "A", 2, 1], ["b2", "B", 2, 1], ["a3", "A", 1, 2],
  ["c1", "C", 1, 1], ["b1", "B", 1, 1], ["a1", "A", 1, 1],
].map(([id, album, number, disc]) => ({ id: String(id), title: String(id), album: String(album),
  artist: "Artist", trackNumber: Number(number), discNumber: Number(disc), filename: "", size: 1, url: `blob:${id}` }));
it("album shuffle permutes blocks while sorting discs/tracks and never adding outside songs", () => {
  const queue = shuffleAlbums(tracks.map(track => track.id), tracks, null, false, () => 0);
  expect(queue).toEqual(["b1", "b2", "c1", "a1", "a2", "a3"]);
  expect(shuffleAlbums(["a3", "a2"], tracks, "a2", false, () => 0)).toEqual(["a2", "a3"]);
  expect(tracks[0].id).toBe("a2");
});
it("switching during playback leaves history/current intact and finishes that album first", () => {
  expect(shuffleAlbums(["c1", "a1", "b2", "a3", "b1", "a2"], tracks, "a1", true, () => 0))
    .toEqual(["c1", "a1", "a2", "a3", "b1", "b2"]);
});
it("same album titles by different album artists and untagged songs remain independent", () => {
  const input = [
    { ...tracks[0], id: "one", album: "Shared", albumArtist: "One" },
    { ...tracks[0], id: "two", album: "Shared", albumArtist: "Two" },
    { ...tracks[0], id: "three", album: undefined },
    { ...tracks[0], id: "four", album: undefined },
  ];
  expect(shuffleAlbums(input.map(track => track.id), input, null, false, () => 0)).toEqual(["two", "three", "four", "one"]);
});
