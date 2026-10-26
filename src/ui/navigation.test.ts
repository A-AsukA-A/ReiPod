import { describe, expect, it } from "vitest";
import { initialNavigation, navigationReducer as reduce } from "./navigation";

describe("player navigation", () => {
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
