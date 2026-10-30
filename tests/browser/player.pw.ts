import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { live, key, home, choose, holdCenter, text } from "./dial";
import { taggedAudio } from "./taggedAudio";

test("Now Playing uses the carousel's full-pane artwork style and stays on the current track", async ({
  page,
}) => {
  await page.goto("/");
  const carousel = live(page).getByLabel("专辑封面轮播");
  const carouselBounds = await carousel
    .locator(".album-preview-stage")
    .boundingBox();
  const carouselMotion = await carousel
    .locator(".preview-cover-current > .album-art")
    .evaluate((el) => {
      const css = getComputedStyle(el);
      return { name: css.animationName, duration: css.animationDuration };
    });
  await key(page, "Space");
  await expect(live(page).locator(".np-cover img").first()).toHaveAttribute(
    "src",
    /carefree/,
  );
  await home(page);
  await choose(page, "正在播放");
  await expect(live(page).locator(".np-cover img").first()).toHaveAttribute(
    "src",
    /carefree/,
  );
  await key(page, "Escape");
  await expect(page.locator(".screen-outgoing")).toHaveCount(0);
  const preview = live(page).getByLabel("正在播放封面");
  await expect(live(page).locator(".menu-preview-card")).toHaveCount(0);
  expect(await preview.locator(".album-preview-stage").boundingBox()).toEqual(
    carouselBounds,
  );
  expect(
    await preview
      .locator(".preview-cover-current > .album-art")
      .evaluate((el) => {
        const css = getComputedStyle(el);
        return { name: css.animationName, duration: css.animationDuration };
      }),
  ).toEqual(carouselMotion);
  await expect(preview.locator("img")).toHaveAttribute("src", /carefree/);
  await key(page, "ArrowRight");
  await expect(preview.locator("img")).toHaveAttribute(
    "src",
    /monkeys-spinning-monkeys/,
  );
  await key(page, "Space");
  await expect(preview).toBeVisible();
  // A full carousel interval must not replace the current song with unrelated art.
  await page.waitForTimeout(6500);
  await expect(preview.locator("img")).toHaveAttribute(
    "src",
    /monkeys-spinning-monkeys/,
  );
  await expect(page.locator(".screen-outgoing")).toHaveCount(0);
  await page
    .locator(".screen-glass")
    .screenshot({ path: ".local/screenshots/now-playing-home-preview.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(preview).toBeVisible();
  const paneBounds = await live(page).locator(".menu-preview").boundingBox();
  expect(await preview.locator(".album-preview-stage").boundingBox()).toEqual(
    paneBounds,
  );
});

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

test("artist browsing drills into scoped albums, keeps its focus and plays only that scope", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("reipod-demos", "hidden"),
  );
  await page.goto("/");
  await choose(page, "音乐");
  const choosing = page.waitForEvent("filechooser");
  await choose(page, "导入音乐");
  await (
    await choosing
  ).setFiles([
    taggedAudio("Second Song", "Alpha", "Z Album"),
    taggedAudio("First Song", "Alpha", "Z Album"),
    taggedAudio("Other Song", "Alpha", "Y Album"),
    taggedAudio("Outsider", "Zulu", "A Album"),
  ]);
  await expect(page.locator(".lcd-screen")).toHaveAttribute(
    "data-page",
    "songs",
  );
  await key(page, "Escape");
  await choose(page, "艺人");
  // Filenames already match titles before tags load. Wait for artist metadata itself
  // so the "unknown artist" row cannot disappear between wheel steps.
  await expect(live(page).locator(".row-title")).toHaveText([
    "全部专辑", "Alpha", "Zulu",
  ]);
  await choose(page, "Alpha");
  await expect(live(page).locator(".screen-status > strong")).toHaveText(
    "Alpha",
  );
  await expect(live(page).locator(".row-title")).toHaveText([
    "全部歌曲",
    "Y Album",
    "Z Album",
  ]);
  await expect(live(page).locator(".row-label small")).toHaveText([
    "3 首歌曲",
    "1 首歌曲",
    "2 首歌曲",
  ]);
  await expect(page.locator(".screen-outgoing")).toHaveCount(0);
  await page
    .locator(".screen-glass")
    .screenshot({ path: ".local/screenshots/artist-album-browser.png" });
  await choose(page, "Z Album");
  await expect(live(page).locator(".track-row")).toHaveCount(2);
  await choose(page, "Second Song");
  await expect(live(page).locator(".now-playing-top")).toHaveAttribute(
    "aria-label",
    "播放队列第 2 首，共 2 首",
  );
  await key(page, "Space");
  await key(page, "Escape");
  await expect(live(page).locator(".screen-row.selected")).toContainText(
    "Second Song",
  );
  await key(page, "Escape");
  await expect(live(page).locator(".screen-row.selected")).toContainText(
    "Z Album",
  );
  await choose(page, "全部歌曲");
  await expect(live(page).locator(".row-title")).toHaveText([
    "First Song",
    "Other Song",
    "Second Song",
  ]);
  await key(page, "Escape");
  await key(page, "Space");
  await expect(live(page).locator(".now-playing-top")).toHaveAttribute(
    "aria-label",
    "播放队列第 1 首，共 3 首",
  );
  await key(page, "Space");
  await holdCenter(page);
  await choose(page, "浏览专辑");
  await expect(live(page).locator(".track-row")).toHaveCount(2);
  await expect(live(page).locator(".screen-row.selected")).toContainText(
    "First Song",
  );
  await key(page, "Escape");
  await choose(page, "浏览艺人");
  await expect(live(page).locator(".track-row")).toHaveCount(3);
  await home(page);
  await choose(page, "音乐");
  await choose(page, "专辑");
  await expect(live(page).locator(".row-title")).toHaveText([
    "全部歌曲",
    "A Album",
    "Y Album",
    "Z Album",
  ]);
  await choose(page, "A Album");
  await expect(live(page).locator(".row-title")).toHaveText(["Outsider"]);
});

