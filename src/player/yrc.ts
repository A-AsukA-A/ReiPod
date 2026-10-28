import type { LyricLine } from "./Player";

// Adapted from Lazer lib/lyrics/lyric_document.dart, revision 87880db.
// Copyright (c) 2026 chuxuehaocai, MIT. See public/third-party-licenses.txt.
// YRC word timestamps are absolute song positions, in milliseconds.
export function parseYrc(source: string): LyricLine[] {
  const result: LyricLine[] = [];
  for (const raw of source.split(/[\r\n]+/)) {
    const line = raw.trim().match(/^\[(-?\d+)[,，](-?\d+)\](.*)$/);
    if (!line) continue;
    const time = Number(line[1]) / 1000;
    const duration = Number(line[2]) / 1000;
    if (
      !Number.isFinite(time) ||
      time < 0 ||
      !Number.isFinite(duration) ||
      duration <= 0
    )
      continue;
    const words = [
      ...line[3].matchAll(
        /\((\d+)[,，](\d+)[,，](\d+)\)(.*?)(?=\(\d+[,，]\d+[,，]\d+\)|$)/g,
      ),
    ]
      .filter((word) => word[4].length > 0)
      .map((word) => ({
        time: Number(word[1]) / 1000,
        duration: Math.max(1, Number(word[2])) / 1000,
        text: word[4],
      }));
    if (
      !words.length ||
      words.some(
        (word) =>
          !Number.isFinite(word.time) ||
          !Number.isFinite(word.duration) ||
          word.time < time ||
          word.time >= time + duration,
      )
    )
      continue;
    if (words.some((word, i) => i > 0 && word.time < words[i - 1].time))
      continue;
    result.push({
      time,
      end: time + duration,
      text: words.map((word) => word.text).join(""),
      words,
    });
  }
  return result.sort((a, b) => a.time - b.time);
}
