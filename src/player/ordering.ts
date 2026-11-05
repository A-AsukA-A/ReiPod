export function shuffled(ids: string[], random = Math.random) {
  const result = [...ids];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(random() * (i + 1)));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function shuffleAfterCurrent(
  ids: string[],
  currentId: string | null,
  random = Math.random,
) {
  const index = currentId ? ids.indexOf(currentId) : -1;
  return [
    ...ids.slice(0, index + 1),
    ...shuffled(ids.slice(index + 1), random),
  ];
}
import type { Track } from "./Player";

export type ShuffleMode = "off" | "songs" | "albums";
export const shuffleModeOf = (state: { shuffle: boolean; shuffleMode?: ShuffleMode }): ShuffleMode =>
  state.shuffleMode ?? (state.shuffle ? "songs" : "off");


/** Randomize album blocks only, never fetch tracks outside the supplied queue. */
export function shuffleAlbums(ids: string[], tracks: Track[], currentId: string | null,
  preserveHistory = false, random = Math.random) {
  const byId = new Map(tracks.map(track => [track.id, track]));
  const albumKey = (id: string) => {
    const track = byId.get(id);
    return track?.album?.trim()
      ? JSON.stringify([track.albumArtist?.trim() || track.artist?.trim() || "未知艺人", track.album.trim()])
      : JSON.stringify(["untagged", id]);
  };
  const index = currentId ? ids.indexOf(currentId) : -1;
  const prefix = preserveHistory ? ids.slice(0, index + 1) : [];
  const pending = preserveHistory ? ids.slice(index + 1) : ids;
  const groups = new Map<string, string[]>();
  for (const id of pending) {
    const key = albumKey(id);
    const group = groups.get(key) ?? [];
    group.push(id); groups.set(key, group);
  }
  const currentAlbum = currentId && index >= 0 ? albumKey(currentId) : undefined;
  const keys = [...groups.keys()];
  const order = [
    ...(currentAlbum && groups.has(currentAlbum) ? [currentAlbum] : []),
    ...shuffled(keys.filter(key => key !== currentAlbum), random),
  ];
  return [...prefix, ...order.flatMap(key => groups.get(key)!.slice().sort((a, b) => {
    const left = byId.get(a), right = byId.get(b);
    return (left?.discNumber ?? 1) - (right?.discNumber ?? 1) ||
      (left?.trackNumber ?? 999) - (right?.trackNumber ?? 999);
  }))];
}
