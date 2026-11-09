import { test, expect } from "@playwright/test";
import { choose, home, key, live } from "./dial";
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { if (!localStorage.getItem("extras95-test")) {
    localStorage.setItem("reipod-appearance", JSON.stringify({ backlight: 0, clickSound: false }));
    localStorage.setItem("extras95-test", "1");
  } });
  await page.emulateMedia({ reducedMotion: "reduce" });
});
test("world clocks use actual city time zones, keep insertion order after reload and delete through the wheel", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-09T18:05:00Z"));
  await page.goto("/"); await choose(page, "附加功能"); await choose(page, "时钟");
  await key(page, "Enter"); await choose(page, "添加时钟"); await choose(page, "美洲"); await choose(page, "纽约");
  await expect(page.locator(".lcd-screen")).toHaveAttribute("data-page", "clock");
  await expect(live(page).locator(".world-clock").last()).toContainText("13:05");
  await key(page, "Enter"); await choose(page, "添加时钟"); await choose(page, "亚洲"); await choose(page, "东京");
  await expect(live(page).locator(".world-clock").last()).toContainText("03:05");
  await expect(live(page).locator(".world-clock").last()).toContainText("11月10日");
  await page.reload(); await choose(page, "附加功能"); await choose(page, "时钟");
  await expect(live(page).locator(".world-clock strong")).toHaveText(["本地时间", "纽约", "东京"]);
  await key(page, "ArrowDown"); await key(page, "Enter"); await choose(page, "删除此时钟");
  await expect(live(page).locator(".world-clock strong")).toHaveText(["本地时间", "东京"]);
});
test("stopwatch laps, pause/resume, archived statistics and clear confirmation leave music alone", async ({ page }) => {
  await page.goto("/"); await key(page, "Space");
  await home(page); await choose(page, "附加功能"); await choose(page, "秒表"); await choose(page, "计时器");
  const start = new Date("2026-11-10T00:00:00Z");
  await page.clock.install({ time: start }); await page.clock.pauseAt(new Date(start.getTime() + 1000));
  await key(page, "Space"); await page.clock.runFor(1234); await key(page, "Enter");
  await page.clock.runFor(1400); await key(page, "Enter"); await key(page, "Space");
  await expect(live(page).locator(".stopwatch-time")).toHaveText("00:02.63");
  await expect(live(page).locator(".stopwatch-laps time")).toHaveText(["00:01.23", "00:01.40"]);
  await expect(live(page).locator('.screen-playing-link[aria-label="正在播放"]')).toHaveCount(1);
  await page.clock.runFor(3000); await expect(live(page).locator(".stopwatch-time")).toHaveText("00:02.63");
  await choose(page, "继续"); await page.clock.runFor(1000); await key(page, "Space");
  await expect(live(page).locator(".stopwatch-time")).toHaveText("00:03.63");
  await choose(page, "新计时"); await key(page, "Escape");
  await expect(live(page).locator(".screen-row")).toHaveCount(2);
  await key(page, "ArrowDown"); await key(page, "Enter");
  await expect(live(page).locator(".stopwatch-statistics")).toContainText("最快00:01.23");
  await page.reload(); await choose(page, "附加功能"); await choose(page, "秒表");
  await expect(live(page).locator(".screen-row")).toHaveCount(2);
  await key(page, "ArrowDown"); await key(page, "Enter"); await key(page, "Enter");
  await choose(page, "清空记录…");
  await expect(live(page).locator('.selected .row-title')).toHaveText("取消");
  await choose(page, "取消"); await choose(page, "清空记录…"); await choose(page, "清空");
  await expect(page.locator(".lcd-screen")).toHaveAttribute("data-page", "stopwatch");
  await expect(live(page).locator(".row-title")).toHaveText(["计时器"]);
});
