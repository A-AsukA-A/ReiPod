import { test, expect } from "@playwright/test";
import { mkdir, writeFile, utimes } from "node:fs/promises";
import { choose, holdCenter, home, key, live } from "./dial";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII=",
  "base64",
);

async function openSlideshowSettings(page: import("@playwright/test").Page) {
  await choose(page, "设置");
  await choose(page, "ReiPod 设置");
  await choose(page, "照片设置");
  await choose(page, "幻灯片设置");
}

test("slideshow settings persist, control non-repeating playback and background music, and restore on Reset Settings", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await key(page, "Space");
  await expect(live(page).locator(".screen-playing-link")).toHaveAttribute("aria-label", "正在播放");
  await home(page);
  await openSlideshowSettings(page);

  await choose(page, "每张停留时间");
  await choose(page, "2 秒");
  await choose(page, "背景音乐");
  await choose(page, "关闭");
  await choose(page, "重复播放");
  await choose(page, "过渡效果");
  await choose(page, "划像");

  const values = () => live(page).locator(".row-value").allTextContents();
  expect(await values()).toEqual(["2 秒", "关闭", "关闭", "关闭", "划像"]);

  await page.reload();
  await openSlideshowSettings(page);
  expect(await values()).toEqual(["2 秒", "关闭", "关闭", "关闭", "划像"]);

  await key(page, "Escape");
  const chooserPromise = page.waitForEvent("filechooser");
  await choose(page, "导入照片…");
  const chooser = await chooserPromise;
  const newer = testInfo.outputPath("one.png");
  const older = testInfo.outputPath("two.png");
  await mkdir(testInfo.outputDir, { recursive: true });
  await writeFile(newer, png);
  await writeFile(older, png);
  await utimes(newer, new Date("2026-11-06T00:00:00Z"), new Date("2026-11-06T00:00:00Z"));
  await utimes(older, new Date("2026-11-01T00:00:00Z"), new Date("2026-11-01T00:00:00Z"));
  await chooser.setFiles([older, newer]);

  await choose(page, "所有照片");
  await expect(live(page).locator(".photo-contact-sheet img")).toHaveCount(2);
  await key(page, "Enter");
  await expect(live(page).locator(".photo-full img[data-visible]")).toHaveAttribute(
    "alt",
    "one.png",
  );

  await holdCenter(page);
  await choose(page, "开始幻灯片");
  await expect(live(page).locator(".photo-full span")).toContainText("▷");

  await expect(live(page).locator(".photo-full img[data-visible]")).toHaveAttribute(
    "alt",
    "two.png",
    { timeout: 6000 },
  );
  await expect(live(page).locator(".photo-full span")).toHaveCount(0, {
    timeout: 6000,
  });
  await expect(page.locator(".screen-notice")).toContainText("幻灯片播放结束");

  await home(page);
  await expect(live(page).locator(".screen-playing-link")).toHaveAttribute("aria-label", "已暂停");
  await choose(page, "设置");
  await choose(page, "均衡器");
  await choose(page, "重低音增强");
  await choose(page, "音量平衡");
  await choose(page, "开启");
  await choose(page, "日期与时间");
  await choose(page, "标题栏显示时间");
  await expect(live(page).locator(".screen-status > strong")).toHaveText(/^\d{2}:\d{2}$/);
  await page.reload();
  await expect(live(page).locator(".screen-status > strong")).toHaveText(/^\d{2}:\d{2}$/);
  await choose(page, "设置");
  await expect(live(page).locator(".screen-row").filter({ hasText: "均衡器" })).toContainText("重低音增强");
  await expect(live(page).locator(".screen-row").filter({ hasText: "音量平衡" })).toContainText("开启");

  await choose(page, "还原设置");
  await choose(page, "还原");
  await expect(live(page).locator(".screen-status > strong")).toHaveText("设置");
  await expect(live(page).locator(".screen-row").filter({ hasText: "均衡器" })).toContainText("关闭");
  await expect(live(page).locator(".screen-row").filter({ hasText: "音量平衡" })).toContainText("关闭");

  await home(page);
  await openSlideshowSettings(page);
  expect(await values()).toEqual(["3 秒", "保持当前", "开启", "关闭", "淡入淡出"]);
});
