import { useId } from "react";

type Transport = "play" | "pause" | "seek-forward" | "seek-backward";
type Icon = Transport | "shuffle" | "repeat";

// Independently redrawn filled silhouettes, rather than modern round-stroke icons.
// Photos establish the visual family; these paths/colors are provisional fits.
const paths: Record<Icon, string> = {
  play: "M.7.5 9.5 6 .7 11.5Z",
  pause: "M.5.5h3.2v11H.5ZM6.3.5h3.2v11H6.3Z",
  "seek-forward": "M.4 1v10L5 6ZM5 1v10l4.6-5Z",
  "seek-backward": "M9.6 1v10L5 6ZM5 1v10L.4 6Z",
  shuffle: "M0 2h3.1c3.3 0 5.2 3.4 7.8 7.1 1.5 2.1 2.5 2.4 5.1 2.4V9l4 3.5-4 3.5v-2.5c-3.3 0-5-1-6.9-3.7C6 5.4 5 4.5 3.1 4.5H0ZM0 11.5h3c1.6 0 2.9-1.3 4.3-3.3L8.8 10C7.2 12.2 5.7 14 3 14H0ZM10.3 5.5C12.3 2.6 13.6 2 16 2V0l4 3.5L16 7V4.5c-1.8 0-2.5.7-4.2 3Z",
  repeat: "M0 10V6q0-4 4-4h10V0l5 3.5L14 7V4.5H4Q2.5 4.5 2.5 6v4ZM20 6v4q0 4-4 4H6v2l-5-3.5L6 9v2.5h10q1.5 0 1.5-1.5V6Z",
};

export function ClassicLcdIcon({ name }: { name: Icon }) {
  const gradient = useId();
  const transport = name !== "shuffle" && name !== "repeat";
  return (
    <svg
      className={`player-icon classic-lcd-icon ${transport ? "status-transport " : ""}icon-${name}`}
      viewBox={transport ? "0 0 10 12" : "0 0 20 16"}
      aria-hidden="true"
    >
      {transport && (
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7ccbf4" />
            <stop offset="0.44" stopColor="#3ba6de" />
            <stop offset="0.5" stopColor="#177fbb" />
            <stop offset="1" stopColor="#278cc5" />
          </linearGradient>
        </defs>
      )}
      <path
        d={paths[name]}
        fill={transport ? `url(#${gradient})` : "currentColor"}
        stroke={transport ? "#3c85af" : "none"}
        strokeWidth={transport ? 0.3 : 0}
        strokeLinejoin="round"
      />
    </svg>
  );
}
