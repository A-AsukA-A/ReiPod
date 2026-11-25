import { validEvent, validTodo } from "../models/organizerCalendar";
import type { OrganizerEvent, OrganizerTodo } from "../models/organizerCalendar";
import { validContact } from "../models/organizerContacts";
import type { OrganizerContact } from "../models/organizerContacts";
export type OrganizerResource = "calendars" | "reminders" | "contacts";
export type OrganizerAuthorization = "notDetermined" | "authorized" | "limited" | "denied" | "restricted" | "writeOnly";
export type OrganizerPermissions = Record<OrganizerResource, OrganizerAuthorization>;
export type NativeOrganizerReply = { authorization: OrganizerPermissions; revision: number;
  calendars?: {id:string;title:string}[]; events?: OrganizerEvent[]; todos?: OrganizerTodo[]; contacts?: OrganizerContact[]; contact?: OrganizerContact;
  total?: number; nextOffset?: number; truncated?: boolean };
type Host = { __REIPOD_NATIVE_ORGANIZER_VERSION__?: number; webkit?: { messageHandlers?: { reipodOrganizer?: {postMessage:(message:unknown)=>Promise<unknown>} } } };
export const nativeOrganizerAvailable=()=> (window as unknown as Host).__REIPOD_NATIVE_ORGANIZER_VERSION__===1;
export const readableOrganizer=(status:OrganizerAuthorization|undefined)=>status==="authorized"||status==="limited";
export const emptyPermissions=():OrganizerPermissions=>({calendars:"notDetermined",reminders:"notDetermined",contacts:"notDetermined"});
export async function nativeOrganizerRequest(action:"status"|"authorize"|"events"|"reminders"|"contacts"|"contact"|"refresh"|"openSettings",fields:{resource?:OrganizerResource;start?:string;end?:string;offset?:number;limit?:number;id?:string}={}):Promise<NativeOrganizerReply>{
  const bridge=(window as unknown as Host).webkit?.messageHandlers?.reipodOrganizer;
  if(!nativeOrganizerAvailable()||!bridge)throw Error("当前容器不支持系统日历与通讯录，请更新App");
  const raw=await bridge.postMessage({version:1,action,...fields}) as NativeOrganizerReply;
  const statuses=["notDetermined","authorized","limited","denied","restricted","writeOnly"];
  if(!raw||!raw.authorization||!(["calendars","reminders","contacts"] as const).every(key=>statuses.includes(raw.authorization[key]))||!Number.isSafeInteger(raw.revision)||raw.revision<0||
    raw.calendars!==undefined&&(!Array.isArray(raw.calendars)||raw.calendars.length>5000||!raw.calendars.every(x=>x&&typeof x.id==="string"&&x.id.length<200&&typeof x.title==="string"&&x.title.length<=500))||
    raw.events!==undefined&&(!Array.isArray(raw.events)||raw.events.length>100||!raw.events.every(validEvent))||
    raw.todos!==undefined&&(!Array.isArray(raw.todos)||raw.todos.length>100||!raw.todos.every(validTodo))||
    raw.contacts!==undefined&&(!Array.isArray(raw.contacts)||raw.contacts.length>100||!raw.contacts.every(validContact))||raw.contact!==undefined&&!validContact(raw.contact)||
    raw.nextOffset!==undefined&&(!Number.isSafeInteger(raw.nextOffset)||raw.nextOffset<0)||raw.total!==undefined&&(!Number.isSafeInteger(raw.total)||raw.total<0))throw Error("系统资料返回无效，请刷新重试");
  return raw;
}
