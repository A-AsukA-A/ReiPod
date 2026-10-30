import { describe, expect, it, vi } from "vitest";
import { createMusicServiceActions } from "./musicServiceActions";
import type { MusicServiceState } from "../services/musicServices";
import type { Screen } from "../ui/navigation";

function setup() {
  let services: MusicServiceState = {
    selected: "qq", playback: "local", transport: "web", auth: "authorized",
    ready: true, syncing: false, error: "", libraryTracks: [], playlists: [], searchResults: [],
  };
  let screen: Screen = { page: "playlists", selectedKey: "qq-playlist:1" };
  let history: Screen[] = [];
  let resolve!: (value: boolean) => void;
  let reject!: (error: unknown) => void;
  const pending = new Promise<boolean>((yes, no) => { resolve = yes; reject = no; });
  const ports = {
    select: vi.fn(), authorize: vi.fn(), prepare: vi.fn(), refresh: vi.fn(), signOut: vi.fn(),
    reopenLogin: vi.fn(), openSettings: vi.fn(() => Promise.resolve()),
    loadPlaylist: vi.fn(() => pending),
  };
  const open = vi.fn(), back = vi.fn(), setNotice = vi.fn();
  const actions = createMusicServiceActions({
    getServices: () => services, getNavigation: () => ({screen, history}),
    open, back, setNotice, ports,
  });
  return {
    actions, ports, open, back, setNotice, resolve, reject,
    patch: (patch: Partial<MusicServiceState>) => { services = { ...services, ...patch }; },
    navigate: (next: Screen) => { screen = next; history = [...history]; },
    select: (key: string) => { screen = { ...screen, selectedKey: key }; },
  };
}

describe("service commands preserve current navigation and account boundaries", () => {
  it("opens a loaded playlist only while its original screen and account remain active", async () => {
    const ctx = setup();
    const result = ctx.actions.openPlaylist("qq-playlist:1");
    expect(ctx.open).not.toHaveBeenCalled();
    ctx.resolve(true); await result;
    expect(ctx.open).toHaveBeenCalledWith("playlist-tracks", undefined, "qq-playlist:1");
  });

  it("accepts the selection update queued by confirming a playlist on the wheel", async () => {
    const ctx = setup();
    const result = ctx.actions.openPlaylist("qq-playlist:1");
    ctx.select("qq-playlist:1");
    ctx.resolve(true); await result;
    expect(ctx.open).toHaveBeenCalledWith("playlist-tracks", undefined, "qq-playlist:1");
  });

  it.each(["leave", "return", "switch-service", "sign-out"])("ignores a late result after %s", async (change) => {
    const ctx = setup();
    const result = ctx.actions.openPlaylist("qq-playlist:1");
    if (change === "leave") ctx.navigate({ page: "home", selectedKey: "music" });
    // A new screen with equal fields represents leaving and returning.
    if (change === "return") ctx.navigate({ page: "playlists", selectedKey: "qq-playlist:1" });
    if (change === "switch-service") ctx.patch({ selected: "netease" });
    if (change === "sign-out") ctx.patch({ auth: "signed-out" });
    ctx.resolve(true); await result;
    expect(ctx.open).not.toHaveBeenCalled();
    expect(ctx.setNotice).not.toHaveBeenCalled();
  });

  it("shows current load errors but suppresses errors from a screen that was left", async () => {
    const current = setup();
    const result = current.actions.openPlaylist("qq-playlist:1");
    current.patch({ error: "请重新登录" });
    current.resolve(false); await result;
    expect(current.setNotice).toHaveBeenCalledWith("请重新登录");
    const stale = setup();
    const old = stale.actions.openPlaylist("qq-playlist:1");
    stale.navigate({ page: "home", selectedKey: "music" });
    stale.reject(new Error("旧请求失败")); await old;
    expect(stale.setNotice).not.toHaveBeenCalled();
  });

  it("contains rejected loads instead of leaking an unhandled promise", async () => {
    const ctx = setup();
    const result = ctx.actions.openPlaylist("qq-playlist:1");
    ctx.reject(new Error("网络断开")); await result;
    expect(ctx.setNotice).toHaveBeenCalledWith("网络断开");
  });

  it("routes denied native access to Settings and reports a failed Settings action", async () => {
    const ctx = setup();
    ctx.patch({ selected: "apple-music", transport: "ios", nativeAuthorization: "denied" });
    ctx.ports.openSettings.mockRejectedValue(new Error("设置不可用"));
    ctx.actions.login(); await Promise.resolve();
    expect(ctx.ports.openSettings).toHaveBeenCalledOnce();
    expect(ctx.ports.authorize).not.toHaveBeenCalled();
    expect(ctx.setNotice).toHaveBeenCalledWith("设置不可用");
  });

  it("reopens a bound login, preserves the QQ channel, and prepares unready Apple Music", () => {
    const ctx = setup();
    ctx.patch({ loginUrl: "https://example.invalid/bound-session" });
    ctx.actions.login();
    expect(ctx.ports.reopenLogin).toHaveBeenCalledWith("qq");
    ctx.patch({ loginUrl: undefined, ready: false });
    ctx.actions.login("wechat");
    expect(ctx.ports.authorize).toHaveBeenCalledWith("wechat");
    ctx.patch({ selected: "apple-music" });
    ctx.actions.login();
    expect(ctx.ports.prepare).toHaveBeenCalledOnce();
  });
});
