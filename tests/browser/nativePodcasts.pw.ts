import { test, expect } from "@playwright/test";
import { choose, home, key, live } from "./dial";
import { nativeMusicFixture } from "./nativeMusicFixture";

async function podcastSettings(page: import("@playwright/test").Page) {
  await home(page);
  await choose(page, "设置");
  await choose(page, "ReiPod 设置");
  await choose(page, "播客设置");
}

test("entering iPhone podcasts automatically authorizes, groups, resumes and follows system playback", async ({ page }) => {
  await nativeMusicFixture(page, false, true);
  await page.goto("/");
  await choose(page, "播客");
  await expect(live(page).locator(".row-title")).toContainText(["系统节目"]);
  await expect(live(page).locator(".row-title")).not.toContainText(["连接 iPhone 播客"]);
  expect(await page.evaluate(() => (window as any).__nativeTest.calls.filter((action: string) => action === "authorize"))).toHaveLength(1);
  await choose(page, "系统节目");
  await expect(live(page).locator(".row-title")).toHaveText(["系统单集一", "系统单集二"]);
  await choose(page, "系统单集一");
  await expect(live(page).locator(".np-info strong")).toHaveText("系统单集一");
  expect(await page.evaluate(() => {
    const log = (window as any).__nativeTest;
    return { queue: log.queue, playback: JSON.parse(localStorage.getItem("__fixture-ios-playback")!) };
  })).toMatchObject({ queue: ["9007199254740995", "9007199254740997"], playback: { position: 125 } });
  await key(page, "Space");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("__fixture-ios-playback")!).status)).toBe("paused");
  await key(page, "Space");
  await key(page, "ArrowRight");
  await expect(live(page).locator(".np-info strong")).toHaveText("系统单集二");
  await page.evaluate(() => (window as any).__nativeTest.update({ position: 300, status: "playing" }));
  await page.reload();
  await choose(page, "正在播放");
  await expect(live(page).locator(".np-info strong")).toHaveText("系统单集二");
  expect(await page.evaluate(() => (window as any).__nativeTest.calls)).not.toContain("setQueue");
  await home(page);
  await choose(page, "音乐");
  await choose(page, "歌曲");
  await expect(live(page).locator(".row-title")).toHaveText(["Phone First", "Phone Second"]);
  await home(page);
  await choose(page, "播客");
  await expect(live(page).locator(".row-title")).toHaveText(["系统节目"]);
  await podcastSettings(page);
  await choose(page, "打开 Apple 播客");
  expect(await page.evaluate(() => (window as any).__nativeTest.opens)).toBe(1);
  await page.evaluate(() => (window as any).__nativeTest.setPermission("denied"));
  await expect(live(page).locator(".row-title")).not.toContainText(["系统节目"]);
  await choose(page, "打开系统设置");
  expect(await page.evaluate(() => (window as any).__nativeTest.settings)).toBe(1);
  await home(page);
  await choose(page, "播客");
  await podcastSettings(page);
  await choose(page, "导入播客…");
  await expect(page.locator("#podcast-files")).toBeAttached();
});

test("empty or denied system podcast access stays actionable and leaves local playback available", async ({ page }) => {
  await nativeMusicFixture(page, true, true);
  await page.goto("/");
  await choose(page, "播客");
  await expect(live(page).locator(".row-title")).toHaveText(["系统播客暂不可用"]);
  await choose(page, "系统播客暂不可用");
  await expect(live(page).locator(".row-title")).toHaveText(["打开系统设置", "打开 Apple 播客", "导入播客…"]);
  await page.evaluate(() => {
    (window as any).__nativeTest.emptyPodcasts = true;
    (window as any).__nativeTest.setPermission("authorized");
  });
  await expect(live(page).locator(".row-title")).toContainText(["刷新系统播客"]);
  await expect(live(page)).toContainText("系统未提供已下载播客");
  await choose(page, "打开 Apple 播客");
  expect(await page.evaluate(() => (window as any).__nativeTest.opens)).toBe(1);
  await home(page);
  await choose(page, "音乐");
  await choose(page, "本地音乐");
  await choose(page, "晴天");
  await expect(page.locator("main")).toHaveAttribute("data-playback-source", "local");
});