test("Cover Flow uses artist order while Albums retains title order", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("reipod-demos", "hidden"),
  );
  await page.goto("/");
  await choose(page, "音乐");
  const choosing = page.waitForEvent("filechooser");
  await choose(page, "导入音乐");
  await (
    await choosing
  ).setFiles([
    taggedAudio("One", "Zulu", "A Album"),
    taggedAudio("Two", "Alpha", "Z Album"),
  ]);
  await expect(page.locator(".lcd-screen")).toHaveAttribute(
    "data-page",
    "songs",
  );
  await key(page, "Escape");
  await choose(page, "专辑");
  await expect(live(page).locator(".row-title")).toHaveText([
    "全部歌曲",
    "A Album",
    "Z Album",
  ]);
  await key(page, "Escape");
  await choose(page, "Cover Flow");
  await expect(live(page).locator(".cf-caption strong")).toHaveText("Z Album");
  await expect(live(page).locator(".cf-caption > span")).toHaveText("Alpha");
  await key(page, "ArrowDown");
  await expect(live(page).locator(".cf-caption strong")).toHaveText("A Album");
  await key(page, "Enter");
  await expect(live(page).locator(".coverflow-album-heading")).toContainText(
    "A Album",
  );
  await expect(live(page).locator(".row-title")).toHaveText(["One"]);
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

