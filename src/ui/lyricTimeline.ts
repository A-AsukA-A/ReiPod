import type { LyricLine, LyricWord } from "../player/Player";

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
