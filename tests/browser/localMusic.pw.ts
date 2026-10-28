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
