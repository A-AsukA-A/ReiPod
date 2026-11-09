import { test, expect } from "@playwright/test";
import { encode } from "fast-png";
import { choose, key, live } from "./dial";
import { taggedAudio } from "./taggedAudio";
import { nativeMusicFixture } from "./nativeMusicFixture";

// CAL79 engineering regression: source-photo uncertainty and original firmware
// typography/timing remain separate from this deterministic local-file fixture.
test("ordinary playback preserves its endpoint layout while long metadata truncates or scrolls", async ({ page }, testInfo) => {
  const metadata = {
    title: "A long ordinary playback title 0123456789 END",
    artist: "用于普通播放页校准的很长中文艺人名称结束",
    album: "Better Living Through Chemistry - Calibration Album END",
  };
  const artwork = Buffer.from(encode({ width: 2, height: 2, channels: 4,
    data: new Uint8Array([41, 79, 87, 255, 211, 168, 97, 255, 211, 168, 97, 255, 41, 79, 87, 255]) }));
  await page.addInitScript(() => {
    localStorage.setItem("reipod-demos", "hidden");
    localStorage.setItem("reipod-appearance", JSON.stringify({ backlight: 0, clickSound: false }));
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await choose(page, "音乐"); await choose(page, "歌曲");
  const chooser = page.waitForEvent("filechooser");
  await choose(page, "导入音乐");
  await (await chooser).setFiles(taggedAudio(metadata.title, metadata.artist, metadata.album,
    { artwork: { mimeType: "image/png", data: artwork } }));
  await choose(page, metadata.title);
  await expect(live(page).locator(".screen-playing-link .icon-play")).toBeVisible();
  await key(page, "Space");
  await expect(live(page).locator(".screen-playing-link .icon-pause")).toBeVisible();
  // Reach the exact midpoint through the real wheel/seek path, then return to art.
  await key(page, "Enter"); await key(page, "ArrowUp");
  for (let step = 0; step < 3; step++) await key(page, "ArrowDown");
  const progress = live(page).getByRole("progressbar", { name: "播放进度" });
  await expect(progress).toHaveAttribute("aria-valuenow", "6");
  await expect(progress).toHaveAttribute("aria-valuemax", "12");
  for (let step = 0; step < 3; step++) await key(page, "Enter");
  await expect(live(page).locator(".view-art")).toHaveCount(1);
  await expect(page.locator(".screen-outgoing, .np-control-outgoing")).toHaveCount(0);
  await expect(live(page).locator(".np-cover > .album-art img")).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
  });
  const labels = live(page).locator(".np-info .marquee-text");
  await expect(labels).toHaveText(Object.values(metadata));
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const label of await labels.all()) {
      await expect.poll(() => label.evaluate(el => {
        const style = getComputedStyle(el);
        return style.animationName === "none" && style.textOverflow === "ellipsis"
          && el.getBoundingClientRect().width <= el.parentElement!.getBoundingClientRect().width + 1;
      })).toBe(true);
    }
    const readLayout = () => live(page).locator(".now-playing-screen").evaluate(el => {
      const selectors = [".np-cover", ".np-cover-reflection", ".np-info", ".np-control-bay", ".firmware-progress"];
      return selectors.map(selector => el.querySelector(selector)!.getBoundingClientRect().toJSON());
    });
    const before = await readLayout();
    const alignment = await progress.evaluate(el => {
      const track = el.getBoundingClientRect(), fill = el.querySelector("i")!.getBoundingClientRect();
      const times = [...el.parentElement!.querySelectorAll("span")].map(span => span.getBoundingClientRect());
      return { fill: fill.width / track.width,
        axes: times.map(rect => Math.abs(rect.y + rect.height / 2 - track.y - track.height / 2)) };
    });
    expect(alignment.fill).toBeCloseTo(0.5, 2);
    expect(alignment.axes.every(delta => delta < 1)).toBe(true);
    await page.locator(".lcd-screen").screenshot({ path: testInfo.outputPath(`ordinary-50-${width}.png`) });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    for (const label of await labels.all()) {
      await expect.poll(() => label.evaluate(el => el.getAnimations().length)).toBe(1);
      await label.evaluate(el => {
        const animation = el.getAnimations()[0], timing = animation.effect!.getTiming();
        animation.pause(); animation.currentTime = timing.delay + Number(timing.duration) * 0.9;
      });
      await expect.poll(() => label.evaluate(el => Math.abs(
        el.getBoundingClientRect().right - el.parentElement!.getBoundingClientRect().right,
      ))).toBeLessThan(2);
    }
    expect(await readLayout()).toEqual(before);
    await expect(progress).toHaveAttribute("aria-valuenow", "6");
    await expect(live(page).locator(".np-sequence")).toHaveText("1 / 1");
    await expect(labels).toHaveText(Object.values(metadata));
    // CAL81: inspect ordinary art after wheel seeking, rather than mistaking
    // the thin seek rail and its diamond for the ordinary progress endpoints.
    for (const position of [0, 12, 6]) {
      await key(page, "Enter");
      for (let step = 0; step < 6; step++) await key(page, "ArrowUp");
      for (let step = 0; step < position / 2; step++) await key(page, "ArrowDown");
      for (let step = 0; step < 3; step++) await key(page, "Enter");
      await expect(live(page).locator(".view-art")).toHaveCount(1);
      await expect(page.locator(".screen-outgoing, .np-control-outgoing")).toHaveCount(0);
      await expect(progress).toHaveAttribute("aria-valuenow", String(position));
      await expect(progress).toHaveAttribute("data-seeking", "false");
      await expect(live(page).locator(".progress-elapsed")).toHaveText(`0:${String(position).padStart(2, "0")}`);
      await expect(live(page).locator(".progress-remaining")).toHaveText(`−0:${String(12 - position).padStart(2, "0")}`);
      expect(await readLayout()).toEqual(before);
      const fill = await progress.evaluate(el => el.querySelector("i")!.getBoundingClientRect().width / el.getBoundingClientRect().width);
      expect(fill).toBeCloseTo(position / 12, 2);
      if (position !== 6) await page.locator(".lcd-screen").screenshot({ path: testInfo.outputPath(`ordinary-${position === 0 ? 0 : 100}-${width}.png`) });
    }
  }
});

