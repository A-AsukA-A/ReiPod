import { test, expect } from "@playwright/test";
import { home, key, live } from "./dial";
import { nativeMusicFixture } from "./nativeMusicFixture";
import { taggedAudio } from "./taggedAudio";

async function highlightPodcasts(page: import("@playwright/test").Page) {
  await home(page);
  const rows = await live(page).locator(".screen-row").evaluateAll(items =>
    items.map(item => ({ title: item.querySelector(".row-title")?.textContent,
      selected: item.getAttribute("aria-current") === "true" })));
  const current = rows.findIndex(row => row.selected);
  const target = rows.findIndex(row => row.title === "播客");
  for (let i = 0; i < Math.abs(target - current); i++)
    await key(page, target > current ? "ArrowDown" : "ArrowUp");
  await expect(live(page).locator('.screen-row[aria-current="true"]')).toHaveText("播客");
  return live(page).getByLabel("播客封面轮播");
}

test("home rotates system show artwork without starting playback or borrowing music covers", async ({ page }) => {
  await nativeMusicFixture(page, false, true, { authorized: true, podcastArtwork: true, holdMusic: true });
  await page.goto("/");
  const preview = await highlightPodcasts(page);
  await expect(preview.locator(".preview-cover-current img")).toHaveAttribute("alt", "系统节目 封面");
  await expect(live(page).locator(".menu-preview-card")).toHaveCount(0);
  const first = await preview.getAttribute("data-album-id");
  await expect(preview).not.toHaveAttribute("data-album-id", first!, { timeout: 8500 });
  await expect(preview.locator(".preview-cover-current img")).toHaveAttribute("alt", "另一系统节目 封面");
  await expect(preview.locator(".preview-cover-outgoing")).toHaveCount(0);
  await key(page, "ArrowUp");
  await key(page, "ArrowUp");
  await expect(live(page).getByLabel("专辑封面轮播")).toBeVisible();
  await key(page, "ArrowDown");
  await key(page, "ArrowDown");
  await expect(preview).toBeVisible();
  await expect(preview.locator(".preview-cover-outgoing")).toHaveCount(0);
  expect(await page.evaluate(() => {
    const log = (window as any).__nativeTest;
    return { commands: log.calls.filter((c: string) => ["authorize", "setQueue", "play", "pause", "openPodcasts"].includes(c)), queue: log.queue };
  })).toEqual({ commands: [], queue: [] });
});

test("reduced motion holds a podcast cover and revoked permission removes it without showing music", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await nativeMusicFixture(page, false, true, { authorized: true, podcastArtwork: true });
  await page.goto("/");
  const preview = await highlightPodcasts(page);
  await expect(preview.locator(".preview-cover-current img")).toHaveAttribute("alt", "系统节目 封面");
  await expect(preview).toHaveAttribute("data-paused", "true");
  await page.clock.install();
  await page.clock.runFor(7000);
  await expect(preview.locator(".preview-cover-current img")).toHaveAttribute("alt", "系统节目 封面");
  await page.evaluate(() => (window as any).__nativeTest.setPermission("denied"));
  await expect(preview.locator("img")).toHaveCount(0);
  await expect(preview).toContainText("播客封面");
  await expect(preview).not.toContainText("专辑封面");
});

test("web home uses imported podcast covers and leaves an empty or unillustrated show honest", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const preview = await highlightPodcasts(page);
  await expect(preview).toContainText("播客封面");
  await expect(preview.locator("img")).toHaveCount(0);
  await page.locator("#podcast-files").setInputFiles(taggedAudio("Episode", "Guest", "Unillustrated Show"));
  await highlightPodcasts(page);
  await expect(preview.getByRole("img", { name: /Unillustrated Show.*无内嵌封面/ })).toBeVisible();
  await page.locator("#podcast-files").setInputFiles("public/music/qingtian.m4a");
  await highlightPodcasts(page);
  await expect.poll(async () => page.evaluate(() => {
    const raw = localStorage.getItem("reipod-podcasts");
    return raw && JSON.parse(raw).length;
  })).toBe(2);
  // With motion enabled the newly imported illustrated show joins the rotation.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(preview.locator(".preview-cover-current img")).toBeVisible({ timeout: 8500 });
  await expect(preview.locator(".preview-cover-current img")).toHaveAttribute("alt", "叶惠美 封面");
  await expect(page.locator("main")).toHaveAttribute("data-playback-source", "local");
  await expect(page.locator(".lcd-screen")).toHaveAttribute("data-page", "home");
});
