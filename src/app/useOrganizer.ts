import { useRef, useState } from "react";
import { readOrganizer, writeOrganizer, readOrganizerSource, writeOrganizerSource } from "../services/organizerStorage";
import type { OrganizerState } from "../services/organizerStorage";
import { parseContacts } from "../models/organizerContacts";
import { parseCalendar } from "../models/organizerCalendar";
export function useOrganizer(notice:(message:string)=>void,available=false){
  const [state,setState]=useState(readOrganizer),live=useRef(state),[busy,setBusy]=useState(false),pending=useRef(false);
  const [systemSource,setSystemSource]=useState(()=>readOrganizerSource(available));
  const source=(system:boolean)=>{setSystemSource(system);if(!writeOrganizerSource(system))notice("资料来源偏好未能保存");};
  live.current=state;
  const commit=(next:OrganizerState)=>{live.current=next;setState(next);if(!writeOrganizer(next))notice("资料未能保存，本次仍可查看");};
  const importFiles=async(files:File[],kind:"contacts"|"calendar")=>{
    if(pending.current||!files.length)return;pending.current=true;setBusy(true);
    let skipped=Math.max(0,files.length-32),added=0;const incoming=readOrganizer();
    // Merge against current stored state, never against a captured library/player snapshot.
    const contacts=new Map(incoming.contacts.map(x=>[x.id,x])),events=new Map(incoming.events.map(x=>[x.id,x])),todos=new Map(incoming.todos.map(x=>[x.id,x]));
    for(const file of files.slice(0,32)){
      try{
        if(file.size>2000000){skipped++;continue;}
        const text=await file.text();
        if(kind==="contacts"){
          const result=parseContacts(text);skipped+=result.skipped;
          for(const item of result.contacts){if(!contacts.has(item.id)&&contacts.size>=1500){skipped++;continue;}contacts.set(item.id,item);added++;}
          if(!result.contacts.length&&!result.skipped)skipped++;
        }else{
          const result=parseCalendar(text,file.name);skipped+=result.skipped;
          for(const item of result.events){if(!events.has(item.id)&&events.size>=1500){skipped++;continue;}events.set(item.id,item);added++;}
          for(const item of result.todos){if(!todos.has(item.id)&&todos.size>=1500){skipped++;continue;}todos.set(item.id,item);added++;}
          if(!result.events.length&&!result.todos.length&&!result.skipped)skipped++;
        }
      }catch{skipped++;}
    }
    const next={...live.current,contacts:[...contacts.values()],events:[...events.values()],todos:[...todos.values()]};
    live.current=next;setState(next);const saved=writeOrganizer(next);
    notice(`${saved?"已导入／更新":"本次载入"} ${added} 项${skipped?`，略过 ${skipped} 项不支持或无效内容`:""}${saved?"":"；未能保存"}`);
    if(added)source(false);
    pending.current=false;setBusy(false);
  };
  return {state,busy,importFiles,systemSource,source,sort:()=>commit({...live.current,sort:live.current.sort==="first"?"last":"first"}),
    clear:(kind:"contacts"|"calendar")=>commit(kind==="contacts"?{...live.current,contacts:[]}:{...live.current,events:[],todos:[]})};
}
