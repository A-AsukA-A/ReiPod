import { expect, it } from "vitest";
import type { Track } from "../player/Player";
import { canShowLyrics, playingViews, restingPlayView } from "./nowPlaying";
const track: Track = {
  id: "song",
  title: "Song",
  filename: "song.mp3",
  size: 1,
  url: "blob:song",
  kind: "local",
};
it("cycles classic controls in the documented order and leaves repeat in Settings", () => {
  expect(
    playingViews({ ...track, lyrics: [{ time: 0, text: "Words" }] }, true),
  ).toEqual(["art", "seek", "shuffle", "rating", "lyrics"]);
  expect(playingViews(track, true)).toEqual([
    "art",
    "seek",
    "shuffle",
    "rating",
  ]);
});
it("only offers lyrics when supplied locally or obtainable online, and respects the switch", () => {
  expect(canShowLyrics({ ...track, kind: "netease" }, true)).toBe(true);
  expect(
    canShowLyrics({ ...track, kind: "qq", lyricsStatus: "empty" }, true),
  ).toBe(false);
  expect(
    canShowLyrics({ ...track, kind: "qq", lyricsStatus: "error" }, true),
  ).toBe(true);
  expect(canShowLyrics({ ...track, kind: "apple-music" }, true)).toBe(false);
  expect(canShowLyrics({ ...track, kind: "netease" }, false)).toBe(false);
});
it("keeps the reader but resets temporary controls when leaving playback or changing songs", () => {
  expect(restingPlayView("lyrics")).toBe("lyrics");
  for (const view of ["seek", "shuffle", "rating", "art"] as const)
    expect(restingPlayView(view)).toBe("art");
});
