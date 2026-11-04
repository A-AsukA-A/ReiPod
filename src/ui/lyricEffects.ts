import type { LyricWord } from "../player/Player";
import { lyricMotion } from "./motion";

const unit = (value: number) => Math.max(0, Math.min(1, value));
const letterCounts = new WeakMap<LyricWord, number>();
const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
export const lyricGlyphs = (text: string) => [...segmenter.segment(text)].map(item => item.segment);

/** Generic cubic easing evaluated by Newton iteration, independent of reference renderers. */
function curve(progress: number, x1: number, y1: number, x2: number, y2: number) {
  const x = unit(progress);
  const coordinate = (t: number, a: number, b: number) => ((1 - 3 * b + 3 * a) * t + 3 * b - 6 * a) * t * t + 3 * a * t;
  let t = x;
  for (let i = 0; i < 7; i++) {
    const slope = 3 * (1 - 3 * x2 + 3 * x1) * t * t + 2 * (3 * x2 - 6 * x1) * t + 3 * x1;
    if (Math.abs(slope) < 0.00001) break;
    t = unit(t - (coordinate(t, x1, x2) - x) / slope);
  }
  return coordinate(t, y1, y2);
}

/** Duration-shaped keyframes: a sustained syllable emphasizes each grapheme in sequence.
 * Reference curves/observable parameters: Lazer 87880db; no renderer or solver port. */
export function lyricGlyphPose(word: LyricWord, time: number, index: number, count: number, last: boolean) {
  const age = time - word.time;
  const duration = Math.max(1, word.duration);
  const ordinaryLift = -lyricMotion.wordLift * curve(age / duration, 0, 0, 0.58, 1);
  let letters = letterCounts.get(word);
  if (letters === undefined) { letters = lyricGlyphs(word.text.trim()).length; letterCounts.set(word, letters); }
  const emphasized = word.duration >= 1 && (/\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Hangul}/u.test(word.text) || letters > 1 && letters <= 7);
  if (!emphasized) return { x: 0, y: ordinaryLift, scale: 1, glow: 0, radius: 0 };
  const tail = last ? 1.2 : 1;
  const phase = (age / (duration * tail)) - index / Math.max(1, count) * 0.4;
  const pulse = phase < 0.5
    ? curve(phase * 2, 0.2, 0.4, 0.58, 1)
    : 1 - curve((phase - 0.5) * 2, 0.3, 0, 0.58, 1);
  const shape = (ratio: number) => ratio <= 1 ? ratio ** 3 : Math.sqrt(ratio);
  const amplitude = Math.min(1.2, shape(duration / 2) * 0.6 * (last ? 1.6 : 1));
  const glow = Math.min(0.8, shape(duration / 3) * 0.5 * (last ? 1.5 : 1));
  return {
    x: (index - count / 2) * 0.03 * amplitude * pulse,
    y: -0.025 * amplitude * pulse - lyricMotion.wordLift * Math.sin(Math.PI * unit((phase + 0.4 / (duration * tail)) / 1.4)),
    scale: 1 + 0.1 * amplitude * pulse,
    glow: glow * pulse,
    radius: Math.min(0.3, glow * 0.3),
  };
}

/** Numerical integration of the damped oscillator, retaining velocity on retarget.
 * Bounded substeps keep a delayed browser frame from injecting energy. */
export function advanceLyricSpring(position: number, velocity: number, target: number,
  elapsed: number, stiffness: number = lyricMotion.lineStiffness, damping: number = lyricMotion.lineDamping, mass: number = lyricMotion.lineMass) {
  const time = Math.min(1 / 30, Math.max(0, elapsed));
  const steps = Math.max(1, Math.ceil(time * 240));
  const dt = time / steps;
  for (let i = 0; i < steps; i++) {
    velocity += (stiffness * (target - position) - damping * velocity) / mass * dt;
    position += velocity * dt;
  }
  if (Math.abs(target - position) < 0.01 && Math.abs(velocity) < 0.01) return { position: target, velocity: 0 };
  return { position, velocity };
}
