import { useId } from "react";

/** 2007 classic analog world-clock face with automatic Day (ivory) / Night (charcoal) dial. */
export function ClassicClock({ now, zone }: { now: number; zone: string }) {
  const id = useId().replace(/:/g, "");
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    hourCycle: "h23",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(now);
  const read = (name: string) =>
    Number(parts.find((part) => part.type === name)?.value ?? 0);
  const hour = read("hour");
  const minute = read("minute");
  const second = read("second");
  const isNight = hour < 6 || hour >= 18;
  const handFill = isNight ? "#f4f7fa" : "#181d22";
  const tickColor = isNight ? "#c8d0d8" : "#3a434d";

  return (
    <svg className="classic-clock-face" viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <linearGradient id={`wc-rim-${id}`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#c7ced5" />
          <stop offset="1" stopColor="#75808a" />
        </linearGradient>
        <radialGradient id={`wc-face-${id}`} cx="50%" cy="35%" r="65%">
          <stop offset="0" stopColor={isNight ? "#30363e" : "#ffffff"} />
          <stop offset="1" stopColor={isNight ? "#161a1f" : "#dde3e9"} />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="57" fill={`url(#wc-rim-${id})`} stroke="#5d6670" strokeWidth="1.5" />
      <circle
        cx="60"
        cy="60"
        r="50.5"
        fill={`url(#wc-face-${id})`}
        stroke={isNight ? "#0d1014" : "#89949e"}
        strokeWidth="1.6"
      />
      {Array.from({ length: 12 }, (_, i) => {
        const cardinal = i % 3 === 0;
        return (
          <line
            key={i}
            x1="60"
            y1={cardinal ? 13 : 14.5}
            x2="60"
            y2={cardinal ? 22 : 19}
            stroke={tickColor}
            strokeWidth={cardinal ? 3 : 1.5}
            strokeLinecap="round"
            transform={`rotate(${i * 30} 60 60)`}
          />
        );
      })}
      <path
        d="M57.6 62 58.6 31h2.8l1 31Z"
        fill={handFill}
        transform={`rotate(${(hour % 12) * 30 + minute / 2} 60 60)`}
      />
      <path
        d="M58 63 58.9 19.5h2.2L62 63Z"
        fill={handFill}
        transform={`rotate(${minute * 6 + second / 10} 60 60)`}
      />
      <path
        d="M59.2 72V16h1.6v56Z"
        fill="#d1342f"
        transform={`rotate(${second * 6} 60 60)`}
      />
      <circle cx="60" cy="60" r="4" fill="#d1342f" stroke={handFill} strokeWidth="1" />
    </svg>
  );
}
