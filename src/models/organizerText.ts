/** Content-line subset shared by iCalendar and vCard; never interpreted as HTML or a URL to fetch. */
export type ContentLine = { name: string; params: Record<string, string>; value: string };
export function contentLines(text: string): ContentLine[] {
  return text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n[ \t]/g, "")
    .split("\n").flatMap(raw => {
      let colon=-1,quoted=false;
      for(let i=0;i<raw.length;i++){
        if(raw[i]==='"')quoted=!quoted;
        if(raw[i]===":"&&!quoted){colon=i;break;}
      }
      if (colon < 0) return [];
      const [name, ...parameters] = raw.slice(0, colon).split(/;(?=(?:[^"]*"[^"]*")*[^"]*$)/);
      return [{ name: name.split(".").at(-1)!.toUpperCase(), params: Object.fromEntries(parameters.map(parameter => {
        const equal = parameter.indexOf("=");
        return equal < 0 ? ["TYPE", parameter] : [parameter.slice(0, equal).toUpperCase(), parameter.slice(equal + 1).replace(/^"|"$/g, "")];
      })), value: raw.slice(colon + 1) }];
    });
}
export const plainText = (value: string) => value.replace(/\\([nN,;\\])/g, (_, char: string) => /n/i.test(char) ? "\n" : char).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").slice(0, 12000);
export function splitText(value: string): string[] {
  const parts=[""];
  for(let i=0;i<value.length;i++){
    if(value[i]==="\\"&&i+1<value.length){parts[parts.length-1]+=value[i]+value[++i];continue;}
    if(value[i]===";")parts.push("");else parts[parts.length-1]+=value[i];
  }
  return parts.map(plainText);
}
export function identity(value: string) {
  let hash = 2166136261;
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(36);
}
