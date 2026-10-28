import { test, expect, vi } from "vitest";
vi.mock("@yakult-green-tea/qq-music-api/serverless", () => ({
  handleRequest: async (request) => {
    const path = new URL(request.url).pathname;
    if (path.endsWith("/key"))
      return Response.json({ data: { unikey: "fixture-key" } });
    if (path.endsWith("/create"))
      return Response.json({ data: { qrimg: "data:image/png;base64,AAAA" } });
    try {
      await fetch("https://xui.ptlogin2.qq.com/ssl/ptqrlogin?secret=private");
    } catch {}
    return Response.json({ code: 801 });
  },
}));
import { createRuntime } from "./runtime.mjs";
test("QQ network failure swallowed by its adapter is surfaced without query credentials", async () => {
  const original = globalThis.fetch;
  let state;
  try {
    const handle = await createRuntime({
      secret: "fixture",
      fetcher: async () => {
        throw new Error("transport failed");
      },
      storage: {
        load: async () => structuredClone(state),
        save: async (value) => {
          state = structuredClone(value);
        },
      },
    });
    const request = (action, body = {}) => ({
      version: 1,
      service: "qq",
      action,
      body,
      token: "",
    });
    const start = await handle(request("login-start"));
    const result = await handle(
      request("login-check", { key: start.data.key }),
    );
    expect(result.status).toBe(502);
    expect(result.data.error).toContain("xui.ptlogin2.qq.com/ssl/ptqrlogin");
    expect(result.data.error).not.toContain("private");
  } finally {
    globalThis.fetch = original;
  }
});
