import { parseLyrics } from "./library";
import type { LocalMetadata } from "./localLibrary";

/** Browser metadata adapter; heavy parsing stays lazy and outside the shared coordinator. */
export async function readLocalMetadata(file: File): Promise<LocalMetadata> {
  const { parseBlob, selectCover } = await import("music-metadata");
  const metadata = await parseBlob(file, { duration: false, skipPostHeaders: true });
  const cover = selectCover(metadata.common.picture);
  const artwork = cover && cover.data.byteLength < 8 * 1024 * 1024
    ? URL.createObjectURL(new Blob([new Uint8Array(cover.data)], { type: cover.format })) : undefined;
  const embedded = metadata.common.lyrics?.[0];
  // music-metadata extracts LRC timestamps into syncText and removes them from text.
  const synchronized = embedded?.timeStampFormat === 2
    ? embedded.syncText.filter(line => Number.isFinite(line.timestamp) && line.timestamp! >= 0)
        .map(line => ({ time: line.timestamp! / 1000, text: line.text }))
    : [];
  const lyrics = synchronized.length ? synchronized : embedded?.text ? parseLyrics(embedded.text) : undefined;
  return {
    title: metadata.common.title?.trim() || file.name.replace(/\.[^.]+$/, ""),
    artist: metadata.common.artist?.trim(), album: metadata.common.album?.trim(),
    albumArtist: metadata.common.albumartist?.trim(), genres: metadata.common.genre,
    composers: metadata.common.composer, trackNumber: metadata.common.track.no ?? undefined,
    duration: metadata.format.duration, ...(artwork ? { artwork } : {}),
    ...(lyrics?.length ? { lyrics } : {}),
  };
}
