import type { WheelCommand } from "../input/ClickWheel";
export type AlarmPageInput={rotate:(steps:number)=>void;command:(command:WheelCommand)=>void};
export type AlarmInput=AlarmPageInput&{readonly ringing:boolean};
