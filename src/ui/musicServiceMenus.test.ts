import { expect, it, vi } from "vitest";
import { createMusicServiceMenus } from "./musicServiceMenus";
import type { MusicServiceState } from "../services/musicServices";

function menus(patch: Partial<MusicServiceState> = {}, externalLogin = false) {
  const services: MusicServiceState = {
    selected: "qq", playback: "local", transport: "web", auth: "signed-out",
    ready: true, syncing: false, error: "", libraryTracks: [], playlists: [], searchResults: [], ...patch,
  };
  const actions = {
    select: vi.fn(), refresh: vi.fn(), signOut: vi.fn(), login: vi.fn(), openPlaylist: vi.fn(async () => {}),
  };
  const open = vi.fn();
  return { actions, open, ...createMusicServiceMenus({
    services, serviceName: services.selected === "qq" ? "QQ 音乐" : "Apple Music", externalLogin,
    localFirstId: "local:1", page: "search", localMusicItems: [], localPlaylistItems: [],
    open, beginText: vi.fn(), clearQuery: vi.fn(), openFiles: vi.fn(), loadDemos: vi.fn(), actions,
  }) };
}

it("keeps QR and bound-app login choices separate and exposes cancel while waiting", () => {
  const qr = menus();
  expect(qr.managedRows["music-account"]?.map(row => row.key)).toEqual(["login", "wechat-login", "local-songs"]);
  qr.managedRows["music-account"]?.[1].action();
  expect(qr.actions.login).toHaveBeenCalledWith("wechat");
  const app = menus({}, true);
  expect(app.managedRows["music-account"]?.map(row => row.key)).toEqual(["login", "local-songs"]);
  expect(app.managedRows["music-account"]?.[0].label).toBe("打开 QQ 音乐 登录");
  const waiting = menus({ auth: "loading" });
  expect(waiting.managedRows["music-account"]?.[0].disabled).toBe(true);
  const confirm = menus({ auth: "loading", loginUrl: "https://example.invalid/session" });
  expect(confirm.managedRows["music-account"]?.[0].disabled).toBe(false);
  confirm.managedRows["music-account"]?.find(row => row.key === "cancel-login")?.action();
  expect(confirm.actions.signOut).toHaveBeenCalledOnce();
});

it("retains refresh as a disabled focus target during sync and leaves logout available", () => {
  const ctx = menus({ auth: "authorized", syncing: true });
  const rows = ctx.managedRows["music-account"]!;
  expect(rows.map(row => row.key)).toEqual(["refresh", "logout"]);
  expect(rows[0].disabled).toBe(true);
  expect(rows[1].disabled).toBeUndefined();
  rows[1].action();
  expect(ctx.actions.signOut).toHaveBeenCalledOnce();
});

it("keeps denied native access actionable and local files reachable", () => {
  const ctx = menus({ selected: "apple-music", transport: "ios", nativeAuthorization: "denied" });
  expect(ctx.managedRows["music-account"]?.[0].label).toBe("打开系统设置");
  ctx.managedRows["music-account"]?.find(row => row.key === "local-songs")?.action();
  expect(ctx.open).toHaveBeenCalledWith("local-songs", "local:1");
});