for (const duration of [300, 6000]) {
  test(`ordinary progress does not resize between endpoints for a ${duration}s recording`, async ({ page }) => {
    // A bridge substitute supplies long-duration readouts without creating a
    // 96MB PCM file. This checks UI layout, not physical native playback.
    await nativeMusicFixture(page, false, false, { authorized: true, songDuration: duration });
    await page.addInitScript(() => localStorage.setItem("reipod-appearance", JSON.stringify({ backlight: 0, clickSound: false })));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await choose(page, "音乐"); await choose(page, "歌曲"); await choose(page, "Phone First");
    await expect(live(page).locator(".screen-playing-link .icon-play")).toBeVisible();
    await key(page, "Space");
    await expect(live(page).locator(".screen-playing-link .icon-pause")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      const samples = [];
      for (const fraction of [0, 0.5, 1]) {
        await page.evaluate(position => (window as unknown as {
          __nativeTest: { update(patch: Record<string, unknown>): void };
        }).__nativeTest.update({ position, status: "paused" }), duration * fraction);
        const bar = live(page).getByRole("progressbar", { name: "播放进度" });
        await expect(bar).toHaveAttribute("aria-valuenow", String(duration * fraction));
        const sample = await bar.evaluate(el => {
          const rect = el.getBoundingClientRect(), fill = el.querySelector("i")!.getBoundingClientRect();
          return { x: rect.x, width: rect.width, fill: fill.width / rect.width };
        });
        expect(sample.fill).toBeCloseTo(fraction, 2);
        samples.push(sample);
      }
      expect(samples.every(sample => sample.x === samples[0].x && sample.width === samples[0].width)).toBe(true);
      // Hidden width reservations must not duplicate the exposed time labels.
      await expect(live(page).locator(".progress-elapsed")).toMatchAriaSnapshot(`- text: ${Math.floor(duration / 60)}:00`);
      await expect(live(page).locator(".progress-remaining")).toMatchAriaSnapshot("- text: −0:00");
    }
  });
}

test("playback controls retain their modes and keep volume feedback at its limit", async ({ page }) => {
  await page.clock.install();
  await page.addInitScript(() => localStorage.setItem("reipod-appearance", JSON.stringify({ backlight: 0, clickSound: false })));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await key(page, "Space");
  await expect(live(page).locator(".screen-playing-link .icon-play")).toBeVisible();
  await key(page, "Space");
  const bar = live(page).getByRole("progressbar", { name: "播放进度" });
  const current = await live(page).locator(".np-info > strong").textContent();
  await key(page, "Enter");
  await expect(live(page).locator(".view-seek")).toHaveCount(1);
  await key(page, "ArrowDown");
  const position = await bar.getAttribute("aria-valuenow");
  await key(page, "Enter");
  await key(page, "ArrowDown"); await key(page, "ArrowDown");
  await expect(live(page).locator('.np-mode-panel [aria-current="true"]')).toHaveText("专辑");
  await key(page, "Enter");
  await expect(live(page).locator(".classic-rating .chosen")).toHaveCount(0);
  for (let step = 0; step < 3; step++) await key(page, "ArrowDown");
  await expect(live(page).locator(".classic-rating .chosen")).toHaveCount(3);
  await key(page, "Enter");
  await expect(live(page).locator(".view-lyrics")).toHaveCount(1);
  await key(page, "Enter");
  for (let step = 0; step < 40; step++) await key(page, "ArrowDown");
  await expect(live(page).locator(".classic-volume")).toHaveAttribute("aria-label", "音量 100%");
  await page.clock.runFor(1000);
  await key(page, "ArrowDown"); // The clamped audio value is unchanged.
  await page.clock.runFor(500);
  await expect(live(page).locator(".classic-volume")).toBeVisible();
  await expect(live(page).locator(".classic-volume")).toHaveAttribute("aria-label", "音量 100%");
  await page.clock.runFor(900);
  await expect(live(page).locator(".classic-volume")).toHaveCount(0);
  await expect(live(page).locator(".np-info > strong")).toHaveText(current!);
  await expect(bar).toHaveAttribute("aria-valuenow", position!);
  await expect(live(page).locator(".now-playing-screen button")).toHaveCount(0);
});
