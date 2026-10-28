import { test, expect } from "@playwright/test";
import { choose, key, live } from "./dial";
import { nativeMusicFixture } from "./nativeMusicFixture";

test("browsing local songs from system music renders one list and one selection", async ({
  page,
}) => {
  await nativeMusicFixture(page);
  await page.goto("/");
  await choose(page, "音乐");
  await choose(page, "本地音乐");
  await expect(page.locator(".lcd-screen")).toHaveAttribute(
    "data-page",
    "local-songs",
  );
  await expect(live(page).locator(".settings-screen")).toHaveCount(0);
  await expect(live(page).locator(".screen-song-list")).toHaveCount(1);
  await expect(live(page).locator(".row-title")).toHaveText([
    "Carefree",
    "Monkeys Spinning Monkeys",
    "Sneaky Snitch",
    "导入音乐",
  ]);
  await key(page, "ArrowDown");
  await expect(
    live(page).locator('.screen-row[aria-current="true"]'),
  ).toHaveCount(1);
  await expect(
    live(page).locator('.screen-row[aria-current="true"] .row-title'),
  ).toHaveText("Monkeys Spinning Monkeys");
});

test("an empty local library renders its import action only once", async ({
  page,
}) => {
  await nativeMusicFixture(page);
  await page.addInitScript(() =>
    localStorage.setItem("reipod-demos", "hidden"),
  );
  await page.goto("/");
  await choose(page, "音乐");
  await choose(page, "本地音乐");
  await expect(live(page).locator(".settings-screen")).toHaveCount(0);
  await expect(live(page).locator(".screen-empty")).toHaveCount(1);
  await expect(live(page).locator(".row-title")).toHaveText(["导入音乐"]);
  await expect(
    live(page).locator('.screen-row[aria-current="true"]'),
  ).toHaveCount(1);
});

test("local YRC imports attach to the matching song and survive reload", async ({
  page,
}) => {
  const { readFile } = await import("node:fs/promises");
  const { holdCenter, home } = await import("./dial");
  await page.addInitScript(() =>
    localStorage.setItem("reipod-demos", "hidden"),
  );
  await page.goto("/");
  await page.getByLabel("选择本地音频或歌词文件").setInputFiles([
    {
      name: "word-song.mp3",
      mimeType: "audio/mpeg",
      buffer: await readFile("public/music/carefree.mp3"),
    },
    {
      name: "word-song.yrc",
      mimeType: "text/plain",
      buffer: Buffer.from("[0,4000](0,2000,0)本地(2000,2000,0)逐字"),
    },
  ]);
  const open = async () => {
    await home(page);
    await choose(page, "音乐");
    await choose(page, "歌曲");
    await expect(live(page).locator(".row-title")).toContainText(["Carefree"]);
    await choose(page, "Carefree");
    await holdCenter(page);
    await choose(page, "歌词");
    await expect(live(page).locator(".lyric-word")).toHaveCount(2);
    await expect(live(page).locator(".lyrics-lines")).toContainText("本地");
  };
  await open();
  await page.reload();
  await open();
});
