import { test, expect } from "@playwright/test";
import { choose, key, live, home } from "./dial";
import { nativeMusicFixture } from "./nativeMusicFixture";
import { nativePhotosFixture } from "./nativePhotosFixture";

test("native haptics work with click audio disabled, respect their own switch and HOLD", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("reipod-appearance", JSON.stringify({ clickSound: false, backlight: 0 }));
    Object.defineProperty(window, "__REIPOD_NATIVE_EXPERIENCE_VERSION__", { value: 1 });
    const events: unknown[] = [];
    (window as any).__hapticsTest = events;
    Object.defineProperty(window, "webkit", { value: { messageHandlers: { reipodExperience: {
      postMessage(message: any) { if (message.action !== "appearance") events.push(message); },
    } } } });
  });
  await page.goto("/");
  await key(page, "ArrowDown");
  await expect.poll(() => page.evaluate(() => (window as any).__hapticsTest.length)).toBe(1);
  await page.waitForTimeout(45); // A separate press starts after the intentional 40ms feedback rate limit.
  await key(page, "Enter");
  await expect.poll(() => page.evaluate(() => (window as any).__hapticsTest.some((event: any) => event.action === "press"))).toBe(true);
  await home(page); await choose(page, "设置"); await choose(page, "ReiPod 设置");
  await choose(page, "触觉反馈");
  await expect(live(page).locator('[data-row-key="haptics"]')).toContainText("关闭");
  const count = await page.evaluate(() => (window as any).__hapticsTest.length);
  await key(page, "ArrowDown"); await key(page, "Escape");
  expect(await page.evaluate(() => (window as any).__hapticsTest.length)).toBe(count);
  await choose(page, "ReiPod 设置"); await choose(page, "触觉反馈");
  await page.getByRole("switch").click();
  const held = await page.evaluate(() => (window as any).__hapticsTest.length);
  await key(page, "ArrowDown"); await key(page, "Enter");
  expect(await page.evaluate(() => (window as any).__hapticsTest.length)).toBe(held);
});

test("10,000 system photos load nearby pages and seek to both ends without reading the whole library", async ({ page }) => {
  await nativePhotosFixture(page, { count: 10000 });
  await page.goto("/"); await choose(page, "照片"); await choose(page, "所有照片");
  await expect(live(page).locator(".photo-grid-header")).toContainText("10,000 张照片");
  await expect.poll(() => page.evaluate(() => (window as any).__photosTest.calls.filter((c: any) => c.action === "photos").length)).toBe(2);
  await expect(live(page).locator(".photo-grid-header")).toContainText("2026年11月6日");
  await page.getByRole("group", { name: /^Classic 转轮/ }).focus();
  await page.keyboard.down("ArrowRight"); await page.waitForTimeout(650); await page.keyboard.up("ArrowRight");
  await expect(live(page).locator(".current-photo img")).toHaveAttribute("alt", "系统照片 10000");
  expect(await page.evaluate(() => (window as any).__photosTest.calls.filter((c: any) => c.action === "photos").length)).toBeLessThanOrEqual(4);
  await key(page, "Enter");
  await expect(live(page).locator(".photo-full")).toHaveAttribute("aria-label", "第 10000 张，共 10000 张照片");
  await page.keyboard.down("ArrowLeft"); await page.waitForTimeout(650); await page.keyboard.up("ArrowLeft");
  await expect(live(page).locator(".photo-full img[data-visible]")).toHaveAttribute("alt", "系统照片 1");
  await key(page, "Escape");
  await expect(live(page).locator(".current-photo img")).toHaveAttribute("alt", "系统照片 10000");
  await page.evaluate(() => (window as any).__photosTest.resize(5));
  await expect(live(page).locator(".photo-grid-header")).toContainText("5 张照片");
  await expect(live(page).locator(".current-photo img")).toHaveAttribute("alt", "系统照片 5");
  await key(page, "Enter");
  await expect(live(page).locator(".photo-full img[data-visible]")).toHaveAttribute("alt", "系统照片 5");
});

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 568 }, { width: 390, height: 844 }, { width: 960, height: 900 }]) {
  test(`host layout fits ${viewport.width}x${viewport.height} and keeps the transparent web backdrop`, async ({ page }) => {
    await page.setViewportSize(viewport); await page.goto("/");
    const layout = await page.locator(".classic-device").evaluate(device => {
      const bounds = device.getBoundingClientRect(), shell = document.querySelector("main")!;
      return { top: bounds.top, bottom: bounds.bottom, left: bounds.left, right: bounds.right,
        height: innerHeight, width: innerWidth, pageHeight: document.documentElement.scrollHeight,
        background: getComputedStyle(shell).backgroundColor };
    });
    expect(layout.top).toBeGreaterThanOrEqual(0); expect(layout.bottom).toBeLessThanOrEqual(layout.height);
    expect(layout.left).toBeGreaterThanOrEqual(0); expect(layout.right).toBeLessThanOrEqual(layout.width);
    expect(layout.pageHeight).toBeLessThanOrEqual(layout.height);
    expect(layout.background).toBe("rgba(0, 0, 0, 0)");
  });
}


