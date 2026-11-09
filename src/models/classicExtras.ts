/** Classic extras behavior: Apple classic 120GB guide pp49–51.
 * City coverage, automatic IANA DST and bounded local persistence are ReiPod adaptations. */
export const clockRegions = [
  { id: "asia", name: "亚洲" }, { id: "europe", name: "欧洲" },
  { id: "america", name: "美洲" }, { id: "oceania", name: "大洋洲" }, { id: "africa", name: "非洲" },
] as const;
export const clockCities = [
  { id: "beijing", name: "北京", region: "asia", zone: "Asia/Shanghai" },
  { id: "hongkong", name: "香港", region: "asia", zone: "Asia/Hong_Kong" },
  { id: "tokyo", name: "东京", region: "asia", zone: "Asia/Tokyo" },
  { id: "singapore", name: "新加坡", region: "asia", zone: "Asia/Singapore" },
  { id: "dubai", name: "迪拜", region: "asia", zone: "Asia/Dubai" },
  { id: "kolkata", name: "加尔各答", region: "asia", zone: "Asia/Kolkata" },
  { id: "london", name: "伦敦", region: "europe", zone: "Europe/London" },
  { id: "paris", name: "巴黎", region: "europe", zone: "Europe/Paris" },
  { id: "berlin", name: "柏林", region: "europe", zone: "Europe/Berlin" },
  { id: "moscow", name: "莫斯科", region: "europe", zone: "Europe/Moscow" },
  { id: "newyork", name: "纽约", region: "america", zone: "America/New_York" },
  { id: "losangeles", name: "洛杉矶", region: "america", zone: "America/Los_Angeles" },
  { id: "chicago", name: "芝加哥", region: "america", zone: "America/Chicago" },
  { id: "vancouver", name: "温哥华", region: "america", zone: "America/Vancouver" },
  { id: "saopaulo", name: "圣保罗", region: "america", zone: "America/Sao_Paulo" },
  { id: "sydney", name: "悉尼", region: "oceania", zone: "Australia/Sydney" },
  { id: "auckland", name: "奥克兰", region: "oceania", zone: "Pacific/Auckland" },
  { id: "cairo", name: "开罗", region: "africa", zone: "Africa/Cairo" },
  { id: "johannesburg", name: "约翰内斯堡", region: "africa", zone: "Africa/Johannesburg" },
];
export function clockCity(id: string) {
  return clockCities.find(city => city.id === id) ?? {
    id: "local", name: "本地时间", zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}
export type StopwatchSession = { id: string; date: number; elapsed: number; started: number | null; laps: number[] };
export type ExtrasState = { clocks: string[]; current: StopwatchSession; logs: StopwatchSession[] };
export const freshStopwatch = (now: number): StopwatchSession => ({ id: String(now), date: now, elapsed: 0, started: null, laps: [] });
export const stopwatchElapsed = (session: StopwatchSession, now: number) =>
  session.elapsed + (session.started === null ? 0 : Math.max(0, now - session.started));
export function lapDurations(session: StopwatchSession) {
  return session.laps.map((value, i) => value - (session.laps[i - 1] ?? 0));
}
export function formatStopwatch(ms: number) {
  const total = Math.max(0, Math.floor(ms / 10));
  const seconds = Math.floor(total / 100), minutes = Math.floor(seconds / 60), hours = Math.floor(minutes / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${hours ? `${hours}:${pad(minutes % 60)}` : pad(minutes)}:${pad(seconds % 60)}.${pad(total % 100)}`;
}
export function parseExtras(value: unknown, now: number): ExtrasState {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= Number.MAX_SAFE_INTEGER;
  const session = (raw: unknown): StopwatchSession | null => {
    if (!raw || typeof raw !== "object") return null;
    const s = raw as Record<string, unknown>;
    if (typeof s.id !== "string" || !finite(s.date) || !finite(s.elapsed) || !(s.started === null || finite(s.started))) return null;
    const limit = s.elapsed + (s.started === null ? 0 : Math.max(0, now - s.started));
    let previous = 0;
    const laps = Array.isArray(s.laps) ? s.laps.filter((n): n is number => {
      if (!finite(n) || n < previous || n > limit) return false;
      previous = n; return true;
    }).slice(0, 1000) : [];
    return { id: s.id, date: s.date, elapsed: s.elapsed, started: s.started, laps };
  };
  const allowed = new Set(["local", ...clockCities.map(city => city.id)]);
  return {
    clocks: Array.isArray(input.clocks) ? [...new Set(input.clocks.filter((id): id is string => typeof id === "string" && allowed.has(id)))] : ["local"],
    current: session(input.current) ?? freshStopwatch(now),
    logs: Array.isArray(input.logs) ? input.logs.map(session).filter((s): s is StopwatchSession => !!s && s.started === null).slice(0, 50) : [],
  };
}
export type ExtrasAction = { type: "add-clock"; id: string } | { type: "remove-clock"; id: string } |
  { type: "toggle" | "pause" | "lap" | "new"; now: number } |
  { type: "delete-log"; id: string } | { type: "clear-logs" };
export function extrasReducer(state: ExtrasState, action: ExtrasAction): ExtrasState {
  if (action.type === "add-clock") return !clockCities.some(c => c.id === action.id) || state.clocks.includes(action.id) ? state : { ...state, clocks: [...state.clocks, action.id] };
  if (action.type === "remove-clock") return { ...state, clocks: state.clocks.filter(id => id !== action.id) };
  if (action.type === "delete-log") return { ...state, logs: state.logs.filter(log => log.id !== action.id) };
  if (action.type === "clear-logs") return { ...state, logs: [] };
  const current = state.current;
  const elapsed = stopwatchElapsed(current, action.now);
  if (action.type === "lap") return current.started === null || current.laps.length >= 1000 ? state :
    { ...state, current: { ...current, laps: [...current.laps, elapsed] } };
  if (action.type === "new") return { ...state, current: freshStopwatch(action.now),
    logs: elapsed > 0 ? [{ ...current, elapsed, started: null }, ...state.logs.filter(log => log.id !== current.id)].slice(0, 50) : state.logs };
  if (action.type === "pause" && current.started === null) return state;
  return { ...state, current: current.started === null ? { ...current, date: current.elapsed ? current.date : action.now, started: action.now } : { ...current, elapsed, started: null } };
}
