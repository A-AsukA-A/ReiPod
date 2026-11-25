import { expect,test } from "vitest";
import { advanceAlarms,alarmSchedules,emptyAlarms,freshAlarm,nextAlarm,parseAlarms,timerRemaining } from "./classicAlarms";
const id="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
test("weekday alarms use local dates, fire once per occurrence and expire stale one-off alarms",()=>{
 const friday=new Date(2026,10,13,8).getTime(),alarm={...freshAlarm(id,friday),repeat:"weekdays" as const,minute:420};
 expect(new Date(nextAlarm(alarm,friday)!)).toEqual(new Date(2026,10,16,7));
 expect(advanceAlarms({...emptyAlarms(id),alarms:[{...alarm,lastFired:friday}]},friday).alerts).toHaveLength(0);
 const at=new Date(2026,10,16,7).getTime(),state={...emptyAlarms(id),alarms:[alarm]};
 const fired=advanceAlarms(state,at+1);expect(fired.alerts).toHaveLength(1);expect(advanceAlarms(fired,at+500)).toBe(fired);
 expect(alarmSchedules(fired,at+500)[0].at).toBe(new Date(2026,10,17,7).getTime());
 const stale={...alarm,repeat:"once" as const,day:"2026-11-10"};
 expect(advanceAlarms({...state,alarms:[stale]},friday)).toMatchObject({alarms:[{enabled:false}],alerts:[]});
});
test("timer restores a real deadline, pauses without drift and persists only bounded valid settings",()=>{
 const start=Date.now(),state=emptyAlarms(id);state.timer={...state.timer,duration:5,remaining:5000,deadline:start+5000};
 expect(timerRemaining(state,start+1500)).toBe(3500);
 const restored=parseAlarms(JSON.parse(JSON.stringify(state)),id),done=advanceAlarms(restored,start+6000);
 expect(done.timer).toMatchObject({deadline:null,remaining:0});expect(done.alerts).toHaveLength(1);expect(advanceAlarms(done,start+7000)).toBe(done);
 expect(parseAlarms({...state,timer:{...state.timer,duration:Infinity}},id).timer.deadline).toBe(null);
});
