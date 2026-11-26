import { useEffect,useImperativeHandle,useRef,useState,useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { Ref,RefObject } from "react";
import { advanceAlarms,alarmDay,alarmLabels,alarmPlaylistId,alarmRepeats,alarmSoundLabel,alarmTime,formatCountdown,freshAlarm,nextAlarm,timerRemaining } from "../models/classicAlarms";
import type { AlarmState,ClassicAlarm } from "../models/classicAlarms";
import { alarmsStore } from "../services/alarmsStore";
import { alarmHost,createAlarmChime,nativeAlarmsAvailable } from "../services/alarmHost";
import type { AlarmHostState } from "../services/alarmHost";
import type { AlarmInput,AlarmPageInput } from "./alarmInput";
import { MarqueeText } from "./MarqueeText";
import "./classic-alarms.css";
export type AlarmPlaylistOption={id:string;name:string;count:number};
const useAlarms=()=>useSyncExternalStore(alarmsStore.subscribe,alarmsStore.snapshot);
const message=(e:unknown)=>e instanceof Error?e.message:String(e);
export function AlarmRuntime({input,screenInput,onWake,onSleep,onRinging,onPlayPlaylist,notice}:{input:Ref<AlarmInput>;screenInput:RefObject<AlarmPageInput|null>;onWake:()=>void;onSleep:()=>void;onRinging:(value:boolean)=>void;onPlayPlaylist?:(playlistId:string)=>boolean;notice:(message:string)=>void}){
 const {state}=useAlarms(),[visible,setVisible]=useState(!document.hidden),[host,setHost]=useState<AlarmHostState>({engine:"foreground",authorization:"authorized"}),ready=useRef(false),checking=useRef(0),chime=useRef<ReturnType<typeof createAlarmChime>>(null),launched=useRef<{key:string;playing:boolean}>({key:"",playing:false});
 const live=useRef({onWake,onSleep,onRinging,onPlayPlaylist,notice,screenInput});live.current={onWake,onSleep,onRinging,onPlayPlaylist,notice,screenInput};
 useEffect(()=>{
  chime.current=createAlarmChime();
  const unlock=()=>{if(!nativeAlarmsAvailable())chime.current?.unlock();};
  const synchronize=async()=>{
   setVisible(!document.hidden);
   if(document.hidden){ready.current=false;checking.current++;chime.current?.stop();return;}
   const token=++checking.current;ready.current=false;
   try{
    const status=await alarmHost("status");if(token!==checking.current)return;setHost(status);
    let next=alarmsStore.snapshot().state;
    if(status.acknowledged){const ack=status.acknowledged;
     const alarms=next.alarms.map(a=>ack[a.id]>a.lastFired&&(a.repeat!=="once"||(nextAlarm(a,a.lastFired)??Infinity)<=ack[a.id])?{...a,lastFired:ack[a.id],enabled:a.repeat!=="once"}:a);
     const timer=ack[next.timer.id]&&next.timer.deadline!==null&&ack[next.timer.id]>=next.timer.deadline?{...next.timer,deadline:null,remaining:0}:next.timer;
     next={...next,alarms,timer,alerts:next.alerts.filter(a=>!(ack[a.id]>=a.at))};alarmsStore.commit(next);
    }
    next=advanceAlarms(next,Date.now());if(next!==alarmsStore.snapshot().state)alarmsStore.commit(next);
    if(status.authorization==="authorized")await alarmHost("replace",next);
   }catch(e){live.current.notice(message(e));}
   finally{if(token===checking.current)ready.current=true;}
  };
  const changed=()=>{void synchronize();};
  const tick=()=>{
   if(!ready.current||document.hidden)return;
   const current=alarmsStore.snapshot().state,now=Date.now(),next=advanceAlarms(current,now);
   if(next!==current){alarmsStore.commit(next);if(next.alerts.length>current.alerts.length)live.current.onWake();}
   if(next.sleepAt!==null&&next.sleepAt<=now){alarmsStore.commit({...next,sleepAt:null});live.current.onSleep();}
  };
  document.addEventListener("keydown",unlock);document.addEventListener("pointerdown",unlock);
  document.addEventListener("visibilitychange",changed);window.addEventListener("reipod-native-alarms",changed);
  const timer=setInterval(tick,250);void synchronize();
  return()=>{checking.current++;clearInterval(timer);document.removeEventListener("keydown",unlock);document.removeEventListener("pointerdown",unlock);document.removeEventListener("visibilitychange",changed);window.removeEventListener("reipod-native-alarms",changed);chime.current?.dispose();};
 },[]);
 const alert=state.alerts[0],alertKey=alert?`${alert.id}:${alert.at}:${alert.playlistId??""}`:"";
 useEffect(()=>{
  live.current.onRinging(!!alert);
  if(!alert){launched.current={key:"",playing:false};chime.current?.stop();return;}
  if(visible){
   if(launched.current.key!==alertKey){
    launched.current={key:alertKey,playing:!!alert.playlistId&&!!live.current.onPlayPlaylist?.(alert.playlistId)};
   }
   if(!launched.current.playing&&host.engine==="foreground")chime.current?.start();else chime.current?.stop();
   live.current.onWake();
  }else chime.current?.stop();
  return()=>chime.current?.stop();
 },[alertKey,host.engine,visible]);
 useImperativeHandle(input,()=>({get ringing(){return alarmsStore.snapshot().state.alerts.length>0;},rotate:steps=>{if(!alarmsStore.snapshot().state.alerts.length)live.current.screenInput.current?.rotate(steps);},command:value=>{
  const alert=alarmsStore.snapshot().state.alerts[0];
  if(alert){if(["select","menu","play"].includes(value))void alarmsStore.acknowledge(alert.id);return;}
  live.current.screenInput.current?.command(value);
 }}),[]);
 const target=alert?document.querySelector(".screen-viewport > .screen-content"):null;
 return alert&&target?createPortal(<div className="classic-alarm-alert" role="alert" aria-label={alert.kind==="timer"?"倒计时结束":"闹钟响铃"}>
  <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M12 45h40l-6-8V25a14 14 0 0 0-28 0v12ZM25 51a7 7 0 0 0 14 0M28 10v-3h8v3" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round"/></svg>
  <strong>{alert.label}</strong><time>{alarmTime(new Date(alert.at).getHours()*60+new Date(alert.at).getMinutes())}</time><span>停止</span>
 </div>,target):null;
}

type Page="alarms"|"countdown"|"sleep-timer"|"alarm-settings";
type Mode="root"|"edit"|"time"|"date"|"repeat"|"sound"|"label"|"delete"|"discard"|"duration";
export function ClassicAlarmsScreen({page,input,playlists=[],exit,open,notice}:{page:Page;input:Ref<AlarmPageInput>;playlists?:readonly AlarmPlaylistOption[];exit:()=>void;open:(page:Page)=>void;notice:(text:string)=>void}){
 const {state,saving,error}=useAlarms(),[mode,setMode]=useState<Mode>("root"),[index,setIndex]=useState(0),[draft,setDraft]=useState<ClassicAlarm|null>(null),[field,setField]=useState(0),[duration,setDuration]=useState(state.timer.duration),[now,setNow]=useState(Date.now),[host,setHost]=useState<AlarmHostState>({engine:"foreground",authorization:"authorized"});
 const initial=useRef(""),selected=useRef<HTMLDivElement>(null),list=useRef<HTMLDivElement>(null);
 useEffect(()=>{setMode("root");setIndex(0);void alarmHost("status").then(setHost).catch(e=>notice(message(e)));},[page,notice]);
 useEffect(()=>{const timer=setInterval(()=>{if(!document.hidden)setNow(Date.now());},250);return()=>clearInterval(timer);},[]);
 const enter=(mode:Mode)=>{setMode(mode);setIndex(0);setField(0);};
 const change=(reduce:(s:AlarmState)=>AlarmState,done?:()=>void,authorize=true)=>{void alarmsStore.change(reduce,authorize).then(()=>{done?.();}).catch(e=>notice(message(e)));};
 const edit=(alarm?:ClassicAlarm)=>{const value=alarm?{...alarm,sound:alarm.sound??"beep"}:freshAlarm(crypto.randomUUID(),Date.now());setDraft(value);initial.current=alarm?JSON.stringify({...alarm,sound:alarm.sound??"beep"}):"";enter("edit");};
 const save=()=>{if(!draft)return;if(draft.enabled&&nextAlarm(draft,Date.now())===null){notice("请选择将来的闹钟日期和时间");return;}const value={...draft,sound:draft.sound??"beep",lastFired:Date.now()};change(s=>({...s,alarms:[...s.alarms.filter(a=>a.id!==value.id),value],alerts:s.alerts.filter(a=>a.id!==value.id)}),()=>{enter("root");notice("闹钟已保存");});};
 const toggleTimer=()=>change(s=>{const remaining=timerRemaining(s,Date.now());return{...s,timer:s.timer.deadline===null?{...s.timer,remaining:remaining||s.timer.duration*1000,deadline:Date.now()+(remaining||s.timer.duration*1000)}:{...s.timer,remaining,deadline:null}};});
 const timerText=formatCountdown(timerRemaining(state,now)),dirty=!!draft&&JSON.stringify(draft)!==initial.current,beepLabel=host.engine==="foreground"?"蜂鸣":"系统默认",selectedPlaylistId=alarmPlaylistId(draft?.sound);
 const rows:{label:string;value?:string;detail?:string;disabled?:boolean;action:()=>void}[]=mode==="delete"?[
  {label:"取消",action:()=>enter("edit")},{label:"删除闹钟",action:()=>{if(draft)change(s=>({...s,alarms:s.alarms.filter(a=>a.id!==draft.id),alerts:s.alerts.filter(a=>a.id!==draft.id)}),()=>enter("root"),false);}},
 ]:mode==="discard"?[
  {label:"继续编辑",action:()=>enter("edit")},{label:"放弃更改",action:()=>enter("root")},
 ]:mode==="repeat"?Object.entries(alarmRepeats).map(([key,label])=>({label,value:draft?.repeat===key?"✓":undefined,action:()=>{setDraft(d=>d?{...d,repeat:key as ClassicAlarm["repeat"]}:d);enter("edit");}}))
 :mode==="sound"?[
  {label:beepLabel,value:!selectedPlaylistId?"✓":undefined,action:()=>{setDraft(d=>d?{...d,sound:"beep"}:d);enter("edit");}},
  ...playlists.map(item=>({label:item.name,value:selectedPlaylistId===item.id?"✓":`${item.count} 首`,action:()=>{setDraft(d=>d?{...d,sound:{playlistId:item.id,playlistName:item.name}}:d);enter("edit");}})),
 ]:mode==="label"?alarmLabels.map(label=>({label,value:draft?.label===label?"✓":undefined,action:()=>{setDraft(d=>d?{...d,label}:d);enter("edit");}}))
 :mode==="edit"&&draft?[
  {label:"闹钟",value:draft.enabled?"开启":"关闭",action:()=>setDraft(d=>d?{...d,enabled:!d.enabled}:d)},
  {label:"时间",value:alarmTime(draft.minute),action:()=>enter("time")},
  {label:"日期",value:draft.day,action:()=>enter("date")},
  {label:"重复",value:alarmRepeats[draft.repeat],action:()=>enter("repeat")},
  {label:"声音",value:alarmSoundLabel(draft.sound,beepLabel,playlists),action:()=>enter("sound")},
  {label:"标签",value:draft.label,action:()=>enter("label")},
  {label:saving?"正在保存…":"保存闹钟",action:save},
  ...(state.alarms.some(a=>a.id===draft.id)?[{label:"删除闹钟…",action:()=>enter("delete")}]:[]),
 ]:page==="sleep-timer"?[...[0,15,30,60,90,120].map(minutes=>({label:minutes?`${minutes} 分钟`:"关闭",action:()=>{alarmsStore.setSleep(minutes);notice(minutes?`将在${minutes}分钟后停止播放`:"睡眠定时已关闭");exit();}}))]
 :page==="countdown"?[
  {label:state.timer.deadline===null?timerRemaining(state,now)>0&&timerRemaining(state,now)<state.timer.duration*1000?"继续":"开始":"暂停",action:toggleTimer},
  {label:"重设",action:()=>change(s=>({...s,timer:{...s.timer,remaining:s.timer.duration*1000,deadline:null},alerts:s.alerts.filter(a=>a.id!==s.timer.id)}),undefined,false)},
  {label:"时长",value:formatCountdown(state.timer.duration*1000),action:()=>{setDuration(state.timer.duration);enter("duration");}},
 ]:page==="alarm-settings"?[
  {label:"后台提醒",value:host.engine==="alarmkit"?"系统闹钟":host.engine==="notifications"?"系统通知":"仅前台",action:()=>notice(host.engine==="foreground"?"网页关闭或进入后台后不保证提醒":host.engine==="notifications"?"旧系统通知受通知权限、静音与专注模式影响":"由iPhone系统调度，App进入后台后仍可提醒")},
  {label:"提醒权限",value:host.authorization==="authorized"?"已允许":host.authorization==="denied"?"未允许":"未授权",action:()=>{void alarmHost(host.authorization==="denied"?"openSettings":"authorize").then(setHost).catch(e=>notice(message(e)));}},
  {label:"睡眠定时",value:"App内停止",action:()=>notice("睡眠定时在App可运行时停止播放；系统挂起后会在返回时补执行")},
 ]:[
  {label:"创建闹钟",disabled:state.alarms.length>=8,action:()=>edit()},
  ...state.alarms.map(a=>({label:`${a.label} ${alarmTime(a.minute)}`,value:a.enabled?"开启":"关闭",action:()=>edit(a)})),
  {label:"睡眠定时",value:state.sleepAt?formatCountdown(state.sleepAt-now):"关闭",action:()=>open("sleep-timer")},
  {label:"倒计时",value:state.timer.deadline?timerText:undefined,action:()=>open("countdown")},
 ];
 useEffect(()=>{setIndex(i=>Math.max(0,Math.min(rows.length-1,i)));},[rows.length]);
 useEffect(()=>{const row=selected.current,parent=list.current;if(!row||!parent)return;if(row.offsetTop<parent.scrollTop)parent.scrollTop=row.offsetTop;else if(row.offsetTop+row.offsetHeight>parent.scrollTop+parent.clientHeight)parent.scrollTop=row.offsetTop+row.offsetHeight-parent.clientHeight;},[index,mode]);
 const back=()=>{if(mode==="root")exit();else if(mode==="edit"){if(dirty)enter("discard");else enter("root");}else if(mode==="duration")enter("root");else enter("edit");};
 const controls:AlarmPageInput={rotate:steps=>{
  if(saving)return;
  if(mode==="time"&&draft){const hour=Math.floor(draft.minute/60),minute=draft.minute%60;setDraft({...draft,minute:field===0?((hour+steps)%24+24)%24*60+minute:hour*60+((minute+steps)%60+60)%60});}
  else if(mode==="date"&&draft){const d=new Date(`${draft.day}T12:00:00`),year=Math.max(1900,Math.min(2199,d.getFullYear()+(field===0?steps:0))),month=field===1?((d.getMonth()+steps)%12+12)%12:d.getMonth(),day=field===2?Math.max(1,Math.min(new Date(year,month+1,0).getDate(),d.getDate()+steps)):Math.min(d.getDate(),new Date(year,month+1,0).getDate());setDraft({...draft,day:alarmDay(new Date(year,month,day,12))});}
  else if(mode==="duration"){const fields=[Math.floor(duration/3600),Math.floor(duration/60)%60,duration%60],max=field===0?24:60;fields[field]=((fields[field]+steps)%max+max)%max;setDuration(fields[0]*3600+fields[1]*60+fields[2]);}
  else setIndex(i=>Math.max(0,Math.min(rows.length-1,i+steps)));
 },command:command=>{
  if(saving)return;
  if(command==="menu"){back();return;}
  if(["time","date","duration"].includes(mode)){
   const fields=mode==="time"?2:3;
   if(command==="previous"||command==="next"){setField(x=>Math.max(0,Math.min(fields-1,x+(command==="next"?1:-1))));return;}
   if(command==="select"){
    if(field<fields-1){setField(x=>x+1);return;}
    if(mode==="duration"){if(!duration){notice("时长至少为一秒");return;}change(s=>({...s,timer:{...s.timer,duration,remaining:duration*1000,deadline:null},alerts:s.alerts.filter(a=>a.id!==s.timer.id)}),()=>enter("root"),false);}
    else enter("edit");
   }return;
  }
  if(command==="play"&&page==="countdown"){toggleTimer();return;}
  if(command==="select"&&!rows[index]?.disabled)rows[index]?.action();
 }};
 const live=useRef(controls);live.current=controls;useImperativeHandle(input,()=>({rotate:steps=>live.current.rotate(steps),command:value=>live.current.command(value)}),[]);
 const editing=["time","date","duration"].includes(mode),values=mode==="time"?alarmTime(draft?.minute??0).split(":"):mode==="date"?(draft?.day??alarmDay(new Date())).split("-"):formatCountdown(duration*1000).split(":"),labels=mode==="date"?["年","月","日"]:mode==="time"?["时","分"]:["时","分","秒"];
 return <div className="classic-alarms" data-alarm-page={page} data-alarm-mode={mode}>
  {editing?<section className="alarm-value-editor" aria-label={mode==="time"?"设置时间":mode==="date"?"设置日期":"设置时长"}>
   <div className="alarm-value-fields">{values.map((value,i)=><div className={field===i?"selected":""} key={i} aria-current={field===i?"true":undefined}><strong>{value}</strong><span>{labels[i]}</span></div>)}</div>
  </section>:<>
   {page==="countdown"&&<div className="countdown-display"><strong>{timerText}</strong><span>{state.timer.deadline?"计时中":timerRemaining(state,now)===0?"计时结束":timerRemaining(state,now)<state.timer.duration*1000?"已暂停":"倒计时"}</span></div>}
   {page==="sleep-timer"&&state.sleepAt&&<div className="alarm-context">{formatCountdown(state.sleepAt-now)} 后停止播放</div>}
   {mode==="delete"&&<div className="alarm-context">删除此闹钟？</div>}
   {mode==="discard"&&<div className="alarm-context">放弃未保存的更改？</div>}
   <div className="alarm-rows" ref={list} role="list" aria-label="闹钟选项">{rows.map((row,i)=><div className={`alarm-row ${i===index?"selected":""}`} key={`${row.label}:${i}`} ref={i===index?selected:undefined} role="listitem" aria-current={i===index?"true":undefined} aria-disabled={saving||row.disabled||undefined}><strong><MarqueeText text={row.label} active={i===index}/></strong>{row.value?<span>{row.value}</span>:<i aria-hidden="true">›</i>}</div>)}</div>
  </>}
  {error&&<div className="alarm-error" role="status">{error}</div>}
 </div>;
}
