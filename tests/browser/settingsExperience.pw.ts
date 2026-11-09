import { test, expect } from "@playwright/test";
import { choose, home, key, live } from "./dial";
import { nativeMusicFixture } from "./nativeMusicFixture";

// Each flow uses the actual wheel/Center/Menu paths. No actions are attached to the LCD.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("settings90-seeded")) {
      localStorage.setItem("reipod-appearance", JSON.stringify({ backlight: 0, clickSound: false }));
      localStorage.setItem("settings90-seeded", "true");
    }
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("About cycles three truthful cards at all widths, keeps playback, and reopens on storage", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator.storage, "estimate", {
    value: async () => ({ quota: 10 * 1024 ** 3, usage: 2 * 1024 ** 3 }),
  }));
  await page.goto("/");
  await key(page, "Space"); await key(page, "Space");
  await home(page); await choose(page, "设置"); await choose(page, "关于本机");
  const about = () => live(page).locator(".classic-about");
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(about()).toHaveAttribute("data-about-page", "0");
    await expect(about()).toContainText("2.0 GB 已用");
    await expect(about()).toContainText("8.0 GB 可用");
    await expect(about()).toContainText("网页存储");
    await expect(about().locator(".screen-row")).toHaveCount(0);
    await key(page, "Enter");
    await expect(about().locator(".about-counts div").first()).toHaveText("歌曲3");
    await key(page, "ArrowDown");
    await expect(about()).toHaveAttribute("data-about-page", "1");
    await key(page, "Enter");
    await expect(about()).toContainText("软件版本0.1.0");
    await expect(about()).toContainText("音乐来源本地音乐");
    await expect(about()).not.toContainText("序列号");
    const overflow = await about().evaluate(e => {
      const box = e.getBoundingClientRect();
      return [...e.querySelectorAll(".about-identity, .about-card, .about-pages")].some(n => {
        const b = n.getBoundingClientRect(); return b.left < box.left || b.right > box.right || b.bottom > box.bottom;
      });
    });
    expect(overflow).toBe(false);
    await key(page, "Enter");
  }
  await key(page, "Enter"); await key(page, "Escape"); await choose(page, "关于本机");
  await expect(about()).toHaveAttribute("data-about-page", "0");
  await key(page, "Escape"); await home(page); await choose(page, "正在播放");
  await expect(live(page).locator(".np-info strong")).toHaveText("晴天");
});

test("About has an honest unavailable state when storage is inaccessible", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator.storage, "estimate", {
    value: async () => { throw new Error("Storage denied"); },
  }));
  await page.goto("/"); await choose(page, "设置"); await choose(page, "关于本机");
  await expect(live(page)).toContainText("存储信息不可用");
  await expect(live(page)).not.toContainText("GB 可用");
  await expect(live(page).getByRole("meter")).toHaveCount(0);
  await key(page, "Enter"); await expect(live(page)).toContainText("歌曲");
});

test("About counts the selected library while local playback continues separately", async ({ page }) => {
  await nativeMusicFixture(page, false, false, { authorized: true });
  await page.goto("/");
  await choose(page, "设置"); await choose(page, "ReiPod 设置");
  await choose(page, "音乐服务"); await choose(page, "本地音乐");
  await home(page); await key(page, "Space"); await key(page, "Space");
  await home(page); await choose(page, "设置"); await choose(page, "ReiPod 设置");
  await choose(page, "音乐服务"); await choose(page, "Apple Music");
  await home(page); await choose(page, "设置"); await choose(page, "关于本机"); await key(page, "Enter");
  await expect(live(page).locator(".about-counts div").first()).toHaveText("歌曲2");
  await key(page, "Enter"); await expect(live(page)).toContainText("iPhone 系统音乐");
  await expect(page.locator("main")).toHaveAttribute("data-playback-source", "local");
});

test("display and volume changes persist, the limit caps actual playback, and menu shortcuts survive reload/reset", async ({ page }) => {
  await page.goto("/"); await key(page, "Space"); await key(page, "Space");
  await home(page); await choose(page, "设置"); await choose(page, "亮度");
  for (let i = 0; i < 5; i++) await key(page, "ArrowUp");
  await expect(live(page).getByRole("progressbar")).toHaveAttribute("value", /0\.7/);
  await expect(live(page).locator(".classic-adjustment")).not.toContainText(/%|转动转轮/);
  await key(page, "Enter"); await choose(page, "音量上限");
  for (let i = 0; i < 10; i++) await key(page, "ArrowUp");
  const read = () => page.evaluate(() => JSON.parse(localStorage.getItem("reipod-appearance")!));
  expect((await read()).volumeLimit).toBeCloseTo(.5);
  await key(page, "Enter"); await home(page); await choose(page, "正在播放");
  for (let i = 0; i < 40; i++) await key(page, "ArrowDown");
  await expect(live(page).getByRole("status", { name: "音量 50%" })).toBeVisible();
  await home(page); await choose(page, "设置"); await choose(page, "主菜单"); await choose(page, "歌曲");
  await key(page, "Escape"); await choose(page, "音乐菜单"); await choose(page, "Cover Flow");
  await page.reload(); await choose(page, "歌曲");
  await expect(page.locator(".lcd-screen")).toHaveAttribute("data-page", "songs");
  await home(page); await choose(page, "音乐");
  await expect(live(page).locator(".row-title")).not.toContainText(["Cover Flow"]);
  await home(page); await choose(page, "设置");
  expect((await read()).brightness).toBeCloseTo(.75);
  await choose(page, "还原设置"); await key(page, "Enter");
  expect((await read()).volumeLimit).toBeCloseTo(.5);
  await choose(page, "还原设置"); await choose(page, "还原");
  expect(await read()).toMatchObject({ brightness: 1, volumeLimit: 1, backlight: 0, clickSound: true });
  await home(page); await expect(live(page).locator(".row-title").filter({ hasText: /^歌曲$/ })).toHaveCount(0);
  await choose(page, "音乐"); await expect(live(page).locator(".row-title")).toContainText(["Cover Flow"]);
});

test("timed backlight wakes on wheel input, Always On persists, and Clicker controls the real synthesized feedback", async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__clickStarts = 0;
    const create = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function() {
      (window as any).__clickStarts++;
      return create.call(this);
    };
  });
  await page.goto("/"); await choose(page, "设置");
  await page.clock.install();
  await choose(page, "背光时间"); await choose(page, "5 秒");
  await page.clock.runFor(5001);
  await expect(page.locator(".lcd-backlight-dim")).toHaveCount(1);
  await key(page, "ArrowDown");
  await expect(page.locator(".lcd-backlight-dim")).toHaveCount(0);
  await choose(page, "背光时间"); await choose(page, "始终开启");
  await page.clock.runFor(60001);
  await expect(page.locator(".lcd-backlight-dim")).toHaveCount(0);
  const starts = () => page.evaluate(() => (window as any).__clickStarts);
  expect(await starts()).toBe(0);
  await choose(page, "转轮声音"); await choose(page, "开启");
  const before = await starts(); await key(page, "ArrowDown");
  expect(await starts()).toBeGreaterThan(before);
  await choose(page, "转轮声音"); await choose(page, "关闭");
  const muted = await starts(); await key(page, "ArrowDown");
  expect(await starts()).toBe(muted);
  await page.reload();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("reipod-appearance")!))).toMatchObject({ backlight: 0, clickSound: false });
});