test("classic menu order and Music customization survive legacy settings and reload", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("menu-migration-tested")) {
      localStorage.setItem(
        "reipod-appearance",
        JSON.stringify({
          menuVersion: 2,
          mainMenu: [
            "photos",
            "podcasts",
            "extras",
            "coverflow",
            "import",
            "demo",
            "shuffle-all",
            "playing",
          ],
        }),
      );
      localStorage.setItem("menu-migration-tested", "true");
    }
  });
  await page.goto("/");
  const labels = () => live(page).locator(".row-title").allTextContents();
  expect(await labels()).toEqual([
    "音乐",
    "照片",
    "播客",
    "附加功能",
    "设置",
    "随机播放歌曲",
  ]);
  await choose(page, "音乐");
  expect(await labels()).toEqual([
    "Cover Flow",
    "播放列表",
    "艺人",
    "专辑",
    "歌曲",
    "风格",
    "作曲者",
    "搜索",
    "导入音乐",
    "试听音乐",
  ]);
  await home(page);
  await choose(page, "设置");
  expect((await labels()).slice(0, 9)).toEqual([
    "关于本机",
    "音乐服务",
    "歌词显示",
    "随机播放",
    "重复播放",
    "主菜单",
    "音乐菜单",
    "音量上限",
    "背光时间",
  ]);
  await choose(page, "音乐菜单");
  await choose(page, "Cover Flow");
  await page.reload();
  await choose(page, "音乐");
  expect(await labels()).not.toContain("Cover Flow");
  await expect(live(page).locator(".screen-row.selected")).toContainText(
    "播放列表",
  );
});

