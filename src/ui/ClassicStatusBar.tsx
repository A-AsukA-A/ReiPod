import { useEffect, useState } from "react";
import { BatteryIndicator } from "./BatteryIndicator";
import { ClassicLcdIcon } from "./ClassicLcdIcon";
import { repeatText } from "./primaryMenus";

function localClockText() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

type Props = {
  title: string;
  timeInTitle?: boolean;
  shuffle: boolean;
  repeat: "off" | "all" | "one";
  held: boolean;
  hasCurrent: boolean;
  active: boolean;
  busy: boolean;
  transportHint: "seek-forward" | "seek-backward" | null;
};

export function ClassicStatusBar({
  title, timeInTitle = false, shuffle, repeat, held, hasCurrent, active, busy, transportHint,
}: Props) {
  const [clockText, setClockText] = useState(localClockText);
  useEffect(() => {
    if (!timeInTitle) return;
    setClockText(localClockText());
    const timer = setInterval(() => setClockText(localClockText()), 15000);
    return () => clearInterval(timer);
  }, [timeInTitle]);
  return (
    <div className="screen-status">
      <strong title={title}>{timeInTitle ? clockText : title}</strong>
      <span className="play-modes">
        {shuffle && (
          <span title="随机播放" aria-label="随机播放">
            <ClassicLcdIcon name="shuffle" />
          </span>
        )}
        {repeat !== "off" && (
          <span
            title={`重复${repeatText[repeat]}`}
            aria-label={`重复${repeatText[repeat]}`}
          >
            <ClassicLcdIcon name="repeat" />
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
              <ClassicLcdIcon name={transportHint} />
            ) : busy ? (
              <i className="lcd-loading" />
            ) : (
              <ClassicLcdIcon name={active ? "play" : "pause"} />
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
