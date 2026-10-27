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
  | "volume";
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
  volume: "M3 9h4l5-5v16l-5-5H3Zm13-1a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14",
};
export function PlayerIcon({
  name,
  filled = false,
}: {
  name: IconName;
  filled?: boolean;
}) {
  return (
    <svg
      className={`player-icon icon-${name}`}
      viewBox="0 0 24 24"
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
