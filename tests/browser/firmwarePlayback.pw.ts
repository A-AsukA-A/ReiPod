import { test, expect, type Page } from "@playwright/test";
import { live, key, choose, home, holdCenter } from "./dial";
import { taggedAudio } from "./taggedAudio";

const files = [
  taggedAudio("A Disc Two", "Artist", "Alpha", { discNumber: 2, trackNumber: 1 }),
  taggedAudio("Z Second", "Artist", "Alpha", { discNumber: 1, trackNumber: 2 }),
  taggedAudio("Y First", "Artist", "Alpha", { discNumber: 1, trackNumber: 1 }),
  taggedAudio("B Second", "Artist", "Beta", { discNumber: 1, trackNumber: 2 }),
  taggedAudio("B First", "Artist", "Beta", { discNumber: 1, trackNumber: 1 }),
];
const titles = (page: Page) => live(page).locator(".row-title");
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("reipod-playlists") ?? "[]") as { id: string; name: string; trackIds: string[]; savedOnTheGo?: number }[]);
async function imported(page: Page, reduced = true) {
  await page.addInitScript(() => {
    localStorage.setItem("reipod-demos", "hidden");
    localStorage.setItem("reipod-appearance", JSON.stringify({ backlight: 0, clickSound: false }));
    const target = window as unknown as { __confirmKeys: string[] };
    target.__confirmKeys = [];
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      if (this.classList.contains("row-title")) target.__confirmKeys.push(this.closest<HTMLElement>(".screen-row")?.dataset.rowKey ?? "");
      return animate.call(this, frames, options);
    };
  });
  await page.emulateMedia({ reducedMotion: reduced ? "reduce" : "no-preference" });
  await page.goto("/"); await choose(page, "音乐"); await choose(page, "歌曲");
  const chooser = page.waitForEvent("filechooser"); await choose(page, "导入音乐");
  await (await chooser).setFiles(files);
  await key(page, "Escape"); await choose(page, "艺人"); await choose(page, "Artist");
  await expect(live(page).locator(".row-label small")).toHaveText(["5 首歌曲", "3 首歌曲", "2 首歌曲"]);
}
async function working(page: Page) {
  await home(page); await choose(page, "音乐"); await choose(page, "播放列表"); await choose(page, "On-The-Go");
}
async function addSelectedAlbum(page: Page, length: number) {
  await page.locator(".click-wheel").focus(); await page.keyboard.down("Enter");
  await expect.poll(async () => (await saved(page)).find(item => item.id === "on-the-go")?.trackIds.length).toBe(length);
  await page.keyboard.up("Enter");
  await expect(page.locator(".lcd-screen")).toHaveAttribute("data-page", "albums");
}

test("album shuffle keeps disc/track order, switches in both controls and survives reload", async ({ page }) => {
  await imported(page);
  await home(page); await choose(page, "设置"); await choose(page, "随机播放");
  await expect(titles(page)).toHaveText(["关闭", "歌曲", "专辑"]);
  await choose(page, "专辑");
  await home(page); await choose(page, "音乐"); await choose(page, "艺人"); await choose(page, "Artist");
  await choose(page, "全部歌曲"); await choose(page, "Y First"); await key(page, "Space");
  await key(page, "Enter"); await key(page, "Enter");
  await expect(live(page).locator(".np-shuffle-options .chosen")).toHaveText("专辑");
  await key(page, "ArrowUp"); await expect(live(page).locator(".np-shuffle-options .chosen")).toHaveText("歌曲");
  await key(page, "ArrowDown"); await expect(live(page).locator(".np-shuffle-options .chosen")).toHaveText("专辑");
  await holdCenter(page); await choose(page, "查看播放队列");
  await expect(titles(page)).toHaveText(["Y First", "Z Second", "A Disc Two", "B First", "B Second"]);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("reipod-playback")!).shuffleMode)).toBe("albums");
  await page.reload();
  await choose(page, "设置"); await choose(page, "随机播放");
  await expect(live(page).locator('.screen-row').filter({ hasText: "专辑" }).getByRole("img", { name: "已选择" })).toHaveCount(1);
});

