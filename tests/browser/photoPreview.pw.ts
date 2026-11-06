import { test, expect } from "@playwright/test";
import { home, key, live, choose } from "./dial";
import { nativePhotosFixture } from "./nativePhotosFixture";

async function highlightPhotos(page: import("@playwright/test").Page) {
  await home(page);
  const rows = await live(page).locator(".screen-row").evaluateAll(items => items.map(item => ({
    title: item.querySelector(".row-title")?.textContent, selected: item.getAttribute("aria-current") === "true",
  })));
  const current = rows.findIndex(row => row.selected), target = rows.findIndex(row => row.title === "照片");
  for (let index = 0; index < Math.abs(target - current); index++) await key(page, target > current ? "ArrowDown" : "ArrowUp");
  return live(page).getByLabel("照片轮播", { exact: true });
}

test("home randomly rotates a bounded native photo sample without requesting permission or touching playback", async ({ page }) => {
  await nativePhotosFixture(page, { count: 10000 });
  await page.goto("/"); const preview = await highlightPhotos(page);
  await expect(preview.locator(".preview-cover-current img")).toHaveAttribute("alt", "系统照片 1");
  const first = await preview.getAttribute("data-album-id");
  await expect(preview).not.toHaveAttribute("data-album-id", first!, { timeout: 8500 });
  expect(await page.evaluate(() => (window as any).__photosTest.calls.filter((c: any) => ["authorize", "photos", "albums"].includes(c.action)))).toEqual([]);
  expect(await page.evaluate(() => (window as any).__photosTest.calls.filter((c: any) => c.action === "preview").length)).toBe(1);
  await key(page, "ArrowUp");
  await expect(live(page).getByLabel("专辑封面轮播")).toBeVisible();
  await key(page, "ArrowDown");
  await expect(preview.locator(".preview-cover-outgoing")).toHaveCount(0);
  await page.evaluate(() => (window as any).__photosTest.permission("denied"));
  await expect(preview.locator("img")).toHaveCount(0);
  await expect(preview).toContainText("有可用照片后在这里自动展示");
  await expect(page.locator("main")).toHaveAttribute("data-playback-source", "local");
});

test("home waits for explicit photo entry to authorize and reduced motion holds a single sample", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await nativePhotosFixture(page, { authorization: "notDetermined", count: 1 });
  await page.goto("/"); const preview = await highlightPhotos(page);
  await expect(preview.locator("img")).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__photosTest.calls.filter((c: any) => ["authorize", "preview"].includes(c.action)))).toEqual([]);
  await key(page, "Enter"); await expect(live(page).locator(".row-title")).toContainText(["所有照片"]);
  await highlightPhotos(page);
  await expect(preview.locator(".preview-cover-current img")).toHaveAttribute("alt", "系统照片 1");
  await expect(preview).toHaveAttribute("data-paused", "true");
  await page.clock.install(); await page.clock.runFor(7000);
  await expect(preview.locator(".preview-cover-current img")).toHaveAttribute("alt", "系统照片 1");
});

test("web photo preview uses imported photos instead of the music artwork", async ({ page }) => {
  await page.goto("/");
  await page.locator("#photo-files").setInputFiles({ name: "预览照片.png", mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII=", "base64") });
  await choose(page, "所有照片");
  const preview = await highlightPhotos(page);
  await expect(preview.locator(".preview-cover-current img")).toHaveAttribute("alt", "预览照片.png");
  await expect(preview.locator(".preview-cover-outgoing")).toHaveCount(0);
});

test("photo preview starts recent, progressively advances to older batches, and resets when leaving", async ({ page }) => {
  await page.clock.install();
  await nativePhotosFixture(page, { count: 40 });
  await page.goto("/"); const preview = await highlightPhotos(page);
  await expect(preview.locator(".preview-cover-current img")).toHaveAttribute("alt", "系统照片 1");
  await page.clock.runFor(9000);
  expect(await page.evaluate(() => (window as any).__photosTest.calls.filter((c: any) => c.action === "preview").map((c: any) => c.offset))).toEqual([0]);
  await page.clock.runFor(2000);
  await expect.poll(() => page.evaluate(() => (window as any).__photosTest.calls.filter((c: any) => c.action === "preview").map((c: any) => c.offset))).toEqual([0, 8]);
  await expect(preview.locator(".preview-cover-current img")).toHaveAttribute("alt", "系统照片 9");
  await key(page, "ArrowUp"); await key(page, "ArrowDown");
  await expect(preview.locator(".preview-cover-current img")).toHaveAttribute("alt", "系统照片 1");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const count = await page.evaluate(() => (window as any).__photosTest.calls.filter((c: any) => c.action === "preview").length);
  await page.clock.runFor(50000);
  expect(await page.evaluate(() => (window as any).__photosTest.calls.filter((c: any) => c.action === "preview").length)).toBe(count);
});