test("desktop and phone layouts render the bundled LCD typeface and keep HOLD touchable", async ({
  page,
  context,
}) => {
  await page.goto("/");
  for (const viewport of [
    { width: 1280, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => document.fonts.ready);
    const cdp = await context.newCDPSession(page);
    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable");
    const { root } = await cdp.send("DOM.getDocument");
    const { nodeId } = await cdp.send("DOM.querySelector", {
      nodeId: root.nodeId,
      selector: ".screen-viewport .screen-row.selected .marquee-text",
    });
    const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
    expect(fonts.length).toBeGreaterThan(0);
    expect(fonts.every((font) => font.isCustomFont)).toBe(true);
    await cdp.detach();
    const bounds = await page.locator(".top-hold").boundingBox();
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
    await page.getByRole("switch", { name: "HOLD 锁定" }).click();
    await expect(page.getByRole("switch")).toBeChecked();
    await expect(live(page).getByRole("img", { name: "已锁定" })).toHaveCount(
      1,
    );
    await page.getByRole("switch").click();
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page
      .locator(".hold-track > i")
      .evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toBe("0s");
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
  await expect(live(page).locator(".now-playing-top")).toHaveAttribute(
    "aria-label",
    "播放队列第 1 首，共 2 首",
  );
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
  await expect(live(page).locator(".photo-grid-header")).toContainText(
    "2 张照片",
  );
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
  await expect(live(page).locator(".screen-status")).toBeHidden();
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
  await expect(live(page).locator(".view-shuffle")).toHaveCount(1);
  await key(page, "ArrowDown");
  await expect(live(page).locator(".np-shuffle-options .chosen")).toContainText(
    "歌曲",
  );
  await key(page, "Enter");
  await key(page, "ArrowDown");
  await expect(live(page).locator(".classic-rating .chosen")).toHaveCount(1);
  await key(page, "Enter");
  await expect(live(page).locator(".view-art")).toHaveCount(1);
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
  await expect(
    live(page).locator(".screen-playing-link .icon-seek-forward"),
  ).toHaveCount(1);
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

test("LCD and body aspect ratios remain stable with narrow menu scrolling", async ({
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

test("Cover Flow flips the selected cover into an overlaid album sheet, including interruptions", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await choose(page, "音乐");
  await choose(page, "Cover Flow");
  await expect(page.locator(".screen-outgoing")).toHaveCount(0);
  await key(page, "Enter");
  const panel = live(page).locator(".cf-album-panel");
  const motion = await panel.evaluate((element) => {
    const animation = element.getAnimations()[0];
    const viewport = document
      .querySelector(".screen-viewport")!
      .getBoundingClientRect();
    const bounds = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      duration: animation.effect!.getTiming().duration,
      frames: animation.effect!.getKeyframes().map((frame) => frame.transform),
      layoutWidth: parseFloat(style.width),
      viewportWidth: viewport.width,
      coverStillPresent: !!document.querySelector(
        '.screen-outgoing .cf-card[aria-current="true"]',
      ),
      pageSlides: document
        .querySelector(".screen-viewport > .screen-content")!
        .getAnimations().length,
    };
  });
  expect(motion.duration).toBe(360);
  expect(motion.frames[0]).toContain("rotateY(-90deg)");
  expect(motion.frames.at(-1)).toContain("rotateY(0deg)");
  expect(motion.layoutWidth / motion.viewportWidth).toBeCloseTo(0.8, 2);
  expect(motion.coverStillPresent).toBe(true);
  expect(motion.pageSlides).toBe(0);
  await key(page, "Escape");
  await key(page, "Enter");
  await key(page, "Escape");
  await expect(page.locator(".screen-outgoing")).toHaveCount(0);
  await expect(live(page).locator(".cf-album-panel")).toHaveCount(0);
  await expect(
    live(page).locator('.cf-card[aria-current="true"]'),
  ).toHaveAttribute("aria-label", /Carefree/);
  expect(errors).toEqual([]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await key(page, "Enter");
  await expect(panel).toBeVisible();
  await expect(page.locator(".screen-outgoing")).toHaveCount(0);
});

test("provisional menu travel keeps text readable and Cover Flow closes from both edges", async ({
  page,
}) => {
  await page.goto("/");
  await choose(page, "音乐");
  const travel = await live(page).evaluate((element) => {
    const animation = element.getAnimations()[0];
    animation.pause();
    const duration = Number(animation.effect!.getTiming().duration);
    animation.currentTime = duration / 4;
    return {
      duration,
      progress: animation.effect!.getComputedTiming().progress,
    };
  });
  expect(travel.duration).toBe(360);
  expect(travel.progress).toBeLessThan(0.2);
  await live(page).evaluate((element) => element.getAnimations()[0].finish());
  await choose(page, "Cover Flow");
  await expect(page.locator(".screen-outgoing")).toHaveCount(0);
  await key(page, "Escape");
  await expect(page.locator("[data-flow-half]")).toHaveCount(2);
  const halves = await page.locator("[data-flow-half]").evaluateAll((items) =>
    items.map((item) => {
      const animation = item.getAnimations()[0];
      animation.pause();
      animation.currentTime =
        Number(animation.effect!.getTiming().duration) / 2;
      return {
        side: (item as HTMLElement).dataset.flowHalf,
        duration: animation.effect!.getTiming().duration,
        transform: getComputedStyle(item).transform,
        inert: (item as HTMLElement).inert,
      };
    }),
  );
  expect(halves.map((half) => half.duration)).toEqual([480, 480]);
  expect(halves.every((half) => half.inert)).toBe(true);
  expect(Number(halves[0].transform.split(",")[4])).toBeLessThan(0);
  expect(Number(halves[1].transform.split(",")[4])).toBeGreaterThan(0);
  await page
    .locator(".screen-glass")
    .screenshot({ path: ".local/screenshots/flow-close-midpoint.png" });
  // Reverse midway: stale half-surfaces must disappear and the fan remains navigable.
  await key(page, "Enter");
  await expect(page.locator(".lcd-screen")).toHaveAttribute(
    "data-page",
    "coverflow",
  );
  await expect(page.locator(".screen-outgoing")).toHaveCount(0);
  await key(page, "Escape");
  await expect(page.locator(".screen-outgoing")).toHaveCount(0);
  await expect(live(page).locator(".screen-row.selected")).toContainText(
    "Cover Flow",
  );
});

test("playback controls share one bottom bay without moving the cover or creating LCD buttons", async ({
  page,
}) => {
  await page.goto("/");
  await key(page, "Space");
  const cover = live(page).locator(".np-cover");
  await expect(page.locator(".screen-outgoing")).toHaveCount(0);
  const original = await cover.boundingBox();
  await expect(live(page).getByRole("progressbar")).toHaveAttribute(
    "aria-valuemax",
    /205/,
  );
  const line = await live(page)
    .locator(".np-control-surface .screen-progress")
    .evaluate((element) => {
      const times = [...element.querySelectorAll(":scope > span")].map((item) =>
        item.getBoundingClientRect(),
      );
      const bar = element
        .querySelector(".firmware-progress")!
        .getBoundingClientRect();
      return times.every(
        (time) => time.top < bar.bottom && time.bottom > bar.top,
      );
    });
  expect(line).toBe(true);
  await key(page, "Enter");
  await key(page, "ArrowDown");
  await expect(
    live(page).locator('.firmware-progress[data-seeking="true"] b'),
  ).toHaveCount(1);
  await key(page, "Enter");
  await key(page, "ArrowDown");
  await expect(live(page).locator(".np-shuffle-options .chosen")).toHaveText(
    "歌曲",
  );
  await key(page, "Enter");
  await key(page, "ArrowDown");
  await expect(live(page).locator(".classic-rating .chosen")).toHaveCount(1);
  const after = await cover.boundingBox();
  expect(after!.x).toBeCloseTo(original!.x, 1);
  expect(after!.y).toBeCloseTo(original!.y, 1);
  await key(page, "Enter");
  await expect(live(page).locator(".view-art")).toHaveCount(1);
  await key(page, "ArrowDown");
  await expect(live(page).locator(".classic-volume")).toBeVisible();
  await expect(live(page).getByRole("progressbar")).toHaveCount(0);
  await expect(live(page).locator(".classic-volume")).toHaveCount(0);
  await expect(live(page).getByRole("progressbar")).toBeVisible();
  expect(
    await page
      .locator(".screen-glass button,.screen-glass input,.screen-glass a")
      .count(),
  ).toBe(0);
});

test("a physical or keyboard confirmation emits one press and one release click", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "reipod-appearance",
      JSON.stringify({ clickSound: true }),
    );
    const Original = window.AudioContext;
    (window as any).clickFrequencies = [];
    window.AudioContext = class extends Original {
      createOscillator() {
        const oscillator = super.createOscillator();
        const set = oscillator.frequency.setValueAtTime.bind(
          oscillator.frequency,
        );
        oscillator.frequency.setValueAtTime = (
          value: number,
          start: number,
        ) => {
          (window as any).clickFrequencies.push(value);
          return set(value, start);
        };
        return oscillator;
      }
    };
  });
  await page.goto("/");
  await key(page, "Enter");
  expect(await page.evaluate(() => (window as any).clickFrequencies)).toEqual([
    650, 1350,
  ]);
  await page.locator(".wheel-select").click();
  expect(await page.evaluate(() => (window as any).clickFrequencies)).toEqual([
    650, 1350, 650, 1350,
  ]);
});

test("saved rating and queue position remain readable above the control bay at each viewport", async ({ page }) => {
  await page.goto("/");
  await key(page, "Space");
  await expect(page.locator(".screen-outgoing")).toHaveCount(0);
  // Pause the bundled fixture so screenshots and geometry use a settled session.
  await key(page, "Space");
  await expect(live(page).locator(".np-sequence")).toHaveText("1 / 3");
  await expect(live(page).locator(".np-saved-rating")).toHaveCount(0);
  await key(page, "Enter");
  await key(page, "Enter");
  await key(page, "Enter");
  await key(page, "ArrowDown");
  await key(page, "Enter");
  await expect(live(page).getByLabel("已评分 1 星")).toBeVisible();
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
    });
    const bounds = await live(page).locator(".now-playing-screen").evaluate(element => {
      const info = element.querySelector(".np-info")!.getBoundingClientRect();
      const bay = element.querySelector(".np-control-bay")!.getBoundingClientRect();
      const children = [...element.querySelector(".np-info")!.children].map(child => child.getBoundingClientRect());
      return {
        aboveBay: info.bottom <= bay.top,
        rowsSeparate: children.every((child, index) => index === 0 || children[index - 1].bottom <= child.top + 1),
        insideWidth: info.right <= element.getBoundingClientRect().right,
      };
    });
    expect(bounds).toEqual({ aboveBay: true, rowsSeparate: true, insideWidth: true });
    await page.locator(".screen-glass").screenshot({ path: `.local/screenshots/playback-reference-layout-${width}.png` });
    const capture = await page.evaluate(() => ({
      viewport: { width: innerWidth, height: innerHeight },
      dpr: devicePixelRatio,
      userAgent: navigator.userAgent,
      fonts: document.fonts.status,
      lcd: document.querySelector(".screen-glass")!.getBoundingClientRect().toJSON(),
      fixture: { track: "Carefree", status: "paused", rating: 1 },
    }));
    await writeFile(`.local/screenshots/playback-reference-layout-${width}.json`, JSON.stringify(capture, null, 2));
  }
});

