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
  expect(sent.url).toBe("https://music.163.com/api/login/qrcode/client/login");
  expect(new URLSearchParams(sent.options.body).has("encSecKey")).toBe(false);
  const form = new URLSearchParams(sent.options.body);
  expect(form.get("key")).toBe("qr-key");
  expect(form.get("type")).toBe("3");
  expect(form.get("secureCaptcha")).toBe("");
  expect(form.has("params")).toBe(false);
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

test("QR requests preserve server cookies and clear them for a fresh login", async () => {
  const sent = [];
  const api = createNetEase(
    async (url, options) => {
      sent.push(options.headers.Cookie);
      const response = Response.json({ code: 801 });
      response.headers.getSetCookie = () =>
        sent.length === 1 ? ["NMTID=challenge-cookie; Path=/; Secure"] : [];
      return response;
    },
    { deviceId: "stable-device" },
  );
  await api.login_qr_key();
  await api.login_qr_check({ key: "fixture" });
  expect(sent[1]).toContain("NMTID=challenge-cookie");
  expect(sent[1]).not.toContain("deviceId=");
  await api.login_qr_key();
  expect(sent[2]).not.toContain("NMTID=challenge-cookie");
});