test("authorized podcasts prefetch on launch without waiting for the music library", async ({ page }) => {
  await nativeMusicFixture(page, false, true, { authorized: true, holdMusic: true });
  await page.goto("/");
  await expect.poll(() => page.evaluate(() => (window as any).__nativeTest.calls.filter((action: string) => action === "podcasts").length)).toBe(2);
  expect(await page.evaluate(() => (window as any).__nativeTest.musicBlocked)).toBe(true);
  await choose(page, "播客");
  await expect(live(page).locator(".row-title")).toHaveText(["系统节目"]);
  await choose(page, "系统节目");
  await choose(page, "系统单集一");
  await expect(live(page).locator(".np-info strong")).toHaveText("系统单集一");
  await page.evaluate(() => (window as any).__nativeTest.releaseMusic());
});

test("cached shows stay selected and playable during background refresh; refresh invalidates native cache", async ({ page }) => {
  await nativeMusicFixture(page, false, true, { authorized: true });
  await page.goto("/");
  await choose(page, "播客");
  await expect(live(page).locator(".row-title")).toHaveText(["系统节目"]);
  await page.evaluate(() => {
    const log = (window as any).__nativeTest;
    log.holdPodcasts(); log.removeEpisode(); log.libraryChanged();
  });
  await expect(live(page).locator(".row-title")).toHaveText(["系统节目"]);
  await expect(live(page).locator('[aria-current="true"] .row-title')).toHaveText("系统节目");
  await choose(page, "系统节目");
  await expect(live(page).locator(".row-title")).toHaveText(["系统单集一", "系统单集二"]);
  await choose(page, "系统单集一");
  await page.evaluate(() => (window as any).__nativeTest.releasePodcasts());
  await expect.poll(() => page.evaluate(() => (window as any).__nativeTest.refreshes)).toBe(1);
  await home(page); await choose(page, "播客"); await choose(page, "系统节目");
  await expect(live(page).locator(".row-title")).toHaveText(["系统单集一"]);
  await podcastSettings(page);
  await choose(page, "刷新系统播客");
  await expect.poll(() => page.evaluate(() => (window as any).__nativeTest.refreshes)).toBe(2);
  expect(await page.evaluate(() => (window as any).__nativeTest.opens)).toBe(0);
});

test("first-load repeated Center stays in podcasts, then replaces the passive status with shows", async ({ page }) => {
  await nativeMusicFixture(page, false, true, { authorized: true, holdPodcasts: true });
  await page.goto("/");
  await choose(page, "播客");
  await expect(live(page).locator('[aria-current="true"] .row-title')).toHaveText("正在读取播客…");
  await key(page, "Enter"); await key(page, "Enter");
  expect(await page.evaluate(() => (window as any).__nativeTest.opens)).toBe(0);
  await expect(page.locator(".lcd-screen")).toHaveAttribute("data-page", "podcasts");
  await page.evaluate(() => (window as any).__nativeTest.releasePodcasts());
  await expect(live(page).locator('[aria-current="true"] .row-title')).toHaveText("系统节目");
});

test("podcast query failure does not prevent system music from loading", async ({ page }) => {
  await nativeMusicFixture(page, false, true, { authorized: true, failPodcasts: true });
  await page.goto("/");
  await choose(page, "音乐"); await choose(page, "歌曲");
  await expect(live(page).locator(".row-title")).toHaveText(["Phone First", "Phone Second"]);
  await home(page); await choose(page, "播客");
  await expect(live(page)).toContainText("系统播客暂不可用");
});

test("the first podcast page is visible and playable before the rest of the library arrives", async ({ page }) => {
  await nativeMusicFixture(page, false, true, { authorized: true, holdPodcastTail: true });
  await page.goto("/");
  await choose(page, "播客");
  await choose(page, "系统节目");
  await expect(live(page).locator(".row-title")).toHaveText(["系统单集一"]);
  await choose(page, "系统单集一");
  await expect(live(page).locator(".np-info strong")).toHaveText("系统单集一");
  await page.evaluate(() => (window as any).__nativeTest.releasePodcasts());
  await home(page); await choose(page, "播客"); await choose(page, "系统节目");
  await expect(live(page).locator(".row-title")).toHaveText(["系统单集一", "系统单集二"]);
});