test("seek and volume endpoints stay clear of labels and preserve the cover", async ({ page }) => {
  await page.goto("/");
  await key(page, "Space");
  await expect(page.locator(".screen-outgoing")).toHaveCount(0);
  await key(page, "Space");
  const cover = await live(page).locator(".np-cover").boundingBox();
  await key(page, "Enter");
  await key(page, "ArrowUp");
  const bar = live(page).getByRole("progressbar");
  await expect(bar).toHaveAttribute("aria-valuenow", "0");
  const clearOfTimes = () => live(page).locator(".np-control-surface .screen-progress").evaluate(element => {
    const marker = element.querySelector(".firmware-progress > b")!.getBoundingClientRect();
    const elapsed = element.querySelector(".progress-elapsed")!.getBoundingClientRect();
    const remaining = element.querySelector(".progress-remaining")!.getBoundingClientRect();
    return marker.left >= elapsed.right && marker.right <= remaining.left;
  });
  expect(await clearOfTimes()).toBe(true);
  await page.locator(".screen-glass").screenshot({ path: ".local/screenshots/playback-seek-start.png" });
  const duration = Number(await bar.getAttribute("aria-valuemax"));
  for (let index = 0; index < Math.ceil(duration / 2); index++) {
    await page.keyboard.press("ArrowDown");
  }
  await expect(bar).toHaveAttribute("aria-valuenow", String(duration));
  expect(await clearOfTimes()).toBe(true);
  await page.locator(".screen-glass").screenshot({ path: ".local/screenshots/playback-seek-end.png" });
  for (let index = 0; index < 3; index++) await key(page, "Enter");
  for (const [keyName, percentage] of [["ArrowDown", 100], ["ArrowUp", 0]] as const) {
    for (let index = 0; index < 40; index++) await page.keyboard.press(keyName);
    await expect(live(page).getByRole("status", { name: `音量 ${percentage}%` })).toBeVisible();
    const width = await live(page).locator(".classic-volume-track").evaluate(element => ({
      track: element.getBoundingClientRect().width,
      fill: element.querySelector("i")!.getBoundingClientRect().width,
    }));
    expect(width.fill).toBeCloseTo(width.track * percentage / 100, 1);
    expect(await live(page).locator(".np-cover").boundingBox()).toEqual(cover);
    await page.locator(".screen-glass").screenshot({ path: `.local/screenshots/playback-volume-${percentage}.png` });
  }
});

