/** Classic alarm fields follow Apple classic120GB guide p50; timer limits/labels are adaptations. */
export type AlarmRepeat="once"|"daily"|"weekdays"|"weekends"|"weekly";
export type AlarmSound="beep"|{playlistId:string;playlistName:string};
export type ClassicAlarm={id:string;label:string;day:string;minute:number;repeat:AlarmRepeat;enabled:boolean;lastFired:number;sound?:AlarmSound};
export type AlarmNotice={id:string;label:string;at:number;kind:"alarm"|"timer";playlistId?:string};
export type AlarmState={alarms:ClassicAlarm[];timer:{id:string;duration:number;remaining:number;deadline:number|null};sleepAt:number|null;alerts:AlarmNotice[]};
export const alarmLabels=["起床","约会","提醒","练习","出发"];
export const alarmRepeats:Record<AlarmRepeat,string>={once:"一次",daily:"每天",weekdays:"工作日",weekends:"周末",weekly:"每周"};
export const alarmDay=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
const validDay=(day:string)=>/^\d{4}-\d{2}-\d{2}$/.test(day)&&day>="1900-01-01"&&day<="2199-12-31"&&alarmDay(new Date(`${day}T12:00:00`))===day;
export const validAlarmId=(id:unknown):id is string=>typeof id==="string"&&/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id);
export const validAlarmSound=(sound:unknown):sound is AlarmSound|undefined=>sound===undefined||sound==="beep"||!!sound&&typeof sound==="object"&&typeof (sound as {playlistId?:unknown}).playlistId==="string"&&(sound as {playlistId:string}).playlistId.trim().length>0&&(sound as {playlistId:string}).playlistId.length<=80&&typeof (sound as {playlistName?:unknown}).playlistName==="string"&&(sound as {playlistName:string}).playlistName.trim().length>0&&(sound as {playlistName:string}).playlistName.length<=60;
export const alarmPlaylistId=(sound?:AlarmSound)=>sound&&sound!=="beep"?sound.playlistId:undefined;
export const alarmSoundLabel=(sound:AlarmSound|undefined,defaultBeep:string,playlists:readonly {id:string;name:string}[]=[])=>{
 if(!sound||sound==="beep")return defaultBeep;
 return playlists.find(item=>item.id===sound.playlistId)?.name??sound.playlistName;
};
export function freshAlarm(id:string,now:number):ClassicAlarm{
 const date=new Date(now);date.setHours(7,0,0,0);if(date.getTime()<=now)date.setDate(date.getDate()+1);
 return{id,label:"起床",day:alarmDay(date),minute:420,repeat:"once",enabled:true,lastFired:0,sound:"beep"};
}
export const alarmTime=(minute:number)=>`${String(Math.floor(minute/60)).padStart(2,"0")}:${String(minute%60).padStart(2,"0")}`;
export function alarmWeekdays(alarm:ClassicAlarm):number[]{
 return alarm.repeat==="daily"?[0,1,2,3,4,5,6]:alarm.repeat==="weekdays"?[1,2,3,4,5]:alarm.repeat==="weekends"?[0,6]:alarm.repeat==="weekly"?[new Date(`${alarm.day}T12:00:00`).getDay()]:[];
}
export function nextAlarm(alarm:ClassicAlarm,after:number):number|null{
 if(!alarm.enabled)return null;
 if(alarm.repeat==="once"){const date=new Date(`${alarm.day}T00:00:00`);date.setHours(Math.floor(alarm.minute/60),alarm.minute%60,0,0);return date.getTime()>Math.max(after,alarm.lastFired)?date.getTime():null;}
 const days=alarmWeekdays(alarm),start=new Date(after);start.setHours(0,0,0,0);
 for(let offset=0;offset<15;offset++){const candidate=new Date(start);candidate.setDate(candidate.getDate()+offset);candidate.setHours(Math.floor(alarm.minute/60),alarm.minute%60,0,0);if(days.includes(candidate.getDay())&&candidate.getTime()>Math.max(after,alarm.lastFired))return candidate.getTime();}
 return null;
}
export const timerRemaining=(state:AlarmState,now:number)=>state.timer.deadline===null?state.timer.remaining:Math.max(0,state.timer.deadline-now);
export function formatCountdown(ms:number){const total=Math.ceil(Math.max(0,ms)/1000);return`${String(Math.floor(total/3600)).padStart(2,"0")}:${String(Math.floor(total/60)%60).padStart(2,"0")}:${String(total%60).padStart(2,"0")}`;}
export function emptyAlarms(timerId:string):AlarmState{return{alarms:[],timer:{id:timerId,duration:300,remaining:300000,deadline:null},sleepAt:null,alerts:[]};}
export function parseAlarms(value:unknown,timerId:string):AlarmState{
 const fallback=emptyAlarms(timerId);if(!value||typeof value!=="object")return fallback;
 const x=value as AlarmState,finite=(n:unknown):n is number=>typeof n==="number"&&Number.isFinite(n)&&n>=0&&n<=Number.MAX_SAFE_INTEGER;
 const alarms=Array.isArray(x.alarms)?x.alarms.filter(a=>a&&validAlarmId(a.id)&&typeof a.label==="string"&&a.label.length<=40&&validDay(a.day)&&Number.isInteger(a.minute)&&a.minute>=0&&a.minute<1440&&Object.hasOwn(alarmRepeats,a.repeat)&&typeof a.enabled==="boolean"&&finite(a.lastFired)&&validAlarmSound(a.sound)).slice(0,8):[];
 const t=x.timer,validTimer=t&&validAlarmId(t.id)&&Number.isInteger(t.duration)&&t.duration>=1&&t.duration<=86399&&finite(t.remaining)&&t.remaining<=86399000&&(t.deadline===null||finite(t.deadline));
 return{alarms:[...new Map(alarms.map(a=>[a.id,{...a,sound:a.sound&&a.sound!=="beep"?{playlistId:a.sound.playlistId.trim(),playlistName:a.sound.playlistName.trim()}:("beep" as const)}])).values()],timer:validTimer?{id:t.id,duration:t.duration,remaining:t.remaining,deadline:t.deadline}:fallback.timer,sleepAt:x.sleepAt===null||finite(x.sleepAt)?x.sleepAt:null,
 alerts:Array.isArray(x.alerts)?x.alerts.filter(a=>a&&validAlarmId(a.id)&&typeof a.label==="string"&&a.label.length<=40&&finite(a.at)&&["alarm","timer"].includes(a.kind)&&(a.playlistId===undefined||typeof a.playlistId==="string"&&a.playlistId.trim().length>0&&a.playlistId.length<=80)).slice(0,9).map(a=>({id:a.id,label:a.label,at:a.at,kind:a.kind,...(a.playlistId?{playlistId:a.playlistId.trim()}:{})})) :[]};
}
export function advanceAlarms(state:AlarmState,now:number):AlarmState{
 let changed=false;const alerts=[...state.alerts],alarms=state.alarms.map(alarm=>{
  if(!alarm.enabled)return alarm;
  if(alarm.repeat==="once"&&nextAlarm(alarm,now-86400000)===null){changed=true;return{...alarm,enabled:false};}
  // Search from the last acknowledged occurrence; only alert for the latest day after a long absence.
  const lookback=Math.max(alarm.lastFired,now-86400000),due=nextAlarm({...alarm,lastFired:alarm.lastFired},lookback-1);
  if(due===null||due>now||due<=alarm.lastFired)return alarm;
  const playlistId=alarmPlaylistId(alarm.sound);
  changed=true;if(!alerts.some(a=>a.id===alarm.id))alerts.push({id:alarm.id,label:alarm.label,at:due,kind:"alarm",...(playlistId?{playlistId}:{})});
  return{...alarm,lastFired:due,enabled:alarm.repeat!=="once"};
 });
 let timer=state.timer;if(timer.deadline!==null&&timer.deadline<=now){changed=true;if(!alerts.some(a=>a.id===timer.id))alerts.push({id:timer.id,label:"倒计时结束",at:timer.deadline,kind:"timer"});timer={...timer,remaining:0,deadline:null};}
 return changed?{...state,alarms,timer,alerts:alerts.slice(0,9)}:state;
}
export type AlarmSchedule={id:string;label:string;at:number;minute:number;weekdays:number[]};
export function alarmSchedules(state:AlarmState,now:number):AlarmSchedule[]{
 const records=state.alarms.flatMap(a=>{const at=nextAlarm(a,now);return at===null?[]:[{id:a.id,label:a.label,at,minute:a.minute,weekdays:alarmWeekdays(a)}];});
 if(state.timer.deadline!==null&&state.timer.deadline>now)records.push({id:state.timer.id,label:"倒计时结束",at:state.timer.deadline,minute:0,weekdays:[]});
 return records;
}
