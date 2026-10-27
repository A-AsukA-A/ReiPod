import { useEffect, useState } from "react";
type Battery = EventTarget & { level: number; charging: boolean };

/** Unknown means unknown: never invent an iPod charge level on unsupported hosts. */
export function BatteryIndicator() {
  const [battery, setBattery] = useState<{
    level: number;
    charging: boolean;
  } | null>(null);
  useEffect(() => {
    let disposed = false;
    let source: Battery | null = null;
    const update = () => {
      if (!disposed && source)
        setBattery({ level: source.level, charging: source.charging });
    };
    const navigatorWithBattery = navigator as Navigator & {
      getBattery?: () => Promise<Battery>;
    };
    void navigatorWithBattery
      .getBattery?.()
      .then((value) => {
        if (disposed) return;
        source = value;
        source.addEventListener("levelchange", update);
        source.addEventListener("chargingchange", update);
        update();
      })
      .catch(() => {});
    return () => {
      disposed = true;
      source?.removeEventListener("levelchange", update);
      source?.removeEventListener("chargingchange", update);
    };
  }, []);
  const level = battery ? Math.max(0, Math.min(1, battery.level)) : null;
  const label =
    level === null
      ? "电量不可用"
      : `${battery?.charging ? "正在充电，" : ""}电量 ${Math.round(level * 100)}%`;
  return (
    <span
      className={`classic-battery ${level === null ? "is-unknown" : level < 0.2 ? "is-low" : ""}`}
      role="img"
      aria-label={label}
      title={label}
    >
      <i style={{ width: level === null ? "0%" : `${level * 100}%` }} />
      {battery?.charging && (
        <svg viewBox="0 0 12 16" aria-hidden="true">
          <path d="M7 0 1 9h4l-1 7 7-10H7Z" />
        </svg>
      )}
      {level === null && <span>—</span>}
    </span>
  );
}