test("control bay slides independently, interrupts cleanly and respects reduced motion", async ({ page }) => {
  await page.goto("/");
  await key(page, "Space");
  await expect(page.locator(".screen-outgoing")).toHaveCount(0);
  await key(page, "Space");
  const cover = await live(page).locator(".np-cover").boundingBox();
  await key(page, "Enter");
  const transforms = await live(page).locator(".np-control-bay").evaluate(element => {
    const animations = element.getAnimations({ subtree: true });
    for (const animation of animations) {
      animation.pause();
      animation.currentTime = Number(animation.effect!.getTiming().duration) / 2;
    }
    const x = (selector: string) => new DOMMatrixReadOnly(getComputedStyle(element.querySelector(selector)!).transform).m41;
    return { incoming: x(".np-control-surface"), outgoing: x(".np-control-outgoing") };
  });
  expect(transforms.incoming).toBeGreaterThan(0);
  expect(transforms.outgoing).toBeLessThan(0);
  await page.locator(".screen-glass").screenshot({ path: ".local/screenshots/playback-control-slide-midpoint.png" });
  expect(await live(page).locator(".np-cover").boundingBox()).toEqual(cover);
  // Another Center press replaces the in-flight snapshot, without queuing input.
  await key(page, "Enter");
  await expect(live(page).locator(".np-control-bay")).toHaveAttribute("data-control", "shuffle");
  const departure = await live(page).locator(".np-control-bay").evaluate(element => {
    const animation = element.getAnimations({ subtree: true }).find(item =>
      ((item.effect as KeyframeEffect).target as Element)?.classList.contains("np-control-outgoing"));
    const first = (animation!.effect as KeyframeEffect).getKeyframes()[0];
    return new DOMMatrixReadOnly(String(first.transform)).m41;
  });
  expect(departure).toBeCloseTo(transforms.incoming, 1);
  await expect(live(page).locator(".np-control-outgoing")).toHaveCount(1);
  await expect(live(page).locator(".np-control-outgoing")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await key(page, "Enter");
  await expect(live(page).locator(".np-control-bay")).toHaveAttribute("data-control", "rating");
  await expect(live(page).locator(".np-control-outgoing")).toHaveCount(0);
  expect(await live(page).locator(".np-control-bay").evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
});

test("finished control panels are detached before their animation is released", async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).connectedControlResets = [];
    const original = Animation.prototype.cancel;
    Animation.prototype.cancel = function () {
      const target = (this.effect as KeyframeEffect | null)?.target;
      if (target instanceof HTMLElement && target.classList.contains("np-control-outgoing") &&
          target.isConnected && this.playState === "finished") {
        (window as any).connectedControlResets.push(getComputedStyle(target).transform);
      }
      return original.call(this);
    };
  });
  await page.goto("/");
  await key(page, "Space");
  await expect(page.locator(".screen-outgoing")).toHaveCount(0);
  await key(page, "Space");
  await key(page, "Enter");
  await expect(live(page).locator(".np-control-outgoing")).toHaveCount(0);
  await key(page, "Enter");
  await expect(live(page).locator(".np-control-outgoing")).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).connectedControlResets)).toEqual([]);
});

