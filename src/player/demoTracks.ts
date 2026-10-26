import catalog from "./demoCatalog.json";
import type { Track } from "./Player";

/** Metadata only: audio loads on a user's play command, preserving Safari activation. */
export function getDemoTracks(baseUrl: string): Track[] {
  return catalog.map((song, index) => ({
    id: `demo:${song.id}`,
    title: song.title,
    artist: song.artist,
    album: song.title,
    albumArtist: song.artist,
    trackNumber: 1,
    duration: [205.078639, 125, 136.551723][index],
    artwork: `${baseUrl}artwork/${song.filename.replace(".mp3", ".svg")}`,
    kind: "demo",
    filename: song.filename,
    size: song.bytes,
    url: `${baseUrl}music/${song.filename}`,
  }));
}
