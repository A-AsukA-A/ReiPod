/** Authored analog face retained from ReiPod's original clock; geometry remains provisional. */
export function ClassicClock({ now, zone }: { now: number; zone: string }) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: zone, hourCycle: "h23", hour: "numeric", minute: "numeric", second: "numeric" }).formatToParts(now);
  const read = (name: string) => Number(parts.find(part => part.type === name)?.value ?? 0);
  const hour = read("hour"), minute = read("minute"), second = read("second");
  return <svg className="classic-clock-face" viewBox="0 0 120 120" aria-hidden="true">
    <circle cx="60" cy="60" r="56" fill="#f9fafb" stroke="#647887" strokeWidth="3" />
    {Array.from({ length: 12 }, (_, i) => <path key={i} d="M60 10v6" stroke="#3c4a54" strokeWidth="2" transform={`rotate(${i * 30} 60 60)`} />)}
    <path d="M60 60V31" stroke="#1d2932" strokeWidth="4" transform={`rotate(${hour % 12 * 30 + minute / 2} 60 60)`} />
    <path d="M60 60V19" stroke="#1d2932" strokeWidth="3" transform={`rotate(${minute * 6 + second / 10} 60 60)`} />
    <path d="M60 70V16" stroke="#cc3533" strokeWidth="1" transform={`rotate(${second * 6} 60 60)`} />
    <circle cx="60" cy="60" r="3" fill="#354853" />
  </svg>;
}
