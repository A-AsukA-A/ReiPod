import type { AlarmState, AlarmToneId } from "../models/classicAlarms";
import { alarmSchedules } from "../models/classicAlarms";
export type AlarmHostState={engine:"alarmkit"|"notifications"|"foreground";authorization:"authorized"|"denied"|"notDetermined";acknowledged?:Record<string,number>};
type Host={__REIPOD_NATIVE_ALARMS_VERSION__?:number;webkit?:{messageHandlers?:{reipodAlarms?:{postMessage:(request:unknown)=>Promise<AlarmHostState>}}}};
export const nativeAlarmsAvailable=()=>(window as unknown as Host).__REIPOD_NATIVE_ALARMS_VERSION__===1;
export async function alarmHost(action:"status"|"authorize"|"replace"|"openSettings",state?:AlarmState):Promise<AlarmHostState>{
 const bridge=(window as unknown as Host).webkit?.messageHandlers?.reipodAlarms;
 if(!nativeAlarmsAvailable()||!bridge)return{engine:"foreground",authorization:"authorized"};
 const reply=await bridge.postMessage({version:1,action,...(state?{records:alarmSchedules(state,Date.now()),retain:state.alerts.map(a=>a.id)}:{})});
 if(!reply||!["alarmkit","notifications"].includes(reply.engine)||!["authorized","denied","notDetermined"].includes(reply.authorization))throw Error("系统闹钟状态无效");
 return reply;
}
export function createAlarmChime(){
 let context:AudioContext|undefined,timer:ReturnType<typeof setInterval>|undefined;
 const unlock=()=>{context??=new AudioContext();void context.resume().catch(()=>{});};
 const note=(freq:number,offset:number,duration:number,type:OscillatorType="sine")=>{
  if(!context||context.state!=="running")return;
  const start=context.currentTime+offset,oscillator=context.createOscillator(),gain=context.createGain();
  oscillator.type=type;oscillator.frequency.value=freq;
  gain.gain.setValueAtTime(0.001,start);gain.gain.exponentialRampToValueAtTime(.12,start+.02);gain.gain.exponentialRampToValueAtTime(.001,start+duration);
  oscillator.connect(gain);gain.connect(context.destination);oscillator.start(start);oscillator.stop(start+duration+.02);
 };
 const play=(tone:AlarmToneId="beep")=>{
  if(tone==="chime"){note(1046.5,0,.22,"triangle");note(1318.5,.16,.34,"triangle");return;}
  if(tone==="double"){note(988,0,.14);note(988,.18,.14);return;}
  if(tone==="pulse"){note(784,0,.11);note(988,.13,.11);note(1175,.26,.16);return;}
  note(880,0,.3);
 };
 return{unlock,preview:(tone:AlarmToneId="beep")=>{unlock();play(tone);},start:(tone:AlarmToneId="beep")=>{if(timer)return;play(tone);timer=setInterval(()=>play(tone),1200);},stop:()=>{if(timer)clearInterval(timer);timer=undefined;},dispose:()=>{if(timer)clearInterval(timer);void context?.close();}};
}

export async function stopHostAlarm(id:string){
 const bridge=(window as unknown as Host).webkit?.messageHandlers?.reipodAlarms;
 if(nativeAlarmsAvailable()&&bridge)await bridge.postMessage({version:1,action:"stop",id});
}
