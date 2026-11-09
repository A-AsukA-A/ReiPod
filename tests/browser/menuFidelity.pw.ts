import { test, expect } from "@playwright/test";
import { decode } from "fast-png";
import { choose, home, key, live } from "./dial";
import { taggedAudio } from "./taggedAudio";

// Engineering guards for the bounded task-27 fit in UI_METRICS; these do not
// establish full hardware fidelity, original font identity or firmware timing.
test("main menu keeps the same LCD text spacing and grid at phone and desktop scales", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("reipod-appearance", JSON.stringify({ backlight: 0, clickSound: false })));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const samples: { spacing: number; height: number }[] = [];
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(() => document.fonts.ready);
    const rows = live(page).locator(".home-screen .screen-row");
    samples.push(await rows.first().evaluate(row => {
      const unit = document.querySelector(".lcd-screen")!.getBoundingClientRect().width / 320;
      return { spacing: parseFloat(getComputedStyle(row).letterSpacing) / unit,
        height: row.getBoundingClientRect().height / unit };
    }));
    // First/last selection must not change the grid or push it into the preview.
    const before = await rows.evaluateAll(items => items.map(row => row.getBoundingClientRect().toJSON()));
    for (let step = 0; step < await rows.count(); step++) await key(page, "ArrowDown");
    await expect(rows.last()).toHaveAttribute("aria-current", "true");
    expect(await rows.evaluateAll(items => items.map(row => row.getBoundingClientRect().toJSON()))).toEqual(before);
    for (let step = 0; step < await rows.count(); step++) await key(page, "ArrowUp");
    await expect(rows.first()).toHaveAttribute("aria-current", "true");
  }
  expect(Math.max(...samples.map(s => s.spacing)) - Math.min(...samples.map(s => s.spacing))).toBeLessThan(0.001);
  expect(Math.max(...samples.map(s => s.height)) - Math.min(...samples.map(s => s.height))).toBeLessThan(0.05);
});

test("long menu titles truncate at rest and reveal their ends only while selected", async ({ page }, testInfo) => {
  const titles = ["A long English menu title 0123456789 — END", "很长的中文菜单标题用于检查省略和滚动末尾0123456789结束"];
  await page.addInitScript(() => {
    localStorage.setItem("reipod-demos", "hidden");
    localStorage.setItem("reipod-appearance", JSON.stringify({ backlight: 0, clickSound: false }));
  });
  await page.goto("/");
  await choose(page, "音乐"); await choose(page, "歌曲");
  const chooser = page.waitForEvent("filechooser");
  await choose(page, "导入音乐");
  await (await chooser).setFiles(titles.map(title => taggedAudio(title, "Fixture", "Calibration")));
  await expect(live(page).locator(".track-row")).toHaveCount(2);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".screen-outgoing")).toHaveCount(0);
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    for (const title of titles) {
      await page.emulateMedia({ reducedMotion: "no-preference" });
      const rows = live(page).locator(".screen-row");
      const labels = await rows.locator(".row-title").allTextContents();
      for (let step = 0; step < labels.length; step++) await key(page, "ArrowUp");
      for (let step = 0; step < labels.indexOf(title); step++) await key(page, "ArrowDown");
      const row = rows.filter({ has: page.locator(".row-title", { hasText: title }) });
      await expect(row).toHaveAttribute("aria-current", "true");
      const text = row.locator(".marquee-text"), viewport = row.locator(".marquee-window");
      await expect(text).toHaveClass(/is-overflowing/);
      // Inspect the real CSS animation's settled end, without changing its timing.
      await text.evaluate(el => {
        const animation = el.getAnimations()[0];
        animation.pause();
        const timing = animation.effect!.getTiming();
        animation.currentTime = timing.delay + Number(timing.duration) * 0.9;
      });
      // ResizeObserver can still be publishing the new overflow distance after
      // a viewport/focus change. Read both edges in one settled browser frame.
      await expect.poll(() => text.evaluate(el => Math.abs(
        el.getBoundingClientRect().right - el.parentElement!.getBoundingClientRect().right,
      ))).toBeLessThan(2);
      const window = await viewport.boundingBox();
      await page.emulateMedia({ reducedMotion: "reduce" });
      await expect.poll(() => text.evaluate(el => getComputedStyle(el).animationName)).toBe("none");
      expect((await text.boundingBox())!.width).toBeLessThanOrEqual(window!.width + 1);
      await expect(text).toHaveText(title);
      // An unfocused long title has a bounded text box, so the ellipsis can paint.
      await key(page, labels.indexOf(title) === 0 ? "ArrowDown" : "ArrowUp");
      await expect(text).not.toHaveClass(/is-overflowing/);
      expect((await text.boundingBox())!.width).toBeLessThanOrEqual(window!.width + 1);
      expect(await text.evaluate(el => getComputedStyle(el).textOverflow)).toBe("ellipsis");
      await expect(text).toHaveText(title);
    }
    await page.locator(".lcd-screen").screenshot({ path: testInfo.outputPath(`long-titles-${width}.png`) });
  }
});

