import { afterEach, expect, test, vi } from "vitest";
import { openMusicLogin, usesExternalMusicLogin, musicWebsites } from "./musicLogin";
afterEach(() => vi.unstubAllGlobals());
test.each([
  ["iPhone", "iPhone", 1, true],
  ["Android", "Linux", 5, true],
  ["Macintosh", "MacIntel", 5, true],
  ["Macintosh", "MacIntel", 0, false],
])("detects mobile %s/%s/%i", (userAgent, platform, maxTouchPoints, expected) => {
  vi.stubGlobal("window", {});
  vi.stubGlobal("navigator", { userAgent, platform, maxTouchPoints });
  expect(usesExternalMusicLogin()).toBe(expected);
});
test("native login sends only a provider operation and propagates launch failure", async () => {
  const postMessage = vi.fn().mockRejectedValue(new Error("launch failed"));
  vi.stubGlobal("window", { __REIPOD_SERVICE_VERSION__: 1, webkit: { messageHandlers: { reipodService: { postMessage } } } });
  expect(usesExternalMusicLogin()).toBe(true);
  await expect(openMusicLogin("qq")).rejects.toThrow("launch failed");
  expect(postMessage).toHaveBeenCalledWith({ version: 1, service: "qq", action: "open-login" });
});
test("blocked mobile popup falls back to direct official navigation", async () => {
  const assign = vi.fn();
  vi.stubGlobal("window", { open: vi.fn(() => null), location: { assign } });
  await openMusicLogin("netease");
  expect(assign).toHaveBeenCalledWith(musicWebsites.netease);
});
test("external tab cannot access ReiPod through opener", async () => {
  const tab = { opener: {}, location: { replace: vi.fn() } };
  vi.stubGlobal("window", { open: vi.fn(() => tab) });
  await openMusicLogin("qq");
  expect(tab.opener).toBeNull();
  expect(tab.location.replace).toHaveBeenCalledWith(musicWebsites.qq);
});
