import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { live, key, home, choose, holdCenter, text } from "./dial";

test("the LCD ignores clicks, hover and direct screen commands; wheel notches move one row", async ({
  page,
}) => {
  await page.goto("/");
  const screen = page.locator(".screen-glass");
  const bounds = await screen.boundingBox();
  if (!bounds) throw Error("No LCD");
  await page.mouse.click(bounds.x + 35, bounds.y + 60);
  await expect(page.locator(".lcd-screen")).toHaveAttribute(
    "data-page",
    "home",
  );
  await expect(live(page).locator(".screen-row.selected")).toContainText(
    "音乐",
  );
  const wheel = await page.locator(".click-wheel").boundingBox();
  if (!wheel) throw Error("No wheel");
  await page.mouse.move(wheel.x + wheel.width / 2, wheel.y + wheel.height / 2);
  await page.mouse.wheel(0, 1200);
  await expect(live(page).locator(".screen-row.selected")).toContainText(
    "照片",
  );
  await page.mouse.wheel(0, 1200);
  await expect(live(page).locator(".screen-row.selected")).toContainText(
    "播客",
  );
  await page.mouse.wheel(0, -1200);
  await expect(live(page).locator(".screen-row.selected")).toContainText(
    "照片",
  );
  expect(
    await screen
      .locator("button,input,a")
      .evaluateAll((items) =>
        items.every((item) => (item as HTMLElement).tabIndex === -1),
      ),
  ).toBe(true);
  await key(page, "Enter");
  await expect(page.locator(".lcd-screen")).toHaveAttribute(
    "data-page",
    "photos",
  );
});

test("Cover Flow opens a dedicated album menu and returns to the same cover", async ({
  page,
}) => {
  await page.goto("/");
  await choose(page, "音乐");
  await expect(live(page).locator(".screen-row.selected")).toContainText(
    "Cover Flow",
  );
  await key(page, "Enter");
  await key(page, "ArrowDown");
  await key(page, "Enter");
  await expect(page.locator(".lcd-screen")).toHaveAttribute(
    "data-page",
    "coverflow-album",
  );
  await expect(live(page).locator(".coverflow-album-heading")).toContainText(
    "Monkeys",
  );
  await key(page, "Escape");
  await expect(
    live(page).locator('.cf-card[aria-current="true"]'),
  ).toHaveAttribute("aria-label", /Monkeys/);
  await key(page, "Enter");
  await key(page, "Enter");
  await expect(live(page).locator(".np-info")).toContainText("Monkeys");
  await expect(
    live(page).getByRole("progressbar", { name: "播放进度" }),
  ).toHaveAttribute("aria-valuemax", /12[45]/);
  await holdCenter(page);
  await choose(page, "查看播放队列");
  await expect(live(page).locator(".track-row")).toHaveCount(1);
});

test("settings use real choice pages, matched fonts, checkmarks and persisted choices", async ({
  page,
}) => {
  await page.goto("/");
  await choose(page, "设置");
  const row = live(page).locator(".screen-row").filter({ hasText: "机身颜色" });
  const fonts = await row.evaluate((element) => [
    getComputedStyle(element.querySelector(".row-title")!).fontFamily,
    getComputedStyle(element.querySelector(".row-value")!).fontFamily,
  ]);
  expect(fonts[0]).toBe(fonts[1]);
  await choose(page, "机身颜色");
  await expect(page.locator(".lcd-screen")).toHaveAttribute(
    "data-page",
    "finish",
  );
  await expect(live(page).locator(".row-check")).toHaveCount(1);
  await choose(page, "黑色");
  await expect(page.locator("main")).toHaveAttribute("data-finish", "black");
  await expect(page.locator(".screen-outgoing")).toHaveCount(0);
  await page.reload();
  await expect(page.locator("main")).toHaveAttribute("data-finish", "black");
});

test("search and playlist naming can be entered entirely on the click wheel", async ({
  page,
}) => {
  await page.goto("/");
  await choose(page, "音乐");
  await choose(page, "搜索");
  await text(page, "Care");
  await expect(live(page).locator(".track-row")).toHaveCount(1);
  await choose(page, "Carefree");
  await expect(page.locator(".lcd-screen")).toHaveAttribute(
    "data-page",
    "playing",
  );
  await home(page);
  await choose(page, "音乐");
  await choose(page, "播放列表");
  await choose(page, "新建歌单…");
  await text(page, "ABC");
  await choose(page, "创建歌单");
  await choose(page, "ABC");
  await choose(page, "添加歌曲");
  await choose(page, "Carefree");
  await choose(page, "Sneaky Snitch");
  await choose(page, "完成选择");
  await expect(live(page).locator(".track-row")).toHaveCount(2);
  await choose(page, "Carefree");
  await expect(live(page).locator(".np-index")).toHaveText("1 / 2");
  await page.reload();
  await expect(page.locator(".screen-playing-link .icon-pause")).toHaveCount(1);
});

