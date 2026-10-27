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
  | "clock";

const gear = Array.from({ length: 48 }, (_, index) => {
  const angle = (index * Math.PI) / 24;
  const radius = index % 4 < 2 ? 34 : 27;
  return `${50 + Math.cos(angle) * radius},${50 + Math.sin(angle) * radius}`;
}).join(" ");

/** Original vectors, shaped against the classic's embossed, filled icon vocabulary. */
export function ClassicGlyph({ name }: { name: ClassicGlyphName }) {
  const id = useId().replace(/:/g, "");
  const fill = `url(#metal-${id})`;
  return (
    <svg
      className={`classic-glyph glyph-${name}`}
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`metal-${id}`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#f4f9ff" />
          <stop offset=".45" stopColor="#d4e2ef" />
          <stop offset=".52" stopColor="#b1c6da" />
          <stop offset="1" stopColor="#d1dfeb" />
        </linearGradient>
      </defs>
      <g fill={fill} stroke="#d6e5f1" strokeWidth="0.65" strokeLinejoin="round">
        {name === "shuffle" ? (
          <>
            <path d="M8 23h17c14 0 23 12 32 25 8 12 13 19 23 19h3V56l13 16-13 16V77h-3c-16 0-23-11-32-24-8-12-15-20-24-20H8Z" />
            <path d="M8 67h16c10 0 15-8 23-20 9-14 17-24 33-24h3V12l13 16-13 16V33h-3c-11 0-17 8-24 20-9 13-16 24-32 24H8Z" />
          </>
        ) : name === "settings" ? (
          <>
            <polygon points={gear} />
            <circle cx="50" cy="50" r="16" fill="#637985" strokeWidth="3" />
            <circle
              cx="50"
              cy="50"
              r="23"
              fill="none"
              stroke="#8a9fae"
              strokeWidth="2"
            />
          </>
        ) : name === "search" ? (
          <>
            <path
              fillRule="evenodd"
              d="M42 12a29 29 0 1 0 0 58 29 29 0 0 0 0-58Zm0 10a19 19 0 1 1 0 38 19 19 0 0 1 0-38Z"
            />
            <path d="m62 61 9-3 23 26-9 9-26-24Z" />
          </>
        ) : name === "import" ? (
          <>
            <path d="M12 55h18v19h40V55h18v31H12Z" />
            <path d="M42 12h16v31h17L50 68 25 43h17Z" />
          </>
        ) : name === "playlists" ? (
          <>
            <path d="M10 17h13v12H10Zm22 0h57v12H32ZM10 39h13v12H10Zm22 0h57v12H32ZM10 61h13v12H10Zm22 0h57v12H32Z" />
          </>
        ) : name === "albums" ? (
          <>
            <path d="M19 9h69v69H19Z" fill="#9eb5c9" />
            <path d="M10 20h69v69H10Z" />
            <circle cx="44" cy="54" r="22" fill="#6b8394" />
            <circle cx="44" cy="54" r="8" />
          </>
        ) : name === "artists" ? (
          <>
            <circle cx="50" cy="29" r="17" />
            <path d="M17 88v-9c0-22 14-32 33-32s33 10 33 32v9Z" />
          </>
        ) : name === "playing" ? (
          <path d="m29 12 58 38-58 38Z" />
        ) : name === "repeat" ? (
          <>
            <path d="M22 25h51V14l20 17-20 17V37H25a9 9 0 0 0-9 9v5H5v-6c0-12 7-20 17-20Z" />
            <path d="M78 75H27v11L7 69l20-17v11h48a9 9 0 0 0 9-9v-5h11v6c0 12-7 20-17 20Z" />
          </>
        ) : name === "speaker" ? (
          <>
            <path d="M12 37h19l24-22v70L31 63H12Z" />
            <path
              d="M65 29q22 21 0 42m12-54q33 33 0 66"
              fill="none"
              stroke={fill}
              strokeWidth="7"
            />
          </>
        ) : name === "finish" ? (
          <>
            <rect x="25" y="8" width="50" height="84" rx="7" />
            <rect x="30" y="16" width="40" height="30" fill="#7790a2" />
            <circle cx="50" cy="68" r="17" fill="#f5f7f8" />
            <circle cx="50" cy="68" r="6" fill="#afbfcb" />
          </>
        ) : name === "background" ? (
          <>
            <circle cx="50" cy="50" r="20" />
            <path d="M46 3h8v15h-8Zm0 79h8v15h-8ZM3 46h15v8H3Zm79 0h15v8H82ZM13 19l6-6 11 11-6 6Zm57 57 6-6 11 11-6 6ZM13 81l11-11 6 6-11 11Zm57-57 11-11 6 6-11 11Z" />
          </>
        ) : name === "info" ? (
          <>
            <circle cx="50" cy="50" r="38" />
            <circle cx="50" cy="28" r="5" fill="#688090" />
            <path d="M46 42h8v30h-8Z" fill="#688090" />
          </>
        ) : name === "clear" ? (
          <>
            <path d="M24 26h52l-4 62H28Zm-5-12h62v9H19ZM38 6h24v8H38Z" />
            <path d="M40 36v40m20-40v40" stroke="#7890a3" strokeWidth="4" />
          </>
        ) : name === "clock" ? (
          <>
            <circle cx="50" cy="50" r="39" />
            <circle cx="50" cy="50" r="33" fill="#e8eef2" />
            <path
              d="M50 24v27l19 11"
              fill="none"
              stroke="#526774"
              strokeWidth="4"
            />
          </>
        ) : (
          <>
            <path d="M33 22 77 12v54c0 17-26 22-28 7-2-11 15-17 23-12V30l-34 8v39c0 17-26 22-28 7-2-11 15-17 23-12Z" />
          </>
        )}
      </g>
    </svg>
  );
}