test("Cover Flow entry parts the menu halves and can return before entry finishes", async ({ page }) => {
  await page.goto("/");
  await choose(page, "音乐");
  await expect(page.locator(".screen-outgoing")).toHaveCount(0);
  await choose(page, "Cover Flow");
  const halves = page.locator("[data-flow-opening-half]");
  await expect(halves).toHaveCount(2);
  const motion = await halves.evaluateAll(items => items.map(element => {
    const animation = element.getAnimations()[0];
    animation.pause();
    animation.currentTime = Number(animation.effect!.getTiming().duration) / 2;
    return {
      side: (element as HTMLElement).dataset.flowOpeningHalf,
      duration: animation.effect!.getTiming().duration,
      x: new DOMMatrixReadOnly(getComputedStyle(element).transform).m41,
      inert: (element as HTMLElement).inert,
    };
  }));
  expect(motion.map(item => item.duration)).toEqual([320, 320]);
  expect(motion[0].x).toBeLessThan(0);
  expect(motion[1].x).toBeGreaterThan(0);
  expect(motion.every(item => item.inert)).toBe(true);
  await page.locator(".screen-glass").screenshot({ path: ".local/screenshots/flow-open-midpoint.png" });
  await key(page, "Escape");
  await expect(page.locator(".lcd-screen")).toHaveAttribute("data-page", "music");
  await expect(page.locator(".screen-outgoing")).toHaveCount(0);
  await expect(page.locator("[data-flow-opening-half]")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await key(page, "Enter");
  await expect(page.locator(".lcd-screen")).toHaveAttribute("data-page", "coverflow");
  await expect(page.locator(".screen-outgoing")).toHaveCount(0);
  await expect(live(page).locator(".coverflow-scene")).toBeVisible();
});
