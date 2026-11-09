import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ClassicClock } from "./ClassicClock";
import { clockCity, formatStopwatch, lapDurations, stopwatchElapsed } from "../models/classicExtras";
import type { StopwatchSession } from "../models/classicExtras";
import "./classic-extras.css";
function useNow(interval: number) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const update = () => { if (!document.hidden) setNow(Date.now()); };
    const timer = setInterval(update, interval);
    document.addEventListener("visibilitychange", update);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", update); };
  }, [interval]);
  return now;
}
export function ClassicClocksScreen({ clocks, selected }: { clocks: string[]; selected?: string }) {
  const now = useNow(1000), focus = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const row = focus.current, parent = row?.parentElement;
    if (!row || !parent) return;
    if (row.offsetTop < parent.scrollTop) parent.scrollTop = row.offsetTop;
    else if (row.offsetTop + row.offsetHeight > parent.scrollTop + parent.clientHeight)
      parent.scrollTop = row.offsetTop + row.offsetHeight - parent.clientHeight;
  }, [selected, clocks]);
  return <div className="classic-clocks" role="list" aria-label="世界时钟">
    {clocks.map(id => { const city = clockCity(id); return <div className="world-clock" key={id} role="listitem" aria-current={selected === id ? "true" : undefined} ref={selected === id ? focus : undefined}>
      <ClassicClock now={now} zone={city.zone} />
      <div><strong>{city.name}</strong><time>{new Intl.DateTimeFormat("zh-CN", { timeZone: city.zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now)}</time>
        <span>{new Intl.DateTimeFormat("zh-CN", { timeZone: city.zone, month: "long", day: "numeric", weekday: "short" }).format(now)}</span></div>
    </div>; })}
  </div>;
}
export function ClassicStopwatchScreen({ session, children, log = false }: { session: StopwatchSession; children?: ReactNode; log?: boolean }) {
  const now = useNow(session.started === null ? 1000 : 40);
  const elapsed = stopwatchElapsed(session, now), text = formatStopwatch(elapsed), laps = lapDurations(session);
  return <section className={`classic-stopwatch ${log ? "stopwatch-record" : ""}`} aria-label={log ? "秒表记录" : "秒表计时"}>
    {log && <div className="stopwatch-date">{new Date(session.date).toLocaleString("zh-CN", { hour12: false })}</div>}
    <strong className="stopwatch-time" style={{ fontSize: `calc(var(--lcd-unit) * ${log ? 26 : Math.min(36, 280 / (text.length * .62))})` }} aria-label={`总用时 ${text}`}>{text}</strong>
    {log && laps.length > 0 && <dl className="stopwatch-statistics">
      {[["最快", Math.min(...laps)], ["最慢", Math.max(...laps)], ["平均", laps.reduce((a,b) => a+b, 0) / laps.length]].map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{formatStopwatch(Number(value))}</dd></div>)}
    </dl>}
    <ol className="stopwatch-laps" aria-label="分段记录">
      {laps.slice(-3).map((value, i) => <li key={laps.length - Math.min(3, laps.length) + i}><span>{String(laps.length - Math.min(3, laps.length) + i + 1).padStart(2, "0")}</span><time>{formatStopwatch(value)}</time></li>)}
    </ol>
    {children && <nav className="stopwatch-actions">{children}</nav>}
  </section>;
}
