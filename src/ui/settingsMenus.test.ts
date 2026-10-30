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
  expect(menus.settingsItems[1].value).toBe("QQ 音乐");
  expect(menus.settingsItems.find(row => row.key === "clear")?.disabled).toBe(true);
  menus.settingsItems[1].action();
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
