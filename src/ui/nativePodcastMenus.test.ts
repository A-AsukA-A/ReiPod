import { expect, test, vi } from "vitest";
import { createNativePodcastRows, createNativePodcastStatusRows } from "./nativePodcastMenus";
import { createClassicMenuModel } from "./classicMenuModel";

test("native podcast rows distinguish permission, busy and empty-library states without side effects", () => {
  const actions = { retry: vi.fn(), refresh: vi.fn(), settings: vi.fn(), openApp: vi.fn() };
  expect(createNativePodcastRows(undefined, actions)).toEqual([]);
  const state = { auth: "signed-out" as const, authorization: "notDetermined" as const, syncing: false, error: "", tracks: [] };
  const rows = createNativePodcastRows(state, actions);
  expect(actions.retry).not.toHaveBeenCalled();
  rows[0].action();
  expect(actions.retry).not.toHaveBeenCalled();
  expect(rows[0].label).toBe("正在读取系统播客…");
  createNativePodcastRows({ ...state, auth: "error", error: "暂不可用" }, actions)[0].action();
  rows[1].action();
  expect(actions.retry).toHaveBeenCalledOnce();
  expect(actions.openApp).toHaveBeenCalledOnce();
  createNativePodcastRows({ ...state, authorization: "denied" }, actions)[0].action();
  expect(actions.settings).toHaveBeenCalledOnce();
  const empty = createNativePodcastRows({ ...state, auth: "authorized" }, actions)[0];
  expect(empty.detail).toContain("系统未提供");
  empty.action();
  expect(actions.refresh).toHaveBeenCalledOnce();
  expect(createNativePodcastRows({ ...state, syncing: true }, actions)[0].disabled).not.toBe(true);
});

test("loading stays focused and repeated Center cannot open Podcasts; cached shows hide the loading row", () => {
  const open = vi.fn();
  const state = { auth: "loading" as const, syncing: true, error: "", tracks: [] };
  expect(createNativePodcastStatusRows(state, true, open)).toEqual([]);
  const rows = createNativePodcastStatusRows(state, false, open);
  const model = createClassicMenuModel({ page: "podcasts", selectedKey: "podcast-status", managedRows: { podcasts: rows },
    primaryRows: { home: [], music: [], playlists: [], settings: [], "confirm-clear": [] },
    browseAlbums: [], flowAlbums: [], browseTracks: [], artists: [], visibleTracks: [], isTrackList: false,
    accountSyncing: false, emptyItems: [], open, playTrack: vi.fn() });
  expect(model.focusedRow?.key).toBe("podcast-status");
  model.focusedRow!.action(); model.focusedRow!.action();
  expect(open).not.toHaveBeenCalled();
});
