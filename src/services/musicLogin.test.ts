import { afterEach, expect, test, vi } from "vitest";
import { openMusicLogin, usesExternalMusicLogin, musicLoginTarget } from "./musicLogin";
const netease = "https://music.163.com/login?codekey=fixture";
const qq = "qqmusic://qq.com/other/openid?p=fixture";
afterEach(() => vi.unstubAllGlobals());
test.each([
  ["iPhone", "iPhone", 1, true], ["Android", "Linux", 5, true],
  ["Macintosh", "MacIntel", 5, true], ["Macintosh", "MacIntel", 0, false],
])("detects mobile %s/%s/%i", (userAgent, platform, maxTouchPoints, expected) => {
  vi.stubGlobal("window", {});
  vi.stubGlobal("navigator", { userAgent, platform, maxTouchPoints });
  expect(usesExternalMusicLogin()).toBe(expected);
});
test("native login passes the session-bound URL and propagates launch failure", async () => {
  const postMessage = vi.fn().mockRejectedValue(new Error("launch failed"));
  vi.stubGlobal("window", { __REIPOD_SERVICE_VERSION__: 1, webkit: { messageHandlers: { reipodService: { postMessage } } } });
  await expect(openMusicLogin("qq", qq)).rejects.toThrow("launch failed");
  expect(postMessage).toHaveBeenCalledWith({ version: 1, service: "qq", action: "open-login", loginUrl: qq });
});
test("NetEase rejects web-login wrapping instead of opening an unrelated account", async () => {
  const open = vi.fn();
  vi.stubGlobal("window", { open });
  await expect(openMusicLogin("netease", netease)).rejects.toThrow("二维码");
  expect(open).not.toHaveBeenCalled();
});
test("blocked mobile popup preserves ReiPod and requests a fresh user gesture", async () => {
  const assign = vi.fn();
  vi.stubGlobal("window", { open: vi.fn(() => null), location: { assign } });
  await expect(openMusicLogin("qq", qq)).rejects.toThrow("再次按中心键");
  expect(assign).not.toHaveBeenCalled();
});
test("launches the QQ authorization route without an opener", async () => {
  const tab = { opener: {}, location: { replace: vi.fn() } };
  vi.stubGlobal("window", { open: vi.fn(() => tab) });
  await openMusicLogin("qq", qq);
  expect(tab.opener).toBeNull();
  expect(tab.location.replace).toHaveBeenCalledWith(qq);
});
test.each(["javascript:alert(1)", "https://evil.test/login?codekey=x", "https://music.163.com.evil.test/login?codekey=x", "qqmusic://evil.test/other/openid", "qqmusic://qq.com/unrelated", "https://user@music.163.com/login?codekey=x"])("rejects unrelated authorization destination %s", raw => {
  expect(() => musicLoginTarget("netease", raw)).toThrow();
  expect(() => musicLoginTarget("qq", raw)).toThrow();
});
