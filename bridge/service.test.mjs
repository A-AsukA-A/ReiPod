import { test, expect } from "vitest";
import { createMusicService, validateOperation } from "./service.mjs";
import { allowedURL, restoreResponse } from "./network.mjs";
const request = (action, body = {}, token = "", service = "netease") => ({
  version: 1,
  service,
  action,
  body,
  token,
});
function fixture() {
  let state;
  const providers = {
    start: async () => ({
      key: "upstream-secret",
      image: "data:image/png;base64,AAAA",
    }),
    check: async () => ({ code: 803, cookie: "MUSIC_U=private-cookie" }),
    profile: async () => ({ id: "123", name: "User" }),
    cancel: async () => {},
    logout: async () => {},
    read: async (source, action, body, session) => ({
      tracks: [],
      owner: session?.profile.id,
    }),
  };
  const handle = createMusicService({
    providers,
    storage: {
      load: async () => structuredClone(state),
      save: async (value) => {
        state = structuredClone(value);
      },
    },
  });
  return { handle, providers, getState: () => state };
}
test("privileged service persists opaque sessions, never returns cookies, and isolates providers", async () => {
  const f = fixture();
  expect((await f.handle(request("status"))).data.authorized).toBe(false);
  const start = await f.handle(request("login-start"));
  expect(start.data.key).not.toBe("upstream-secret");
  const result = await f.handle(
    request("login-check", { key: start.data.key }),
  );
  expect(result.data.status).toBe("authorized");
  expect(JSON.stringify(result)).not.toContain("private-cookie");
  expect(
    (await f.handle(request("status", {}, result.data.token))).data.authorized,
  ).toBe(true);
  expect(
    (await f.handle(request("status", {}, result.data.token, "qq"))).status,
  ).toBe(401);
  expect((await f.handle(request("library"))).status).toBe(401);
  await f.handle(request("logout", {}, result.data.token));
  expect(
    (await f.handle(request("status", {}, result.data.token))).data.authorized,
  ).toBe(false);
});
test("cancel queued during login verification revokes the late session", async () => {
  const f = fixture();
  const start = await f.handle(request("login-start"));
  let release;
  f.providers.check = () =>
    new Promise((resolve) => {
      release = resolve;
    });
  const check = f.handle(request("login-check", { key: start.data.key }));
  while (!release) await Promise.resolve();
  const cancel = f.handle(request("login-cancel", { key: start.data.key }));
  release({ code: 803, cookie: "secret" });
  const result = await check;
  await cancel;
  expect(
    (await f.handle(request("status", {}, result.data.token))).data.authorized,
  ).toBe(false);
});
test("expired QR, duplicate checks and restored state behave deterministically", async () => {
  let state;
  let now = 1;
  const f = fixture();
  const storage = {
    load: async () => structuredClone(state),
    save: async (s) => {
      state = structuredClone(s);
    },
  };
  const first = createMusicService({
    providers: f.providers,
    storage,
    now: () => now,
  });
  const start = await first(request("login-start"));
  const result = await first(request("login-check", { key: start.data.key }));
  const restored = createMusicService({
    providers: f.providers,
    storage,
    now: () => now,
  });
  expect(
    (await restored(request("login-check", { key: start.data.key }))).data
      .token,
  ).toBe(result.data.token);
  expect(
    (await restored(request("status", {}, result.data.token))).data.authorized,
  ).toBe(true);
  const expired = await restored(request("login-start"));
  now += 180001;
  expect(
    (await restored(request("login-check", { key: expired.data.key }))).status,
  ).toBe(410);
});
test("bridge rejects arbitrary operations and network destinations", () => {
  for (const action of ["fetch", "delete-account", "http://example.com"])
    expect(() => validateOperation(request(action))).toThrow();
  expect(() =>
    validateOperation(request("playlist", { id: "../etc" })),
  ).toThrow();
  expect(() => validateOperation(request("library", { offset: -1 }))).toThrow();
  expect(allowedURL("https://music.163.com/weapi/test")).toBe(true);
  for (const url of [
    "http://music.163.com/",
    "https://music.163.com.evil.test/",
    "https://music.163.com@evil.test/",
    "https://music.163.com:8443/",
    "http://127.0.0.1/",
  ])
    expect(allowedURL(url)).toBe(false);
});
test("native network responses preserve repeated Set-Cookie fields", async () => {
  const response = restoreResponse({
    status: 200,
    body: btoa('{"ok":true}'),
    headers: [
      ["Set-Cookie", "a=1; Path=/"],
      ["Set-Cookie", "b=2; Path=/"],
    ],
  });
  expect(response.headers.getSetCookie()).toEqual([
    "a=1; Path=/",
    "b=2; Path=/",
  ]);
  expect(await response.json()).toEqual({ ok: true });
});
