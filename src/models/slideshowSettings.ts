/** Classic photo slideshow settings (Apple guide: Time Per Slide, Repeat, Shuffle Photos, Transitions). */
export const slideshowDurations = [2, 3, 5, 10, 20, 0] as const;
export type SlideshowDuration = (typeof slideshowDurations)[number];

export const slideshowTransitions = ["off", "fade", "wipe"] as const;
export type SlideshowTransition = (typeof slideshowTransitions)[number];

export type SlideshowMusic = "keep" | "off" | { playlistId: string; playlistName: string };

export type SlideshowSettings = {
  timePerSlide: SlideshowDuration;
  music: SlideshowMusic;
  repeat: boolean;
  shuffle: boolean;
  transition: SlideshowTransition;
};

export const defaultSlideshowSettings: SlideshowSettings = {
  timePerSlide: 3,
  music: "keep",
  repeat: true,
  shuffle: false,
  transition: "fade",
};

function parseSlideshowMusic(value: unknown): SlideshowMusic {
  if (value === "keep" || value === "off") return value;
  if (
    value &&
    typeof value === "object" &&
    typeof (value as { playlistId?: unknown }).playlistId === "string" &&
    typeof (value as { playlistName?: unknown }).playlistName === "string"
  ) {
    const playlistId = (value as { playlistId: string }).playlistId.trim();
    const playlistName = (value as { playlistName: string }).playlistName.trim();
    if (
      playlistId.length > 0 &&
      playlistId.length <= 80 &&
      playlistName.length > 0 &&
      playlistName.length <= 60
    ) {
      return { playlistId, playlistName };
    }
  }
  return defaultSlideshowSettings.music;
}

export function parseSlideshowSettings(value: unknown): SlideshowSettings {
  const saved =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  return {
    timePerSlide: slideshowDurations.includes(saved.timePerSlide as SlideshowDuration)
      ? (saved.timePerSlide as SlideshowDuration)
      : defaultSlideshowSettings.timePerSlide,
    music: parseSlideshowMusic(saved.music),
    repeat:
      typeof saved.repeat === "boolean"
        ? saved.repeat
        : defaultSlideshowSettings.repeat,
    shuffle:
      typeof saved.shuffle === "boolean"
        ? saved.shuffle
        : defaultSlideshowSettings.shuffle,
    transition: slideshowTransitions.includes(saved.transition as SlideshowTransition)
      ? (saved.transition as SlideshowTransition)
      : defaultSlideshowSettings.transition,
  };
}

export function slideshowMusicLabel(
  music: SlideshowMusic,
  playlists: readonly { id: string; name: string }[] = [],
): string {
  if (music === "keep") return "保持当前";
  if (music === "off") return "关闭";
  return playlists.find((item) => item.id === music.playlistId)?.name ?? music.playlistName;
}

export function slideshowDurationLabel(seconds: SlideshowDuration): string {
  return seconds === 0 ? "手动" : `${seconds} 秒`;
}

export function slideshowTransitionLabel(transition: SlideshowTransition): string {
  return transition === "off"
    ? "关闭"
    : transition === "fade"
      ? "淡入淡出"
      : "划像";
}

export function buildSlideshowOrder(
  total: number,
  startIndex: number,
  shuffle: boolean,
  random: () => number = Math.random,
): number[] {
  if (total <= 0) return [];
  const start = Math.max(0, Math.min(total - 1, Math.floor(startIndex)));
  if (!shuffle) {
    return Array.from({ length: total }, (_, offset) => (start + offset) % total);
  }
  const rest: number[] = [];
  for (let i = 0; i < total; i++) {
    if (i !== start) rest.push(i);
  }
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [start, ...rest];
}

export function nextSlideshowStep(
  order: readonly number[],
  step: number,
  repeat: boolean,
): { nextStep: number; nextIndex: number } | null {
  if (order.length < 2) return null;
  const candidate = step + 1;
  if (candidate < order.length) {
    return { nextStep: candidate, nextIndex: order[candidate] };
  }
  if (repeat) {
    return { nextStep: 0, nextIndex: order[0] };
  }
  return null;
}
