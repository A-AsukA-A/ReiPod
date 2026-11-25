import { alarmSchedules,emptyAlarms,parseAlarms } from "../models/classicAlarms";
import type { AlarmState } from "../models/classicAlarms";
import { alarmHost,stopHostAlarm } from "./alarmHost";
const key="reipod-classic-alarms-v1";
function load(){try{const raw=localStorage.getItem(key);return raw&&raw.length<=50000?parseAlarms(JSON.parse(raw),crypto.randomUUID()):emptyAlarms(crypto.randomUUID());}catch{return emptyAlarms(crypto.randomUUID());}}
let state=load(),version=0,queue=Promise.resolve(),saving=false,error="";
const listeners=new Set<()=>void>();
let snapshot={state,saving,error};
function publish(){snapshot={state,saving,error};for(const listener of listeners)listener();}
function commit(next:AlarmState){state=next;version++;try{localStorage.setItem(key,JSON.stringify(next));}catch{error="闹钟设置未能保存，本次仍可使用";}publish();}
export const alarmsStore={snapshot:()=>snapshot,subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};},commit,
 change:(reduce:(current:AlarmState)=>AlarmState,authorize=true)=>{
  const operation=queue.then(async()=>{
   saving=true;error="";publish();
   try{
    const needsReminder=alarmSchedules(reduce(state),Date.now()).length>0;
    const host=await alarmHost(authorize&&needsReminder?"authorize":"status");
    for(let attempt=0;attempt<4;attempt++){
     const token=version,next=reduce(state);
     const records=alarmSchedules(next,Date.now()),previous=alarmSchedules(state,Date.now());
     const addsSchedule=records.some(r=>!previous.some(p=>p.id===r.id&&p.label===r.label&&p.minute===r.minute&&JSON.stringify(p.weekdays)===JSON.stringify(r.weekdays)&&(r.weekdays.length>0||p.at===r.at)));
     if(addsSchedule&&host.authorization!=="authorized")throw Error("请在系统设置中允许闹钟提醒");
     await alarmHost("replace",next);
     if(token!==version)continue;
     commit(next);return;
    }
    throw Error("计时状态已更新，请重试");
   }catch(e){error=String(e);publish();throw e;}finally{saving=false;publish();}
  });queue=operation.catch(()=>{});return operation;
 },
 setSleep:(minutes:number)=>commit({...state,sleepAt:minutes?Date.now()+minutes*60000:null}),
 acknowledge:async(id:string)=>{
  try{await stopHostAlarm(id);}catch(e){error=String(e);}
  commit({...state,alerts:state.alerts.filter(a=>a.id!==id)});
  try{await alarmHost("replace",state);}catch(e){error=String(e);publish();}
 },
 clearError:()=>{error="";publish();},
};