test("photos import, thumbnail selection, full view, slideshow and refresh use the wheel", async ({
  page,
}) => {
  await page.goto("/");
  await choose(page, "照片");
  const chooserPromise = page.waitForEvent("filechooser");
  await choose(page, "导入照片…");
  const chooser = await chooserPromise;
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII=",
    "base64",
  );
  await chooser.setFiles([
    { name: "one.png", mimeType: "image/png", buffer: png },
    { name: "two.png", mimeType: "image/png", buffer: png },
  ]);
  await choose(page, "所有照片");
  await expect(live(page).locator(".photo-contact-sheet img")).toHaveCount(2);
  await expect
    .poll(() =>
      live(page)
        .locator(".photo-contact-sheet img")
        .first()
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await key(page, "ArrowDown");
  await key(page, "Enter");
  await expect(live(page).locator(".photo-full img")).toHaveAttribute(
    "alt",
    "two.png",
  );
  await expect(page.locator(".screen-outgoing")).toHaveCount(0);
  await key(page, "ArrowDown");
  await expect(page.locator(".screen-outgoing")).toHaveCount(0);
  await key(page, "ArrowUp");
  await expect(live(page).locator(".photo-full img")).toHaveAttribute(
    "alt",
    "one.png",
  );
  await key(page, "Space");
  await expect(live(page).locator(".photo-full span")).toContainText("▷");
  await expect(live(page).locator(".photo-full img")).toHaveAttribute(
    "alt",
    "two.png",
  );
  await page.reload();
  await choose(page, "照片");
  await choose(page, "所有照片");
  await expect(live(page).locator(".photo-contact-sheet img")).toHaveCount(2);
  await key(page, "Enter");
  await holdCenter(page);
  await choose(page, "删除照片…");
  await choose(page, "删除此照片");
  await expect(live(page).locator(".photo-contact-sheet img")).toHaveCount(1);
});

test("podcasts keep show grouping and episode bookmarks apart from music", async ({
  page,
}) => {
  await page.goto("/");
  await choose(page, "播客");
  const chooserPromise = page.waitForEvent("filechooser");
  await choose(page, "导入播客…");
  const chooser = await chooserPromise;
  await chooser.setFiles("public/music/carefree.mp3");
  await expect(live(page).locator(".screen-row")).toHaveCount(2);
  await expect
    .poll(() => live(page).locator(".screen-row").first().textContent())
    .not.toContain("未知");
  const show = (await live(page)
    .locator(".screen-row .row-title")
    .first()
    .textContent())!.trim();
  await choose(page, show);
  const episode = (await live(page)
    .locator(".track-row .row-title")
    .first()
    .textContent())!.trim();
  await choose(page, episode);
  await expect(live(page).getByRole("progressbar")).toHaveAttribute(
    "aria-valuemax",
    /205/,
  );
  await key(page, "Enter");
  await key(page, "ArrowDown");
  await key(page, "ArrowDown");
  await key(page, "Space");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          Object.values(
            JSON.parse(
              localStorage.getItem("reipod-podcast-positions") ?? "{}",
            ),
          )[0],
      ),
    )
    .toBeGreaterThan(2);
  await home(page);
  await choose(page, "播客");
  await choose(page, show);
  await choose(page, episode);
  await expect(live(page).getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    /^[4-9]|^[1-9][0-9]/,
  );
});

test("album folders retain their names and genre/composer entries are navigable", async ({
  page,
}, testInfo) => {
  const folder = testInfo.outputPath("旅行相册");
  await mkdir(folder, { recursive: true });
  await writeFile(
    join(folder, "photo.png"),
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII=",
      "base64",
    ),
  );
  await page.goto("/");
  await choose(page, "照片");
  const pending = page.waitForEvent("filechooser");
  await choose(page, "导入相册文件夹…");
  const chooser = await pending;
  await chooser.setFiles(folder);
  await choose(page, "旅行相册");
  await expect(live(page).locator(".photo-contact-sheet img")).toHaveCount(1);
  await home(page);
  await choose(page, "音乐");
  await choose(page, "风格");
  await choose(page, "未知风格");
  await expect(live(page).locator(".track-row")).toHaveCount(3);
  await home(page);
  await choose(page, "音乐");
  await choose(page, "作曲者");
  await choose(page, "未知作曲者");
  await expect(live(page).locator(".track-row")).toHaveCount(3);
});

