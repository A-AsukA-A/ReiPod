import { test, expect } from "@playwright/test";
import { key, live } from "./dial";

test.use({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1" });

test("iPhone local wheel volume recovers from zero after rapid changes on a live audio graph", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("reipod-appearance", JSON.stringify({ clickSound: false }));
    const state = window as unknown as {
      volumeProbe: { audio?: HTMLMediaElement; analyser?: AnalyserNode; contexts: number };
    };
    state.volumeProbe = { contexts: 0 };
    const createSource = AudioContext.prototype.createMediaElementSource;
    AudioContext.prototype.createMediaElementSource = function (audio) {
      state.volumeProbe.audio = audio;
      state.volumeProbe.contexts++;
      return createSource.call(this, audio);
    };
    const createGain = AudioContext.prototype.createGain;
    AudioContext.prototype.createGain = function () {
      const gain = createGain.call(this);
      const analyser = this.createAnalyser();
      gain.connect(analyser);
      state.volumeProbe.analyser = analyser;
      return gain;
    };
  });
  await page.goto("/");
  await key(page, "Space");
  const sample = () => page.evaluate(() => {
    const probe = (window as unknown as { volumeProbe: {
      audio?: HTMLMediaElement; analyser?: AnalyserNode; contexts: number;
    } }).volumeProbe;
    const data = new Float32Array(2048);
    probe.analyser?.getFloatTimeDomainData(data);
    return { peak: Math.max(...data.map(Math.abs)), time: probe.audio?.currentTime ?? 0,
      paused: probe.audio?.paused, contexts: probe.contexts };
  });
  await expect.poll(async () => (await sample()).peak).toBeGreaterThan(0.001);
  // Keyboard arrows and pointer rotation share the same App.rotate volume path.
  for (let i = 0; i < 50; i++) await key(page, "ArrowUp");
  await expect(live(page).getByLabel("音量 0%")).toBeVisible();
  await expect.poll(async () => (await sample()).peak).toBeLessThan(0.0001);
  const before = (await sample()).time;
  for (let i = 0; i < 24; i++) await key(page, "ArrowDown");
  await expect(live(page).getByLabel("音量 60%")).toBeVisible();
  await expect.poll(async () => (await sample()).peak).toBeGreaterThan(0.001);
  expect((await sample()).time).toBeGreaterThan(before);
  expect((await sample()).paused).toBe(false);
  expect((await sample()).contexts).toBe(1);
  await key(page, "Space");
  await expect.poll(async () => (await sample()).paused).toBe(true);
  await key(page, "Space");
  await expect.poll(async () => (await sample()).peak).toBeGreaterThan(0.001);
  expect((await sample()).contexts).toBe(1);
});
