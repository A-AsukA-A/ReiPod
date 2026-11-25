import { test,expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { choose,home,key,live } from "./dial";
async function pick(page:Page,label:string){
 const rows=live(page).locator(".organizer-row");await expect(rows.filter({hasText:label})).toHaveCount(1);
 const items=await rows.evaluateAll(es=>es.map(e=>({text:e.querySelector("strong")?.textContent,current:e.getAttribute("aria-current")==="true"})));
 const target=items.findIndex(x=>x.text===label),from=items.findIndex(x=>x.current);expect(target).toBeGreaterThanOrEqual(0);
 for(let i=0;i<Math.abs(target-from);i++)await key(page,target>from?"ArrowDown":"ArrowUp");await key(page,"Enter");
}
async function settings(page:Page){await home(page);await choose(page,"设置");await choose(page,"ReiPod 设置");await choose(page,"日历与通讯录");await expect(live(page).locator(".classic-organizer")).toHaveAttribute("data-organizer-mode","root");}

test("organizer imports real files, browses month/day/details and contacts, persists, cancels deletion and leaves audio running",async({page},info)=>{
 await page.emulateMedia({reducedMotion:"reduce"});
 await page.addInitScript(()=>{
  localStorage.setItem("reipod-appearance",JSON.stringify({clickSound:false,backlight:0}));
  const probe={audio:null as HTMLAudioElement|null,pauses:0};(window as any).__organizerAudio=probe;
  window.Audio=new Proxy(window.Audio,{construct(target,args){const audio=Reflect.construct(target,args) as HTMLAudioElement;audio.addEventListener("playing",()=>{probe.audio=audio;});audio.addEventListener("pause",()=>{if(probe.audio===audio)probe.pauses++;});return audio;}});
 });
 await page.goto("/");await key(page,"Space");await expect.poll(()=>page.evaluate(()=>(window as any).__organizerAudio.audio?.currentTime??0)).toBeGreaterThan(.1);
 const date=await page.evaluate(()=>{const d=new Date();return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;});
 const ics=`BEGIN:VCALENDAR\nVERSION:2.0\nX-WR-CALNAME:排练安排\nBEGIN:VEVENT\nUID:rehearsal\nDTSTART;VALUE=DATE:${date}\nSUMMARY:午后排练\nLOCATION:第一排练室\nDESCRIPTION:先合奏\\n再录一段小样\nEND:VEVENT\nBEGIN:VTODO\nUID:todo\nSUMMARY:带上琴谱\nDUE;VALUE=DATE:${date}\nEND:VTODO\nEND:VCALENDAR`;
 const vcf=`BEGIN:VCARD\nVERSION:3.0\nUID:contact-one\nFN:林小雨\nN:林;小雨;;;\nORG:示例工作室\nTEL;TYPE=CELL:+86 138 0000 0000\nEMAIL;TYPE=WORK:hello@example.com\nADR;TYPE=HOME:;;第一街道;上海;;;中国\nNOTE:${"演出联络备注，转轮可以继续阅读。".repeat(35)}\nEND:VCARD`;
 await settings(page);let chooser=page.waitForEvent("filechooser");await pick(page,"导入日历…");await(await chooser).setFiles({name:"rehearsal.ics",mimeType:"text/calendar",buffer:Buffer.from(ics)});
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem("reipod-organizer-v1")??"{}").events?.length)).toBe(1);
 chooser=page.waitForEvent("filechooser");await pick(page,"导入联系人…");await(await chooser).setFiles({name:"contacts.vcf",mimeType:"text/vcard",buffer:Buffer.from(vcf)});
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem("reipod-organizer-v1")??"{}").contacts?.length)).toBe(1);
 await home(page);await choose(page,"附加功能");await choose(page,"日历");await pick(page,"所有日历");await expect(live(page).getByRole("grid")).toBeVisible();
 await expect(live(page).getByRole("gridcell",{selected:true})).toHaveAccessibleName(/有日程/);
 for(const width of [320,390,1280]){await page.setViewportSize({width,height:844});await info.attach(`month-${width}`,{body:await live(page).screenshot(),contentType:"image/png"});}
 const month=await live(page).locator(".calendar-month strong").textContent();await key(page,"ArrowRight");await expect(live(page).locator(".calendar-month strong")).not.toHaveText(month!);await key(page,"ArrowLeft");
 await key(page,"Enter");await pick(page,"午后排练");await expect(live(page).locator(".organizer-detail")).toContainText("第一排练室");
 await key(page,"Escape");await key(page,"Escape");await key(page,"Escape");await pick(page,"待办事项");await pick(page,"带上琴谱");await expect(live(page).locator(".organizer-detail")).toContainText("未完成");
 await home(page);await choose(page,"附加功能");await choose(page,"通讯录");await pick(page,"林小雨");await expect(live(page).locator(".organizer-detail")).toContainText("hello@example.com");
 for(let i=0;i<8;i++)await key(page,"ArrowDown");expect(await live(page).locator(".organizer-detail").evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
 await key(page,"Escape");await expect(live(page).locator('.organizer-row[aria-current="true"]')).toContainText("林小雨");
 expect(await page.evaluate(()=>(window as any).__organizerAudio.pauses)).toBe(0);
 await settings(page);await pick(page,"清空联系人…");await pick(page,"取消");expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("reipod-organizer-v1")!).contacts.length)).toBe(1);
 await page.reload();await home(page);await choose(page,"附加功能");await choose(page,"通讯录");await pick(page,"林小雨");await expect(live(page).locator(".organizer-detail")).toContainText("示例工作室");
 await settings(page);await pick(page,"清空联系人…");await pick(page,"清空");await home(page);await choose(page,"附加功能");await choose(page,"通讯录");await expect(live(page).locator(".organizer-empty")).toContainText("没有联系人");
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("reipod-organizer-v1")!).events.length)).toBe(1);
});