test("HOLD, hold seeking, sleep and center views remain operable without touching the screen", async ({
  page,
}) => {
  await page.goto("/");
  await key(page, "Space");
  await expect(live(page).getByRole("progressbar")).toHaveAttribute(
    "aria-valuemax",
    /205/,
  );
  await key(page, "Enter");
  await expect(live(page).locator(".view-seek")).toHaveCount(1);
  await key(page, "ArrowDown");
  await key(page, "Enter");
  await key(page, "ArrowDown");
  await expect(live(page).locator(".np-shuffle-options .chosen")).toContainText(
    "歌曲",
  );
  await key(page, "Enter");
  await key(page, "ArrowDown");
  await expect(live(page).locator(".classic-rating .chosen")).toHaveCount(1);
  await page.locator(".top-hold").click();
  const value = await live(page)
    .getByRole("progressbar")
    .getAttribute("aria-valuenow");
  await key(page, "Escape");
  await expect(page.locator(".lcd-screen")).toHaveAttribute(
    "data-page",
    "playing",
  );
  await page.locator(".top-hold").click();
  await page.locator(".click-wheel").focus();
  await page.keyboard.down("ArrowRight");
  await expect
    .poll(() =>
      live(page).getByRole("progressbar").getAttribute("aria-valuenow"),
    )
    .not.toBe(value);
  await page.keyboard.up("ArrowRight");
  await page.keyboard.down(" ");
  await expect(page.locator(".lcd-screen")).toHaveAttribute(
    "data-sleeping",
    "true",
  );
  await page.keyboard.up(" ");
  await key(page, "Enter");
  await expect(page.locator(".lcd-screen")).toHaveAttribute(
    "data-sleeping",
    "false",
  );
});

test("rapid reversal, reduced motion and SVG snapshots remain clean", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await choose(page, "设置");
  await choose(page, "机身颜色");
  await key(page, "Escape");
  await key(page, "Escape");
  await expect(page.locator(".screen-outgoing .screen-outgoing")).toHaveCount(
    0,
  );
  await expect(page.locator(".screen-outgoing")).toHaveCount(0);
  const ids = await page
    .locator("[id]")
    .evaluateAll((items) => items.map((item) => item.id));
  expect(new Set(ids).size).toBe(ids.length);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await choose(page, "音乐");
  await expect(page.locator(".screen-outgoing")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("split menu navigation keeps the right preview stationary while the left half slides", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator(".lcd-screen")
    .evaluate((element) =>
      (element as HTMLElement).style.setProperty(
        "--lcd-page-duration",
        "1000ms",
      ),
    );
  await key(page, "Enter");
  await expect(page.locator(".screen-pane-still")).toHaveCount(1);
  const dimensions = await page
    .locator(".screen-pane-still")
    .evaluate((element) => {
      const pane = element.getBoundingClientRect(),
        lcd = document
          .querySelector(".screen-viewport")!
          .getBoundingClientRect();
      return {
        left: pane.left - lcd.left,
        width: pane.width,
        lcd: lcd.width,
        inert: (element as HTMLElement).inert,
      };
    });
  expect(dimensions.left).toBeCloseTo(dimensions.lcd / 2, 0);
  expect(dimensions.width).toBeCloseTo(dimensions.lcd / 2, 0);
  expect(dimensions.inert).toBe(true);
  const frames = await live(page).evaluate((element) =>
    element.getAnimations()[0].effect!.getKeyframes(),
  );
  expect(frames[0].transform).toContain(String(Math.round(dimensions.lcd / 2)));
  await expect(page.locator(".screen-pane-still")).toHaveCount(0);
  await expect(page.locator(".screen-outgoing")).toHaveCount(0);
});

test("LCD geometry and narrow menu scrolling remain aligned to the original hardware grid", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  const dimensions = await page.evaluate(() => {
    const body = document
        .querySelector(".classic-device")!
        .getBoundingClientRect(),
      lcd = document.querySelector(".lcd-screen")!.getBoundingClientRect();
    return {
      body: body.height / body.width,
      lcd: lcd.width / lcd.height,
      x: document.documentElement.scrollWidth > innerWidth,
      y: document.documentElement.scrollHeight > innerHeight,
    };
  });
  expect(dimensions.body).toBeCloseTo(103.5 / 61.8, 2);
  expect(dimensions.lcd).toBeCloseTo(4 / 3, 1);
  expect(dimensions.x).toBe(false);
  expect(dimensions.y).toBe(false);
  await choose(page, "设置");
  await choose(page, "背景");
  await choose(page, "深色");
  await expect(page.locator("main")).toHaveAttribute("data-background", "dark");
});
