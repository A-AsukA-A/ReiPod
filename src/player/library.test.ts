import { describe, expect, it } from "vitest";
import {
  albumsFor,
  artistsFor,
  parseLyrics,
  tracksForArtist,
  coverFlowOrder,
  songsByTitle,
  tracksForCategory,
  categoriesFor,
} from "./library";
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
  it("keeps artist browsing scoped inside a compilation while the album browser includes all its tracks", () => {
    const tracks = [
      song("guest", {
        title: "Second",
        artist: "Guest",
        albumArtist: "Various",
        album: "Shared",
        trackNumber: 2,
      }),
      song("other", {
        title: "First",
        artist: "Other",
        albumArtist: "Various",
        album: "Shared",
        trackNumber: 1,
      }),
      song("single", { title: "Another", artist: "Guest", album: "Solo" }),
    ];
    const scoped = albumsFor(tracksForArtist(tracks, "Guest"));
    expect(
      scoped
        .find((album) => album.title === "Shared")
        ?.tracks.map((track) => track.id),
    ).toEqual(["guest"]);
    expect(
      albumsFor(tracks)
        .find((album) => album.title === "Shared")
        ?.tracks.map((track) => track.id),
    ).toEqual(["other", "guest"]);
    expect(
      songsByTitle(tracksForArtist(tracks, "Guest")).map((track) => track.id),
    ).toEqual(["single", "guest"]);
    expect(tracksForArtist([song("untagged")], "未知艺人")).toHaveLength(1);
  });
  it("sorts Cover Flow by artist without changing the alphabetical Albums browser", () => {
    const albums = albumsFor([
      song("z", { artist: "Zulu", album: "A Album" }),
      song("a", { artist: "Alpha", album: "Z Album" }),
      song("b", { artist: "Alpha", album: "B Album" }),
    ]);
    expect(albums.map((album) => album.title)).toEqual([
      "A Album",
      "B Album",
      "Z Album",
    ]);
    expect(coverFlowOrder(albums).map((album) => album.title)).toEqual([
      "B Album",
      "Z Album",
      "A Album",
    ]);
    expect(albums[0].title).toBe("A Album");
  });
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


it("groups tagged multi-artist compilations and only hides an artist confined to one compilation", () => {
  const tracks = [song("guest-a", { artist: "Guest A", album: "Summer", compilation: true, trackNumber: 2 }),
    song("guest-b", { artist: "Guest B", album: "Summer", compilation: true, trackNumber: 1 }),
    song("resident", { artist: "Resident", album: "Summer", compilation: true, trackNumber: 3 }),
    song("solo", { artist: "Resident", album: "Solo" }),
    song("returning-a", { artist: "Returning", album: "Summer", compilation: true }),
    song("returning-b", { artist: "Returning", album: "Winter", compilation: true })];
  expect(albumsFor(tracks).find(album => album.title === "Summer")?.tracks.map(track => track.id)).toEqual(["guest-b", "guest-a", "resident", "returning-a"]);
  expect(artistsFor(tracks, true)).toEqual(["Resident", "Returning"]);
  expect(artistsFor(tracks)).toHaveLength(4);
  expect(tracksForArtist(tracks, "Resident")).toHaveLength(2);
  expect(tracksForCategory(tracks, { kind: "compilation", value: "合辑" })).toHaveLength(5);
  expect(albumsFor([song("one", { artist: "One", album: "Same" }), song("two", { artist: "Two", album: "Same" })])).toHaveLength(2);
});

it("explicit sort tags change order without merging identities, changing display names or disc order", () => {
  const tracks = [song("z", { title: "最后", artist: "Visible Z", album: "Visible Z", albumArtist: "Visible Z", sortTitle: "A", sortArtist: "A", sortAlbum: "A", sortAlbumArtist: "Z", trackNumber: 2, composers: ["Visible Z"], sortComposer: "A" }),
    song("a", { title: "开头", artist: "Visible A", album: "Visible A", albumArtist: "Visible A", sortTitle: "Z", sortArtist: "Z", sortAlbum: "Z", sortAlbumArtist: "A", trackNumber: 1, composers: ["Visible A"], sortComposer: "Z" })];
  expect(songsByTitle(tracks).map(track => track.title)).toEqual(["最后", "开头"]);
  expect(artistsFor(tracks)).toEqual(["Visible Z", "Visible A"]);
  expect(albumsFor(tracks).map(album => album.title)).toEqual(["Visible Z", "Visible A"]);
  expect(coverFlowOrder(albumsFor(tracks)).map(album => album.title)).toEqual(["Visible A", "Visible Z"]);
  expect(categoriesFor(tracks, "composer").map(group => group.name)).toEqual(["Visible Z", "Visible A"]);
  expect(albumsFor([{ ...tracks[0], album: "Same", albumArtist: "Same" }, { ...tracks[1], album: "Same", albumArtist: "Same" }])[0].tracks.map(track => track.id)).toEqual(["a", "z"]);
});
