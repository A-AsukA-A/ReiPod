import { useId } from "react";
import { BatteryIndicator } from "./BatteryIndicator";
import { PlayerIcon } from "./PlayerIcon";
import { repeatText } from "./primaryMenus";

type Props = {
  title: string;
  shuffle: boolean;
  repeat: "off" | "all" | "one";
  held: boolean;
  hasCurrent: boolean;
  active: boolean;
  busy: boolean;
  transportHint: "seek-forward" | "seek-backward" | null;
};

// Tight bounds avoid shrinking the firmware-style silhouette inside a generic icon box.
function StatusTransportIcon({
  name,
}: {
  name: "play" | "pause" | "seek-forward" | "seek-backward";
}) {
  const gradient = useId();
  const path = {
    play: "M1 0 10 6 1 12Z",
    pause: "M0 0h3v12H0ZM6 0h3v12H6Z",
    "seek-forward": "M0 1v10l5-5ZM5 1v10l5-5Z",
    "seek-backward": "M10 1v10L5 6ZM5 1v10L0 6Z",
  }[name];
  return (
    <svg
      className={`player-icon status-transport icon-${name}`}
      viewBox="0 0 10 12"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8ac5ed" />
          <stop offset="0.48" stopColor="#449ed5" />
          <stop offset="0.52" stopColor="#187ab9" />
          <stop offset="1" stopColor="#368fc8" />
        </linearGradient>
      </defs>
      <path d={path} fill={`url(#${gradient})`} />
    </svg>
  );
}

export function ClassicStatusBar({
  title, shuffle, repeat, held, hasCurrent, active, busy, transportHint,
}: Props) {
  return (
    <div className="screen-status">
      <strong>{title}</strong>
      <span className="play-modes">
        {shuffle && (
          <span title="随机播放" aria-label="随机播放">
            <PlayerIcon name="shuffle" />
          </span>
        )}
        {repeat !== "off" && (
          <span
            title={`重复${repeatText[repeat]}`}
            aria-label={`重复${repeatText[repeat]}`}
          >
            <PlayerIcon name="repeat" />
            {repeat === "one" && <small>1</small>}
          </span>
        )}
      </span>
      {held && (
        <svg
          className="hold-icon"
          viewBox="0 0 12 14"
          aria-label="已锁定"
          role="img"
        >
          <path d="M3 6V4a3 3 0 0 1 6 0v2M2 6h8v7H2Z" />
        </svg>
      )}
      {hasCurrent ? (
        <span
          className="screen-playing-link"
          aria-label={active ? "正在播放" : "已暂停"}
        >
          <span aria-hidden="true">
            {transportHint ? (
              <StatusTransportIcon name={transportHint} />
            ) : busy ? (
              <i className="lcd-loading" />
            ) : (
              <StatusTransportIcon name={active ? "play" : "pause"} />
            )}
          </span>
        </span>
      ) : (
        <span className="screen-header-spacer" />
      )}
      <BatteryIndicator />
    </div>
  );
}