test("a currently playing system episode restores before the music library and selecting it does not restart it", async ({ page }) => {
  await nativeMusicFixture(page, false, true, { authorized: true, holdMusic: true,
    playback: { currentId: "9007199254740995", status: "playing", position: 333 } });
  await page.goto("/");
  await expect(page.locator("main")).toHaveAttribute("data-playback-source", "apple-music");
  await choose(page, "正在播放");
  await expect(live(page).locator(".np-info strong")).toHaveText("系统单集一");
  await home(page); await choose(page, "播客"); await choose(page, "系统节目");
  await choose(page, "系统单集一");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("__fixture-ios-playback")!).position)).toBe(333);
  await page.evaluate(() => (window as any).__nativeTest.releaseMusic());
});

test("library changes during an unfinished first read trigger one trailing fresh read", async ({ page }) => {
  await nativeMusicFixture(page, false, true, { authorized: true, holdPodcastTail: true });
  await page.goto("/"); await choose(page, "播客"); await choose(page, "系统节目");
  await expect(live(page).locator(".row-title")).toHaveText(["系统单集一"]);
  await page.evaluate(() => {
    const log = (window as any).__nativeTest;
    log.removeEpisode(); log.libraryChanged(); log.libraryChanged(); log.releasePodcasts();
  });
  await expect.poll(() => page.evaluate(() => (window as any).__nativeTest.refreshes)).toBe(1);
  await expect(live(page).locator(".row-title")).toHaveText(["系统单集一"]);
});

test("web pages and older native shells do not advertise system podcast access", async ({ page }) => {
  for (const legacy of [false, true]) {
    if (legacy) await nativeMusicFixture(page);
    await page.goto("/");
    await choose(page, "播客");
    await expect(live(page).locator(".row-title")).toHaveText(["暂无播客"]);
    await podcastSettings(page);
    await expect(live(page).locator(".row-title")).toHaveText(["导入播客…"]);
  }
});

test("iPhone show browsing contains only system podcasts; file import and local shows live in settings", async ({ page }) => {
  await nativeMusicFixture(page, false, true, { authorized: true });
  await page.goto("/"); await choose(page, "播客");
  await expect(live(page).locator(".row-title")).toHaveText(["系统节目"]);
  await podcastSettings(page);
  const chooser = page.waitForEvent("filechooser");
  await choose(page, "导入播客…");
  await (await chooser).setFiles("public/music/qingtian.m4a");
  await expect(live(page).locator(".row-title")).toContainText(["本地 · 叶惠美"]);
  await home(page); await choose(page, "播客");
  await expect(live(page).locator(".row-title")).toHaveText(["系统节目"]);
  await podcastSettings(page); await choose(page, "本地 · 叶惠美"); await choose(page, "晴天");
  await expect(page.locator("main")).toHaveAttribute("data-playback-source", "local");
});

test("system podcast authorization and playback stay independent of the selected QQ account", async ({ page }) => {
  await nativeMusicFixture(page, false, true);
  await page.addInitScript(() => localStorage.setItem("reipod-music-service", "qq"));
  await page.route("**/api/music/qq/**", route => route.fulfill({ json: { authorized: false } }));
  await page.goto("/");
  await choose(page, "播客");
  await choose(page, "系统节目");
  await choose(page, "系统单集二");
  await expect(live(page).locator(".np-info strong")).toHaveText("系统单集二");
  await expect(page.locator("main")).toHaveAttribute("data-music-service", "qq");
  await expect(page.locator("main")).toHaveAttribute("data-playback-source", "apple-music");
  await home(page);
  await choose(page, "音乐");
  await expect(live(page).locator(".row-title")).not.toContainText(["Phone First", "系统节目"]);
});
