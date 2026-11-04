import { expect, test } from "vitest";
import { musicEndpoint } from "./musicEndpoint";

test.each([
  "https://julyblog.party/ReiPod/",
  "https://a-asuka-a.github.io/ReiPod/",
  "https://example.test/nested/",
])("public subpath %s uses the maintained HTTPS backend", page => {
  expect(musicEndpoint("netease", "status", page).href).toBe("https://julyblog.party/api/music/netease/status");
});
test("local development uses the root API even under a subpath", () => {
  expect(musicEndpoint("netease", "status", "http://127.0.0.1:4173/ReiPod/").href).toBe("http://127.0.0.1:4173/api/music/netease/status");
});
test("an explicit self-hosted backend takes precedence", () => {
  expect(musicEndpoint("qq", "login-start", "https://example.test/ReiPod/", "https://music.example/api/music").href).toBe("https://music.example/api/music/qq/login-start");
  expect(() => musicEndpoint("qq", "status", "https://example.test/", "http://music.example/api/music/")).toThrow("HTTPS");
});
