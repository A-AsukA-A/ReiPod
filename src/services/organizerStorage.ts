import { validContact } from "../models/organizerContacts";
import type { OrganizerContact } from "../models/organizerContacts";
import { validEvent, validTodo } from "../models/organizerCalendar";
import type { OrganizerEvent, OrganizerTodo } from "../models/organizerCalendar";
export type OrganizerState = { contacts: OrganizerContact[]; events: OrganizerEvent[]; todos: OrganizerTodo[]; sort: "first" | "last" };
const key="reipod-organizer-v1",limit=2000000;
export const emptyOrganizer=():OrganizerState=>({contacts:[],events:[],todos:[],sort:"last"});
export function readOrganizer():OrganizerState {
  try{
    const raw=localStorage.getItem(key);if(!raw||raw.length>limit)return emptyOrganizer();
    const x=JSON.parse(raw) as OrganizerState;
    if(!Array.isArray(x.contacts)||x.contacts.length>1500||!x.contacts.every(validContact)||!Array.isArray(x.events)||x.events.length>1500||!x.events.every(validEvent)||!Array.isArray(x.todos)||x.todos.length>1500||!x.todos.every(validTodo))return emptyOrganizer();
    return {...x,sort:x.sort==="first"?"first":"last"};
  }catch{return emptyOrganizer();}
}
export function writeOrganizer(state:OrganizerState){
  try{const raw=JSON.stringify(state);if(raw.length>limit)return false;localStorage.setItem(key,raw);return true;}catch{return false;}
}

export function readOrganizerSource(available:boolean){try{return available&&localStorage.getItem("reipod-organizer-source-v1")!=="local";}catch{return available;}}
export function writeOrganizerSource(system:boolean){try{localStorage.setItem("reipod-organizer-source-v1",system?"system":"local");return true;}catch{return false;}}
