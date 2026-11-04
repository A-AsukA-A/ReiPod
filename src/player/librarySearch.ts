import type { Track } from "./Player";
import { albumsFor, artistsFor } from "./library";

export type LibrarySearchResult = {
  kind: "song" | "artist" | "album" | "playlist" | "podcast";
  key: string;
  title: string;
  detail?: string;
  artwork?: string;
  track?: Track;
  target?: string;
};
type SearchPlaylist = { id: string; name: string; trackIds: readonly string[] };
const normalize = (text: string) => text.normalize("NFKC").toLocaleLowerCase();
const order = new Intl.Collator("zh-CN", { numeric: true, sensitivity: "base" });

/** Search item names, not a cross-field filename/lyrics blob. Empty input has no results.
 * Apple classic Features Guide (72-page edition), pp7–8; ordering remains a ReiPod fit. */
export function searchLibrary(tracks: readonly Track[], playlists: readonly SearchPlaylist[],
  podcasts: readonly Track[], query: string): LibrarySearchResult[] {
  const term = normalize(query.trim());
  if (!term) return [];
  const matches = (name: string) => normalize(name).includes(term);
  const results: LibrarySearchResult[] = [];
  for (const track of tracks) if (matches(track.title)) results.push({
    kind: "song", key: track.id, title: track.title,
    detail: track.artist || track.album, track,
  });
  for (const artist of artistsFor([...tracks])) if (matches(artist)) results.push({
    kind: "artist", key: `search:artist:${artist}`, title: artist, detail: "艺人", target: artist,
  });
  for (const album of albumsFor([...tracks])) if (matches(album.title)) results.push({
    kind: "album", key: `search:album:${album.id}`, title: album.title,
    detail: album.artist, artwork: album.artwork, target: album.id,
  });
  for (const playlist of playlists) if (matches(playlist.name)) results.push({
    kind: "playlist", key: `search:playlist:${playlist.id}`, title: playlist.name,
    detail: "播放列表", target: playlist.id,
  });
  for (const track of podcasts) if (matches(track.title)) results.push({
    kind: "podcast", key: track.id, title: track.title,
    detail: track.album || track.artist || "播客", track,
  });
  return results.sort((a,b) => order.compare(a.title,b.title) ||
    Number(!a.track) - Number(!b.track) || order.compare(a.key,b.key));
}
