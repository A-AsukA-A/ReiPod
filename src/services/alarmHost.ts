import type { AlarmState } from "../models/classicAlarms";
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
 const beep=()=>{if(!context||context.state!=="running")return;const oscillator=context.createOscillator(),gain=context.createGain();oscillator.frequency.value=880;gain.gain.setValueAtTime(0.001,context.currentTime);gain.gain.exponentialRampToValueAtTime(.12,context.currentTime+.02);gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+.3);oscillator.connect(gain);gain.connect(context.destination);oscillator.start();oscillator.stop(context.currentTime+.32);};
 return{unlock,start:()=>{if(timer)return;beep();timer=setInterval(beep,1200);},stop:()=>{if(timer)clearInterval(timer);timer=undefined;},dispose:()=>{if(timer)clearInterval(timer);void context?.close();}};
}

export async function stopHostAlarm(id:string){
 const bridge=(window as unknown as Host).webkit?.messageHandlers?.reipodAlarms;
 if(nativeAlarmsAvailable()&&bridge)await bridge.postMessage({version:1,action:"stop",id});
}
