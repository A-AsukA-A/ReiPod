import { expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { getDemoTracks } from "./demoTracks";
import { readLocalMetadata } from "./readLocalMetadata";

it("the authorized catalog has isolated IDs, album metadata and immediately available real lyric timing", () => {
  const tracks = getDemoTracks("/ReiPod/");
  expect(tracks.map(track => track.title)).toEqual(["晴天", "七里香", "兰亭序"]);
  expect(tracks.map(track => track.album)).toEqual(["叶惠美", "七里香", "魔杰座"]);
  expect(tracks.map(track => track.trackNumber)).toEqual([3, 2, 7]);
  expect(new Set(tracks.map(track => track.id)).size).toBe(3);
  expect(tracks.every(track => track.id.startsWith("demo:jay-") && track.url.startsWith("/ReiPod/music/") && track.artwork?.startsWith("/ReiPod/artwork/"))).toBe(true);
  expect(tracks.map(track => track.lyrics?.length)).toEqual([62, 38, 37]);
  expect(tracks.map(track => track.lyrics?.some(line => !!line.words?.length))).toEqual([true, false, true]);
});

it("distributed source files round-trip embedded covers, tags and synchronized lyrics through the actual import adapter", async () => {
  for (const track of getDemoTracks("/")) {
    const file = new File([await readFile(`public/music/${track.filename}`)], track.filename, { type: "audio/mp4" });
    const metadata = await readLocalMetadata(file);
    try {
      expect(metadata).toMatchObject({ title: track.title, artist: track.artist, album: track.album, trackNumber: track.trackNumber, composers: ["周杰伦"] });
      expect(metadata.artwork).toMatch(/^blob:/);
      expect(metadata.lyrics?.length).toBe(track.lyrics?.length);
      expect(metadata.lyrics?.some(line => line.time > 20)).toBe(true);
      expect(metadata.lyrics?.map(line => line.time)).toEqual(track.lyrics?.map(line => line.time));
      expect(metadata.lyrics?.some(line => !!line.words?.length)).toBe(track.lyrics?.some(line => !!line.words?.length));
    } finally { if (metadata.artwork) URL.revokeObjectURL(metadata.artwork); }
  }
});
