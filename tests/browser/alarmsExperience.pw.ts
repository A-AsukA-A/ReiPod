import { test,expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { choose,home,key,live } from "./dial";
async function pick(page:Page,label:string){
 const rows=live(page).locator(".alarm-row");await expect.poll(()=>rows.locator("strong").allTextContents()).toContain(label);
 const items=await rows.evaluateAll(es=>es.map(e=>({text:e.querySelector("strong")?.textContent,current:e.getAttribute("aria-current")==="true"})));
 const target=items.findIndex(x=>x.text===label),from=items.findIndex(x=>x.current);
 for(let i=0;i<Math.abs(target-from);i++)await key(page,target>from?"ArrowDown":"ArrowUp");await key(page,"Enter");
}
const stored=(page:Page)=>page.evaluate(()=>JSON.parse(localStorage.getItem("reipod-classic-alarms-v1")??"{}"));
async function alarms(page:Page){await home(page);await choose(page,"附加功能");await choose(page,"闹钟");await expect(live(page).locator(".classic-alarms")).toBeVisible();}
test("wheel edits, saves, cancels and deletes alarms; timer pause/resume, reload, ringing and sleep choices work",async({page},info)=>{
 await page.emulateMedia({reducedMotion:"reduce"});await page.addInitScript(()=>{localStorage.setItem("reipod-appearance",JSON.stringify({clickSound:false,backlight:0}));const probe={audio:null as HTMLAudioElement|null,pauses:0};(window as any).__alarmAudio=probe;window.Audio=new Proxy(window.Audio,{construct(target,args){const audio=Reflect.construct(target,args) as HTMLAudioElement;audio.addEventListener("playing",()=>{probe.audio=audio;});audio.addEventListener("pause",()=>{if(probe.audio===audio)probe.pauses++;});return audio;}});});
 await page.goto("/");await key(page,"Space");await expect.poll(()=>page.evaluate(()=>(window as any).__alarmAudio.audio?.currentTime??0)).toBeGreaterThan(.1);await alarms(page);await pick(page,"创建闹钟");await pick(page,"时间");
 await key(page,"ArrowDown");await key(page,"Enter");await key(page,"ArrowDown");await key(page,"Enter");await pick(page,"重复");await pick(page,"工作日");await pick(page,"标签");await pick(page,"练习");await pick(page,"保存闹钟");
 await expect.poll(async()=>(await stored(page)).alarms?.length).toBe(1);let saved=(await stored(page)).alarms[0];expect(saved).toMatchObject({minute:481,repeat:"weekdays",label:"练习"});
 await info.attach("saved-alarm",{body:await live(page).screenshot(),contentType:"image/png"});
 await pick(page,"练习 08:01");await pick(page,"闹钟");await key(page,"Escape");await pick(page,"放弃更改");expect((await stored(page)).alarms[0].enabled).toBe(true);
 await pick(page,"睡眠定时");await pick(page,"30 分钟");await expect(page.locator(".lcd-screen")).toHaveAttribute("data-page","alarms");expect((await stored(page)).sleepAt).toBeGreaterThan(Date.now());
 await pick(page,"睡眠定时");await pick(page,"关闭");await pick(page,"倒计时");await pick(page,"时长");
 await key(page,"Enter");for(let i=0;i<5;i++)await key(page,"ArrowUp");await key(page,"Enter");for(let i=0;i<5;i++)await key(page,"ArrowDown");await key(page,"Enter");
 expect((await stored(page)).timer.duration).toBe(5);await pick(page,"开始");await expect.poll(async()=>(await stored(page)).timer.deadline).toBeGreaterThan(Date.now());await pick(page,"暂停");const remaining=(await stored(page)).timer.remaining;expect(remaining).toBeGreaterThan(0);expect(remaining).toBeLessThan(5000);
 expect(await page.evaluate(()=>(window as any).__alarmAudio.pauses)).toBe(0);
 await page.reload();await alarms(page);await pick(page,"倒计时");await expect(live(page).locator(".countdown-display")).toContainText("已暂停");await pick(page,"继续");
 const background=await page.context().newPage();await background.goto("about:blank");await background.bringToFront();await background.waitForTimeout(5200);await page.bringToFront();await background.close();
 await expect(live(page).getByRole("alert",{name:"倒计时结束"})).toBeVisible({timeout:8000});await info.attach("timer-ringing",{body:await live(page).screenshot(),contentType:"image/png"});await key(page,"Enter");await expect(live(page).getByRole("alert")).toHaveCount(0);
 await key(page,"Escape");await pick(page,"练习 08:01");await pick(page,"删除闹钟…");await pick(page,"取消");expect((await stored(page)).alarms).toHaveLength(1);await pick(page,"删除闹钟…");await pick(page,"删除闹钟");await expect.poll(async()=>(await stored(page)).alarms.length).toBe(0);
 expect(await page.evaluate(()=>(window as any).__alarmAudio.pauses)).toBe(0);
 await key(page,"Space");await expect.poll(()=>page.evaluate(()=>(window as any).__alarmAudio.audio?.currentTime??0)).toBeGreaterThan(.1);
 await pick(page,"睡眠定时");await pick(page,"15 分钟");await page.clock.install();await page.clock.fastForward(15*60000+500);
 await expect(page.locator(".lcd-screen")).toHaveAttribute("data-sleeping","true");expect(await page.evaluate(()=>(window as any).__alarmAudio.audio.paused)).toBe(true);
});
test("native schedule permission, denied retry and stop receipts survive foreground refresh without duplicate ringing",async({page})=>{
 await page.emulateMedia({reducedMotion:"reduce"});await page.addInitScript(()=>{
  const state={authorization:"denied",records:[] as any[],acknowledged:{} as Record<string,number>,actions:[] as string[]};(window as any).__alarms=state;
  Object.defineProperty(window,"__REIPOD_NATIVE_ALARMS_VERSION__",{value:1});(window as any).webkit={messageHandlers:{reipodAlarms:{postMessage:async(r:any)=>{state.actions.push(r.action);if(r.action==="replace")state.records=r.records;if(r.action==="stop")state.acknowledged[r.id]=Date.now();return{...state,engine:"alarmkit"};}}}};
 });
 await page.goto("/");await alarms(page);await pick(page,"创建闹钟");await pick(page,"保存闹钟");await expect(live(page).locator(".alarm-error")).toContainText("允许");expect((await stored(page)).alarms??[]).toHaveLength(0);
 await page.evaluate(()=>{(window as any).__alarms.authorization="authorized";});await pick(page,"保存闹钟");await expect.poll(async()=>(await stored(page)).alarms?.length).toBe(1);expect(await page.evaluate(()=>(window as any).__alarms.records.length)).toBe(1);
 await pick(page,"倒计时");await pick(page,"时长");await key(page,"Enter");for(let i=0;i<5;i++)await key(page,"ArrowUp");await key(page,"Enter");for(let i=0;i<2;i++)await key(page,"ArrowDown");await key(page,"Enter");await pick(page,"开始");
 const timer=(await stored(page)).timer;expect(await page.evaluate(()=>(window as any).__alarms.records.length)).toBe(2);
 await page.evaluate(({id,at})=>{(window as any).__alarms.acknowledged[id]=at;window.dispatchEvent(new Event("reipod-native-alarms"));},{id:timer.id,at:timer.deadline+100});
 await expect.poll(async()=>(await stored(page)).timer.deadline).toBe(null);await expect(live(page).getByRole("alert")).toHaveCount(0);expect((await stored(page)).alarms[0].enabled).toBe(true);
 await page.evaluate(()=>{(window as any).__alarms.authorization="denied";});await key(page,"Escape");const alarm=(await stored(page)).alarms[0];
 await pick(page,`${alarm.label} ${String(Math.floor(alarm.minute/60)).padStart(2,"0")}:${String(alarm.minute%60).padStart(2,"0")}`);await pick(page,"闹钟");await pick(page,"保存闹钟");
 await expect.poll(async()=>(await stored(page)).alarms[0].enabled).toBe(false);expect(await page.evaluate(()=>(window as any).__alarms.records.length)).toBe(0);
});
