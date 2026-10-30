type IconName =
  | "more"
  | "back"
  | "chevron"
  | "play"
  | "pause"
  | "seek-forward"
  | "seek-backward"
  | "shuffle"
  | "repeat"
  | "queue"
  | "lyrics"
  | "star"
  | "volume-low"
  | "volume-high";
const paths: Record<IconName, string> = {
  more: "M4 12h1m6 0h1m6 0h1",
  back: "M14 4 6 12l8 8",
  chevron: "m9 5 7 7-7 7",
  play: "m7 4 13 8-13 8Z",
  pause: "M6 4h4v16H6Zm8 0h4v16h-4Z",
  "seek-forward": "M2 5v14l9-7Zm10 0v14l9-7Z",
  "seek-backward": "M22 5v14l-9-7ZM12 5v14l-9-7Z",
  shuffle:
    "M3 6h3c5 0 7 12 12 12h3m-4-4 4 4-4 4M3 18h3c2 0 4-3 6-6s4-6 6-6h3m-4-4 4 4-4 4",
  repeat:
    "m17 2 4 4-4 4M3 10V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4m14 0v2a2 2 0 0 1-2 2H3",
  queue: "M8 6h13M8 12h13M8 18h13M2 6h1M2 12h1M2 18h1",
  lyrics:
    "M4 5h6v7c0 4-2 6-5 7v-3c2-1 2-2 2-4H4Zm10 0h6v7c0 4-2 6-5 7v-3c2-1 2-2 2-4h-3Z",
  star: "m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z",
  "volume-low": "M3 9h3.5l4.5-3.5q1-.7 1 .5v12q0 1-1 .5L6.5 15H3q-1 0-1-1v-4q0-1 1-1Z",
  "volume-high": "M3 9h3.5l4.5-3.5q1-.7 1 .5v12q0 1-1 .5L6.5 15H3q-1 0-1-1v-4q0-1 1-1Z",
};
export function PlayerIcon({
  name,
  filled = false,
}: {
  name: IconName;
  filled?: boolean;
}) {
  if (name === "volume-low" || name === "volume-high") {
    return (
      <svg
        className={`player-icon icon-${name}`}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d={paths[name]} fill="currentColor" />
        <path
            className="volume-waves"
            d={name === "volume-low"
              ? "M15 9Q18 12 15 15"
              : "M15 9Q18 12 15 15M17.5 6.5Q22 12 17.5 17.5M20 4Q26 12 20 20"}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
      </svg>
    );
  }
  // Tight menu bounds preserve the observed chevron footprint inside its 9×15u box.
  return (
    <svg
      className={`player-icon icon-${name}`}
      viewBox={name === "chevron" ? "7 3 12 18" : "0 0 24 24"}
      aria-hidden="true"
      fill={filled || name === "pause" ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={name === "pause" ? 0 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  );
}
