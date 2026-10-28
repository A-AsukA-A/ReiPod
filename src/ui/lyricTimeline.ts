import type { LyricLine, LyricWord } from "../player/Player";
import { lyricMotion } from "./motion";

export function activeLyric(lines: LyricLine[], position: number) {
  let low = 0,
    high = lines.length - 1,
    active = -1;
  while (low <= high) {
    const middle = (low + high) >>> 1;
    if (lines[middle].time <= position) {
      active = middle;
      low = middle + 1;
    } else high = middle - 1;
  }
  const line = lines[active];
  return !line ||
    line.time < 0 ||
    (line.end !== undefined && position >= line.end)
    ? -1
    : active;
}
export function wordProgress(word: LyricWord, position: number) {
  return Math.max(0, Math.min(1, (position - word.time) / word.duration));
}

// Independently implemented damped step response: m*x'' + c*x' + k*x = k.
// These are ReiPod motion choices, not Lazer/AMLL animation code or firmware values.
export function wordEmphasis(word: LyricWord, position: number) {
  const elapsed = position - word.time;
  if (elapsed <= 0 || elapsed >= word.duration || word.duration < 1) return 0;
  const { mass, stiffness, damping, settle } = lyricMotion;
  const decay = damping / (2 * mass);
  const frequency = Math.sqrt(stiffness / mass - decay * decay);
  const t = Math.min(elapsed, settle);
  const spring =
    1 -
    Math.exp(-decay * t) *
      (Math.cos(frequency * t) + (decay / frequency) * Math.sin(frequency * t));
  const release = Math.min(1, (word.duration - elapsed) / settle);
  return spring * release;
}