test("large music lists keep a bounded DOM through navigation, reversal and resize", async ({ page }) => {
  await nativeMusicFixture(page, false, false, { authorized: true, songCount: 1000 });
  await page.goto("/");
  await choose(page, "设置"); await choose(page, "ReiPod 设置"); await choose(page, "音乐服务");
  await choose(page, "Apple Music"); await home(page); await choose(page, "音乐"); await choose(page, "歌曲");
  await expect(live(page).locator(".screen-row")).toHaveCount(40);
  for (let index = 0; index < 95; index++) await key(page, "ArrowDown");
  await expect(live(page).locator('.screen-row[aria-current="true"]')).toContainText("Song 00096");
  await page.setViewportSize({ width: 320, height: 568 });
  expect(await live(page).locator('.screen-row[aria-current="true"]').evaluate(row => {
    const a=row.getBoundingClientRect(),b=row.parentElement!.getBoundingClientRect();
    return a.top>=b.top-1 && a.bottom<=b.bottom+1;
  })).toBe(true);
  await key(page, "Escape"); await key(page, "Enter");
  await expect(live(page).locator('.screen-row[aria-current="true"]')).toContainText("Song 00096");
  for (let index = 0; index < 15; index++) await key(page, "ArrowUp");
  await expect(live(page).locator('.screen-row[aria-current="true"]')).toContainText("Song 00081");
  await key(page, "Escape");
  expect(await page.locator('.screen-outgoing .screen-row').count()).toBeLessThanOrEqual(100);
});


test("photo changes retain the decoded image through slow loads and reject stale completions", async ({ page }) => {
  await nativePhotosFixture(page);
  let releaseFirst!: () => void, releaseSecond!: () => void;
  const first = new Promise<void>(resolve => { releaseFirst = resolve; });
  const second = new Promise<void>(resolve => { releaseSecond = resolve; });
  await page.route("**/artwork/**?full=*", async route => {
    const value = new URL(route.request().url()).searchParams.get("full");
    if (value === "1") await first;
    if (value === "2") await second;
    await route.continue().catch(() => {});
  });
  await page.goto("/"); await choose(page, "照片"); await choose(page, "所有照片"); await key(page, "Enter");
  const visible = live(page).locator(".photo-full img[data-visible]");
  await expect(visible).toHaveAttribute("src", /full=0/);
  await key(page, "ArrowDown");
  await expect(live(page).locator(".photo-full")).toHaveAttribute("aria-busy", "true");
  await expect(visible).toHaveAttribute("src", /full=0/);
  expect(await visible.evaluate(image => (image as HTMLImageElement).naturalWidth > 0 && getComputedStyle(image).visibility === "visible")).toBe(true);
  await key(page, "ArrowDown"); releaseFirst();
  await expect(visible).toHaveAttribute("src", /full=0/);
  releaseSecond();
  await expect(visible).toHaveAttribute("src", /full=2/);
  await expect(live(page).locator(".photo-full")).toHaveAttribute("aria-busy", "false");
  await expect(live(page).locator(".photo-full img")).toHaveCount(1);
  await page.evaluate(() => (window as any).__photosTest.permission("denied"));
  await expect(live(page).locator(".photo-full img")).toHaveCount(0);
});
