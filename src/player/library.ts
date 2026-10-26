import type { Track } from "./Player";

export type Album = {
  id: string;
  title: string;
  artist: string;
  artwork?: string;
  tracks: Track[];
};
const collator = new Intl.Collator("zh-CN", {
  numeric: true,
  sensitivity: "base",
});
export function albumsFor(tracks: Track[]): Album[] {
  const albums = new Map<string, Album>();
  for (const track of tracks) {
    const title = track.album?.trim() || "未知专辑";
    const artist =
      track.albumArtist?.trim() || track.artist?.trim() || "未知艺人";
    const id = JSON.stringify([artist, title]);
    const album = albums.get(id) ?? {
      id,
      title,
      artist,
      artwork: track.artwork,
      tracks: [],
    };
    album.tracks.push(track);
    album.artwork ??= track.artwork;
    albums.set(id, album);
  }
  return [...albums.values()]
    .map((album) => ({
      ...album,
      tracks: [...album.tracks].sort(
        (a, b) =>
          (a.trackNumber ?? 999) - (b.trackNumber ?? 999) ||
          collator.compare(a.title, b.title),
      ),
    }))
    .sort(
      (a, b) =>
        collator.compare(a.title, b.title) ||
        collator.compare(a.artist, b.artist),
    );
}
export function artistsFor(tracks: Track[]) {
  return [
    ...new Set(tracks.map((track) => track.artist?.trim() || "未知艺人")),
  ].sort(collator.compare);
}

export function parseLyrics(text: string): NonNullable<Track["lyrics"]> {
  const result: NonNullable<Track["lyrics"]> = [];
  const offset = Number(text.match(/\[offset:([+-]?\d+)\]/i)?.[1] ?? 0) / 1000;
  for (const line of text.split(/\r?\n/)) {
    const times = [
      ...line.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g),
    ];
    const content = line.replace(/\[[^\]]+\]/g, "").trim();
    if (!content) continue;
    if (times.length)
      for (const match of times)
        result.push({
          time: Math.max(
            0,
            Number(match[1]) * 60 +
              Number(match[2]) +
              Number(`0.${match[3] ?? 0}`) +
              offset,
          ),
          text: content,
        });
    else if (!/^\s*\[\w+:/.test(line)) result.push({ time: -1, text: content });
  }
  return result.some((line) => line.time >= 0)
    ? result.filter((line) => line.time >= 0).sort((a, b) => a.time - b.time)
    : result;
}
