import { expect, test } from "@playwright/test";
import { choose, home, key, live } from "./dial";

test("smart playlists record play history and reflect top-rated songs while showing empty hints honestly", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    localStorage.setItem("reipod-appearance", JSON.stringify({ clickSound: false, backlight: 0 }));
  });
  await page.goto("/");

  // Empty smart playlists show honest guidance without import buttons.
  await home(page);
  await choose(page, "音乐");
  await choose(page, "播放列表");
  await expect(live(page).locator(".row-title")).toContainText(["我的高评分", "最常播放", "最近播放"]);

  await choose(page, "我的高评分");
  await expect(live(page).locator(".screen-empty")).toContainText("还没有高评分歌曲");
  await expect(live(page).locator(".empty-actions")).toHaveCount(0);
  await key(page, "Escape");

  await choose(page, "最常播放");
  await expect(live(page).locator(".screen-empty")).toContainText("还没有播放记录");
  await expect(live(page).locator(".empty-actions")).toHaveCount(0);

  // Play first demo song and give it a 5-star rating on the rating control.
  await home(page);
  await choose(page, "音乐");
  await choose(page, "歌曲");
  await key(page, "Enter");
  await expect(page.locator(".lcd-screen")).toHaveAttribute("data-page", "playing");

  await expect.poll(async () => {
    const raw = await page.evaluate(() => localStorage.getItem("reipod-play-history-v1"));
    return Object.keys(JSON.parse(raw ?? "{}")).length;
  }).toBeGreaterThanOrEqual(1);

  // Cycle Center to Rating view (art -> seek -> shuffle -> rating) and set 5 stars.
  await key(page, "Enter");
  await key(page, "Enter");
  await key(page, "Enter");
  for (let i = 0; i < 5; i++) await key(page, "ArrowDown");

  await home(page);
  await choose(page, "音乐");
  await choose(page, "播放列表");
  await choose(page, "最近播放");
  await expect(live(page).locator(".track-row")).toHaveCount(1);
  await key(page, "Escape");

  await choose(page, "最常播放");
  await expect(live(page).locator(".track-row")).toHaveCount(1);
  await key(page, "Escape");

  await choose(page, "我的高评分");
  await expect(live(page).locator(".track-row")).toHaveCount(1);
});
