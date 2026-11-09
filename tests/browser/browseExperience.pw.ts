import { test, expect, type Page } from "@playwright/test";
import { choose, home, key, live } from "./dial";
import { taggedAudio } from "./taggedAudio";

const artist = "Aster — 很长的艺人名称与中文阅读测试 — The Midnight Orchestra · 完整艺人信息末尾";
const album = "01 — 夜行音乐集 Midnight Sessions · 完整专辑标题";
async function prepare(page: Page, count: number) {
  await page.addInitScript(() => {
    localStorage.setItem("reipod-demos", "hidden");
    localStorage.setItem("reipod-appearance", JSON.stringify({ clickSound: false, backlight: 0 }));
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await choose(page, "音乐"); await choose(page, "歌曲");
  const chooser = page.waitForEvent("filechooser"); await choose(page, "导入音乐");
  await (await chooser).setFiles(Array.from({ length: count }, (_, i) => taggedAudio(
    `${String(i + 1).padStart(2, "0")} · 夜行 / Night Walk`, artist, album,
    { trackNumber: i + 1, genre: "Ambient" },
  )));
  await expect(live(page).locator(".screen-footer")).toHaveText(`1 / ${count}`);
  await page.evaluate(() => document.fonts.ready);
  // Imports publish placeholders first; wait for metadata before freezing scope.
  await home(page); await choose(page, "音乐"); await choose(page, "艺人");
  await expect(live(page).locator(".row-title")).toHaveText(["全部专辑", artist]);
  await key(page, "Escape"); await choose(page, "歌曲");
}
async function listPosition(page: Page) {
  return live(page).locator(".screen-song-list").evaluate(list => {
    const row = list.querySelector<HTMLElement>(".selected")!;
    return { key: row.dataset.rowKey, y: row.getBoundingClientRect().top - list.getBoundingClientRect().top,
      height: row.getBoundingClientRect().height, scroll: list.scrollTop };
  });
}

for (const width of [320, 390, 1280]) {
  test(`browsing and playing restore the same song and visible window at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await prepare(page, 72);
    // Cross a virtual window boundary, then move upward without scrolling back.
    for (let i = 0; i < 40; i++) await key(page, "ArrowDown");
    for (let i = 0; i < 5; i++) await key(page, "ArrowUp");
    const songs = await listPosition(page);
    expect(songs.scroll).toBeGreaterThan(0);
    await key(page, "Enter");
    await expect(page.locator('.screen-playing-link[aria-label="正在播放"]')).toBeVisible();
    await key(page, "Space");
    await key(page, "Escape");
    expect(await listPosition(page)).toEqual(songs);
    await expect(live(page).locator(".selected .track-playing-marker .icon-pause")).toBeVisible();
    // A separate artist/album path has its own list window and scoped queue.
    await home(page); await choose(page, "音乐"); await choose(page, "艺人");
    await choose(page, artist); await choose(page, album);
    await expect(live(page).locator(".screen-row.selected .row-title")).toHaveText("01 · 夜行 / Night Walk");
    for (let i = 0; i < 15; i++) await key(page, "ArrowDown");
    for (let i = 0; i < 3; i++) await key(page, "ArrowUp");
    const scoped = await listPosition(page);
    await key(page, "Enter");
    await expect(live(page).locator(".np-sequence")).toHaveText("13 / 72");
    await key(page, "Space"); await key(page, "Escape");
    expect(await listPosition(page)).toEqual(scoped);
    // Re-entering Songs does not inherit the artist list's focus or scroll.
    await home(page); await choose(page, "音乐"); await choose(page, "歌曲");
    expect(await listPosition(page)).toEqual(songs);
    await expect(page.locator(".lcd-screen button")).toHaveCount(0);
  });
}

test("album art, secondary text and footers scale together and long artist names can be read", async ({ page }) => {
  await prepare(page, 3);
  await home(page); await choose(page, "音乐"); await choose(page, "专辑");
  await key(page, "ArrowDown");
  const row = live(page).locator(".album-row.selected");
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    const metrics = await row.evaluate(row => {
      const unit = document.querySelector(".lcd-screen")!.getBoundingClientRect().width / 320;
      const art = row.querySelector(".album-art")!, detail = row.querySelector("small")!;
      const box = row.getBoundingClientRect(), text = row.querySelector(".row-label")!.getBoundingClientRect();
      return { art: art.getBoundingClientRect().width / unit, font: parseFloat(getComputedStyle(detail).fontSize) / unit,
        footer: document.querySelector(".screen-content .screen-footer")!.getBoundingClientRect().height / unit,
        containsText: text.top >= box.top && text.bottom <= box.bottom };
    });
    expect(metrics.art).toBeCloseTo(31, 1); expect(metrics.font).toBeCloseTo(10, 1);
    expect(metrics.footer).toBeCloseTo(17, 1); expect(metrics.containsText).toBe(true);
    const text = row.locator(".row-detail .marquee-text");
    await expect(text).toHaveText(artist);
    expect(await text.evaluate(el => getComputedStyle(el).textOverflow)).toBe("ellipsis");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(text).toHaveClass(/is-overflowing/);
    await expect.poll(() => text.evaluate(el => el.getAnimations().length)).toBeGreaterThan(0);
    await text.evaluate(el => {
      const animation = el.getAnimations()[0]; animation.pause();
      const timing = animation.effect!.getTiming();
      animation.currentTime = timing.delay + Number(timing.duration) * 0.9;
    });
    await expect.poll(() => text.evaluate(el => Math.abs(el.getBoundingClientRect().right - el.parentElement!.getBoundingClientRect().right))).toBeLessThan(2);
    await page.emulateMedia({ reducedMotion: "reduce" });
  }
});
