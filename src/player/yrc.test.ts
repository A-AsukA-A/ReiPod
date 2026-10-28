import { expect, test } from "vitest";
import { parseLyrics } from "./library";
import { parseYrc } from "./yrc";

test("YRC uses absolute milliseconds, full-width separators and preserves word spaces", () => {
  expect(
    parseYrc("[1000，2400](1000，1200，0)走(2200,1200,0) here 🌙"),
  ).toEqual([
    {
      time: 1,
      end: 3.4,
      text: "走 here 🌙",
      words: [
        { time: 1, duration: 1.2, text: "走" },
        { time: 2.2, duration: 1.2, text: " here 🌙" },
      ],
    },
  ]);
});
test("YRC is preferred while malformed/absent YRC preserves LRC and plain text", () => {
  expect(
    parseLyrics("[00:01]fallback", "[1000,500](1000,500,0)Word")[0].words?.[0]
      .text,
  ).toBe("Word");
  expect(parseLyrics("[00:01]fallback", "[1000,-3](1000,50,0)bad")).toEqual([
    { time: 1, text: "fallback" },
  ]);
  expect(parseLyrics("Plain\n歌词")).toEqual([
    { time: -1, text: "Plain" },
    { time: -1, text: "歌词" },
  ]);
});
test("invalid timing is rejected, zero-length tokens are safe and rows are sorted", () => {
  expect(
    parseYrc(
      "[1000,100](900,10,0)bad\n[2000,100](2000,0,0)零\n[0,100](0,100,0)始",
    ).map((l) => [l.time, l.words?.[0].duration]),
  ).toEqual([
    [0, 0.1],
    [2, 0.001],
  ]);
  expect(parseYrc("[0,1000](500,100,0)后(200,100,0)前")).toEqual([]);
});
