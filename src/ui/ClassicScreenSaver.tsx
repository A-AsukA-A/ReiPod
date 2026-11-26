import { useEffect, useState } from "react";
import { BatteryIndicator } from "./BatteryIndicator";
import { ClassicLcdIcon } from "./ClassicLcdIcon";
import { formatClassicTime, type TimeFormat } from "../models/classicExtras";

type Props = {
  timeFormat?: TimeFormat;
  held: boolean;
  hasCurrent: boolean;
  active: boolean;
  trackTitle?: string;
  trackArtist?: string;
};

/** 2007 iPod classic 6G dimmed-backlight monochrome clock screen saver (ReiPod LCD geometry). */
export function ClassicScreenSaver({
  timeFormat = "24h",
  held,
  hasCurrent,
  active,
  trackTitle,
  trackArtist,
}: Props) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  const formatted = formatClassicTime(now, timeFormat);
  const dateText = new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(now);

  return (
    <div className="lcd-backlight-dim" role="status" aria-label="背光时钟屏保">
      <div className="screensaver-status">
        <div className="screensaver-icons">
          {held && (
            <svg className="hold-icon" viewBox="0 0 12 14" aria-label="已锁定" role="img">
              <path d="M3 6V4a3 3 0 0 1 6 0v2M2 6h8v7H2Z" />
            </svg>
          )}
          {hasCurrent && (
            <span className="screensaver-transport" aria-label={active ? "正在播放" : "已暂停"}>
              <ClassicLcdIcon name={active ? "play" : "pause"} />
            </span>
          )}
        </div>
        <BatteryIndicator />
      </div>
      <div className="screensaver-center">
        <time className="screensaver-clock" aria-label={`当前时间 ${formatted.text}`}>
          {formatted.time}
          {formatted.meridiem && <small>{formatted.meridiem}</small>}
        </time>
        <div className="screensaver-date">{dateText}</div>
      </div>
      {trackTitle ? (
        <div className="screensaver-track">
          <strong>{trackTitle}</strong>
          {trackArtist && <span>{trackArtist}</span>}
        </div>
      ) : (
        <div className="screensaver-spacer" aria-hidden="true" />
      )}
    </div>
  );
}
