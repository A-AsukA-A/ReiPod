import { expect, it, vi } from "vitest";
import { createSettingsMenus } from "./settingsMenus";
import { parsePreferences } from "./classicSettings";
import type { PlayerState } from "../player/Player";
function fixture() {
  const state: PlayerState = { tracks: [], queue: [], currentId: null, status: "idle", position: 0,
    duration: 0, volume: 1, volumeControl: true, shuffle: false, repeat: "off", favorites: [], error: null };
  const context: Parameters<typeof createSettingsMenus>[0] = {
    prefs: parsePreferences(null), state, cloud: true, serviceName: "QQ 音乐", selectedService: "qq", localMusicCount: 0,
    originalSettingsItems: [{ key: "about", label: "About", action: vi.fn() }, { key: "clear", label: "Clear", action: vi.fn() }],
    open: vi.fn(), back: vi.fn(), clear: vi.fn(), setPreferences: vi.fn(), shuffle: vi.fn(), repeat: vi.fn(),
  };
  return { context, menus: () => createSettingsMenus(context) };
}
it("service presentation does not enable clearing an empty local library, and cancel has no clear side effect", () => {
  const f = fixture();
  const menus = f.menus();
  const extensions = menus.managedRows["reipod-settings"]!;
  expect(extensions[0].value).toBe("QQ 音乐");
  expect(extensions.find(row => row.key === "clear")?.disabled).toBe(true);
  extensions[0].action();
  expect(f.context.open).toHaveBeenCalledWith("music-services", "qq");
  menus.confirmItems[0].action();
  expect(f.context.clear).not.toHaveBeenCalled();
  menus.confirmItems[1].action();
  expect(f.context.clear).toHaveBeenCalledOnce();
});
it("playback modes use playback ports while appearance uses only the preference port", () => {
  const f = fixture();
  const rows = f.menus().managedRows;
  rows["repeat-mode"]?.find(row => row.key === "one")?.action();
  expect(f.context.repeat).toHaveBeenCalledWith("one");
  expect(f.context.setPreferences).not.toHaveBeenCalled();
  rows.finish?.find(row => row.key === "black")?.action();
  expect(f.context.setPreferences).toHaveBeenCalledWith({ finish: "black" });
  expect(f.context.back).toHaveBeenCalledTimes(2);
});
it("customization keeps fixed entries disabled and toggles optional items without mutating the snapshot", () => {
  const f = fixture();
  const original = [...f.context.prefs.mainMenu];
  const rows = f.menus().managedRows["main-menu"]!;
  expect(rows.find(row => row.key === "music")?.disabled).toBe(true);
  expect(rows.find(row => row.key === "settings")?.disabled).toBe(true);
  rows.find(row => row.key === "photos")!.action();
  expect(f.context.setPreferences).toHaveBeenCalledWith({ mainMenu: original.filter(key => key !== "photos") });
  expect(f.context.prefs.mainMenu).toEqual(original);
  expect(f.context.back).not.toHaveBeenCalled();
});

it("stock settings order is stable and modern features have one labeled boundary", () => {
  const f = fixture();
  f.context.originalSettingsItems = ["finish", "click", "brightness", "repeat", "about", "shuffle", "lyrics-display", "music-menu", "backlight", "main-menu", "volume-limit"].map(key => ({ key, label: key, action: vi.fn() }));
  f.context.localTools = [{ key: "import", label: "Import", action: vi.fn() }];
  const menus = f.menus();
  expect(menus.settingsItems.map(row => row.key)).toEqual(["about", "shuffle", "repeat", "main-menu", "music-menu", "volume-limit", "backlight", "brightness", "click", "reipod-settings", "reset-settings"]);
  expect(menus.managedRows["reipod-settings"]!.map(row => row.key)).toEqual(["music-services", "import", "podcast-settings", "finish", "lyrics-display"]);
  menus.settingsItems.at(-1)!.action();
  expect(f.context.open).toHaveBeenCalledWith("reset-settings", "cancel");
});
it("native podcast maintenance is reachable through ReiPod settings without changing the chosen music source", () => {
  const f = fixture();
  f.menus().managedRows["reipod-settings"]!.find(row => row.key === "podcast-settings")!.action();
  expect(f.context.open).toHaveBeenCalledWith("podcast-settings");
  expect(f.context.selectedService).toBe("qq");
});
it("Reset Settings restores implemented firmware preferences through their owners and leaves extensions alone", () => {
  const f = fixture();
  f.context.prefs = parsePreferences({ finish: "black", background: "dark", lyricsEnabled: false, clickSound: false, brightness: .25, volumeLimit: .2, backlight: 0, menuVersion: 3, mainMenu: [], musicMenu: [] });
  const rows = f.menus().managedRows["reset-settings"]!;
  rows[0].action();
  expect(f.context.setPreferences).not.toHaveBeenCalled();
  rows[1].action();
  expect(f.context.setPreferences).toHaveBeenCalledWith({ clickSound: true, brightness: 1, volumeLimit: 1, backlight: 10, mainMenu: parsePreferences(null).mainMenu, musicMenu: parsePreferences(null).musicMenu });
  expect(f.context.shuffle).toHaveBeenCalledWith(false);
  expect(f.context.repeat).toHaveBeenCalledWith("off");
  expect(f.context.clear).not.toHaveBeenCalled();
  expect(f.context.state.tracks).toEqual([]);
  expect(f.context.prefs).toMatchObject({ finish: "black", background: "dark", lyricsEnabled: false, brightness: .25 });
});
