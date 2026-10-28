import { test, expect, chromium } from "@playwright/test";
import { resolve } from "node:path";

test("packaged extension bridges only allowed pages and rejects arbitrary operations", async () => {
  const extension = resolve(".local/extension");
  const context = await chromium.launchPersistentContext("", {
    channel: "chromium",
    headless: true,
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
    ],
  });
  try {
    await context.route("https://a-asuka-a.github.io/**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<!doctype html><title>Bridge fixture</title>",
      }),
    );
    const page = await context.newPage();
    await page.goto("https://a-asuka-a.github.io/ReiPod/");
    const send = async (request: Record<string, unknown>) =>
      page.evaluate(
        (request) =>
          new Promise<Record<string, unknown>>((resolve, reject) => {
            const id = crypto.randomUUID();
            const timer = setTimeout(
              () => reject(new Error("No extension reply")),
              10000,
            );
            const receive = (event: MessageEvent) => {
              if (
                event.data?.channel === "reipod-music-reply" &&
                event.data.id === id
              ) {
                clearTimeout(timer);
                window.removeEventListener("message", receive);
                resolve(event.data.reply);
              }
            };
            window.addEventListener("message", receive);
            window.postMessage(
              { channel: "reipod-music-request", id, request },
              location.origin,
            );
          }),
        request,
      );
    expect(await send({ version: 1, action: "bridge-status" })).toMatchObject({
      status: 200,
      data: { transport: "extension" },
    });
    for (const service of ["netease", "qq"])
      expect(
        await send({
          version: 1,
          service,
          action: "status",
          body: {},
          token: "",
        }),
      ).toEqual({ status: 200, data: { authorized: false } });
    expect(
      await send({
        version: 1,
        service: "netease",
        action: "fetch",
        body: { url: "https://evil.test/" },
      }),
    ).toMatchObject({ status: 400 });
    await context.route(
      /^https:\/\/(?:music|interfacepc\.music)\.163\.com\//,
      async (route) => {
        const path = new URL(route.request().url()).pathname;
        const data = path.includes("/unikey")
          ? { code: 200, unikey: "fixture-key" }
          : path.includes("/client/login")
            ? { code: 803 }
            : {
                code: 200,
                account: { id: 123 },
                profile: { nickname: "Fixture user" },
              };
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: {
            "Set-Cookie":
              "MUSIC_U=fixture-private-cookie; Path=/; Secure; HttpOnly",
          },
          body: JSON.stringify(data),
        });
      },
    );
    const started = await send({
      version: 1,
      service: "netease",
      action: "login-start",
      body: {},
      token: "",
    });
    expect(started).toMatchObject({
      status: 200,
      data: { image: expect.stringMatching(/^data:image\/svg\+xml;base64,/) },
    });
    const key = (started.data as Record<string, unknown>).key;
    const loggedIn = await send({
      version: 1,
      service: "netease",
      action: "login-check",
      body: { key },
      token: "",
    });
    // CDP route fulfillment does not deliver HttpOnly cookies through webRequest.
    // The adapter must refuse a nominal success without an actual platform session.
    expect(loggedIn).toMatchObject({
      status: 502,
      data: { error: "平台未返回登录会话" },
    });
    expect(JSON.stringify(loggedIn)).not.toContain("fixture-private-cookie");
    expect(
      await send({
        version: 1,
        service: "netease",
        action: "status",
        body: {},
        token: "",
      }),
    ).toMatchObject({ data: { authorized: false } });
    await send({
      version: 1,
      service: "netease",
      action: "login-cancel",
      body: { key },
      token: "",
    });
    const worker =
      context.serviceWorkers()[0] ??
      (await context.waitForEvent("serviceworker"));
    const access = await worker.evaluate(async () => {
      const chrome = (globalThis as any).chrome;
      return {
        rules: await chrome.declarativeNetRequest.getSessionRules(),
        state: await chrome.storage.local.get("state"),
      };
    });
    expect(access.rules).toEqual([]);
    expect(JSON.stringify(access.state)).not.toContain("MUSIC_U");
    await page.goto("https://a-asuka-a.github.io/another-project/");
    expect(
      await page.evaluate(
        () =>
          new Promise((resolve) => {
            const id = crypto.randomUUID();
            window.addEventListener("message", (event) => {
              if (
                event.data?.id === id &&
                event.data.channel === "reipod-music-reply"
              )
                resolve(true);
            });
            window.postMessage(
              {
                channel: "reipod-music-request",
                id,
                request: { version: 1, action: "bridge-status" },
              },
              location.origin,
            );
            setTimeout(() => resolve(false), 500);
          }),
      ),
    ).toBe(false);
  } finally {
    await context.close();
  }
});

test("Pages UI uses the extension for QR login without an HTTP music backend", async () => {
  const { readFile } = await import("node:fs/promises");
  const { extname } = await import("node:path");
  const { choose, live } = await import("./dial");
  const extension = resolve(".local/extension");
  const context = await chromium.launchPersistentContext("", {
    channel: "chromium",
    headless: true,
    viewport: { width: 390, height: 844 },
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
    ],
  });
  try {
    let backendRequests = 0;
    await context.route(
      "https://a-asuka-a.github.io/ReiPod/**",
      async (route) => {
        const path =
          new URL(route.request().url()).pathname.replace("/ReiPod/", "") ||
          "index.html";
        if (path.includes("api/music/")) {
          backendRequests++;
          await route.abort();
          return;
        }
        const types: Record<string, string> = {
          ".html": "text/html",
          ".js": "application/javascript",
          ".css": "text/css",
          ".json": "application/json",
          ".woff2": "font/woff2",
          ".mp3": "audio/mpeg",
        };
        await route.fulfill({
          body: await readFile(resolve("dist", path)),
          contentType: types[extname(path)] ?? "application/octet-stream",
        });
      },
    );
    await context.route(
      /^https:\/\/(?:music|interfacepc\.music)\.163\.com\//,
      (route) => route.fulfill({ json: { code: 200, unikey: "qr-fixture" } }),
    );
    const page = await context.newPage();
    await page.goto("https://a-asuka-a.github.io/ReiPod/");
    await choose(page, "设置");
    await choose(page, "音乐服务");
    await choose(page, "网易云音乐");
    await expect(live(page).locator(".row-title")).toContainText([
      "扫码登录 网易云音乐",
    ]);
    await choose(page, "扫码登录 网易云音乐");
    await expect(
      live(page).locator('img[src^="data:image/svg+xml;base64,"]'),
    ).toBeVisible();
    expect(backendRequests).toBe(0);
  } finally {
    await context.close();
  }
});
