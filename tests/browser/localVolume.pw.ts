import { test, expect } from "@playwright/test";
import { key, live } from "./dial";

test.use({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1" });

test("iPhone local wheel volume recovers from zero after rapid changes on a live audio graph", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("reipod-appearance", JSON.stringify({ clickSound: false }));
    const state = window as unknown as {
      volumeProbe: { audio?: HTMLMediaElement; analyser?: AnalyserNode; contexts: number; context?: AudioContext; positionUpdates: number; sessionWrites: number };
    };
    state.volumeProbe = { contexts: 0, positionUpdates: 0, sessionWrites: 0 };
    const setPosition = navigator.mediaSession.setPositionState.bind(navigator.mediaSession);
    navigator.mediaSession.setPositionState = (position) => {
      state.volumeProbe.positionUpdates++;
      setPosition(position);
    };
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "reipod-session") state.volumeProbe.sessionWrites++;
      setItem.call(this, key, value);
    };
    const createSource = AudioContext.prototype.createMediaElementSource;
    AudioContext.prototype.createMediaElementSource = function (audio) {
      state.volumeProbe.audio = audio;
      state.volumeProbe.context = this;
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
      audio?: HTMLMediaElement; analyser?: AnalyserNode; contexts: number; context?: AudioContext; positionUpdates: number; sessionWrites: number;
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
  const burst = await page.evaluate(() => {
    const probe = (window as any).volumeProbe;
    const before = { positions: probe.positionUpdates, writes: probe.sessionWrites };
    const wheel = document.querySelector(".click-wheel")!;
    for (let i = 0; i < 200; i++) wheel.dispatchEvent(new KeyboardEvent("keydown", {
      key: i % 2 ? "ArrowDown" : "ArrowUp", bubbles: true,
    }));
    return { positions: probe.positionUpdates - before.positions, writes: probe.sessionWrites - before.writes };
  });
  expect(burst).toEqual({ positions: 0, writes: 0 });
  // Real output suspension plus simulated media buffering completion: the
  // media clock alone is insufficient; the output signal must recover too.
  await page.evaluate(async () => {
    const probe = (window as any).volumeProbe;
    probe.audio.dispatchEvent(new Event("waiting"));
    await probe.context.suspend();
    probe.audio.dispatchEvent(new Event("playing"));
  });
  await expect.poll(async () => (await sample()).peak).toBeGreaterThan(0.001);
  await key(page, "Space");
  await expect.poll(async () => (await sample()).paused).toBe(true);
  await key(page, "Space");
  await expect.poll(async () => (await sample()).peak).toBeGreaterThan(0.001);
  expect((await sample()).contexts).toBe(1);
});
