import { useId } from "react";

export type ClassicGlyphName =
  | "music"
  | "shuffle"
  | "settings"
  | "import"
  | "playlists"
  | "artists"
  | "albums"
  | "songs"
  | "search"
  | "playing"
  | "repeat"
  | "speaker"
  | "finish"
  | "background"
  | "info"
  | "clear"
  | "clock"
  | "eq"
  | "photos"
  | "podcasts";

const gearTeeth = Array.from({ length: 48 }, (_, index) => {
  const angle = (index * Math.PI) / 24 - Math.PI / 2;
  const radius = index % 4 < 2 ? 40 : 32;
  return `${(50 + Math.cos(angle) * radius).toFixed(2)},${(50 + Math.sin(angle) * radius).toFixed(2)}`;
}).join(" ");

/** 2007 Apple 2.5D brushed-chrome & glass skeuomorphic preview glyphs. */
export function ClassicGlyph({ name }: { name: ClassicGlyphName }) {
  const id = useId().replace(/:/g, "");
  const metal = `url(#cg-metal-${id})`;
  const vert = `url(#cg-vert-${id})`;
  const recessed = `url(#cg-recess-${id})`;
  const gloss = `url(#cg-gloss-${id})`;
  const vinyl = `url(#cg-vinyl-${id})`;

  return (
    <svg
      className={`classic-glyph glyph-${name}`}
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`cg-metal-${id}`} x1="0.1" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.34" stopColor="#eaf1f7" />
          <stop offset="0.52" stopColor="#b5c7d8" />
          <stop offset="0.82" stopColor="#dbe6f0" />
          <stop offset="1" stopColor="#9ab0c4" />
        </linearGradient>
        <linearGradient id={`cg-vert-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.46" stopColor="#e2ecf5" />
          <stop offset="0.52" stopColor="#b8cbe0" />
          <stop offset="1" stopColor="#e5eef6" />
        </linearGradient>
        <linearGradient id={`cg-recess-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#354857" />
          <stop offset="0.5" stopColor="#4f6779" />
          <stop offset="1" stopColor="#698296" />
        </linearGradient>
        <linearGradient id={`cg-gloss-${id}`} x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.82" />
          <stop offset="0.55" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`cg-vinyl-${id}`} cx="42%" cy="38%" r="58%">
          <stop offset="0" stopColor="#72889b" />
          <stop offset="0.55" stopColor="#3c4f5f" />
          <stop offset="1" stopColor="#263542" />
        </radialGradient>
      </defs>

      {name === "speaker" ? (
        <g>
          <path
            d="M11 38a3 3 0 0 1 3-3h16l24-21a2.5 2.5 0 0 1 4 2v68a2.5 2.5 0 0 1-4 2L30 65H14a3 3 0 0 1-3-3Z"
            fill={vert}
            stroke="#ffffff"
            strokeOpacity="0.58"
            strokeWidth="0.7"
            strokeLinejoin="round"
          />
          <path d="M13 37h17l24-20v23c-14 6-26 9-41 9Z" fill={gloss} />
          <path d="M30 35v30" stroke="#7d95a8" strokeOpacity="0.45" strokeWidth="1.5" />
          <path
            d="M65.5 34a22 22 0 0 1 0 32"
            fill="none"
            stroke={vert}
            strokeWidth="6.2"
            strokeLinecap="round"
          />
          <path
            d="M75.5 22a38 38 0 0 1 0 56"
            fill="none"
            stroke={metal}
            strokeWidth="6.2"
            strokeLinecap="round"
          />
        </g>
      ) : name === "settings" ? (
        <g>
          <polygon
            points={gearTeeth}
            fill={metal}
            stroke="#ffffff"
            strokeOpacity="0.58"
            strokeWidth="0.7"
            strokeLinejoin="round"
          />
          <circle cx="50" cy="50" r="24.5" fill="#d9e5f0" stroke="#748c9f" strokeWidth="1.4" />
          <circle cx="50" cy="50" r="15.5" fill={recessed} stroke="#ffffff" strokeOpacity="0.68" strokeWidth="0.9" />
          <circle cx="50" cy="50" r="8" fill={metal} stroke="#5d7486" strokeWidth="1.1" />
        </g>
      ) : name === "clock" ? (
        <g>
          <circle cx="50" cy="50" r="40" fill={metal} stroke="#ffffff" strokeOpacity="0.6" strokeWidth="0.7" />
          <circle cx="50" cy="50" r="33.5" fill="#f7fafd" stroke="#5c7385" strokeWidth="1.6" />
          <path d="M21 38a33 33 0 0 1 58 0c-12 8-46 8-58 0Z" fill={gloss} />
          {Array.from({ length: 12 }, (_, i) => (
            <line
              key={i}
              x1="50"
              y1={i % 3 === 0 ? 19 : 20.5}
              x2="50"
              y2={i % 3 === 0 ? 25 : 23.5}
              stroke="#465b6b"
              strokeWidth={i % 3 === 0 ? 2.4 : 1.3}
              strokeLinecap="round"
              transform={`rotate(${i * 30} 50 50)`}
            />
          ))}
          <path d="M50 50 50 29" stroke="#2c3e4d" strokeWidth="3.6" strokeLinecap="round" />
          <path d="M50 50 67 59" stroke="#2c3e4d" strokeWidth="2.8" strokeLinecap="round" />
          <circle cx="50" cy="50" r="3.4" fill="#51687a" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="0.6" />
        </g>
      ) : name === "shuffle" ? (
        <g strokeLinejoin="round">
          <path
            d="M8 25h17c14 0 21 10 30 23 8 12 13 18 24 18h4V55l13 16-13 16V76h-4c-16 0-23-10-32-23-8-12-14-18-22-18H8Z"
            fill={vert}
            stroke="#ffffff"
            strokeOpacity="0.55"
            strokeWidth="0.7"
          />
          <path
            d="M36 44 63 44 55 58 40 58Z"
            fill="none"
            stroke="#4c6477"
            strokeOpacity="0.35"
            strokeWidth="5"
          />
          <path
            d="M8 66h17c9 0 14-7 22-18 9-13 16-23 32-23h4V14l13 16-13 16V35h-4c-11 0-16 6-24 18-9 13-16 23-30 23H8Z"
            fill={metal}
            stroke="#ffffff"
            strokeOpacity="0.58"
            strokeWidth="0.7"
          />
        </g>
      ) : name === "repeat" ? (
        <g strokeLinejoin="round">
          <path
            d="M22 25h50V14l21 17-21 17V37H25a9 9 0 0 0-9 9v6H6v-7c0-12 7-20 16-20Z"
            fill={metal}
            stroke="#ffffff"
            strokeOpacity="0.58"
            strokeWidth="0.7"
          />
          <path
            d="M78 75H28v11L7 69l21-17v11h47a9 9 0 0 0 9-9v-6h10v7c0 12-7 20-16 20Z"
            fill={vert}
            stroke="#ffffff"
            strokeOpacity="0.58"
            strokeWidth="0.7"
          />
        </g>
      ) : name === "search" ? (
        <g>
          <path d="M62 63 72 58 92 78a6 6 0 0 1-8.5 8.5L63 66Z" fill={metal} stroke="#ffffff" strokeOpacity="0.58" strokeWidth="0.7" strokeLinejoin="round" />
          <circle cx="43" cy="43" r="29" fill={metal} stroke="#ffffff" strokeOpacity="0.6" strokeWidth="0.7" />
          <circle cx="43" cy="43" r="20.5" fill="#7fa0b8" fillOpacity="0.45" stroke="#536b7e" strokeWidth="1.4" />
          <path d="M26 36a19 19 0 0 1 34 0c-9 6-25 6-34 0Z" fill={gloss} />
        </g>
      ) : name === "import" ? (
        <g strokeLinejoin="round">
          <path d="M12 56h15v18h46V56h15v29a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3Z" fill={vert} stroke="#ffffff" strokeOpacity="0.58" strokeWidth="0.7" />
          <path d="M41 12h18v30h16L50 67 25 42h16Z" fill={metal} stroke="#ffffff" strokeOpacity="0.58" strokeWidth="0.7" />
          <path d="M42 13h16v20H42Z" fill={gloss} />
        </g>
      ) : name === "playlists" ? (
        <g>
          {[18, 43, 68].map((y) => (
            <g key={y}>
              <rect x="10" y={y} width="14" height="14" rx="2.5" fill={vert} stroke="#ffffff" strokeOpacity="0.55" strokeWidth="0.65" />
              <rect x="31" y={y} width="59" height="14" rx="2.5" fill={metal} stroke="#ffffff" strokeOpacity="0.58" strokeWidth="0.65" />
              <rect x="32" y={y + 1} width="57" height="5.5" rx="1.5" fill={gloss} />
            </g>
          ))}
        </g>
      ) : name === "albums" ? (
        <g>
          <circle cx="62" cy="48" r="29" fill={vinyl} stroke="#9fb4c6" strokeWidth="1" />
          <circle cx="62" cy="48" r="19" fill="none" stroke="#859cad" strokeOpacity="0.45" strokeWidth="1" />
          <circle cx="62" cy="48" r="11" fill={metal} />
          <circle cx="62" cy="48" r="3.5" fill="#3b4f5e" />
          <rect x="11" y="18" width="58" height="64" rx="3" fill={metal} stroke="#ffffff" strokeOpacity="0.6" strokeWidth="0.7" />
          <path d="M13 20h54v28c-16 8-38 8-54 0Z" fill={gloss} />
          <circle cx="40" cy="50" r="11" fill={recessed} stroke="#ffffff" strokeOpacity="0.65" strokeWidth="0.8" />
        </g>
      ) : name === "artists" ? (
        <g>
          <path
            d="M17 87v-8c0-20 13-30 33-30s33 10 33 30v8Z"
            fill={vert}
            stroke="#ffffff"
            strokeOpacity="0.58"
            strokeWidth="0.7"
            strokeLinejoin="round"
          />
          <circle cx="50" cy="29" r="17" fill={metal} stroke="#ffffff" strokeOpacity="0.58" strokeWidth="0.7" />
          <path d="M36 24a15 15 0 0 1 28 0c-6 4-22 4-28 0Z" fill={gloss} />
        </g>
      ) : name === "playing" ? (
        <g>
          <path
            d="M27 14a3 3 0 0 1 4.6-2.5l52 36a3 3 0 0 1 0 5l-52 36A3 3 0 0 1 27 86Z"
            fill={metal}
            stroke="#ffffff"
            strokeOpacity="0.6"
            strokeWidth="0.7"
            strokeLinejoin="round"
          />
          <path d="M29 14l49 34c-16 4-35 4-49 0Z" fill={gloss} />
        </g>
      ) : name === "finish" ? (
        <g>
          <rect x="24" y="8" width="52" height="84" rx="8" fill={metal} stroke="#ffffff" strokeOpacity="0.6" strokeWidth="0.7" />
          <rect x="29" y="14" width="42" height="31" rx="2" fill={recessed} stroke="#d5e2ec" strokeOpacity="0.7" strokeWidth="0.8" />
          <path d="M31 16h38v13c-10 4-28 4-38 0Z" fill={gloss} />
          <circle cx="50" cy="68" r="17.5" fill="#f5f8fb" stroke="#7890a3" strokeWidth="1" />
          <circle cx="50" cy="68" r="6.5" fill={metal} stroke="#7890a3" strokeWidth="0.8" />
        </g>
      ) : name === "background" ? (
        <g>
          {Array.from({ length: 8 }, (_, i) => (
            <rect
              key={i}
              x="46"
              y="6"
              width="8"
              height="15"
              rx="3"
              fill={metal}
              stroke="#ffffff"
              strokeOpacity="0.55"
              strokeWidth="0.6"
              transform={`rotate(${i * 45} 50 50)`}
            />
          ))}
          <circle cx="50" cy="50" r="20" fill={vert} stroke="#ffffff" strokeOpacity="0.58" strokeWidth="0.7" />
          <path d="M33 44a18 18 0 0 1 34 0c-8 4-26 4-34 0Z" fill={gloss} />
        </g>
      ) : name === "info" ? (
        <g>
          <circle cx="50" cy="50" r="38" fill={metal} stroke="#ffffff" strokeOpacity="0.6" strokeWidth="0.7" />
          <path d="M18 40a34 34 0 0 1 64 0c-14 8-50 8-64 0Z" fill={gloss} />
          <circle cx="50" cy="29" r="5" fill={recessed} />
          <rect x="45.5" y="40" width="9" height="32" rx="3" fill={recessed} />
        </g>
      ) : name === "clear" ? (
        <g strokeLinejoin="round">
          <path d="M23 27h54l-5 60H28Z" fill={vert} stroke="#ffffff" strokeOpacity="0.58" strokeWidth="0.7" />
          <rect x="18" y="16" width="64" height="9" rx="3" fill={metal} stroke="#ffffff" strokeOpacity="0.58" strokeWidth="0.7" />
          <rect x="38" y="8" width="24" height="8" rx="2.5" fill={metal} stroke="#ffffff" strokeOpacity="0.55" strokeWidth="0.65" />
          <line x1="39" y1="36" x2="41" y2="78" stroke="#5d7588" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="50" y1="36" x2="50" y2="78" stroke="#5d7588" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="61" y1="36" x2="59" y2="78" stroke="#5d7588" strokeWidth="3.5" strokeLinecap="round" />
        </g>
      ) : name === "eq" ? (
        <g>
          {[
            { x: 22, knobY: 26 },
            { x: 50, knobY: 56 },
            { x: 78, knobY: 36 },
          ].map(({ x, knobY }) => (
            <g key={x}>
              <rect x={x - 4} y="12" width="8" height="76" rx="4" fill={recessed} stroke="#d5e2ed" strokeOpacity="0.65" strokeWidth="0.7" />
              <rect x={x - 11} y={knobY} width="22" height="14" rx="3.5" fill={vert} stroke="#ffffff" strokeOpacity="0.6" strokeWidth="0.7" />
              <line x1={x - 6} y1={knobY + 7} x2={x + 6} y2={knobY + 7} stroke="#637b8e" strokeWidth="1.4" />
            </g>
          ))}
        </g>
      ) : name === "photos" ? (
        <g>
          <g transform="rotate(-7 50 50)">
            <rect x="14" y="18" width="66" height="58" rx="3" fill="#dce7f1" stroke="#ffffff" strokeOpacity="0.58" strokeWidth="0.7" />
            <rect x="19" y="23" width="56" height="40" fill="#70899c" />
          </g>
          <g transform="rotate(3 50 50)">
            <rect x="17" y="20" width="68" height="60" rx="3" fill={metal} stroke="#ffffff" strokeOpacity="0.6" strokeWidth="0.7" />
            <rect x="22" y="25" width="58" height="42" fill={recessed} />
            <path d="M22 67 40 43l13 15 10-10 17 19Z" fill="#dfe9f2" />
            <circle cx="67" cy="36" r="5.5" fill="#ffffff" />
          </g>
        </g>
      ) : name === "podcasts" ? (
        <g>
          <path
            d="M31 48a19 19 0 0 1 38 0"
            fill="none"
            stroke={vert}
            strokeWidth="5.5"
            strokeLinecap="round"
          />
          <path
            d="M19 45a31 31 0 0 1 62 0"
            fill="none"
            stroke={metal}
            strokeWidth="5.5"
            strokeLinecap="round"
          />
          <circle cx="50" cy="51" r="9" fill={metal} stroke="#ffffff" strokeOpacity="0.58" strokeWidth="0.7" />
          <path
            d="M36 87c0-13 5.5-22 14-22s14 9 14 22Z"
            fill={vert}
            stroke="#ffffff"
            strokeOpacity="0.58"
            strokeWidth="0.7"
            strokeLinejoin="round"
          />
        </g>
      ) : (
        <g>
          <path
            d="M33 22 77 12v54c0 17-26 22-28 7-2-11 15-17 23-12V30l-34 8v39c0 17-26 22-28 7-2-11 15-17 23-12Z"
            fill={metal}
            stroke="#ffffff"
            strokeOpacity="0.6"
            strokeWidth="0.7"
            strokeLinejoin="round"
          />
          <path d="M35 24 75 15v9L35 33Z" fill={gloss} />
        </g>
      )}
    </svg>
  );
}

export function PreviewGlyph({ name }: { name: ClassicGlyphName }) {
  return (
    <div className="preview-glyph-stage">
      <ClassicGlyph name={name} />
    </div>
  );
}
