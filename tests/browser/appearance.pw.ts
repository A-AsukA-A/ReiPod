import { test, expect } from "@playwright/test";
import { home, choose, key, live } from "./dial";

test("finish and background changes preserve the model, audio instance and active queue", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("reipod-appearance", JSON.stringify({clickSound:false,backlight:0,model:"nano-6",lcd:{width:240,height:240}}));
    const probe = { instances: [] as HTMLAudioElement[], active: null as HTMLAudioElement | null, loads:0, pauses:0 };
    (window as any).__appearanceProbe = probe;
    window.Audio = new Proxy(window.Audio, {
      construct(target, args) {
        const audio = Reflect.construct(target,args) as HTMLAudioElement;
        probe.instances.push(audio);
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
