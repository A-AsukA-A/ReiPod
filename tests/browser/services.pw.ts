import { test, expect } from "@playwright/test";
import { live, key, choose, home, text } from "./dial";
import { appleMusicFixture } from "./appleMusicFixture";

test("service choice persists, unconfigured Apple Music is honest, and local files stay available", async ({
  page,
}) => {
  await page.goto("/");
  await choose(page, "设置");
  await choose(page, "音乐服务");
  await expect(live(page).locator(".row-title")).toHaveText([
    "Apple Music",
    "本地音乐",
    "网易云音乐",
    "QQ 音乐",
  ]);
  await expect(page.locator(".screen-outgoing")).toHaveCount(0);
  await page
    .locator(".screen-glass")
    .screenshot({ path: ".local/screenshots/music-service-picker.png" });
  await choose(page, "Apple Music");
  await home(page);
  await choose(page, "音乐");
  await choose(page, "登录 Apple Music");
  await expect(live(page).getByRole("status")).toContainText(
    "网站尚未配置 Apple Music",
  );
  await choose(page, "本地音乐");
  await expect(live(page).locator(".row-title")).toContainText(["Carefree"]);
  await page.reload();
  await expect(page.locator("main")).toHaveAttribute(
    "data-music-service",
    "apple-music",
  );
  await choose(page, "设置");
  await choose(page, "音乐服务");
  await choose(page, "本地音乐");
  await home(page);
  await choose(page, "音乐");
  await choose(page, "播放列表");
  await expect(live(page).locator(".row-title")).toContainText(["新建歌单…"]);
});

test("Apple library pagination, playlists, catalog search and playback stay separate from local music", async ({
  page,
}) => {
  await appleMusicFixture(page);
  await page.goto("/");
  await expect(page.locator("main")).toHaveAttribute(
    "data-music-service",
    "apple-music",
  );
  await choose(page, "音乐");
  await choose(page, "登录 Apple Music");
  await choose(page, "登录 Apple Music");
  await expect(live(page).getByRole("status")).toContainText(
    "2 首歌曲 · 2 个歌单",
  );
  await home(page);
  await choose(page, "音乐");
  await choose(page, "播放列表");
  await expect(live(page).locator(".row-title")).toHaveText([
    "Apple First List",
    "Apple Second List",
    "刷新 Apple Music 歌单",
    "Apple Music 账户",
  ]);
  await choose(page, "Apple First List");
  await expect(live(page).locator(".row-title")).toHaveText([
    "Cloud First",
    "Cloud Second",
  ]);
  await expect(page.locator(".screen-outgoing")).toHaveCount(0);
  await page
    .locator(".screen-glass")
    .screenshot({ path: ".local/screenshots/apple-playlist.png" });
  await choose(page, "Cloud First");
  await expect(live(page).locator(".np-info strong")).toHaveText("Cloud First");
  await expect(page.locator("main")).toHaveAttribute(
    "data-playback-source",
    "apple-music",
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { __appleTest: { plays: string[] } })
            .__appleTest.plays,
      ),
    )
    .toContain("i.first");
  await key(page, "ArrowRight");
  await expect(live(page).locator(".np-info strong")).toHaveText(
    "Cloud Second",
  );
  await key(page, "Space");
  await page.reload();
  await expect(page.locator("main")).toHaveAttribute(
    "data-playback-source",
    "apple-music",
  );
  await choose(page, "正在播放");
  await expect(live(page).locator(".np-info strong")).toHaveText(
    "Cloud Second",
  );
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __appleTest: { plays: string[] } }).__appleTest
          .plays,
    ),
  ).toEqual([]);
  await home(page);
  await choose(page, "音乐");
  await choose(page, "搜索 Apple Music");
  await text(page, "Cloud");
  await expect(live(page).locator(".row-title")).toContainText([
    "Catalog Result",
  ]);
  await home(page);
  await choose(page, "音乐");
  await choose(page, "本地音乐");
  await expect(live(page).locator(".row-title")).not.toContainText([
    "Cloud First",
  ]);
  await choose(page, "Carefree");
  await expect(page.locator("main")).toHaveAttribute(
    "data-playback-source",
    "local",
  );
  await expect(live(page).locator(".np-info strong")).toHaveText("Carefree");
  await page.reload();
  await choose(page, "音乐");
  await choose(page, "Apple Music 账户");
  await expect(live(page).getByRole("status")).toContainText(
    "已连接 Apple Music",
  );
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __appleTest: { logins: number } }).__appleTest
          .logins,
    ),
  ).toBe(0);
  await choose(page, "退出登录");
  await expect(live(page).getByRole("status")).toContainText(
    "连接你的 Apple Music",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("reipod-apple-user")),
  ).toBeNull();
  await home(page);
  await choose(page, "音乐");
  await choose(page, "本地音乐");
  await expect(live(page).locator(".row-title")).toContainText(["Carefree"]);
});

