import { afterEach, expect, test, vi } from "vitest";
import { bridgeMusicRequest, useMusicBridge } from "./musicTransport";
afterEach(() => vi.unstubAllGlobals());
test("bundled app uses its service bridge without fetch and respects cancellation", async () => {
  const postMessage = vi
    .fn()
    .mockResolvedValue({ status: 401, data: { error: "请先扫码登录" } });
  vi.stubGlobal("window", {
    __REIPOD_SERVICE_VERSION__: 1,
    webkit: { messageHandlers: { reipodService: { postMessage } } },
  });
  expect(useMusicBridge()).toBe(true);
  const reply = await bridgeMusicRequest(
    "netease",
    "library",
    {},
    "opaque",
    new AbortController().signal,
  );
  expect(reply.status).toBe(401);
  expect(postMessage).toHaveBeenCalledWith({
    version: 1,
    service: "netease",
    action: "library",
    body: {},
    token: "opaque",
  });
  const controller = new AbortController();
  controller.abort();
  await expect(
    bridgeMusicRequest("netease", "status", {}, "", controller.signal),
  ).rejects.toThrow();
  expect(postMessage).toHaveBeenCalledTimes(1);
});
test("a missing bundled service cannot silently fall back to HTTP", async () => {
  vi.stubGlobal("window", { __REIPOD_SERVICE_VERSION__: 1 });
  await expect(
    bridgeMusicRequest("qq", "status", {}, "", new AbortController().signal),
  ).rejects.toThrow("内置音乐服务不可用");
});
