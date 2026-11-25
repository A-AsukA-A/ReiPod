import { parseYrc } from "./yrc";
import type { Track } from "./Player";
import { albumIdentity } from "./albumIdentity";

export type Album = {
  id: string;
  title: string;
  artist: string;
  sortTitle?: string;
  sortArtist?: string;
  artwork?: string;
  tracks: Track[];
};
export type MusicCategory = { kind: "genre" | "composer" | "compilation"; value: string };
const collator = new Intl.Collator("zh-CN", {
  numeric: true,
  sensitivity: "base",
});
export const trackSortTitle = (track: Track) => track.sortTitle?.trim() || track.title;
const firstSort = (values: (string | undefined)[]) => values.map(value => value?.trim()).filter((value): value is string => !!value).sort(collator.compare)[0];
export function artistSortLabels(tracks: Track[]) {
  const labels = new Map<string, string>();
  for (const track of tracks) {
    const artist = track.artist?.trim() || "未知艺人", sort = track.sortArtist?.trim();
    if (sort && (!labels.has(artist) || collator.compare(sort, labels.get(artist)!) < 0)) labels.set(artist, sort);
  }
  return labels;
}
export function albumsFor(tracks: Track[]): Album[] {
  const albums = new Map<string, Album>();
  for (const track of tracks) {
    const { id, title, artist } = albumIdentity(track);
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
      sortTitle: firstSort(album.tracks.map(track => track.sortAlbum)) || album.title,
      sortArtist: firstSort(album.tracks.map(track => track.sortAlbumArtist ||
        (track.artist?.trim() === album.artist ? track.sortArtist : undefined))) || album.artist,
      tracks: [...album.tracks].sort(
        (a, b) =>
          (a.discNumber ?? 1) - (b.discNumber ?? 1) ||
          (a.trackNumber ?? 999) - (b.trackNumber ?? 999) ||
          collator.compare(trackSortTitle(a), trackSortTitle(b)) || collator.compare(a.title, b.title),
      ),
    }))
    .sort(
      (a, b) =>
        collator.compare(a.sortTitle ?? a.title, b.sortTitle ?? b.title) || collator.compare(a.title, b.title) ||
        collator.compare(a.artist, b.artist),
    );
}
export function artistsFor(tracks: Track[], groupCompilations = false) {
  const names = [
    ...new Set(tracks.map((track) => track.artist?.trim() || "未知艺人")),
  ];
  const keys = artistSortLabels(tracks);
  const groups = new Map<string, { compilation: boolean; albums: Set<string> }>();
  if (groupCompilations) for (const track of tracks) {
    const name = track.artist?.trim() || "未知艺人";
    const group = groups.get(name) ?? { compilation: true, albums: new Set<string>() };
    group.compilation &&= track.compilation === true;
    group.albums.add(albumIdentity(track).id); groups.set(name, group);
  }
  return names.filter(name => {
    if (!groupCompilations) return true;
    const group = groups.get(name)!;
    return !group.compilation || group.albums.size !== 1;
  }).sort((a, b) => collator.compare(keys.get(a) || a, keys.get(b) || b) || collator.compare(a, b));
}

/** The stock Artists browser uses track artist; Album Artists is a separate feature. */
export function tracksForArtist(tracks: Track[], artist: string) {
  return tracks.filter(
    (track) => (track.artist?.trim() || "未知艺人") === artist,
  );
}

export function trackCategories(track: Track, kind: "genre" | "composer") {
  const values = (kind === "genre" ? track.genres : track.composers)
    ?.map(value => value.trim()).filter(Boolean);
  return values?.length ? [...new Set(values)] : [kind === "genre" ? "未知风格" : "未知作曲者"];
}

export function categoriesFor(tracks: Track[], kind: "genre" | "composer") {
  const groups = new Map<string, Track[]>();
  for (const track of tracks) for (const name of trackCategories(track, kind)) {
    const collection = groups.get(name) ?? [];
    collection.push(track);
    groups.set(name, collection);
  }
  const keys = new Map([...groups].map(([name, collection]) => [name, kind === "composer"
    ? firstSort(collection.filter(track => track.composers?.length === 1).map(track => track.sortComposer)) || name : name]));
  return [...groups.keys()].sort((a, b) => {
    const left = keys.get(a)!, right = keys.get(b)!;
    return left < right ? -1 : left > right ? 1 : a < b ? -1 : a > b ? 1 : 0;
  })
    .map(name => ({ name, sortLabel: keys.get(name)!, tracks: groups.get(name)! }));
}

export function tracksForCategory(tracks: Track[], category?: MusicCategory) {
  if (!category) return tracks;
  const { kind, value } = category;
  if (kind === "compilation") return tracks.filter(track => track.compilation === true);
  return tracks.filter(track => trackCategories(track, kind).includes(value));
}

export function songsByTitle(tracks: Track[]) {
  return [...tracks].sort(
    (a, b) =>
      collator.compare(trackSortTitle(a), trackSortTitle(b)) || collator.compare(a.title, b.title) ||
      collator.compare(a.artist ?? "", b.artist ?? ""),
  );
}

/** Apple User Guide p26: Cover Flow sorts by artist; Albums sorts by title. */
export function coverFlowOrder(albums: Album[]) {
  return [...albums].sort(
    (a, b) =>
      collator.compare(a.sortArtist ?? a.artist, b.sortArtist ?? b.artist) ||
      collator.compare(a.sortTitle ?? a.title, b.sortTitle ?? b.title) || collator.compare(a.title, b.title),
  );
}

export function parseLyrics(text: string, yrc = ""): NonNullable<Track["lyrics"]> {
  const words = parseYrc(yrc || text);
  if (words.length) return words;
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
