import catalog from "./demoCatalog.json";
import type { Track } from "./Player";

/** Metadata only: audio loads on a user's play command, preserving Safari activation. */
export function getDemoTracks(baseUrl: string): Track[] {
  return catalog.map((song) => ({
    id: `demo:${song.id}`,
    title: song.title,
    artist: song.artist,
    kind: "demo",
    filename: song.filename,
    size: song.bytes,
    url: `${baseUrl}music/${song.filename}`,
  }));
}
