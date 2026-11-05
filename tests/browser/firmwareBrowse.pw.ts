import { test, expect, type Page } from "@playwright/test";
import { live, key, home, choose } from "./dial";
import { taggedAudio } from "./taggedAudio";
import { appleMusicFixture } from "./appleMusicFixture";

const files = [
  taggedAudio("Z First", "Alpha", "Shared", { albumArtist: "Various", genre: "Rock", composer: "One", trackNumber: 1 }),
  taggedAudio("A Second", "Alpha", "Shared", { albumArtist: "Various", genre: "Rock", composer: "One", trackNumber: 2 }),
  taggedAudio("Jazz Outside", "Alpha", "Shared", { albumArtist: "Various", genre: "Jazz", composer: "Two", trackNumber: 3 }),
  taggedAudio("B Guest", "Zulu", "Shared", { albumArtist: "Various", genre: "Rock", composer: "One", trackNumber: 4 }),
  taggedAudio("Other Rock", "Alpha", "Other Album", { genre: "Rock", composer: "Two", trackNumber: 1 }),
  taggedAudio("Untagged", "", ""),
];
async function library(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("reipod-demos", "hidden");
    localStorage.setItem("reipod-appearance", JSON.stringify({ backlight: 0 }));
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await choose(page, "音乐");
  await choose(page, "歌曲");
  const chooser = page.waitForEvent("filechooser");
  await choose(page, "导入音乐");
  await (await chooser).setFiles(files);
  await key(page, "Escape");
  await choose(page, "风格");
  // Wait for actual parsed metadata, not the pre-metadata filename rows.
  await expect(live(page).locator(".row-title")).toHaveText(["全部艺人", "Jazz", "Rock", "未知风格"]);
  await expect(live(page).locator(".category-row small")).toHaveText([
    "3 位艺人，3 张专辑", "1 位艺人，1 张专辑", "2 位艺人，2 张专辑", "1 位艺人，1 张专辑",
  ]);
}
const titles = (page: Page) => live(page).locator(".row-title");
const selected = (page: Page) => live(page).locator(".screen-row.selected .row-title");

test("genre drills through artists and scoped albums, preserving album order, queues and Menu focus", async ({ page }) => {
  await library(page);
  await expect(live(page).locator(".category-row small")).toHaveText([
    "3 位艺人，3 张专辑", "1 位艺人，1 张专辑", "2 位艺人，2 张专辑", "1 位艺人，1 张专辑",
  ]);
  await choose(page, "Rock");
  await expect(live(page).locator(".screen-status > strong")).toHaveText("Rock");
  await expect(titles(page)).toHaveText(["全部专辑", "Alpha", "Zulu"]);
  await choose(page, "Alpha");
  await expect(titles(page)).toHaveText(["全部歌曲", "Other Album", "Shared"]);
  await choose(page, "Shared");
  await expect(titles(page)).toHaveText(["Z First", "A Second"]);
  await choose(page, "A Second");
  await expect(live(page).locator(".now-playing-top")).toHaveAttribute("aria-label", "播放队列第 2 首，共 2 首");
  await key(page, "Space");
  await key(page, "Escape");
  await expect(selected(page)).toHaveText("A Second");
  await key(page, "Escape");
  await expect(selected(page)).toHaveText("Shared");
  await choose(page, "全部歌曲");
  await expect(titles(page)).toHaveText(["A Second", "Other Rock", "Z First"]);
  await key(page, "Escape");
  await key(page, "Escape");
  await expect(selected(page)).toHaveText("Alpha");
  await choose(page, "全部专辑");
  await expect(titles(page)).toHaveText(["全部歌曲", "Other Album", "Shared"]);
  await choose(page, "Shared");
  await expect(titles(page)).toHaveText(["Z First", "A Second", "B Guest"]);
  await key(page, "Escape");
  await key(page, "Escape");
  await key(page, "Escape");
  await expect(selected(page)).toHaveText("Rock");
  await choose(page, "Jazz");
  await choose(page, "Alpha");
  await choose(page, "Shared");
  await expect(titles(page)).toHaveText(["Jazz Outside"]);
});

