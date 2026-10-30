import { expect, it, vi } from "vitest";
import { createMediaMenus } from "./mediaMenus";
import type { NavigationState } from "./navigation";
function fixture() {
  const navigation: NavigationState = { screen: { page: "photo-delete", groupKey: "one", selectedKey: "confirm" }, history: [], remembered: {} };
  const context: Parameters<typeof createMediaMenus>[0] = {
    photos: [{ id: "one", name: "One", album: "Album A", url: "blob:one" },
      { id: "two", name: "Two", album: "Album A", url: "blob:two" },
      { id: "three", name: "Three", album: "Album B", url: "blob:three" }],
    activePhotos: [{ id: "three", name: "Three", album: "Album B", url: "blob:three" }],
    podcastShows: [{ id: "show", title: "未知专辑", artist: "Speaker", tracks: [
      { id: "episode", title: "Episode", filename: "episode.m4a", url: "blob:episode", size: 1 }] }],
    groupKey: "one", openPhotos: vi.fn(), openPodcasts: vi.fn(), deletePhoto: vi.fn(async () => {}),
    open: vi.fn(), back: vi.fn(), setNotice: vi.fn(), setSlideshow: vi.fn(), getNavigation: () => navigation,
  };
  return { context, navigation, menus: () => createMediaMenus(context) };
}
it("imports are synchronous injected commands and menu construction has no media side effects", () => {
  const f = fixture();
  const menus = f.menus();
  expect(f.context.openPhotos).not.toHaveBeenCalled();
  expect(f.context.deletePhoto).not.toHaveBeenCalled();
  menus.photos!.find(row => row.key === "photo-import")!.action();
  menus.photos!.find(row => row.key === "photo-folder")!.action();
  expect(vi.mocked(f.context.openPhotos).mock.calls).toEqual([[false], [true]]);
  menus.podcasts!.find(row => row.key === "podcast-import")!.action();
  expect(f.context.openPodcasts).toHaveBeenCalledOnce();
});
it("album counts and thumbnails reflect their own group and opening retains its scope", () => {
  const f = fixture();
  const rows = f.menus().photos!;
  expect(rows.slice(0, 3).map(row => [row.key, row.detail, row.artwork])).toEqual([
    ["all-photos", "3 张照片", "blob:one"], ["Album A", "2 张照片", "blob:one"], ["Album B", "1 张照片", "blob:three"],
  ]);
  rows[2].action();
  expect(f.context.open).toHaveBeenCalledWith("photo-grid", "three", "Album B");
  f.context.groupKey = "Album B";
  const grid = f.menus()["photo-grid"]!;
  expect(grid.map(row => row.key)).toEqual(["three"]);
  grid[0].action();
  expect(f.context.open).toHaveBeenLastCalledWith("photo-full", "three", "Album B");
});
it("empty photos disable browsing but leave both import routes and podcast import reachable", () => {
  const f = fixture();
  f.context.photos = [];
  f.context.activePhotos = [];
  f.context.podcastShows = [];
  const menus = f.menus();
  expect(menus.photos![0].disabled).toBe(true);
  expect(menus.photos!.slice(1).map(row => row.key)).toEqual(["photo-import", "photo-folder"]);
  expect(menus["photo-grid"]).toEqual([]);
  expect(menus.podcasts!.map(row => row.key)).toEqual(["podcast-import"]);
});
it("podcasts use show fallback labels and retain episode selection without invoking music storage", () => {
  const f = fixture();
  const row = f.menus().podcasts![0];
  expect(row.label).toBe("Speaker");
  expect(row.value).toBe("1");
  row.action();
  expect(f.context.open).toHaveBeenCalledWith("podcast-episodes", "episode", "show");
  expect(f.context.deletePhoto).not.toHaveBeenCalled();
});
it("slideshow starts after returning and cancel only returns", () => {
  const f = fixture();
  const rows = f.menus()["photo-options"]!;
  rows[0].action();
  expect(f.context.back).toHaveBeenCalledOnce();
  expect(f.context.setSlideshow).toHaveBeenCalledWith(true);
  expect(vi.mocked(f.context.back).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(f.context.setSlideshow).mock.invocationCallOrder[0]);
  f.menus()["photo-delete"]![0].action();
  expect(f.context.deletePhoto).not.toHaveBeenCalled();
});
it("late deletion does not return from a different photo or a different page", async () => {
  for (const screen of [{ page: "photo-delete" as const, groupKey: "other", selectedKey: "confirm" },
    { page: "home" as const, groupKey: undefined, selectedKey: "photos" }]) {
    const f = fixture();
    let complete!: () => void;
    vi.mocked(f.context.deletePhoto).mockImplementation(() => new Promise(resolve => { complete = resolve; }));
    f.menus()["photo-delete"]![1].action();
    f.navigation.screen = screen;
    complete();
    await vi.waitFor(() => expect(f.context.setNotice).toHaveBeenCalledWith("已删除浏览器中的照片副本"));
    expect(f.context.back).not.toHaveBeenCalled();
  }
});
it("deletion returns only for the matching confirmation and exposes failure feedback", async () => {
  const f = fixture();
  vi.mocked(f.context.deletePhoto).mockRejectedValueOnce(new Error("storage failure"));
  f.menus()["photo-delete"]![1].action();
  await vi.waitFor(() => expect(f.context.setNotice).toHaveBeenCalledWith("照片删除失败，请重试"));
  expect(f.context.back).not.toHaveBeenCalled();
  f.menus()["photo-delete"]![1].action();
  await vi.waitFor(() => expect(f.context.back).toHaveBeenCalledWith(3));
  expect(f.context.deletePhoto).toHaveBeenCalledWith("one");
});
