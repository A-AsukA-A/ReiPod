import type { Track } from "../player/Player";

export type PlayView = "art" | "seek" | "shuffle" | "rating" | "lyrics";

/** Classic skips information that the current song cannot supply. */
export function canShowLyrics(track: Track | undefined, enabled: boolean) {
  return !!(
    enabled &&
    track &&
    (track.lyrics?.length ||
      ((track.kind === "netease" || track.kind === "qq") &&
        track.lyricsStatus !== "empty"))
  );
}

/** Apple classic's order, omitting Genius until there is an actual Genius source. */
export function playingViews(
  track: Track | undefined,
  lyricsEnabled: boolean,
): PlayView[] {
  return [
    "art",
    "seek",
    "shuffle",
    "rating",
    ...(canShowLyrics(track, lyricsEnabled) ? ["lyrics" as const] : []),
  ];
}

/** Editing a control is temporary; choosing the lyrics reader is a lasting view choice. */
export const restingPlayView = (view: PlayView): PlayView =>
  view === "lyrics" ? "lyrics" : "art";
