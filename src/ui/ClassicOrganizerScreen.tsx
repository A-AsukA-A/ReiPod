import { useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { Ref } from "react";
import { createOrganizerFilePicker } from "../services/organizerFilePicker";
import { useNativeOrganizer } from "../app/useNativeOrganizer";
import { nativeOrganizerAvailable, readableOrganizer } from "../services/nativeOrganizer";
import type { OrganizerResource } from "../services/nativeOrganizer";
import { useOrganizer } from "../app/useOrganizer";
import { dateKey, dayDate, eventsOnDay, shiftDay, shiftMonth, stampTime } from "../models/organizerCalendar";
import type { CalendarOccurrence } from "../models/organizerCalendar";
import type { OrganizerInput } from "./organizerInput";
import { MarqueeText } from "./MarqueeText";
import "./classic-organizer.css";
type Mode="root"|"month"|"day"|"event"|"todos"|"todo"|"contact"|"confirm-contacts"|"confirm-calendar"|"help";
const dateLabel=(day:string)=>dayDate(day).toLocaleDateString("zh-CN",{year:"numeric",month:"long",day:"numeric",weekday:"long"});
const clock=(value:number)=>new Date(value).toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit",hour12:false});
const timeLabel=(item:CalendarOccurrence)=>{
  const crossDay=dateKey(new Date(item.start))!==dateKey(new Date(item.end-(item.allDay?1:0)));
  const endDate=new Date(item.end-(item.allDay?1:0)).toLocaleDateString("zh-CN",{month:"numeric",day:"numeric"});
  return item.allDay?`全天${crossDay?` · 至${endDate}`:""}`:`${clock(item.start)}${item.end>item.start?`–${crossDay?endDate+" ":""}${clock(item.end)}`:""}`;
};
export function ClassicOrganizerScreen({page,input,active,exit,notice}:{page:"calendar"|"contacts"|"organizer-settings";input:Ref<OrganizerInput>;active:boolean;exit:()=>void;notice:(text:string)=>void}){
  const local=useOrganizer(notice,nativeOrganizerAvailable());
  const {busy,importFiles,sort,clear}=local;
  const [mode,setMode]=useState<Mode>("root"),[index,setIndex]=useState(0),[day,setDay]=useState(()=>dateKey(new Date())),[calendar,setCalendar]=useState(""),[chosen,setChosen]=useState<CalendarOccurrence|null>(null),[contactId,setContactId]=useState(""),[todoId,setTodoId]=useState("");
  const resource:OrganizerResource=page==="contacts"?"contacts":["todos","todo"].includes(mode)?"reminders":"calendars";
  const native=useNativeOrganizer(resource,day,local.systemSource&&page!=="organizer-settings");
  const system=local.systemSource&&native.available;
  const state=system?{...local.state,contacts:native.contacts,events:native.events,todos:native.todos}:local.state;
  const nativeBlocked=system&&page!=="organizer-settings"&&(!native.visible||!!native.error||!readableOrganizer(native.permissions[resource])||native.loading&&!native.contacts.length);
  const manage=(action:"authorize"|"refresh"|"openSettings",target?:OrganizerResource)=>{void native.manage(action,target).catch(error=>notice(String(error)));};
  const permissionLabel=(key:OrganizerResource)=>({notDetermined:"未授权",authorized:"已允许",limited:"部分联系人",denied:"未允许",restricted:"受限制",writeOnly:"仅写入"})[native.permissions[key]];
  useEffect(()=>{if(!system)return;setChosen(null);setContactId("");setTodoId("");setCalendar("");setMode(value=>value==="contact"?"root":value==="event"?"day":value==="todo"?"todos":value);},[native.epoch,system]);
  useEffect(()=>{if(system&&mode==="contact"&&contactId)void native.loadContact(contactId);},[system,mode,contactId,native.loadContact]);
  const selected=useRef<HTMLDivElement>(null),scroll=useRef<HTMLDivElement>(null),file=useRef<ReturnType<typeof createOrganizerFilePicker>>(null);
  const enter=(next:Mode)=>{setMode(next);setIndex(0);if(scroll.current)scroll.current.scrollTop=0;};
  useEffect(()=>{enter("root");setCalendar("");},[page]);
  const contacts=useMemo(()=>[...state.contacts].sort((a,b)=>a[state.sort].localeCompare(b[state.sort],"zh-CN")||a.name.localeCompare(b.name,"zh-CN")),[state.contacts,state.sort]);
  const calendars=useMemo(()=>[...new Map([...(system?native.calendars:[]).map(item=>[item.id,item.title] as [string,string]),...[...state.events,...state.todos].map(event=>[event.calendarId??event.calendar,event.calendar] as [string,string])]).entries()].sort((a,b)=>a[1].localeCompare(b[1],"zh-CN")),[state.events,state.todos,native.calendars]);
  const events=useMemo(()=>calendar?state.events.filter(e=>(e.calendarId??e.calendar)===calendar):state.events,[state.events,calendar]);
  const agenda=useMemo(()=>eventsOnDay(events,day),[events,day]);
  const todos=useMemo(()=>state.todos.filter(t=>!calendar||(t.calendarId??t.calendar)===calendar).sort((a,b)=>Number(a.done)-Number(b.done)||(a.due?.day??"9999").localeCompare(b.due?.day??"9999")),[state.todos,calendar]);
  const month=dayDate(day),monthStart=dateKey(new Date(month.getFullYear(),month.getMonth(),1,12)),gridStart=shiftDay(monthStart,-dayDate(monthStart).getDay());
  const cells=useMemo(()=>Array.from({length:42},(_,i)=>{const date=shiftDay(gridStart,i);return {day:date,hasEvents:eventsOnDay(events,date).length>0};}),[gridStart,events]);
  const contact=system&&native.contact?.id===contactId?native.contact:contacts.find(c=>c.id===contactId),todo=todos.find(t=>t.id===todoId);
  const detail=mode==="contact"||mode==="event"||mode==="todo"||mode==="help";
  const importPort=useRef({active,importFiles});importPort.current={active,importFiles};
  useEffect(()=>{const picker=createOrganizerFilePicker((files,kind)=>{if(importPort.current.active)void importPort.current.importFiles(files,kind);});file.current=picker;return()=>{picker.dispose();file.current=null;};},[]);
  useEffect(()=>{file.current?.setEnabled(active&&!busy);},[active,busy]);
  const pickFile=(kind:"contacts"|"calendar")=>{if(active&&!busy)file.current?.choose(kind);};
  const back=()=>{
    if(mode==="root"){exit();return;}
    if(mode==="month"||mode==="todos"||mode.startsWith("confirm-")||mode==="help")enter("root");
    else if(mode==="day")enter("month");else if(mode==="event"){setMode("day");}else if(mode==="todo"){setMode("todos");}else if(mode==="contact")setMode("root");
  };
  const rows: {label:string;detail?:string;value?:string;action:()=>void;disabled?:boolean}[]=mode==="confirm-contacts"||mode==="confirm-calendar"?[
    {label:"取消",action:()=>enter("root")},{label:"清空",action:()=>{clear(mode==="confirm-contacts"?"contacts":"calendar");enter("root");}},
  ]:nativeBlocked?[
    {label:native.loading?"正在读取系统资料…":native.error?"读取失败，刷新重试":"允许读取系统"+({calendars:"日历",reminders:"提醒事项",contacts:"通讯录"})[resource],detail:native.error,disabled:native.loading,action:()=>manage(native.error?"refresh":native.permissions[resource]==="notDetermined"||native.permissions[resource]==="writeOnly"?"authorize":"openSettings",resource)},
  ]:page==="organizer-settings"?[
    ...(native.available?[
      {label:"资料来源",value:system?"iPhone系统":"已导入副本",action:()=>local.source(!system)},
      ...(["calendars","reminders","contacts"] as const).map(key=>({label:({calendars:"系统日历",reminders:"系统提醒事项",contacts:"系统通讯录"})[key],value:permissionLabel(key),action:()=>manage(["notDetermined","writeOnly"].includes(native.permissions[key])?"authorize":"openSettings",key)})),
      {label:"刷新系统资料",action:()=>manage("refresh")},
    ]:[]),
    {label:busy?"正在导入…":"导入日历…",detail:"iCalendar · .ics / .vcs",action:()=>pickFile("calendar"),disabled:busy},
    {label:busy?"正在导入…":"导入联系人…",detail:"vCard · .vcf",action:()=>pickFile("contacts"),disabled:busy},
    {label:"联系人排序",value:state.sort==="first"?"名字":"姓氏",action:sort},
    {label:"导入说明",action:()=>enter("help")},
    {label:native.available?"清空导入日历与待办…":"清空日历与待办…",action:()=>enter("confirm-calendar"),disabled:!local.state.events.length&&!local.state.todos.length},
    {label:native.available?"清空导入联系人…":"清空联系人…",action:()=>enter("confirm-contacts"),disabled:!local.state.contacts.length},
  ]:mode==="day"?agenda.map(item=>({label:item.event.title,detail:timeLabel(item),action:()=>{setChosen(item);setMode("event");}}))
  :mode==="todos"?todos.map(item=>({label:item.title,detail:item.due?.day,value:item.done?"✓":undefined,action:()=>{setTodoId(item.id);setMode("todo");}}))
  :page==="contacts"?[...contacts.map(item=>({label:item.name,action:()=>{setContactId(item.id);setMode("contact");}})),...(system&&native.nextOffset!==undefined?[{label:native.loading?"正在读取…":"载入更多联系人",disabled:native.loading,action:()=>{void native.loadMore();}}]:[])]
  :[{label:"所有日历",action:()=>{setCalendar("");enter("month");}},...calendars.map(([id,name])=>({label:name,action:()=>{setCalendar(id);enter("month");}})),{label:"待办事项",action:()=>{setCalendar("");enter("todos");}}];
  useEffect(()=>{setIndex(i=>Math.max(0,Math.min(rows.length-1,i)));},[rows.length]);
  useEffect(()=>{
    if(!selected.current||!scroll.current)return;
    const row=selected.current,parent=scroll.current;
    if(row.offsetTop<parent.scrollTop)parent.scrollTop=row.offsetTop;
    else if(row.offsetTop+row.offsetHeight>parent.scrollTop+parent.clientHeight)parent.scrollTop=row.offsetTop+row.offsetHeight-parent.clientHeight;
  },[index,mode,page]);
  const controls:OrganizerInput={rotate:steps=>{
    if(nativeBlocked){setIndex(i=>Math.max(0,Math.min(rows.length-1,i+steps)));return;}
    if(mode==="month"){const next=shiftDay(day,steps);if(next>="1900-01-01"&&next<="2199-12-31")setDay(next);}
    else if(detail&&scroll.current)scroll.current.scrollTop+=steps*scroll.current.clientWidth/320*22;
    else setIndex(i=>Math.max(0,Math.min(rows.length-1,i+steps)));
  },command:command=>{
    if(command==="menu"){back();return;}
    if(nativeBlocked){if(command==="select"&&!rows[index]?.disabled)rows[index]?.action();return;}
    if(mode==="month"&&(command==="previous"||command==="next")){
      const next=shiftMonth(day,command==="previous"?-1:1);if(next>="1900-01-01"&&next<="2199-12-31")setDay(next);return;
    }
    if(mode==="month"&&command==="options"){setDay(dateKey(new Date()));return;}
    if(command!=="select")return;
    if(mode==="month")enter("day");else if(!detail)rows[index]?.disabled||rows[index]?.action();
  }};
  const live=useRef(controls);live.current=controls;
  useImperativeHandle(input,()=>({rotate:steps=>live.current.rotate(steps),command:value=>live.current.command(value)}),[]);
  const detailFields: [string,string][] = mode==="contact"&&contact?[
    ...(contact.company?[["公司",contact.company] as [string,string]]:[]),...contact.fields.map(field=>[field.label,field.value] as [string,string]),
  ]:mode==="event"&&chosen?[["时间",`${new Date(chosen.start).toLocaleDateString("zh-CN")} ${timeLabel(chosen)}`],
    ...(chosen.event.location?[["地点",chosen.event.location] as [string,string]]:[]),["日历",chosen.event.calendar],...(chosen.event.description?[["备注",chosen.event.description] as [string,string]]:[])]
  :mode==="todo"&&todo?[["状态",todo.done?"已完成":"未完成"],...(todo.due?[["截止",todo.due.clock?new Date(stampTime(todo.due)).toLocaleString("zh-CN",{hour12:false}):dateLabel(todo.due.day)] as [string,string]]:[]),["日历",todo.calendar],...(todo.description?[["备注",todo.description] as [string,string]]:[])]:[];
  return <div className={`classic-organizer organizer-${page}`} data-organizer-mode={mode}>
    {mode==="month"&&!nativeBlocked?<>
      <div className="calendar-month"><span aria-hidden="true">‹</span><strong>{month.toLocaleDateString("zh-CN",{year:"numeric",month:"long"})}</strong><span aria-hidden="true">›</span></div>
      <div className="calendar-weekdays">{"日一二三四五六".split("").map(day=><span key={day}>{day}</span>)}</div>
      <div className="calendar-grid" role="grid" aria-label="月历">{cells.map(cell=><div key={cell.day} role="gridcell" aria-label={`${cell.day}${cell.hasEvents?" 有日程":""}`} aria-selected={cell.day===day} className={`${cell.day.slice(0,7)===day.slice(0,7)?"":"outside"} ${cell.day===dateKey(new Date())?"today":""} ${cell.day===day?"selected":""}`}><span>{Number(cell.day.slice(-2))}</span>{cell.hasEvents&&<i aria-hidden="true"/>}</div>)}</div>
      <div className="calendar-caption"><span>{dateLabel(day)}</span><strong>{agenda.length?`${agenda.length}项日程`:""}</strong></div>
    </>:detail&&!nativeBlocked?<div className="organizer-detail" ref={scroll} key={`${mode}:${contactId}:${todoId}:${chosen?.id}`}>
      {mode==="help"?<><h2>日历与通讯录</h2><p>在这里管理系统读取授权，也可导入.ics／.vcs日历和.vcf联系人。系统资料仅在会话中显示，导入副本保存在本地。</p><p>月历：转轮选日期，前后键换月，中心键查看日程，长按中心键回到今天。Menu返回。</p><p>支持单次事件、全天／跨日、基本日／周／月／年重复与排除日期、待办；复杂重复、时区自定义和旧式编码可能略过，导入时会提示。</p><p>联系人支持UTF-8 vCard 3.0／4.0、常见2.1文本及内嵌JPEG／PNG照片。不会下载远程照片、拨号或发送邮件。</p><p>更新的iPhone容器直接读取已授权的日历、提醒事项和联系人；普通网页使用导入副本。系统变更或回到App时刷新，所有内容只读。提醒由系统提醒事项负责，ReiPod不新建提醒。转轮滚动阅读。</p></>:<>
        <header className="organizer-detail-heading">{mode==="contact"&&contact?.photo&&<img src={contact.photo} alt=""/>}<h2>{mode==="contact"?contact?.name:mode==="event"?chosen?.event.title:todo?.title}</h2></header>
        <dl>{detailFields.map(([label,value],i)=><div key={i}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      </>}
    </div>:<>
      {nativeBlocked&&<div className="organizer-date">iPhone系统资料</div>}
      {system&&native.truncated&&<div className="organizer-date">资料较多，当前显示前10000项</div>}
      {mode==="day"&&!nativeBlocked&&<div className="organizer-date">{dateLabel(day)}</div>}
      {mode.startsWith("confirm-")&&<div className="organizer-date">清空{mode==="confirm-contacts"?"所有联系人":"日历与待办"}？</div>}
      <div className="organizer-list" ref={scroll} role="list" aria-label={page==="contacts"?"联系人":"日历项目"}>
        {rows.length?rows.map((row,i)=><div className={`organizer-row ${i===index?"selected":""} ${row.detail?"has-detail":""}`} ref={i===index?selected:undefined} key={`${row.label}:${i}`} role="listitem" aria-current={i===index?"true":undefined} aria-disabled={row.disabled||undefined}>
          <div><strong><MarqueeText text={row.label} active={i===index}/></strong>{row.detail&&<small>{row.detail}</small>}</div>{row.value?<span>{row.value}</span>:<i aria-hidden="true">›</i>}
        </div>):<div className="organizer-empty">{mode==="day"?"当天没有日程":mode==="todos"?"没有待办事项":"没有联系人"}{page==="contacts"&&<p>{system?"请检查系统通讯录及允许访问的联系人范围。":"在ReiPod设置的“日历与通讯录”中导入。"}</p>}</div>}
      </div>
    </>}
  </div>;
}
