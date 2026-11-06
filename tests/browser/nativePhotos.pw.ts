import { test, expect } from "@playwright/test";
import { choose, home, key, live, holdCenter } from "./dial";
import { nativePhotosFixture } from "./nativePhotosFixture";

test("iPhone reads system albums on entry and browses thumbnails/full photos without imports or changing music", async ({ page }) => {
  await nativePhotosFixture(page, { authorization: "notDetermined" });
  await page.goto("/");
  await key(page, "Space");
  await expect(live(page).locator(".np-info strong")).toHaveText("晴天");
  await expect.poll(async () => Number(await live(page).getByRole("progressbar").getAttribute("aria-valuenow"))).toBeGreaterThan(0);
  const before = Number(await live(page).getByRole("progressbar").getAttribute("aria-valuenow"));
  await home(page);
  await key(page, "ArrowDown");
  expect(await page.evaluate(() => (window as any).__photosTest.calls.filter((c: any) => c.action === "authorize").length)).toBe(0);
  await key(page, "Enter");
  await expect(live(page).locator(".row-title")).toHaveText(["所有照片", "个人收藏"]);
  await expect(live(page).locator(".photo-album-thumb img")).toHaveCount(2);
  expect(await page.evaluate(() => (window as any).__photosTest.calls.filter((c: any) => c.action === "authorize").length)).toBe(1);
  await choose(page, "个人收藏");
  await expect(live(page).locator(".photo-contact-sheet img")).toHaveCount(2);
  await expect(live(page).locator(".screen-status strong")).toHaveText("个人收藏");
  await expect(live(page).locator(".photo-grid-header")).toContainText("2 张照片");
  await expect(live(page).locator(".photo-contact-sheet img").first()).toHaveAttribute("src", /thumb=/);
  await key(page, "ArrowDown");
  await key(page, "Enter");
  await expect(live(page).locator(".photo-full img[data-visible]")).toHaveAttribute("alt", "系统照片 2");
  await expect(live(page).locator(".photo-full img[data-visible]")).toHaveAttribute("src", /full=/);
  await holdCenter(page);
  await expect(live(page).locator(".row-title")).toHaveText(["开始幻灯片", "返回照片"]);
  await home(page);
  await choose(page, "正在播放");
  await expect(live(page).locator(".np-info strong")).toHaveText("晴天");
  await expect(page.locator("main")).toHaveAttribute("data-playback-source", "local");
  await expect(page.getByRole("button", { name: "暂停", exact: true })).toBeVisible();
  await expect.poll(async () => Number(await live(page).getByRole("progressbar").getAttribute("aria-valuenow"))).toBeGreaterThan(before);
});

test("photo album scope rejects a late page, bounds rendered thumbnails, and clears revoked access", async ({ page }) => {
  await nativePhotosFixture(page, { count: 350, authorization: "limited", holdTail: true });
  await page.goto("/");
  await choose(page, "照片");
  await choose(page, "所有照片");
  await expect(live(page).locator(".photo-grid-header")).toContainText("350 张照片");
  await expect(live(page).locator(".photo-contact-sheet img")).toHaveCount(100);
  await key(page, "Escape");
  await choose(page, "个人收藏");
  await expect(live(page).locator(".photo-contact-sheet img")).toHaveCount(2);
  await page.evaluate(() => (window as any).__photosTest.release());
  await expect(live(page).locator(".photo-grid-header")).toContainText("2 张照片");
  await page.evaluate(() => (window as any).__photosTest.permission("denied"));
  await expect(live(page).locator(".photo-contact-sheet img")).toHaveCount(0);
  await expect(live(page)).toContainText("暂无照片");
  await key(page, "Escape");
  await expect(live(page).locator(".photo-album-thumb img")).toHaveCount(0);
  await choose(page, "暂无可用照片");
  await expect(live(page).locator(".row-title")).toContainText(["打开系统设置"]);
});

test("large system albums scroll with a bounded image window and limited access has its own settings action", async ({ page }) => {
  await nativePhotosFixture(page, { count: 350, authorization: "limited" });
  await page.goto("/");
  await choose(page, "照片");
  await choose(page, "所有照片");
  await expect.poll(() => page.evaluate(() => (window as any).__photosTest.calls.filter((c: any) => c.action === "photos").length)).toBe(2);
  for (let index = 0; index < 110; index++) await key(page, "ArrowDown");
  await expect(live(page).locator(".current-photo img")).toHaveAttribute("alt", "系统照片 111");
  await expect(live(page).locator(".photo-contact-sheet img")).toHaveCount(100);
  expect(await live(page).locator(".current-photo").evaluate(el => {
    const a = el.getBoundingClientRect(), b = el.parentElement!.getBoundingClientRect();
    return a.top >= b.top && a.bottom <= b.bottom + 1;
  })).toBe(true);
  await home(page);
  await choose(page, "设置"); await choose(page, "ReiPod 设置"); await choose(page, "照片设置");
  await expect(live(page).locator(".row-title")).toContainText(["选择可访问的照片…"]);
  expect(await live(page).locator('.screen-row[data-row-key="photo-import"]').count()).toBe(1);
});
