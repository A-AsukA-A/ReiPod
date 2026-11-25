import { expect, test } from "vitest";
import { dateKey, eventsOnDay, parseCalendar, shiftMonth, validEvent } from "./organizerCalendar";
import { parseContacts, validContact } from "./organizerContacts";

test("calendar keeps exclusive all-day ends, cross-day events, weekly exclusions and local timezone conversion",()=>{
  const parsed=parseCalendar(`BEGIN:VCALENDAR\nX-WR-CALNAME:本地样本\nBEGIN:VEVENT\nUID:trip\nSUMMARY:跨日旅行\nDTSTART;VALUE=DATE:20261110\nDTEND;VALUE=DATE:20261112\nEND:VEVENT\nBEGIN:VEVENT\nUID:weekly\nSUMMARY:每周排练\nDTSTART;TZID=Asia/Shanghai:20261103T160000\nDTEND;TZID=Asia/Shanghai:20261103T170000\nRRULE:FREQ=WEEKLY;COUNT=4;BYDAY=TU\nEXDATE;TZID=Asia/Shanghai:20261117T160000\nEND:VEVENT\nBEGIN:VTODO\nUID:todo\nSUMMARY:准备器材\nDUE;VALUE=DATE:20261111\nSTATUS:COMPLETED\nEND:VTODO\nEND:VCALENDAR`,"sample.ics");
  expect(parsed.skipped).toBe(0);expect(parsed.events.every(validEvent)).toBe(true);
  expect(eventsOnDay(parsed.events,"2026-11-10").map(x=>x.event.id)).toContain("trip");
  expect(eventsOnDay(parsed.events,"2026-11-11").map(x=>x.event.id)).toContain("trip");
  expect(eventsOnDay(parsed.events,"2026-11-12").map(x=>x.event.id)).not.toContain("trip");
  const at=new Date("2026-11-10T08:00:00Z"),occurrence=eventsOnDay(parsed.events,dateKey(at)).find(x=>x.event.id==="weekly");
  expect(occurrence?.start).toBe(at.getTime());
  expect(eventsOnDay(parsed.events,"2026-11-17").some(x=>x.event.id==="weekly")).toBe(false);
  expect(eventsOnDay(parsed.events,"2026-12-01")).toEqual([]);
  expect(parsed.todos[0]).toMatchObject({done:true,due:{day:"2026-11-11"}});
  expect(shiftMonth("2024-01-31",1)).toBe("2024-02-29");
});

test("calendar rejects unsupported rules and impossible dates without silently making them single events",()=>{
 const result=parseCalendar(`BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART:20260230T120000\nSUMMARY:invalid\nEND:VEVENT\nBEGIN:VEVENT\nDTSTART:20261110T120000\nRRULE:FREQ=MONTHLY;BYSETPOS=1;BYDAY=MO\nSUMMARY:unsupported\nEND:VEVENT\nEND:VCALENDAR`,"bad.ics");
 expect(result.events).toEqual([]);expect(result.skipped).toBe(2);
});

test("vCards unfold UTF-8 names, keep multiple typed fields and escape text without fetching external photos",()=>{
 const input=`BEGIN:VCARD\r\nVERSION:3.0\r\nUID:sample-person\r\nFN:林小\r\n 雨\r\nN:林;小雨;;;\r\nORG:示例工作室\r\nTEL;TYPE=CELL:+86 138 0000 0000\r\nEMAIL;TYPE=WORK:hello@example.com\r\nADR;TYPE=HOME:;;第一街道\\;二号;上海;;;中国\r\nNOTE:第一行\\n第二行：包含一个 " 引号\r\nPHOTO;VALUE=URI:https://example.com/private.jpg\r\nEND:VCARD`;
 const {contacts,skipped}=parseContacts(input);expect(skipped).toBe(0);expect(contacts).toHaveLength(1);
 expect(contacts[0]).toMatchObject({name:"林小雨",first:"小雨",last:"林"});
 expect(contacts[0].fields.find(x=>x.label==="住宅地址")?.value).toContain("第一街道;二号");
 expect(contacts[0].fields.find(x=>x.label==="备注")?.value).toBe('第一行\n第二行：包含一个 " 引号');
 expect(contacts[0].photo).toBeUndefined();expect(validContact(contacts[0])).toBe(true);expect(parseContacts(input).contacts[0].id).toBe(contacts[0].id);
});