for (const reduced of [false, true]) test(`On-The-Go saves a collection without changing playback and respects reduced motion (${reduced})`, async ({ page }) => {
  await imported(page, reduced);
  await key(page, "ArrowDown"); // Alpha album; Center remains a drill-in, long Center adds it.
  await addSelectedAlbum(page, 3);
  if (reduced) expect(await page.evaluate(() => (window as unknown as { __confirmKeys: string[] }).__confirmKeys)).toEqual([]);
  else await expect.poll(() => page.evaluate(() => (window as unknown as { __confirmKeys: string[] }).__confirmKeys.length)).toBe(1);
  await working(page);
  await expect(titles(page)).toHaveText(["Y First", "Z Second", "A Disc Two", "保存播放列表", "清空播放列表…"]);
  await choose(page, "Z Second"); await key(page, "Space"); await key(page, "Escape");
  await choose(page, "保存播放列表");
  await expect(titles(page)).toContainText(["New Playlist 1", "On-The-Go"]);
  const lists = await saved(page);
  expect(lists.find(item => item.id === "on-the-go")!.trackIds).toEqual([]);
  expect(lists.find(item => item.savedOnTheGo === 1)!.trackIds).toHaveLength(3);
  await choose(page, "New Playlist 1");
  await expect(titles(page)).toHaveText(["Y First", "Z Second", "A Disc Two"]);
  await holdCenter(page);
  await expect(titles(page)).not.toContainText(["从此歌单移除", "从 On-The-Go 移除"]);
  await home(page); await choose(page, "正在播放");
  await expect(live(page).locator(".now-playing-top")).toHaveAttribute("aria-label", "播放队列第 2 首，共 3 首");
  await page.reload(); await working(page);
  await expect(titles(page)).toHaveText(["保存播放列表", "清空播放列表…"]);
  await expect(live(page).locator('.screen-row[aria-disabled="true"]')).toHaveCount(2);
  await key(page, "Escape"); await choose(page, "New Playlist 1");
  await expect(titles(page)).toHaveText(["Y First", "Z Second", "A Disc Two"]);
});

test("clear confirmation defaults to cancel and failed durable writes retain the working list", async ({ page }) => {
  await imported(page); await key(page, "ArrowDown"); await addSelectedAlbum(page, 3);
  await working(page); await choose(page, "清空播放列表…");
  await expect(live(page).locator(".screen-row.selected .row-title")).toHaveText("取消");
  await key(page, "Enter");
  await expect(titles(page)).toHaveCount(5);
  await choose(page, "保存播放列表");
  // Add Beta, leaving the saved Alpha copy untouched.
  await home(page); await choose(page, "音乐"); await choose(page, "艺人"); await choose(page, "Artist");
  await key(page, "ArrowDown"); // remembered Alpha -> Beta
  await expect(live(page).locator(".screen-row.selected .row-title")).toHaveText("Beta");
  await addSelectedAlbum(page, 2);
  await working(page); await choose(page, "清空播放列表…");
  await page.evaluate(() => {
    const target = window as unknown as { __setItem: typeof Storage.prototype.setItem };
    target.__setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "reipod-playlists") throw new DOMException("quota", "QuotaExceededError");
      return target.__setItem.call(this, key, value);
    };
  });
  await choose(page, "清空");
  await expect(page.locator(".screen-notice")).toContainText("原列表已保留");
  expect((await saved(page)).find(item => item.id === "on-the-go")!.trackIds).toHaveLength(2);
  await page.evaluate(() => { Storage.prototype.setItem = (window as unknown as { __setItem: typeof Storage.prototype.setItem }).__setItem; });
  await choose(page, "清空");
  expect((await saved(page)).find(item => item.id === "on-the-go")!.trackIds).toEqual([]);
  expect((await saved(page)).find(item => item.savedOnTheGo === 1)!.trackIds).toHaveLength(3);
});

test("song options preserve the lyrics shortcut and can add/remove the working On-The-Go song", async ({ page }) => {
  await page.goto("/"); await key(page, "Space"); await key(page, "Space");
  await holdCenter(page); await expect(titles(page).first()).toHaveText("歌词");
  await choose(page, "添加到 On-The-Go");
  await working(page);
  const rows = await titles(page).allTextContents();
  expect(rows).toHaveLength(3);
  await holdCenter(page); await expect(titles(page).first()).toHaveText("歌词");
  await choose(page, "从 On-The-Go 移除");
  await expect(titles(page)).toHaveText(["保存播放列表", "清空播放列表…"]);
});
