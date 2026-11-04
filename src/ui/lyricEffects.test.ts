import { expect, it } from "vitest";
import { advanceLyricSpring, lyricGlyphPose, lyricGlyphs } from "./lyricEffects";

it("splits grapheme clusters without tearing a joined emoji or combining accent", () => {
  expect(lyricGlyphs("海👩‍🎤e\u0301🌙")).toEqual(["海", "👩‍🎤", "e\u0301", "🌙"]);
});

it("ordinary syllables rise and remain floated while long syllables emphasize each glyph in sequence", () => {
  const word = { time: 1, duration: .2, text: "字" };
  expect(lyricGlyphPose(word, 0, 0, 1, false)).toMatchObject({ x: 0, scale: 1, glow: 0 });
  expect(lyricGlyphPose(word, 0, 0, 1, false).y).toBeCloseTo(0);
  const lift = lyricGlyphPose(word, 1.6, 0, 1, false).y;
  expect(lift).toBeLessThan(0);
  expect(lyricGlyphPose(word, 2, 0, 1, false).y).toBeLessThan(lift);
  const held = { ...word, duration: 2, text: "旋律" };
  const first = lyricGlyphPose(held, 1.7, 0, 2, false), second = lyricGlyphPose(held, 1.7, 1, 2, false);
  expect(first.scale).toBeGreaterThan(second.scale);
  expect(first.glow).toBeGreaterThan(0);
  expect(lyricGlyphPose(held, 6, 0, 2, false)).toMatchObject({ scale: 1, glow: 0 });
});

it("a final sustained word has a stronger, longer tail without emphasizing a long English token", () => {
  const word = { time: 1, duration: 2, text: "旋律" };
  expect(lyricGlyphPose(word, 2, 0, 2, true).scale).toBeGreaterThan(lyricGlyphPose(word, 2, 0, 2, false).scale);
  expect(lyricGlyphPose({ ...word, text: "LongEnglishWord" }, 2, 0, 15, true).scale).toBe(1);
});

it("a line spring retains velocity on a reversal and settles after bounded delayed frames", () => {
  let state = { position: 100, velocity: 0 };
  for (let i = 0; i < 10; i++) state = advanceLyricSpring(state.position, state.velocity, 0, 1 / 60);
  expect(state.velocity).toBeLessThan(0);
  const reversed = advanceLyricSpring(state.position, state.velocity, 150, 1 / 240);
  expect(Math.abs(reversed.position - state.position)).toBeLessThan(Math.abs(state.velocity) / 120);
  expect(reversed.velocity).toBeLessThan(0); // Momentum is not discarded at a new target.
  state = reversed;
  for (let i = 0; i < 400; i++) state = advanceLyricSpring(state.position, state.velocity, 150, i === 1 ? 5 : 1 / 60);
  expect(state).toEqual({ position: 150, velocity: 0 });
});