test("provider menus keep local category data isolated without interrupting remote playback", async ({ page }) => {
  await appleMusicFixture(page);
  await page.goto("/");
  await choose(page, "音乐"); await choose(page, "登录 Apple Music"); await choose(page, "登录 Apple Music");
  await expect(live(page).getByRole("status")).toContainText("2 首歌曲 · 2 个歌单");
  await home(page); await choose(page, "音乐");
  await expect(titles(page)).not.toContainText(["风格", "作曲者"]);
  await choose(page, "艺人");
  await expect(titles(page)).toHaveText(["全部专辑", "Cloud Artist"]);
  await choose(page, "Cloud Artist"); await choose(page, "Cloud Album");
  await expect(titles(page)).toHaveText(["Cloud First", "Cloud Second"]);
  await choose(page, "Cloud Second");
  await expect(live(page).locator(".now-playing-top")).toHaveAttribute("aria-label", "播放队列第 2 首，共 2 首");
  await home(page); await choose(page, "设置"); await choose(page, "ReiPod 设置");
  await choose(page, "音乐服务"); await choose(page, "本地音乐");
  await home(page); await choose(page, "音乐"); await choose(page, "风格"); await choose(page, "未知风格");
  await expect(titles(page)).toHaveText(["全部专辑", "周杰伦"]);
  await expect(page.locator("main")).toHaveAttribute("data-playback-source", "apple-music");
});

test("composer goes to albums, filters a shared compilation, and remembers focus separately from genre browsing", async ({ page }) => {
  await library(page);
  await choose(page, "Rock"); await choose(page, "Alpha"); await choose(page, "Shared");
  await key(page, "ArrowDown");
  await expect(selected(page)).toHaveText("A Second");
  await home(page); await choose(page, "音乐"); await choose(page, "作曲者");
  await expect(titles(page)).toHaveText(["全部专辑", "One", "Two", "未知作曲者"]);
  await choose(page, "One");
  await expect(page.locator(".lcd-screen")).toHaveAttribute("data-page", "albums");
  await expect(live(page).locator(".screen-status > strong")).toHaveText("One");
  await choose(page, "Shared");
  await expect(titles(page)).toHaveText(["Z First", "A Second", "B Guest"]);
  await expect(selected(page)).toHaveText("Z First");
  await choose(page, "B Guest");
  await expect(live(page).locator(".now-playing-top")).toHaveAttribute("aria-label", "播放队列第 3 首，共 3 首");
  await key(page, "Space"); await key(page, "Escape"); await key(page, "Escape");
  await choose(page, "全部歌曲");
  await expect(titles(page)).toHaveText(["A Second", "B Guest", "Z First"]);
  await home(page); await choose(page, "音乐"); await choose(page, "风格");
  await choose(page, "Rock"); await choose(page, "Alpha"); await choose(page, "Shared");
  await expect(selected(page)).toHaveText("A Second");
  // Enter the album without a category: all four songs remain available.
  await home(page); await choose(page, "音乐"); await choose(page, "专辑"); await choose(page, "Shared");
  await expect(titles(page)).toHaveText(["Z First", "A Second", "Jazz Outside", "B Guest"]);
});

test("Play on a genre or its artist starts only that collection, including All Albums", async ({ page }) => {
  await library(page);
  await choose(page, "Rock");
  // The genre's default All Albums row plays only Rock, not Jazz/untagged songs.
  await key(page, "Space");
  await expect(live(page).locator(".now-playing-top")).toHaveAttribute("aria-label", "播放队列第 1 首，共 4 首");
  await key(page, "Space"); await key(page, "Escape");
  await key(page, "ArrowDown");
  await expect(selected(page)).toHaveText("Alpha");
  await key(page, "Space");
  await expect(live(page).locator(".now-playing-top")).toHaveAttribute("aria-label", "播放队列第 1 首，共 3 首");
  await key(page, "Space"); await home(page); await choose(page, "音乐"); await choose(page, "风格");
  // Rock was the remembered category. Play here must start it, not just toggle the previous queue.
  await expect(selected(page)).toHaveText("Rock");
  await key(page, "Space");
  await expect(live(page).locator(".now-playing-top")).toHaveAttribute("aria-label", "播放队列第 1 首，共 4 首");
});

test("category aggregate rows leave the filter and untagged music remains reachable", async ({ page }) => {
  await library(page);
  await choose(page, "未知风格"); await choose(page, "未知艺人"); await choose(page, "未知专辑");
  await expect(titles(page)).toHaveText(["Untagged"]);
  await home(page); await choose(page, "音乐"); await choose(page, "风格"); await choose(page, "全部艺人");
  await expect(titles(page)).toHaveText(["全部专辑", "未知艺人", "Alpha", "Zulu"]);
  await choose(page, "全部专辑"); await choose(page, "全部歌曲");
  await expect(titles(page)).toHaveCount(6);
  await home(page); await choose(page, "音乐"); await choose(page, "作曲者"); await choose(page, "全部专辑");
  await choose(page, "全部歌曲");
  await expect(titles(page)).toHaveCount(6);
});
