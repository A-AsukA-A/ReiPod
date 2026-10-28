import { expect, test } from "vitest";
import { activeLyric, wordProgress, wordEmphasis } from "./lyricTimeline";

test("timeline clears YRC gaps and handles reverse seeks without carrying an old word", () => {
  const lines = [
    { time: 1, end: 2, text: "A" },
    { time: 4, end: 5, text: "B" },
  ];
  expect(
    [0, 1, 1.9, 2, 3.9, 4, 5, 1].map((t) => activeLyric(lines, t)),
  ).toEqual([-1, 0, 0, -1, -1, 1, -1, 0]);
  expect(activeLyric([{ time: 1, text: "LRC" }], 99)).toBe(0);
});
test("word masks use the audio position and emphasis resets outside long syllables", () => {
  const word = { time: 1, duration: 2, text: "长" };
  expect([0, 1, 2, 3, 4].map((t) => wordProgress(word, t))).toEqual([
    0, 0, 0.5, 1, 1,
  ]);
  expect(wordEmphasis(word, 1.3)).toBeGreaterThan(0);
  expect(wordEmphasis(word, 3)).toBe(0);
  expect(wordEmphasis({ ...word, duration: 0.1 }, 1.05)).toBe(0);
});
