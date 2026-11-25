import { useCallback,useEffect,useRef,useState } from "react";
import { dayDate,dateKey,shiftDay } from "../models/organizerCalendar";
import type { OrganizerEvent,OrganizerTodo } from "../models/organizerCalendar";
import type { OrganizerContact } from "../models/organizerContacts";
import { emptyPermissions,nativeOrganizerAvailable,nativeOrganizerRequest,readableOrganizer } from "../services/nativeOrganizer";
import type { OrganizerPermissions,OrganizerResource } from "../services/nativeOrganizer";
type Snapshot={permissions:OrganizerPermissions;calendars:{id:string;title:string}[];events:OrganizerEvent[];todos:OrganizerTodo[];contacts:OrganizerContact[];contact?:OrganizerContact;loading:boolean;error?:string;nextOffset?:number;revision?:number;truncated?:boolean};
const empty=():Snapshot=>({permissions:emptyPermissions(),calendars:[],events:[],todos:[],contacts:[],loading:false});
/** System records are session-only: no storage writes, no merge into imported copies. */
export function useNativeOrganizer(resource:OrganizerResource,day:string,enabled:boolean){
  const available=nativeOrganizerAvailable(),[state,setState]=useState<Snapshot>(empty),[refresh,setRefresh]=useState(0),[epoch,setEpoch]=useState(0),[visible,setVisible]=useState(()=>document.visibilityState==="visible"),generation=useRef(0),pendingMore=useRef(false);
  const month=dayDate(day),first=dateKey(new Date(month.getFullYear(),month.getMonth(),1,12)),start=shiftDay(first,-dayDate(first).getDay()),end=shiftDay(start,42);
  const reload=useCallback(()=>setRefresh(x=>x+1),[]);
  useEffect(()=>{
    if(!available)return;
    const changed=()=>{generation.current++;pendingMore.current=false;setState(empty());setEpoch(x=>x+1);if(document.visibilityState==="visible")reload();};
    const visibility=()=>{setVisible(document.visibilityState==="visible");changed();};
    window.addEventListener("reipod-native-organizer",changed);document.addEventListener("visibilitychange",visibility);
    return()=>{window.removeEventListener("reipod-native-organizer",changed);document.removeEventListener("visibilitychange",visibility);generation.current++;};
  },[available,reload]);
  useEffect(()=>{
    if(!available||!visible)return;
    const token=++generation.current,current=()=>token===generation.current;pendingMore.current=false;
    setState({...empty(),loading:enabled});
    void(async()=>{
      let status=await nativeOrganizerRequest("status");
      if(!current())return;
      if(enabled&&["notDetermined","writeOnly"].includes(status.authorization[resource]))status=await nativeOrganizerRequest("authorize",{resource});
      if(!current())return;
      if(!enabled||!readableOrganizer(status.authorization[resource])){setState({...empty(),permissions:status.authorization,revision:status.revision});return;}
      const result:Snapshot={...empty(),permissions:status.authorization,revision:status.revision};
      let offset:number|undefined=0;
      do{
        const requestedOffset=offset;
        const reply=await nativeOrganizerRequest(resource==="calendars"?"events":resource,{start,end,offset,limit:100});
        if(!current())return;
        if(reply.revision!==status.revision||!readableOrganizer(reply.authorization[resource]))throw Error("系统资料或权限已改变，请刷新重试");
        if(reply.calendars)result.calendars=reply.calendars;
        result.events.push(...reply.events??[]);result.todos.push(...reply.todos??[]);result.contacts.push(...reply.contacts??[]);
        result.permissions=reply.authorization;result.truncated=reply.truncated;offset=reply.nextOffset;
        if(offset!==undefined&&offset<=requestedOffset)throw Error("系统分页未能继续");
        if(resource==="contacts"){result.nextOffset=offset;break;}
        if(result.events.length+result.todos.length>=10000){result.truncated=offset!==undefined||reply.truncated;break;}
      }while(offset!==undefined);
      if(current())setState(result);
    })().catch(error=>{if(current())setState({...empty(),error:String(error)});});
    return()=>{generation.current++;};
  },[available,visible,enabled,resource,start,end,refresh]);
  const loadMore=async()=>{
    if(state.nextOffset===undefined||pendingMore.current||state.loading)return;
    const token=generation.current;pendingMore.current=true;setState(value=>({...value,loading:true}));
    try{
      const reply=await nativeOrganizerRequest("contacts",{offset:state.nextOffset,limit:100});
      if(token!==generation.current)return;
      if(reply.revision!==state.revision||!readableOrganizer(reply.authorization.contacts))throw Error("通讯录权限或资料已改变，请刷新");
      if(reply.nextOffset!==undefined&&reply.nextOffset<=state.nextOffset)throw Error("联系人分页未能继续");
      setState(value=>({...value,permissions:reply.authorization,contacts:[...value.contacts,...reply.contacts??[]],nextOffset:reply.nextOffset,loading:false}));
    }catch(error){if(token===generation.current)setState({...empty(),error:String(error)});}
    finally{if(token===generation.current)pendingMore.current=false;}
  };
  const loadContact=useCallback(async(id:string)=>{
    const token=generation.current;
    try{const reply=await nativeOrganizerRequest("contact",{id});if(token!==generation.current)return;
      if(!readableOrganizer(reply.authorization.contacts))throw Error("通讯录权限已改变");
      setState(value=>reply.revision===value.revision?{...value,contact:reply.contact}:{...empty(),error:"系统资料已改变，请刷新"});
    }catch(error){if(token===generation.current)setState({...empty(),error:String(error)});}
  },[]);
  const manage=async(action:"authorize"|"refresh"|"openSettings",resource?:OrganizerResource)=>{await nativeOrganizerRequest(action,{resource});reload();};
  return{available,...state,epoch,resource,loadMore,loadContact,manage,reload,visible};
}
