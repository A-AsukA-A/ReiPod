import catalog from "./demoCatalog.json";
import type { Track } from "./Player";
import { parseLyrics } from "./library";
import qingtian from "../../public/music/qingtian.yrc?raw";
import qilixiang from "../../public/music/qilixiang.lrc?raw";
import lantingxu from "../../public/music/lantingxu.yrc?raw";

const lyrics: Record<string, Track["lyrics"]> = {
  "qingtian.yrc": parseLyrics(qingtian),
  "qilixiang.lrc": parseLyrics(qilixiang),
  "lantingxu.yrc": parseLyrics(lantingxu),
};

/** Metadata only: audio loads on a user's play command, preserving Safari activation. */
export function getDemoTracks(baseUrl: string): Track[] {
  return catalog.map((song) => ({
    id: `demo:${song.id}`,
    title: song.title,
    artist: song.artist,
    album: song.album,
    albumArtist: song.artist,
    trackNumber: song.trackNumber,
    composers: song.composers,
    duration: song.duration,
    artwork: `${baseUrl}artwork/${song.artworkFilename}`,
    lyrics: lyrics[song.lyricFilename],
    lyricsStatus: "ready",
    kind: "demo",
    filename: song.filename,
    size: song.bytes,
    url: `${baseUrl}music/${song.filename}`,
  }));
}
