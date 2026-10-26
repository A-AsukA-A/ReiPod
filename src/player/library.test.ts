import { describe, expect, it } from "vitest";
import { albumsFor, artistsFor, parseLyrics } from "./library";
import type { Track } from "./Player";
const song = (id: string, patch: Partial<Track> = {}): Track => ({
  id,
  title: id,
  filename: `${id}.mp3`,
  size: 10,
  url: `blob:${id}`,
  ...patch,
});

describe("real library metadata", () => {
  it("keeps albums by different album artists distinct and respects track numbers", () => {
    const tracks = [
      song("later", {
        album: "同名专辑",
        artist: "客串歌手",
        albumArtist: "甲",
        trackNumber: 2,
      }),
      song("first", {
        album: "同名专辑",
        artist: "甲",
        albumArtist: "甲",
        trackNumber: 1,
      }),
      song("other", { album: "同名专辑", artist: "乙" }),
    ];
    const albums = albumsFor(tracks);
    expect(albums).toHaveLength(2);
    expect(
      albums
        .find((album) => album.artist === "甲")
        ?.tracks.map((track) => track.id),
    ).toEqual(["first", "later"]);
    expect(artistsFor(tracks)).toContain("客串歌手");
  });
  it("groups missing tags and preserves multi-timestamp lyrics without inventing timings", () => {
    expect(albumsFor([song("a"), song("b")])).toHaveLength(1);
    expect(
      parseLyrics(
        "[ar:artist]\n[offset:100]\n[00:01.50][00:03]第一行\n[00:02]第二行",
      ),
    ).toEqual([
      { time: 1.6, text: "第一行" },
      { time: 2.1, text: "第二行" },
      { time: 3.1, text: "第一行" },
    ]);
    expect(
      parseLyrics("没有时间标签\n保持纯文本").every((line) => line.time === -1),
    ).toBe(true);
  });
});
