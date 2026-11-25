import {test,expect} from "@playwright/test";
import type {Page} from "@playwright/test";
import {choose,home,key,live} from "./dial";
async function pick(page:Page,label:string){const rows=live(page).locator(".organizer-row");await expect(rows.filter({hasText:label})).toHaveCount(1);const a=await rows.evaluateAll(es=>es.map(e=>({name:e.querySelector("strong")?.textContent,selected:e.getAttribute("aria-current")==="true"}))),target=a.findIndex(e=>e.name===label),from=a.findIndex(e=>e.selected);expect(target).toBeGreaterThanOrEqual(0);for(let i=0;i<Math.abs(target-from);i++)await key(page,target>from?"ArrowDown":"ArrowUp");await key(page,"Enter");}
async function install(page:Page,authorized=false){
 await page.addInitScript(({authorized})=>{
  localStorage.setItem("reipod-appearance",JSON.stringify({clickSound:false,backlight:0}));
  localStorage.setItem("reipod-organizer-v1",JSON.stringify({contacts:[{id:"file-person",name:"导入副本联系人",first:"副本",last:"导入",company:"",fields:[]}],events:[],todos:[],sort:"last"}));
  const permissions={calendars:authorized?"authorized":"notDetermined",reminders:authorized?"authorized":"notDetermined",contacts:authorized?"authorized":"notDetermined"};
  const state={permissions,revision:0,calls:[] as any[],holdContact:false,late:null as null|(()=>void)};(window as any).__organizerMock=state;
  const contact=(n:number)=>({id:`system:person-${n}`,name:`系统联系人${n}`,first:"",last:`联系人${n}`,company:"系统样本公司",fields:[{label:"手机",value:"13800000000"}]});
  const reply=(fields={})=>({authorization:{...permissions},revision:state.revision,...fields});
  Object.defineProperty(window,"__REIPOD_NATIVE_ORGANIZER_VERSION__",{value:1});
  (window as any).webkit={messageHandlers:{reipodOrganizer:{postMessage:async(request:any)=>{
   state.calls.push(request);
   if(request.action==="status"||request.action==="openSettings")return reply();
   if(request.action==="authorize"){(permissions as any)[request.resource]="authorized";state.revision++;return reply();}
   if(request.action==="refresh")return reply();
   if(request.action==="events"){
    const d=new Date(),day=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    return reply({calendars:[{id:"system:calendar",title:"iCloud · 工作日历"},{id:"system:empty",title:"iCloud · 空日历"}],events:[{id:"system:event",uid:"system:event",title:"系统日程样本",calendar:"iCloud · 工作日历",calendarId:"system:calendar",start:{day,clock:"15:30:00"},duration:3600000,location:"系统地点",description:"系统日程备注",excluded:[]}],total:1});
   }
   if(request.action==="reminders")return reply({todos:[{id:"system:todo",title:"系统待办样本",calendar:"iCloud · 提醒事项",calendarId:"system:reminder-list",done:false,description:"系统待办备注"}],total:1});
   if(request.action==="contacts")return reply(request.offset?{contacts:[contact(3)]}:{contacts:[contact(1),contact(2)],nextOffset:2});
   if(request.action==="contact"){
    const value=reply({contact:{...contact(1),photo:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg=="}});
    if(state.holdContact)return new Promise(resolve=>{state.late=()=>resolve(value);});return value;
   }
   throw Error("unexpected operation");
  }}}};
 },{authorized});
 await page.emulateMedia({reducedMotion:"reduce"});
}

test("system calendars, reminders and paged contacts each authorize on entry and never become imported copies",async({page},info)=>{
 await install(page);await page.goto("/");await home(page);await choose(page,"附加功能");await choose(page,"日历");
 await expect(live(page).locator(".organizer-row").filter({hasText:"iCloud · 空日历"})).toHaveCount(1);
 await pick(page,"iCloud · 工作日历");await expect(live(page).getByRole("gridcell",{selected:true})).toHaveAccessibleName(/有日程/);
 await key(page,"Enter");await pick(page,"系统日程样本");await expect(live(page).locator(".organizer-detail")).toContainText("系统地点");await info.attach("system-calendar-fixture",{body:await live(page).screenshot(),contentType:"image/png"});
 await key(page,"Escape");await key(page,"Escape");await key(page,"Escape");await pick(page,"待办事项");await pick(page,"系统待办样本");await expect(live(page).locator(".organizer-detail")).toContainText("系统待办备注");
 await home(page);await choose(page,"附加功能");await choose(page,"通讯录");await pick(page,"载入更多联系人");await expect(live(page).locator(".organizer-row").filter({hasText:"系统联系人3"})).toHaveCount(1);
 await pick(page,"系统联系人1");await expect(live(page).locator(".organizer-detail img")).toBeVisible();await expect(live(page).locator(".organizer-detail")).toContainText("系统样本公司");
 const calls=await page.evaluate(()=>(window as any).__organizerMock.calls);
 expect(calls.filter((x:any)=>x.action==="authorize").map((x:any)=>x.resource)).toEqual(["calendars","reminders","contacts"]);
 expect(calls.every((x:any)=>!["save","delete","remove","update"].includes(x.action))).toBe(true);
 expect(await page.evaluate(()=>localStorage.getItem("reipod-organizer-v1"))).not.toContain("系统日程样本");
 expect(await page.evaluate(()=>localStorage.getItem("reipod-organizer-v1"))).not.toContain("system:");
 await home(page);await choose(page,"设置");await choose(page,"ReiPod 设置");await choose(page,"日历与通讯录");await pick(page,"资料来源");
 await home(page);await choose(page,"附加功能");await choose(page,"通讯录");await pick(page,"导入副本联系人");await expect(live(page).locator(".organizer-detail")).toContainText("导入副本联系人");
});

test("revocation and a late private contact reply cannot restore a system detail page",async({page})=>{
 await install(page,true);await page.goto("/");await home(page);await choose(page,"附加功能");await choose(page,"通讯录");
 await expect(live(page).locator(".organizer-row").filter({hasText:"系统联系人1"})).toHaveCount(1);
 await page.evaluate(()=>(window as any).__organizerMock.holdContact=true);await pick(page,"系统联系人1");
 await expect.poll(()=>page.evaluate(()=>!!(window as any).__organizerMock.late)).toBe(true);
 await page.evaluate(()=>{const mock=(window as any).__organizerMock;mock.permissions.contacts="denied";mock.revision++;window.dispatchEvent(new Event("reipod-native-organizer"));mock.late();});
 await expect(live(page).locator(".organizer-detail")).toHaveCount(0);
 await expect(live(page).locator(".organizer-row")).toContainText("允许读取系统通讯录");
 expect(await live(page).textContent()).not.toContain("系统样本公司");
 expect(await page.evaluate(()=>localStorage.getItem("reipod-organizer-v1"))).toContain("导入副本联系人");
});
