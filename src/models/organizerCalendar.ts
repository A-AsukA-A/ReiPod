import { contentLines, identity, plainText } from "./organizerText";
import type { ContentLine } from "./organizerText";
export type CalendarStamp = { day: string; clock?: string; zone?: string };
export type CalendarRepeat = { frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY"; interval: number; count?: number; until?: string; untilAt?: number; weekdays?: number[] };
export type OrganizerEvent = { id: string; uid: string; title: string; calendar: string; calendarId?: string; start: CalendarStamp; duration: number;
  location: string; description: string; repeat?: CalendarRepeat; excluded: string[]; replacement?: boolean };
export type OrganizerTodo = { id: string; title: string; calendar: string; calendarId?: string; due?: CalendarStamp; done: boolean; description: string };
export type CalendarOccurrence = { id: string; event: OrganizerEvent; start: number; end: number; allDay: boolean };
const dayMs = 86400000;
const zonedTimes = new Map<string, number>();
export const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
export const dayDate = (day: string) => new Date(`${day}T12:00:00`);
const dayIndex = (day: string) => Date.parse(`${day}T00:00:00Z`) / dayMs;
export const shiftDay = (day: string, offset: number) => new Date((dayIndex(day) + offset) * dayMs).toISOString().slice(0,10);
export function shiftMonth(day: string, offset: number) {
  const date = dayDate(day), target = new Date(date.getFullYear(), date.getMonth()+offset, 1, 12);
  target.setDate(Math.min(date.getDate(), new Date(target.getFullYear(),target.getMonth()+1,0).getDate()));
  return dateKey(target);
}
function stamp(line?: ContentLine): CalendarStamp | undefined {
  const match = line?.value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!match) return;
  const day = `${match[1]}-${match[2]}-${match[3]}`;
  if (dayDate(day).toString() === "Invalid Date" || dateKey(dayDate(day)) !== day || +match[1] < 1900 || +match[1] > 2199) return;
  if (match[4] && (+match[4] > 23 || +match[5] > 59 || +(match[6] ?? 0) > 59)) return;
  const result: CalendarStamp = { day, ...(match[4] ? { clock: `${match[4]}:${match[5]}:${match[6] ?? "00"}`, zone: match[7] ? "UTC" : line!.params.TZID } : {}) };
  return Number.isFinite(stampTime(result)) ? result : undefined;
}
/** Convert a wall time using IANA TZID, without requesting a calendar service. */
export function stampTime(stamp: CalendarStamp): number {
  if (!stamp.clock) return new Date(`${stamp.day}T00:00:00`).getTime();
  if (!stamp.zone) return new Date(`${stamp.day}T${stamp.clock}`).getTime();
  const cacheKey=`${stamp.zone}|${stamp.day}|${stamp.clock}`;
  const cached=zonedTimes.get(cacheKey);if(cached!==undefined)return cached;
  const target = Date.parse(`${stamp.day}T${stamp.clock}Z`);
  try {
    const format = new Intl.DateTimeFormat("en-CA", {timeZone:stamp.zone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"});
    let result = target;
    for (let i=0;i<4;i++) {
      const parts = Object.fromEntries(format.formatToParts(result).map(p=>[p.type,p.value]));
      const shown = Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`), delta=target-shown;
      if (!delta) { if(zonedTimes.size>=4096)zonedTimes.delete(zonedTimes.keys().next().value!);zonedTimes.set(cacheKey,result);return result; }
      result += delta;
    }
  } catch { /* Unsupported TZIDs are skipped rather than silently shifted. */ }
  return NaN;
}
function recurrence(value: string): CalendarRepeat | undefined {
  const rule:Record<string,string>=Object.fromEntries(value.toUpperCase().split(";").map(x=>x.split("=")));
  if (Object.keys(rule).some(key=>!["FREQ","INTERVAL","COUNT","UNTIL","BYDAY","WKST"].includes(key)) ||
    !["DAILY","WEEKLY","MONTHLY","YEARLY"].includes(rule.FREQ) || rule.WKST && rule.WKST!=="MO" || rule.BYDAY && rule.FREQ!=="WEEKLY") return;
  const interval=rule.INTERVAL?+rule.INTERVAL:1, count=rule.COUNT?+rule.COUNT:undefined;
  const until=rule.UNTIL?stamp({name:"UNTIL",params:{},value:rule.UNTIL}):undefined;
  const weekdays=rule.BYDAY?.split(",").map(d=>["SU","MO","TU","WE","TH","FR","SA"].indexOf(d));
  if (until?.clock&&until.zone!=="UTC")return;
  if (!Number.isInteger(interval)||interval<1||interval>1000||count!==undefined&&(!Number.isInteger(count)||count<1)||rule.UNTIL&&!until||weekdays?.some(d=>d<0)||count&&until) return;
  return { frequency:rule.FREQ as CalendarRepeat["frequency"],interval,count,until:until?.day,untilAt:until?.clock?stampTime(until):undefined,weekdays };
}
export function parseCalendar(text: string, filename: string): { events: OrganizerEvent[]; todos: OrganizerTodo[]; skipped: number } {
  const all=contentLines(text), calendar=plainText(all.find(l=>l.name==="X-WR-CALNAME")?.value??filename.replace(/\.(ics|vcs)$/i,""));
  const events:OrganizerEvent[]=[],todos:OrganizerTodo[]=[];let block:ContentLine[]|null=null,kind="",depth=0,skipped=0;
  for(const line of all){
    if(line.name==="BEGIN"&&["VEVENT","VTODO"].includes(line.value.toUpperCase())){block=[];kind=line.value.toUpperCase();depth=0;continue;}
    if(!block)continue;
    if(line.name==="BEGIN"){depth++;continue;}
    if(line.name==="END"&&depth){depth--;continue;}
    if(line.name!=="END"||line.value.toUpperCase()!==kind){if(!depth)block.push(line);continue;}
    const get=(name:string)=>block!.find(l=>l.name===name), title=plainText(get("SUMMARY")?.value??"未命名"), description=plainText(get("DESCRIPTION")?.value??"");
    const uid=plainText(get("UID")?.value??identity(`${calendar}|${title}|${get("DTSTART")?.value??get("DUE")?.value}`));
    if(get("STATUS")?.value.toUpperCase()==="CANCELLED"){skipped++;block=null;continue;}
    if(kind==="VTODO") {
      if(get("RRULE")){skipped++;block=null;continue;}
      const due=stamp(get("DUE"));
      if(get("DUE")&&!due){skipped++;block=null;continue;}
      todos.push({id:uid,title,calendar,due,description,done:get("STATUS")?.value.toUpperCase()==="COMPLETED"||!!get("COMPLETED")});
    }else{
      const start=stamp(get("DTSTART")),end=stamp(get("DTEND")),repeat=get("RRULE")?recurrence(get("RRULE")!.value):undefined;
      const replacement=stamp(get("RECURRENCE-ID"));
      const unsupported=get("RDATE")||get("DURATION")||get("RRULE")&&!repeat||get("DTEND")&&!end||get("RECURRENCE-ID")&&!replacement;
      if(!start||unsupported){skipped++;block=null;continue;}
      const duration=end ? start.clock?stampTime(end)-stampTime(start):(dayIndex(end.day)-dayIndex(start.day))*dayMs:start.clock?0:dayMs;
      if(duration<0||duration>366*dayMs||!!start.clock!==!!(end??start).clock){skipped++;block=null;continue;}
      const exclusions=block.filter(l=>l.name==="EXDATE").flatMap(l=>l.value.split(",").map(value=>stamp({...l,value})));
      if(exclusions.some(x=>!x)){skipped++;block=null;continue;}
      const excluded=exclusions.map(x=>x!.day);
      events.push({id:replacement?`${uid}@${replacement.day}`:uid,uid,title,calendar,start,duration,repeat,excluded,location:plainText(get("LOCATION")?.value??""),description,replacement:!!replacement});
    }
    block=null;
  }
  if(block)skipped++;
  return {events,todos,skipped};
}
function occurs(event: OrganizerEvent, day: string): boolean {
  if(day<event.start.day||event.excluded.includes(day))return false;
  const r=event.repeat;if(!r)return day===event.start.day;
  if(r.until&&day>r.until)return false;
  const start=dayDate(event.start.day),date=dayDate(day),days=dayIndex(day)-dayIndex(event.start.day);let ordinal=0;
  if(r.frequency==="DAILY"){if(days%r.interval)return false;ordinal=days/r.interval+1;}
  if(r.frequency==="WEEKLY"){
    const startOffset=(start.getDay()+6)%7, week=Math.floor((days+startOffset)/7), permitted=(r.weekdays??[start.getDay()]).map(d=>(d+6)%7).sort((a,b)=>a-b), offset=(date.getDay()+6)%7;
    if(week%r.interval||!permitted.includes(offset))return false;
    const first=permitted.filter(d=>d>=startOffset).length;
    ordinal=week===0?permitted.filter(d=>d>=startOffset&&d<=offset).length:first+(week/r.interval-1)*permitted.length+permitted.filter(d=>d<=offset).length;
  }
  if(r.frequency==="MONTHLY"){
    const months=(date.getFullYear()-start.getFullYear())*12+date.getMonth()-start.getMonth();
    if(months%r.interval||date.getDate()!==start.getDate())return false;
    if(!r.count)ordinal=1;else for(let m=0;m<=months;m+=r.interval)if(new Date(start.getFullYear(),start.getMonth()+m+1,0).getDate()>=start.getDate())ordinal++;
  }
  if(r.frequency==="YEARLY"){
    const years=date.getFullYear()-start.getFullYear();if(years%r.interval||date.getMonth()!==start.getMonth()||date.getDate()!==start.getDate())return false;
    if(!r.count)ordinal=1;else for(let y=0;y<=years;y+=r.interval)if(new Date(start.getFullYear()+y,start.getMonth(),start.getDate()).getMonth()===start.getMonth())ordinal++;
  }
  return !r.count||ordinal<=r.count;
}
export function eventsOnDay(events: readonly OrganizerEvent[], day: string): CalendarOccurrence[] {
  const from=new Date(`${day}T00:00:00`).getTime(),to=new Date(`${shiftDay(day,1)}T00:00:00`).getTime(),result:CalendarOccurrence[]=[];
  const replacements=new Set(events.filter(x=>x.replacement).map(x=>x.id));
  for(const event of events){
    const candidates=event.repeat?Array.from({length:Math.ceil(event.duration/dayMs)+4},(_,i)=>shiftDay(day,i-Math.ceil(event.duration/dayMs)-2)):[event.start.day];
    for(const candidate of candidates){
      if(!occurs(event,candidate)||event.repeat&&replacements.has(`${event.uid}@${candidate}`))continue;
      const start=stampTime({...event.start,day:candidate}),end=event.start.clock?start+event.duration:stampTime({day:shiftDay(candidate,event.duration/dayMs)});
      if(event.repeat?.untilAt!==undefined&&start>event.repeat.untilAt)continue;
      if(start>=to||Math.max(start+1,end)<=from)continue;
      result.push({id:`${event.id}:${candidate}`,event,start,end,allDay:!event.start.clock});
    }
  }
  return result.sort((a,b)=>Number(b.allDay)-Number(a.allDay)||a.start-b.start||a.event.title.localeCompare(b.event.title,"zh-CN"));
}
export function validEvent(value: unknown): value is OrganizerEvent {
  if(!value||typeof value!=="object")return false;
  const e=value as OrganizerEvent;
  const validStamp=(s:CalendarStamp)=>s&&typeof s.day==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s.day)&&Number.isFinite(stampTime(s));
  return (e.calendarId===undefined||typeof e.calendarId==="string"&&e.calendarId.length<=200)&&[e.id,e.uid,e.title,e.calendar,e.location,e.description].every(v=>typeof v==="string"&&v.length<=12000)&&validStamp(e.start)&&Number.isFinite(e.duration)&&e.duration>=0&&e.duration<=(e.id.startsWith("system:")?300*366:366)*dayMs&&
    Array.isArray(e.excluded)&&e.excluded.length<=1000&&e.excluded.every(d=>typeof d==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(d))&&
    (e.repeat===undefined||((e.repeat.untilAt===undefined||Number.isFinite(e.repeat.untilAt))&&!!recurrence(`FREQ=${e.repeat.frequency};INTERVAL=${e.repeat.interval}${e.repeat.count!==undefined?`;COUNT=${e.repeat.count}`:""}${e.repeat.until?`;UNTIL=${e.repeat.until.replaceAll("-","")}`:""}${e.repeat.weekdays?`;BYDAY=${e.repeat.weekdays.map(d=>["SU","MO","TU","WE","TH","FR","SA"][d]).join(",")}`:""}`)));
}
export function validTodo(value:unknown):value is OrganizerTodo{
  if(!value||typeof value!=="object")return false;
  const t=value as OrganizerTodo;
  return (t.calendarId===undefined||typeof t.calendarId==="string"&&t.calendarId.length<=200)&&[t.id,t.title,t.calendar,t.description].every(v=>typeof v==="string"&&v.length<=12000)&&typeof t.done==="boolean"&&(!t.due||typeof t.due.day==="string"&&Number.isFinite(stampTime(t.due)));
}
