/** Native file selection lives outside the LCD's DOM and React event boundary. */
export function createOrganizerFilePicker(onFiles:(files:File[],kind:"contacts"|"calendar")=>void){
  const input=document.createElement("input");input.type="file";input.multiple=true;input.className="sr-only";input.tabIndex=-1;
  input.setAttribute("aria-label","选择日历或联系人文件");let kind:"contacts"|"calendar"="calendar";
  input.onchange=()=>{if(!input.disabled)onFiles(Array.from(input.files??[]),kind);input.value="";};
  document.body.append(input);
  return {choose:(value:"contacts"|"calendar")=>{if(input.disabled)return;kind=value;input.accept=value==="contacts"?".vcf,text/vcard,text/x-vcard":".ics,.vcs,text/calendar";input.click();},
    setEnabled:(enabled:boolean)=>{input.disabled=!enabled;},dispose:()=>{input.onchange=null;input.remove();}};
}
