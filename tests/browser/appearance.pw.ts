import { test, expect } from "@playwright/test";
import { home, choose, key, live } from "./dial";

test("finish and background changes preserve the model, audio instance and active queue", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("reipod-appearance", JSON.stringify({clickSound:false,backlight:0,model:"nano-6",lcd:{width:240,height:240}}));
    const probe = { instances: [] as HTMLAudioElement[], active: null as HTMLAudioElement | null, loads:0, pauses:0, events: [] as {name:string,time:number,paused:boolean,readyState:number,at:number}[] };
    (window as any).__appearanceProbe = probe;
    window.Audio = new Proxy(window.Audio, {
      construct(target, args) {
        const audio = Reflect.construct(target,args) as HTMLAudioElement;
        probe.instances.push(audio);
        for (const name of ['play','playing','pause','waiting','stalled','error'])
          audio.addEventListener(name,()=>probe.events.push({name,time:audio.currentTime,paused:audio.paused,readyState:audio.readyState,at:performance.now()}));
        audio.addEventListener('loadstart',()=>{if(audio===probe.active)probe.loads++;});
        audio.addEventListener('pause',()=>{if(audio===probe.active)probe.pauses++;});
        return audio;
      },
    });
  });
  await page.goto('/');
  await key(page,'Space');
  await expect(live(page).locator('.screen-playing-link')).toHaveAttribute('aria-label','正在播放');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('reipod-session') ?? '{}').currentId ?? null)).not.toBeNull();
  await expect.poll(() => page.evaluate(() => {
    const p = (window as any).__appearanceProbe;
    return p.instances.some((audio: HTMLAudioElement) => !audio.paused && audio.readyState >= 2 && audio.currentTime > 0.1);
  }), { message: 'The playback fixture must advance before appearance changes', timeout: 15000 }).toBe(true);
  const before = await page.evaluate(() => {
    const p = (window as any).__appearanceProbe;
    p.active = p.instances.find((a: HTMLAudioElement)=>!a.paused && !!a.currentSrc);
    if(!p.active) throw new Error('No active media element');
    return { count:p.instances.length,src:p.active.currentSrc,time:p.active.currentTime,
      session:JSON.parse(localStorage.getItem('reipod-session')!),model:document.querySelector('main')!.getAttribute('data-model'),
      lcd:[document.querySelector('.lcd-screen')!.getBoundingClientRect().width,document.querySelector('.lcd-screen')!.getBoundingClientRect().height] };
  });
  await home(page);
  await choose(page,'设置');
  await choose(page, 'ReiPod 设置');
  await choose(page,'机身颜色');
  await choose(page,'黑色');
  await expect(page.locator('main')).toHaveAttribute('data-finish','black');
  await choose(page,'背景');
  await choose(page,'深色');
  await expect(page.locator('main')).toHaveAttribute('data-background','dark');
  await home(page);
  await choose(page,'正在播放');
  const after = await page.evaluate(() => {
    const p = (window as any).__appearanceProbe;
    return {count:p.instances.length,src:p.active.currentSrc,time:p.active.currentTime,
      active:p.instances.filter((a:HTMLAudioElement)=>!a.paused).includes(p.active),loads:p.loads,pauses:p.pauses,
      session:JSON.parse(localStorage.getItem('reipod-session')!),model:document.querySelector('main')!.getAttribute('data-model'),
      lcd:[document.querySelector('.lcd-screen')!.getBoundingClientRect().width,document.querySelector('.lcd-screen')!.getBoundingClientRect().height]};
  });
  expect(after.count).toBe(before.count);
  expect(after.src).toBe(before.src);
  expect(after.time).toBeGreaterThan(before.time);
  expect(after.active).toBe(true);
  expect(after.loads).toBe(0);
  expect(after.pauses).toBe(0);
  expect(after.lcd).toEqual(before.lcd);
  expect(after.model).toBe(before.model);
  expect(after.model).toBe('classic-2007');
  expect(after.session.currentId).toBe(before.session.currentId);
  expect(after.session.queue).toEqual(before.session.queue);
  expect(after.session.naturalOrder).toEqual(before.session.naturalOrder);
  await expect(live(page).locator('.screen-playing-link')).toHaveAttribute('aria-label','正在播放');
});

// Preserve media events when diagnosing a stopped or still-loading test fixture.
test.afterEach(async ({ page }, testInfo) => {
  const probe = await page.evaluate(() => {
    const p = (window as any).__appearanceProbe;
    return p ? { events: p.events, media: p.instances.map((a: HTMLAudioElement) => ({ time:a.currentTime, paused:a.paused, readyState:a.readyState, error:a.error?.code })) } : null;
  }).catch(() => null);
  if (probe) await testInfo.attach('playback-events', { body:JSON.stringify(probe), contentType:'application/json' });
});

for (const finish of ["silver", "black"] as const) {
  test(`${finish} shell keeps HOLD proportions, touch target and wheel engraving consistent`, async ({ page }, testInfo) => {
    await page.addInitScript(finish => {
      localStorage.setItem("reipod-appearance", JSON.stringify({ finish, background: finish === "black" ? "dark" : "warm", backlight: 0, clickSound: false }));
    }, finish);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const proportions: number[] = [];
    for (const width of [1280, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      const measure = () => page.evaluate(() => {
        const rect = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
        const body = rect(".classic-device"), target = rect(".top-hold"), track = rect(".hold-track"), thumb = rect(".hold-track > i");
        return { ratio: track.width / body.width, target: [target.width, target.height], thumbX: thumb.left - track.left, thumbRight: thumb.right, trackRight: track.right };
      });
      const before = await measure();
      expect(before.target[0]).toBeGreaterThanOrEqual(44);
      expect(before.target[1]).toBeGreaterThanOrEqual(44);
      proportions.push(before.ratio);
      await page.getByRole("switch", { name: "HOLD 锁定" }).click();
      await expect(page.getByRole("switch")).toBeChecked();
      const held = await measure();
      expect(held.thumbX).toBeGreaterThan(before.thumbX);
      expect(held.thumbRight).toBeLessThanOrEqual(held.trackRight + 0.5);
      await page.getByRole("switch").click();
      expect((await measure()).thumbX).toBeCloseTo(before.thumbX, 1);
      const ink = await page.locator(".wheel-menu").evaluate(el => getComputedStyle(el).color);
      const center = page.locator(".wheel-select");
      const bounds = await center.boundingBox();
      await page.locator(".wheel-menu").hover();
      expect(await page.locator(".wheel-menu").evaluate(el => getComputedStyle(el).color)).toBe(ink);
      expect(await center.boundingBox()).toEqual(bounds);
      const shadow = await center.evaluate(el => getComputedStyle(el).boxShadow);
      expect(shadow.split(/,(?![^()]*\))/).every(part => part.includes("inset"))).toBe(true);
      const channels = ink.match(/\d+/g)!.map(Number);
      expect(channels.every(c => finish === "black" ? c > 200 : c < 180)).toBe(true);
      await testInfo.attach(`${finish}-${width}.png`, { body: await page.locator(".classic-device").screenshot(), contentType: "image/png" });
    }
    // Compare the drawing at different scales, without asserting a new hardware size.
    expect(Math.max(...proportions) - Math.min(...proportions)).toBeLessThan(0.001);
  });
}