for (const width of [320, 390, 1280]) {
  test(`classic menu chevrons retain visible ink and pane shadows cover preview content at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() => {
      localStorage.setItem("reipod-appearance", JSON.stringify({ clickSound: false, backlight: 0 }));
      const battery = Object.assign(new EventTarget(), { level: 1, charging: false, chargingTime: Infinity, dischargingTime: Infinity });
      Object.defineProperty(navigator, "getBattery", { value: async () => battery });
    });
    await page.goto("/"); await page.evaluate(() => document.fonts.ready);
    const ink = await live(page).locator(".screen-row.selected .row-chevron svg").evaluate(svg => {
      const path = svg.querySelector("path")!;
      const bounds = path.getBBox(), matrix = path.getScreenCTM()!;
      const stroke = parseFloat(getComputedStyle(path).strokeWidth);
      const unit = document.querySelector(".lcd-screen")!.getBoundingClientRect().width / 320;
      return { width: (bounds.width + stroke) * Math.abs(matrix.a) / unit,
        height: (bounds.height + stroke) * Math.abs(matrix.d) / unit };
    });
    // Conservative visible-footprint bounds from the two 2007 Gadgeteer photos.
    expect(ink.width).toBeGreaterThanOrEqual(6); expect(ink.width).toBeLessThanOrEqual(10);
    expect(ink.height).toBeGreaterThanOrEqual(10); expect(ink.height).toBeLessThanOrEqual(16);
    await expect(live(page).locator(".screen-row.selected .row-chevron")).toBeVisible();
    for (const arrow of await live(page).locator(".screen-row:not(.selected) .row-chevron").all()) await expect(arrow).toBeHidden();
    const rowsBefore = await live(page).locator(".screen-row").evaluateAll(rows => rows.map(row => row.getBoundingClientRect().width));
    await key(page, "ArrowDown");
    await expect(live(page).locator('.screen-row.selected .row-title')).toHaveText("照片");
    await expect(live(page).locator(".screen-row.selected .row-chevron")).toBeVisible();
    for (const arrow of await live(page).locator(".screen-row:not(.selected) .row-chevron").all()) await expect(arrow).toBeHidden();
    expect(await live(page).locator(".screen-row").evaluateAll(rows => rows.map(row => row.getBoundingClientRect().width))).toEqual(rowsBefore);
    await key(page, "ArrowUp");
    await page.locator(".lcd-screen").screenshot({ path: testInfo.outputPath("home-lcd.png") });
    await choose(page, "设置");
    await page.locator(".lcd-screen").screenshot({ path: testInfo.outputPath("settings-lcd.png") });
    // Probe both image and opaque-card previews with a known underlying color.
    // A shadow painted only on the parent is covered by either child surface.
    for (const state of ["artwork", "card"]) {
      await home(page);
      if (state === "card") await choose(page, "设置");
      else {
        for (let step = 0; step < 6; step++) await key(page, "ArrowUp");
        await expect(live(page).locator('.screen-row.selected .row-title')).toHaveText("音乐");
        await expect(live(page).locator('.menu-preview > .album-preview[aria-hidden="false"]')).toHaveCount(1);
      }
      const preview = live(page).locator(".menu-preview");
      await preview.evaluate(element => {
        element.style.background = "rgb(192, 208, 224)";
        for (const child of element.children) {
          const surface = child as HTMLElement;
          surface.style.background = "rgb(192, 208, 224)";
          for (const descendant of surface.children) (descendant as HTMLElement).style.visibility = "hidden";
        }
      });
      const png = decode(await preview.screenshot());
      const unit = png.width / 160;
      const pixel = (x: number) => {
        const offset = (Math.floor(png.height * 0.75) * png.width + Math.floor(x * unit)) * png.channels;
        return Array.from(png.data.slice(offset, offset + 3));
      };
      const near = pixel(2), middle = pixel(9), far = pixel(30);
      for (let channel = 0; channel < 3; channel++) {
        expect(far[channel] - near[channel]).toBeGreaterThan(25);
        expect(middle[channel]).toBeGreaterThan(near[channel]);
        expect(far[channel]).toBeGreaterThan(middle[channel]);
        expect(Math.abs(far[channel] - [192, 208, 224][channel])).toBeLessThanOrEqual(1);
      }
    }
  });
}

test("setting values keep blue/white states while unrelated disabled values remain muted", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("reipod-appearance", JSON.stringify({ backlight: 0, clickSound: false })));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await choose(page, "设置");
  const shuffle = live(page).locator(".screen-row").filter({ has: page.locator('.row-title', { hasText: /^随机播放$/ }) });
  const value = shuffle.locator('.row-value');
  const blue = await value.evaluate(el => getComputedStyle(el).color);
  const [r,g,b] = blue.match(/\d+/g)!.map(Number);
  expect(b - r).toBeGreaterThan(50); expect(g - r).toBeGreaterThan(40);
  await key(page, "ArrowDown");
  await expect(shuffle).toHaveAttribute('aria-current', 'true');
  expect(await value.evaluate(el => getComputedStyle(el).color)).toBe(await shuffle.evaluate(el => getComputedStyle(el).color));
  await choose(page, "主菜单");
  const disabled = live(page).locator('.screen-row.is-disabled').first();
  expect(await disabled.locator('.row-value').evaluate(el => getComputedStyle(el).color)).toBe(await disabled.evaluate(el => getComputedStyle(el).color));
});

test("track transport markers stay legible, inherit focus contrast and follow pause/play", async ({ page }, testInfo) => {
  await page.addInitScript(() => localStorage.setItem("reipod-appearance", JSON.stringify({ backlight: 0, clickSound: false })));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await key(page, "Space");
  await expect(live(page).locator('.screen-playing-link .icon-play')).toBeVisible();
  await key(page, "Space");
  await home(page); await choose(page, "音乐"); await choose(page, "歌曲");
  const marker = live(page).locator('.track-playing-marker');
  await expect(marker.locator('.icon-pause')).toBeVisible();
  for (const width of [320,390,1280]) {
    await page.setViewportSize({ width, height: 900 });
    const ink = await marker.locator('path').evaluate(path => {
      const rect = path.getBoundingClientRect(), unit = document.querySelector('.lcd-screen')!.getBoundingClientRect().width / 320;
      return { w: rect.width / unit, h: rect.height / unit, color: getComputedStyle(path).fill };
    });
    expect(ink.w).toBeGreaterThan(6); expect(ink.h).toBeGreaterThan(8);
    expect(ink.color).toBe('rgb(255, 255, 255)');
  }
  await key(page, "ArrowUp");
  const color = await marker.evaluate(el => getComputedStyle(el).color);
  const [r,,b] = color.match(/\d+/g)!.map(Number); expect(b-r).toBeGreaterThan(100);
  await key(page, "ArrowDown"); await key(page, "Space");
  await expect(marker.locator('.icon-play')).toBeVisible();
  await expect(marker).toHaveCount(1);
  await key(page, "Space"); await expect(marker.locator('.icon-pause')).toBeVisible();
  await testInfo.attach('track-markers.png', { body: await page.locator('.lcd-screen').screenshot(), contentType: 'image/png' });
});
