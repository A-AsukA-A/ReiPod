import type { Track } from "./Player";

/** Keep explicit album artists distinct; a tagged compilation without one shares a stable identity. */
export function albumIdentity(track: Track) {
  const title = track.album?.trim() || "未知专辑";
  const albumArtist = track.albumArtist?.trim();
  const compilation = track.compilation === true && !!track.album?.trim() && !albumArtist;
  const artist = albumArtist || (compilation ? "群星" : track.artist?.trim() || "未知艺人");
  return { id: JSON.stringify(compilation ? ["compilation", "", title] : [artist, title]), title, artist };
}