test("expired user authorization is cleared and can be renewed through the official login action", async ({
  page,
}) => {
  await appleMusicFixture(page, { expiredUser: true });
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("reipod-apple-user")))
    .toBeNull();
  await choose(page, "音乐");
  await choose(page, "登录 Apple Music");
  await expect(live(page).getByRole("status")).toContainText("授权已失效");
  await choose(page, "登录 Apple Music");
  await expect(live(page).getByRole("status")).toContainText(
    "已连接 Apple Music",
  );
});

test("canceling Apple authorization keeps the account signed out", async ({
  page,
}) => {
  await appleMusicFixture(page, { cancel: true });
  await page.goto("/");
  await expect(page.locator("main")).toHaveAttribute(
    "data-music-service",
    "apple-music",
  );
  await choose(page, "音乐");
  await choose(page, "登录 Apple Music");
  await choose(page, "登录 Apple Music");
  await expect(live(page).getByRole("status")).toContainText("登录未完成");
  expect(
    await page.evaluate(() => localStorage.getItem("reipod-apple-user")),
  ).toBeNull();
  await home(page);
  await choose(page, "音乐");
  await expect(live(page).locator(".row-title")).toHaveText([
    "登录 Apple Music",
    "本地音乐",
  ]);
});

test("changing and pausing a still-loading Apple song cannot start the stale queue", async ({
  page,
}) => {
  await appleMusicFixture(page, { queueDelay: 200 });
  await page.goto("/");
  await expect(page.locator("main")).toHaveAttribute(
    "data-music-service",
    "apple-music",
  );
  await choose(page, "音乐");
  await choose(page, "登录 Apple Music");
  await choose(page, "登录 Apple Music");
  await expect(live(page).getByRole("status")).toContainText("2 首歌曲");
  await home(page);
  await choose(page, "音乐");
  await choose(page, "歌曲");
  await choose(page, "Cloud First");
  await key(page, "ArrowRight");
  await key(page, "Space");
  await expect(live(page).locator(".np-info strong")).toHaveText(
    "Cloud Second",
  );
  await page.waitForTimeout(500);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __appleTest: { plays: string[] } }).__appleTest
          .plays,
    ),
  ).toEqual([]);
  await key(page, "Space");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { __appleTest: { plays: string[] } })
            .__appleTest.plays,
      ),
    )
    .toEqual(["i.second"]);
});

test("a late unauthorized response from the previous login cannot clear the new account", async ({
  page,
}) => {
  await appleMusicFixture(page);
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let first = true;
  await page.route(
    "https://api.music.apple.com/v1/me/library/songs?limit=100",
    async (route) => {
      if (!first) {
        await route.fallback();
        return;
      }
      first = false;
      await held;
      await route.fulfill({ status: 401, json: {} }).catch(() => {});
    },
  );
  await page.goto("/");
  await expect(page.locator("main")).toHaveAttribute(
    "data-music-service",
    "apple-music",
  );
  await choose(page, "音乐");
  await choose(page, "登录 Apple Music");
  await choose(page, "登录 Apple Music");
  await expect(live(page).getByRole("status")).toContainText(
    "已连接 Apple Music",
  );
  await choose(page, "退出登录");
  await expect(live(page).getByRole("status")).toContainText(
    "连接你的 Apple Music",
  );
  await choose(page, "登录 Apple Music");
  await expect(live(page).getByRole("status")).toContainText(
    "2 首歌曲 · 2 个歌单",
  );
  release();
  await page.waitForTimeout(200);
  await expect(live(page).getByRole("status")).toContainText(
    "已连接 Apple Music",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("reipod-apple-user")),
  ).toBe("test-user");
});
