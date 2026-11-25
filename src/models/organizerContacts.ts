import { contentLines, identity, plainText, splitText } from "./organizerText";
export type ContactField = { label: string; value: string };
export type OrganizerContact = { id: string; name: string; first: string; last: string; company: string; fields: ContactField[]; photo?: string };
const labels: Record<string, string> = { CELL: "手机", HOME: "住宅", WORK: "工作", FAX: "传真", PAGER: "传呼", MAIN: "主要", OTHER: "其他" };
export function parseContacts(text: string): { contacts: OrganizerContact[]; skipped: number } {
  const contacts: OrganizerContact[] = []; let lines: ReturnType<typeof contentLines> | null = null, skipped = 0;
  for (const line of contentLines(text)) {
    if (line.name === "BEGIN" && line.value.toUpperCase() === "VCARD") { lines = []; continue; }
    if (line.name !== "END" || line.value.toUpperCase() !== "VCARD") { lines?.push(line); continue; }
    if (!lines) continue;
    if (lines.some(item => /QUOTED-PRINTABLE/i.test(item.params.ENCODING ?? "") || item.params.CHARSET && !/^UTF-?8$/i.test(item.params.CHARSET))) { skipped++; lines = null; continue; }
    const get = (name: string) => plainText(lines!.find(item => item.name === name)?.value ?? "");
    const names = splitText(lines.find(item => item.name === "N")?.value ?? "");
    const company = get("ORG").replace(/;/g, " · "), name = get("FN") || [names[3], names[1], names[2], names[0], names[4]].filter(Boolean).join(" ") || company;
    if (!name) { skipped++; lines = null; continue; }
    const fields: ContactField[] = [];
    for (const item of lines) {
      const type = (item.params.TYPE ?? "").toUpperCase().split(",").map(x => labels[x]).filter(Boolean).join(" · ");
      let value = plainText(item.value);
      if (item.name === "TEL") { value = value.replace(/^tel:/i, ""); fields.push({ label: type || "电话", value }); }
      if (item.name === "EMAIL") fields.push({ label: type ? `${type}邮箱` : "电子邮件", value: value.replace(/^mailto:/i, "") });
      if (item.name === "ADR") fields.push({ label: type ? `${type}地址` : "地址", value: splitText(item.value).filter(Boolean).join("\n") });
      if (["TITLE", "URL", "BDAY", "NOTE"].includes(item.name)) fields.push({ label: ({ TITLE: "职位", URL: "网址", BDAY: "生日", NOTE: "备注" })[item.name]!, value });
    }
    const picture = lines.find(item => item.name === "PHOTO"), photo = picture && /^data:image\/(jpeg|png);base64,[a-z\d+/=\s]+$/i.test(picture.value) ? picture.value
      : picture && /^(b|base64)$/i.test(picture.params.ENCODING ?? "") && /^(jpeg|jpg|png)$/i.test(picture.params.TYPE ?? "")
        ? `data:image/${picture.params.TYPE.toLowerCase() === "png" ? "png" : "jpeg"};base64,${picture.value}` : undefined;
    contacts.push({ id: get("UID") || identity([name, company, ...fields.map(field => field.value)].join("|")), name: name.slice(0, 500), first: names[1] || name, last: names[0] || name,
      company: company.slice(0, 500), fields: fields.filter(field => field.value).slice(0, 40), ...(photo && photo.length <= 180000 ? { photo } : {}) });
    lines = null;
  }
  if (lines) skipped++;
  return { contacts, skipped };
}
export function validContact(value: unknown): value is OrganizerContact {
  if (!value || typeof value !== "object") return false;
  const c = value as OrganizerContact;
  return [c.id, c.name, c.first, c.last, c.company].every(x => typeof x === "string" && x.length <= 12000) && !!c.id && !!c.name &&
    Array.isArray(c.fields) && c.fields.length <= 40 && c.fields.every(field => field && typeof field.label === "string" && typeof field.value === "string" && field.value.length <= 12000) &&
    (c.photo === undefined || typeof c.photo === "string" && c.photo.length <= 180000 && /^data:image\/(jpeg|png);base64,[a-z\d+/=\s]+$/i.test(c.photo));
}
