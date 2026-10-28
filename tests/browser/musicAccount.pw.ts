import { test, expect } from "@playwright/test";
import { choose, key, live } from "./dial";

for (const [source, name] of [
  ["netease", "网易云音乐"],
  ["qq", "QQ 音乐"],
] as const) {
  test(`${source} shows identity, keeps synchronization focus and clears profile after logout`, async ({
    page,
  }, testInfo) => {
    let signedIn = true,
      waiting = false,
      logoutCalls = 0;
    let finish!: () => void;
    const profile = {
      id: "12345678901234567890",
      name: "很长的账户昵称也应该保持布局整齐 Account Name",
      avatar: "https://avatar.reipod.test/user.svg",
    };
    await page.addInitScript((source) => {
      localStorage.setItem("reipod-music-service", source);
      localStorage.setItem(`reipod-${source}-session`, "fixture-session");
    }, source);
    await page.route("https://avatar.reipod.test/**", (route) =>
      route.fulfill({
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="#9fc1db"/><circle cx="20" cy="15" r="7" fill="#fff"/><path d="M5 40v-5a15 15 0 0 1 30 0v5" fill="#fff"/></svg>',
      }),
    );
    await page.route("**/api/music/**", async (route) => {
      const action = new URL(route.request().url()).pathname.split("/").at(-1);
      if (action === "library" && waiting)
        await new Promise<void>((resolve) => {
          finish = resolve;
        });
      if (action === "logout") {
        signedIn = false;
        logoutCalls++;
      }
      await route.fulfill({
        json:
          action === "status"
            ? { authorized: signedIn, profile: signedIn ? profile : undefined }
            : action === "library"
              ? { tracks: [{ id: "1", title: "Song" }] }
              : action === "playlists"
                ? { playlists: [{ id: "1", name: "Playlist" }] }
                : {},
      });
    });
    await page.goto("/");
    await choose(page, "设置");
    await choose(page, "音乐服务");
    await choose(page, name);
    await expect(live(page).getByRole("status")).toContainText(
      `已连接 ${name}`,
    );
    await expect(live(page).locator(".music-account-name strong")).toHaveText(
      profile.name,
    );
    await expect(live(page).locator(".music-account-id")).toHaveText(
      `ID ${profile.id}`,
    );
    await expect(live(page).getByAltText("账户头像")).toBeVisible();
    await expect(live(page).locator(".row-title")).toHaveText([
      "刷新资料库",
      "退出登录",
    ]);
    await expect(page.locator(".screen-outgoing")).toHaveCount(0);
    await page
      .locator(".classic-device")
      .screenshot({ path: testInfo.outputPath("account.png") });
    waiting = true;
    await choose(page, "刷新资料库");
    await expect(
      live(page).locator('.screen-row[aria-current="true"] .row-title'),
    ).toHaveText("正在同步…");
    await key(page, "Enter");
    await expect(
      live(page).locator('.screen-row[aria-current="true"] .row-title'),
    ).toHaveText("正在同步…");
    expect(logoutCalls).toBe(0);
    await key(page, "ArrowDown");
    await expect(
      live(page).locator('.screen-row[aria-current="true"] .row-title'),
    ).toHaveText("退出登录");
    await key(page, "ArrowUp");
    await expect(
      live(page).locator('.screen-row[aria-current="true"] .row-title'),
    ).toHaveText("正在同步…");
    await page
      .locator(".classic-device")
      .screenshot({ path: testInfo.outputPath("account-syncing.png") });
    waiting = false;
    finish();
    await expect(
      live(page).locator('.screen-row[aria-current="true"] .row-title'),
    ).toHaveText("刷新资料库");
    await page.setViewportSize({ width: 320, height: 700 });
    const dimensions = await live(page)
      .locator(".music-account-screen")
      .evaluate((el) => ({ width: el.clientWidth, scroll: el.scrollWidth }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
    await expect(live(page).locator(".row-title").last()).toBeVisible();
    await page
      .locator(".classic-device")
      .screenshot({ path: testInfo.outputPath("account-narrow.png") });
    await choose(page, "退出登录");
    await expect(live(page).locator(".music-account-id")).not.toContainText(
      profile.id,
    );
    await expect(
      live(page).locator(".music-account-name strong"),
    ).not.toContainText(profile.name);
    expect(logoutCalls).toBe(1);
  });
}

test("an unavailable avatar falls back without losing public profile or overflowing the LCD", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("reipod-music-service", "netease"),
  );
  await page.route("https://avatar.reipod.test/**", (route) => route.abort());
  await page.route("**/api/music/**", (route) => {
    const action = new URL(route.request().url()).pathname.split("/").at(-1);
    return route.fulfill({
      json:
        action === "status"
          ? {
              authorized: true,
              profile: {
                id: "123",
                name: "User",
                avatar: "https://avatar.reipod.test/missing.jpg",
              },
            }
          : action === "library"
            ? { tracks: [] }
            : { playlists: [] },
    });
  });
  await page.goto("/");
  await choose(page, "设置");
  await choose(page, "音乐服务");
  await choose(page, "网易云音乐");
  await expect(
    live(page).getByRole("img", { name: "默认账户头像" }),
  ).toBeVisible();
  await expect(live(page).locator(".music-account-id")).toHaveText("ID 123");
});

test("a missing extension exposes installation guidance through the wheel", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "__REIPOD_SERVICE_VERSION__", { value: 1 });
    Object.defineProperty(window, "webkit", {
      value: {
        messageHandlers: {
          reipodService: {
            postMessage: async () => {
              throw new Error("请安装并启用 ReiPod 音乐扩展，然后重试连接");
            },
          },
        },
      },
    });
  });
  await page.goto("/");
  await choose(page, "设置");
  await choose(page, "音乐服务");
  await choose(page, "网易云音乐");
  await expect(live(page).getByRole("status")).toContainText(
    "需要安装音乐扩展",
  );
  await expect(live(page).locator(".row-title")).toContainText([
    "扫码登录 网易云音乐",
    "下载扩展安装助手",
  ]);
  const opened = page.waitForEvent("popup");
  await choose(page, "下载扩展安装助手");
  const popup = await opened;
  await expect.poll(() => popup.url()).toContain("/extension-install.html");
  await expect(
    popup.getByRole("link", { name: "下载安装助手", exact: true }),
  ).toBeVisible();
  const metadata = await (
    await popup.request.get(
      new URL("downloads/extension.json", popup.url()).href,
    )
  ).json();
  const archive = await popup.request.get(
    new URL("downloads/" + metadata.filename, popup.url()).href,
  );
  expect(archive.ok()).toBe(true);
  const { createHash } = await import("node:crypto");
  expect(
    createHash("sha256")
      .update(await archive.body())
      .digest("hex"),
  ).toBe(metadata.sha256);
  const helper = await (
    await popup.request.get(
      new URL("downloads/install-reipod.command", popup.url()).href,
    )
  ).text();
  expect(helper).toContain(metadata.sha256);
  expect(helper).not.toContain("@@");
});
