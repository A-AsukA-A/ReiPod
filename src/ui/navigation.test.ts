import { describe, expect, it } from "vitest";
import { initialNavigation, navigationReducer as reduce } from "./navigation";

describe("player navigation", () => {
  it("separates identical artist/album selections by category kind and value, including Menu return", () => {
    const rock = { kind: "genre" as const, value: "Same" };
    const composer = { kind: "composer" as const, value: "Same" };
    let nav = reduce(initialNavigation, { type: "open", page: "album-tracks", groupKey: "shared", artist: "Alpha", category: rock, defaultKey: "r1" });
    nav = reduce(nav, { type: "select", key: "r2" });
    nav = reduce(nav, { type: "open", page: "album-tracks", groupKey: "shared", artist: "Alpha", category: composer, defaultKey: "c1" });
    expect(nav.screen.selectedKey).toBe("c1");
    expect(nav.history.at(-1)?.category).toEqual(rock);
    nav = reduce(nav, { type: "back" });
    expect(nav.screen).toMatchObject({ category: rock, selectedKey: "r2" });
    nav = reduce(nav, { type: "open", page: "album-tracks", groupKey: "shared", artist: "Alpha", defaultKey: "all1" });
    expect(nav.screen.selectedKey).toBe("all1");
    expect(nav.screen.category).toBeUndefined();
    nav = reduce(nav, { type: "open", page: "album-tracks", groupKey: "shared", artist: "Alpha", category: rock });
    expect(nav.screen.selectedKey).toBe("r2");
    nav = reduce(nav, { type: "home" });
    expect(nav.screen.category).toBeUndefined();
  });
  it("keeps album selection and history separate for each artist browse scope", () => {
    let nav = reduce(initialNavigation, {
      type: "open",
      page: "albums",
      artist: "Alpha",
      defaultKey: "all-songs",
    });
    nav = reduce(nav, { type: "select", key: "shared" });
    nav = reduce(nav, {
      type: "open",
      page: "album-tracks",
      artist: "Alpha",
      groupKey: "shared",
      defaultKey: "a1",
    });
    nav = reduce(nav, { type: "select", key: "a2" });
    nav = reduce(nav, { type: "back" });
    expect(nav.screen).toMatchObject({
      page: "albums",
      artist: "Alpha",
      selectedKey: "shared",
    });
    nav = reduce(nav, {
      type: "open",
      page: "album-tracks",
      artist: "Other",
      groupKey: "shared",
      defaultKey: "b1",
    });
    expect(nav.screen.selectedKey).toBe("b1");
    nav = reduce(nav, {
      type: "open",
      page: "album-tracks",
      artist: "Alpha",
      groupKey: "shared",
      defaultKey: "a1",
    });
    expect(nav.screen.selectedKey).toBe("a2");
    nav = reduce(nav, { type: "home" });
    expect(nav.screen.artist).toBeUndefined();
  });
  it("remembers track focus separately for each album, including back navigation", () => {
    let nav = reduce(initialNavigation, {
      type: "open",
      page: "album-tracks",
      groupKey: "album-a",
      defaultKey: "a1",
    });
    nav = reduce(nav, { type: "select", key: "a2" });
    nav = reduce(nav, {
      type: "open",
      page: "album-tracks",
      groupKey: "album-b",
      defaultKey: "b1",
    });
    expect(nav.screen.selectedKey).toBe("b1");
    nav = reduce(nav, { type: "back" });
    expect(nav.screen).toMatchObject({
      groupKey: "album-a",
      selectedKey: "a2",
    });
  });
  it("remembers a directly clicked item through playing and nested back navigation", () => {
    let nav = reduce(initialNavigation, { type: "select", key: "demo" });
    nav = reduce(nav, { type: "open", page: "demos", defaultKey: "song-1" });
    nav = reduce(nav, { type: "select", key: "song-2" });
    nav = reduce(nav, { type: "open", page: "playing" });
    nav = reduce(nav, { type: "back" });
    expect(nav.screen).toEqual({ page: "demos", selectedKey: "song-2" });
    nav = reduce(nav, { type: "back" });
    expect(nav.screen).toEqual({ page: "home", selectedKey: "demo" });
  });
  it("processes rapid rotations sequentially and keeps focus by track identity", () => {
    let nav = reduce(initialNavigation, {
      type: "open",
      page: "songs",
      defaultKey: "b",
    });
    nav = reduce(nav, { type: "move", keys: ["a", "b", "c", "d"], steps: 1 });
    nav = reduce(nav, { type: "move", keys: ["a", "b", "c", "d"], steps: 1 });
    expect(nav.screen.selectedKey).toBe("d");
    nav = reduce(nav, {
      type: "move",
      keys: ["inserted", "a", "b", "c", "d"],
      steps: -1,
    });
    expect(nav.screen.selectedKey).toBe("c");
  });
  it("starts every clear confirmation on cancel and lets Menu cancel it", () => {
    let nav = reduce(initialNavigation, {
      type: "open",
      page: "settings",
      defaultKey: "clear",
    });
    nav = reduce(nav, {
      type: "open",
      page: "confirm-clear",
      selectedKey: "cancel",
    });
    nav = reduce(nav, { type: "select", key: "confirm" });
    nav = reduce(nav, { type: "back" });
    expect(nav.screen).toEqual({ page: "settings", selectedKey: "clear" });
    nav = reduce(nav, {
      type: "open",
      page: "confirm-clear",
      selectedKey: "cancel",
    });
    expect(nav.screen.selectedKey).toBe("cancel");
    nav = reduce(nav, { type: "home" });
    expect(nav.screen.page).toBe("home");
    expect(nav.history).toHaveLength(0);
  });
  it("does not stack the same page or remember previous selections after clear", () => {
    let nav = reduce(initialNavigation, {
      type: "open",
      page: "songs",
      defaultKey: "a",
    });
    nav = reduce(nav, { type: "open", page: "songs" });
    expect(nav.history).toHaveLength(1);
    expect(reduce(nav, { type: "reset" })).toEqual(initialNavigation);
  });
});

it("dismisses a completed management flow while preserving the originating list selection", () => {
  let nav = reduce(initialNavigation, {
    type: "open",
    page: "playlists",
    selectedKey: "list",
  });
  nav = reduce(nav, {
    type: "open",
    page: "playlist-tracks",
    groupKey: "list",
  });
  nav = reduce(nav, {
    type: "open",
    page: "playlist-options",
    groupKey: "list",
  });
  nav = reduce(nav, {
    type: "open",
    page: "confirm-delete-playlist",
    groupKey: "list",
    selectedKey: "cancel",
  });
  nav = reduce(nav, { type: "back", levels: 3 });
  expect(nav.screen).toEqual({ page: "playlists", selectedKey: "list" });
  expect(nav.history).toHaveLength(1);
});
