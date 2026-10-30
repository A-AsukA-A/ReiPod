import { test, expect } from "@playwright/test";
import { decode } from "fast-png";
import { choose, home, key, live } from "./dial";

// Engineering guards for the bounded task-27 fit in UI_METRICS; these do not
// establish full hardware fidelity, original font identity or firmware timing.
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
