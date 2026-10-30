import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { choose, home, key, live } from "./dial";

for (const [service, label] of [
  ["netease", "网易云音乐"],
  ["qq", "QQ 音乐"],
] as const) {
  test(`${label} scans in, reads a playlist in order, plays through its backend and retains local music`, async ({
    page,
  }) => {
    let loggedIn = false;
    const actions: string[] = [];
    const audio = await readFile("public/music/carefree.m4a");
    await page.route("https://audio.reipod.test/**", (route) =>
      route.fulfill({ contentType: "audio/mp4", body: audio }),
    );
    const tracks = [
      { id: "1", title: "Online First", artist: "Artist", duration: 120 },
      { id: "2", title: "Online Second", artist: "Artist", duration: 120 },
    ];
    await page.route("**/api/music/**", async (route) => {
      const parts = new URL(route.request().url()).pathname.split("/");
      const source = parts.at(-2),
        action = parts.at(-1)!;
      if (source !== service) {
        await route.fulfill({
          json: { error: "Unexpected source" },
          status: 400,
        });
        return;
      }
      actions.push(action);
      const body = route.request().postDataJSON() ?? {};
      const result =
        action === "status"
          ? { authorized: loggedIn }
          : action === "login-start"
            ? {
                key: "fixture-challenge",
                image:
                  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9z8AAAAASUVORK5CYII=",
              }
            : action === "login-check"
              ? ((loggedIn = true),
                {
                  status: "authorized",
                  token: "fixture-session",
                  profile: { id: "12345", name: "已登录用户" },
                })
              : action === "library"
                ? { tracks }
                : action === "playlists"
                  ? { playlists: [{ id: "12", name: "Online Playlist" }] }
                  : action === "playlist"
                    ? { tracks: [...tracks].reverse() }
                    : action === "playback"
                      ? { url: `https://audio.reipod.test/${body.id}.mp3` }
                      : action === "logout"
                        ? ((loggedIn = false), {})
                        : {};
      await route.fulfill({ json: result });
    });
    await page.goto("/");
    await choose(page, "设置");
    await choose(page, "音乐服务");
    await choose(page, label);
    await choose(page, `扫码登录 ${label}`);
    await expect(live(page).getByAltText(`${label}登录二维码`)).toBeVisible();
    const image = await live(page)
      .getByAltText(`${label}登录二维码`)
      .boundingBox();
    const menu = await live(page).locator(".screen-menu").boundingBox();
    expect(image!.y + image!.height).toBeLessThanOrEqual(menu!.y);
    await expect(live(page).getByRole("status")).toContainText(
      `已连接 ${label}`,
    );
    await expect(live(page).locator(".music-account-name strong")).toHaveText(
      "已登录用户",
    );
    await expect(live(page).locator(".music-account-id")).toHaveText(
      "ID 12345",
    );
    await home(page);
    await choose(page, "音乐");
    await choose(page, "播放列表");
    await choose(page, "Online Playlist");
    await expect(live(page).locator(".row-title")).toHaveText([
      "Online Second",
      "Online First",
    ]);
    await choose(page, "Online Second");
    await expect(live(page).locator(".np-info strong")).toHaveText(
      "Online Second",
    );
    await expect.poll(() => actions.includes("playback")).toBe(true);
    await expect(page.locator("main")).toHaveAttribute(
      "data-playback-source",
      service,
    );
    await expect(live(page).locator(".screen-playing-link")).toHaveAttribute(
      "aria-label",
      "正在播放",
    );
    await key(page, "Space");
    await expect(live(page).locator(".screen-playing-link")).toHaveAttribute(
      "aria-label",
      "已暂停",
    );
    await key(page, "ArrowRight");
    await expect(live(page).locator(".np-info strong")).toHaveText(
      "Online First",
    );
    await home(page);
    await choose(page, "音乐");
    await choose(page, "本地音乐");
    await expect(live(page).locator(".row-title")).not.toContainText([
      "Online First",
      "Online Second",
    ]);
    await expect(live(page).locator(".settings-screen")).toHaveCount(0);
    await choose(page, "Carefree");
    await expect(page.locator("main")).toHaveAttribute(
      "data-playback-source",
      "local",
    );
  });
}

test("an unavailable self-hosted backend remains disconnected and local music is usable", async ({
  page,
}) => {
  await page.route("**/api/music/**", (route) =>
    route.fulfill({ status: 502, json: { error: "音乐服务暂未连接" } }),
  );
  await page.goto("/");
  await choose(page, "设置");
  await choose(page, "音乐服务");
  await choose(page, "网易云音乐");
  await expect(live(page).getByRole("status")).toContainText(
    "音乐服务暂未连接",
  );
  await expect(live(page).locator(".row-title")).not.toContainText([
    "退出登录",
  ]);
  await choose(page, "本地音乐");
  await choose(page, "Carefree");
  await expect(page.locator("main")).toHaveAttribute(
    "data-playback-source",
    "local",
  );
});

for (const [service, label, loginUrl, target] of [
  ["netease", "网易云音乐", "https://music.163.com/login?codekey=fixture", "orpheus://openurl?url="],
  ["qq", "QQ 音乐", "qqmusic://qq.com/other/openid?p=fixture", "qqmusic://qq.com/other/openid"],
] as const) {
  test(`${label} mobile opens a bound App authorization and receives its login session`, async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "userAgent", { value: "Mozilla/5.0 (iPhone) Mobile" });
      let attempts = 0;
      Object.defineProperty(window, "open", { value: () => {
        if (++attempts === 1) return null; // Simulate Safari rejecting the asynchronous launch.
        return { opener: null, location: { replace: (url: string) => {
          document.documentElement.dataset.loginDestination = url;
        } } };
      } });
    });
    const actions: string[] = [];
    let approved = false;
    await page.route("**/api/music/**", async route => {
      const action = new URL(route.request().url()).pathname.split("/").at(-1)!;
      actions.push(action);
      const body = route.request().postDataJSON();
      if (action === "login-check") expect(body.key).toBe("bound-challenge");
      if (action === "login-start" && service === "qq") expect(body.channel).toBe("qqmusic");
      await route.fulfill({ json:
        action === "status" ? { authorized: false } :
        action === "login-start" ? { key: "bound-challenge", image: "data:image/png;base64,fixture", loginUrl } :
        action === "login-check" ? (approved ? { status: "authorized", token: "mobile-fixture-session", profile: { id: "123", name: "手机授权用户" } } : { status: "waiting" }) :
        { tracks: [], playlists: [] }
      });
    });
    await page.goto("/");
    await choose(page, "设置");
    await choose(page, "音乐服务");
    await choose(page, label);
    await choose(page, `打开 ${label} 登录`);
    await expect(live(page)).toContainText("再次按中心键");
    await choose(page, `打开 ${label} 确认`);
    expect(await page.locator("html").getAttribute("data-login-destination")).toContain(target);
    await expect(live(page).locator(".music-login-qr")).toHaveCount(0);
    expect(actions.filter(action => action === "login-start")).toHaveLength(1);
    await page.reload();
    await choose(page, "设置");
    await choose(page, "音乐服务");
    await choose(page, label);
    await expect(live(page)).toContainText(`打开 ${label} 确认`);
    expect(actions.filter(action => action === "login-start")).toHaveLength(1);
    approved = true;
    await expect(live(page).getByRole("status")).toContainText(`已连接 ${label}`);
    await expect(live(page).locator(".music-account-name strong")).toHaveText("手机授权用户");
    expect(await page.evaluate(service => localStorage.getItem(`reipod-${service}-session`), service)).toBe("mobile-fixture-session");
  });
}
