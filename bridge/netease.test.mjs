import { test, expect, vi } from "vitest";
import CryptoJS from "crypto-js";
import vector from "./fixtures/weapi.json";
import { createNetEase, weapi } from "./netease.mjs";

test("weapi matches the existing backend protocol for a deterministic key", () => {
  // All zero random bytes select the same all-a key in the adapter and upstream.
  const random = vi
    .spyOn(crypto, "getRandomValues")
    .mockImplementation((array) => {
      array.fill(0);
      return array;
    });
  try {
    expect(weapi(vector.input)).toEqual(vector.expected);
  } finally {
    random.mockRestore();
  }
});
test("NetEase adapter sends signed HTTPS requests and captures login cookies", async () => {
  let sent;
  const api = createNetEase(async (url, options) => {
    sent = { url, options };
    const response = Response.json({ code: 803 });
    response.headers.getSetCookie = () => [
      "MUSIC_U=private; HttpOnly",
      "__csrf=csrf; Path=/",
    ];
    return response;
  });
  const result = await api.login_qr_check({ key: "qr-key" });
  expect(sent.url).toBe(
    "https://music.163.com/weapi/login/qrcode/client/login?csrf_token=",
  );
  expect(new URLSearchParams(sent.options.body).get("encSecKey")).toHaveLength(
    256,
  );
  expect(result.body.cookie).toBe("MUSIC_U=private; __csrf=csrf");
  expect(CryptoJS.AES).toBeDefined();
});

test("QR generation works without DOM or canvas", async () => {
  const api = createNetEase(() => {
    throw new Error("Unexpected network");
  });
  const result = await api.login_qr_create({ key: "fixture" });
  expect(result.body.data.qrimg).toMatch(/^data:image\/svg\+xml;base64,/);
  expect(atob(result.body.data.qrimg.split(",")[1])).toContain("<svg");
});
