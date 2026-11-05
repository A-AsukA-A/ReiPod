import { expect, it, vi } from "vitest";
import { createClassicCategoryMenus } from "./classicCategoryMenus";
import { albumsFor, categoriesFor, tracksForArtist, tracksForCategory } from "../player/library";
import type { Track } from "../player/Player";

const track = (id: string, patch: Partial<Track>): Track => ({ id, title: id, filename: `${id}.wav`, size: 1, url: `blob:${id}`, ...patch });
const tracks = [
  track("Second", { artist: "Alpha", albumArtist: "Various", album: "Shared", genres: [" Rock ", "Rock"], composers: ["One"], trackNumber: 2 }),
  track("First", { artist: "Beta", albumArtist: "Various", album: "Shared", genres: ["Rock", "Jazz"], composers: ["One", "Two"], trackNumber: 1 }),
  track("Outside", { artist: "Alpha", albumArtist: "Various", album: "Shared", genres: ["Jazz"], composers: ["Two"], trackNumber: 3 }),
  track("Unknown", { genres: ["", " "], composers: [] }),
];
it("category metadata trims and deduplicates tags, retains unknowns and filters before grouping shared albums", () => {
  expect(categoriesFor(tracks, "genre").map(group => group.name)).toEqual(["Jazz", "Rock", "未知风格"]);
  expect(categoriesFor(tracks, "composer").map(group => group.name)).toEqual(["One", "Two", "未知作曲者"]);
  const rock = tracksForCategory(tracks, { kind: "genre", value: "Rock" });
  expect(albumsFor(rock)[0].tracks.map(track => track.id)).toEqual(["First", "Second"]);
  expect(tracksForArtist(rock, "Alpha").map(track => track.id)).toEqual(["Second"]);
  expect(tracksForCategory(tracks, { kind: "composer", value: "One" }).map(track => track.id)).toEqual(["Second", "First"]);
  expect(tracksForCategory(tracks, { kind: "genre", value: "未知风格" }).map(track => track.id)).toEqual(["Unknown"]);
});
it("Center opens the right intermediate level without playing; collection Play excludes other categories", () => {
  const open = vi.fn(), playTrack = vi.fn();
  const menus = createClassicCategoryMenus({ tracks, open, playTrack });
  const rock = menus.genres!.find(row => row.label === "Rock")!;
  expect(rock.detail).toBe("2 位艺人，1 张专辑");
  rock.action();
  expect(open).toHaveBeenLastCalledWith("artists", undefined, undefined, undefined, { kind: "genre", value: "Rock" });
  expect(playTrack).not.toHaveBeenCalled();
  rock.play!();
  expect(playTrack).toHaveBeenLastCalledWith("First", ["First", "Second"]);
  menus.composers!.find(row => row.label === "One")!.action();
  expect(open).toHaveBeenLastCalledWith("albums", undefined, undefined, undefined, { kind: "composer", value: "One" });
  menus.genres![0].action();
  expect(open).toHaveBeenLastCalledWith("artists");
  menus.composers![0].action();
  expect(open).toHaveBeenLastCalledWith("albums");
  menus.composers![0].play!();
  expect(playTrack).toHaveBeenLastCalledWith("First", ["First", "Outside", "Second", "Unknown"]);
});
it("empty libraries stay empty and real tags cannot collide with aggregate row keys", () => {
  expect(createClassicCategoryMenus({ tracks: [], open: vi.fn(), playTrack: vi.fn() })).toEqual({ genres: [], composers: [] });
  const menus = createClassicCategoryMenus({ tracks: [track("A", { genres: ["all-artists"], composers: ["all-albums"] })], open: vi.fn(), playTrack: vi.fn() });
  for (const rows of Object.values(menus)) expect(new Set(rows!.map(row => row.key)).size).toBe(rows!.length);
});
