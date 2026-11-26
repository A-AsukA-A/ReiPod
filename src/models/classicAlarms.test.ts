import { expect,test } from "vitest";
import { advanceAlarms,alarmPlaylistId,alarmSchedules,alarmSoundLabel,alarmToneOptions,emptyAlarms,freshAlarm,nextAlarm,parseAlarms,timerRemaining } from "./classicAlarms";
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
test("alarm sound persists beep or local playlist selection, defaults legacy alarms to beep and carries playlistId when due",()=>{
 const friday=new Date(2026,10,13,6).getTime(),at=new Date(2026,10,13,7).getTime();
 const legacy={...freshAlarm(id,friday)};delete legacy.sound;
 const parsedLegacy=parseAlarms({alarms:[legacy],timer:emptyAlarms(id).timer,sleepAt:null,alerts:[]},id);
 expect(parsedLegacy.alarms[0].sound).toBe("beep");
 expect(alarmSoundLabel(parsedLegacy.alarms[0].sound,"蜂鸣",[])).toBe("蜂鸣");
 const withPlaylist={...freshAlarm(id,friday),sound:{playlistId:" pl-morning ",playlistName:" 晨间歌单 "}};
 const parsedPlaylist=parseAlarms({alarms:[withPlaylist],timer:emptyAlarms(id).timer,sleepAt:null,alerts:[]},id);
 expect(parsedPlaylist.alarms[0].sound).toEqual({playlistId:"pl-morning",playlistName:"晨间歌单"});
 expect(alarmPlaylistId(parsedPlaylist.alarms[0].sound)).toBe("pl-morning");
 expect(alarmSoundLabel(parsedPlaylist.alarms[0].sound,"蜂鸣",[{id:"pl-morning",name:"重命名晨歌"}])).toBe("重命名晨歌");
 expect(alarmSoundLabel(parsedPlaylist.alarms[0].sound,"蜂鸣",[])).toBe("晨间歌单");
 const fired=advanceAlarms(parsedPlaylist,at+1);
 expect(fired.alerts[0]).toMatchObject({id,kind:"alarm",playlistId:"pl-morning"});
 expect(parseAlarms({alarms:[{...withPlaylist,sound:{playlistId:"",playlistName:"无效"}}],timer:emptyAlarms(id).timer,sleepAt:null,alerts:[]},id).alarms).toHaveLength(0);
});

test("alarm supports all built-in tone options, rejects unknown tones and carries tone into AlarmNotice",()=>{
 const friday=new Date(2026,10,13,6).getTime(),at=new Date(2026,10,13,7).getTime();
 for(const tone of alarmToneOptions){
  const alarm={...freshAlarm(id,friday),sound:tone.id};
  const parsed=parseAlarms({alarms:[alarm],timer:emptyAlarms(id).timer,sleepAt:null,alerts:[]},id);
  expect(parsed.alarms[0].sound).toBe(tone.id);
  expect(alarmSoundLabel(parsed.alarms[0].sound,"蜂鸣",[])).toBe(tone.label);
  const fired=advanceAlarms(parsed,at+1);
  expect(fired.alerts[0]).toMatchObject({id,kind:"alarm",tone:tone.id});
  expect(fired.alerts[0].playlistId).toBeUndefined();
 }
 expect(parseAlarms({alarms:[{...freshAlarm(id,friday),sound:"unknown-tone"}],timer:emptyAlarms(id).timer,sleepAt:null,alerts:[]},id).alarms).toHaveLength(0);
});
