import { expect, it, vi } from "vitest";
import { createOnTheGoMenus } from "./onTheGoMenus";
import type { Track } from "../player/Player";

const track: Track = { id: "a", title: "A", filename: "", url: "blob:a", size: 1 };
function fixture() {
  const context: Parameters<typeof createOnTheGoMenus>[0] = {
    page: "playlist-tracks", groupKey: "on-the-go", tracks: [track],
    playlist: { id: "on-the-go", name: "On-The-Go", trackIds: ["a"] },
    open: vi.fn(), back: vi.fn(), notice: vi.fn(), play: vi.fn(),
    save: vi.fn(() => ({ playlist: { id: "saved", name: "New Playlist 1", trackIds: ["a"] }, persisted: true })),
    clear: vi.fn(() => true),
  };
  return { context, rows: () => createOnTheGoMenus(context) };
}
it("working list plays only songs and save/clear have separate commands without management edits", () => {
  const f = fixture();
  const rows = f.rows()["playlist-tracks"]!;
  expect(rows.map(row => row.key)).toEqual(["a", "save-on-the-go", "clear-on-the-go"]);
  expect(f.context.save).not.toHaveBeenCalled();
  rows[0].action(); expect(f.context.play).toHaveBeenCalledWith("a");
  rows[2].action(); expect(f.context.open).toHaveBeenCalledWith("confirm-clear-on-the-go", "cancel", "on-the-go");
  expect(f.context.clear).not.toHaveBeenCalled();
  rows[1].action(); expect(f.context.back).toHaveBeenCalledOnce();
  expect(f.context.notice).toHaveBeenCalledWith("已保存为「New Playlist 1」");
});
it("empty working lists cannot save or clear; saved copies expose only playback", () => {
  const f = fixture(); f.context.tracks = [];
  const rows = f.rows()["playlist-tracks"]!;
  expect(rows.every(row => row.disabled)).toBe(true);
  rows.forEach(row => row.action());
  expect(f.context.save).not.toHaveBeenCalled(); expect(f.context.open).not.toHaveBeenCalled();
  f.context.tracks = [track]; f.context.groupKey = "saved";
  f.context.playlist = { id: "saved", name: "New Playlist 1", savedOnTheGo: 1, trackIds: ["a"] };
  expect(f.rows()["playlist-tracks"]!.map(row => row.key)).toEqual(["a"]);
});
it("failed saves/clears stay on the current page and expose retry feedback", () => {
  const f = fixture(); f.context.save = vi.fn(() => ({ playlist: null, persisted: false }));
  f.rows()["playlist-tracks"]![1].action();
  expect(f.context.back).not.toHaveBeenCalled();
  expect(f.context.notice).toHaveBeenCalledWith(expect.stringContaining("原列表已保留"));
  f.context.page = "confirm-clear-on-the-go"; f.context.clear = vi.fn(() => false);
  const rows = f.rows()[f.context.page]!;
  expect(rows[0].key).toBe("cancel");
  rows[1].action(); expect(f.context.back).not.toHaveBeenCalled();
  rows[0].action(); expect(f.context.back).toHaveBeenCalledOnce();
});
