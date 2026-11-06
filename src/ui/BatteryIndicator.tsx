import { useEffect, useState } from "react";
import { nativeBatteryAvailable, readNativeBattery } from "../services/nativeBattery";
import { batteryLabel, readDeviceBattery } from "./battery";
import type { DeviceBattery } from "./battery";
type BatterySource = EventTarget & DeviceBattery;

/** Event-driven device sync; returning from the background also refreshes the reading. */
export function BatteryIndicator() {
  const [battery, setBattery] = useState<DeviceBattery | null>(null);
  useEffect(() => {
    let disposed = false;
    if (nativeBatteryAvailable()) {
      let revision = 0;
      const changed = (event: Event) => {
        revision++;
        if (!disposed) setBattery(readDeviceBattery((event as CustomEvent<unknown>).detail));
      };
      const refresh = () => {
        if (document.hidden) return;
        const token = ++revision;
        void readNativeBattery().then(value => {
          if (!disposed && token === revision) setBattery(readDeviceBattery(value));
        }).catch(() => {
          if (!disposed && token === revision) setBattery(null);
        });
      };
      window.addEventListener("reipod-native-battery", changed);
      document.addEventListener("visibilitychange", refresh);
      window.addEventListener("focus", refresh);
      window.addEventListener("pageshow", refresh);
      refresh();
      return () => {
        disposed = true; revision++;
        window.removeEventListener("reipod-native-battery", changed);
        document.removeEventListener("visibilitychange", refresh);
        window.removeEventListener("focus", refresh);
        window.removeEventListener("pageshow", refresh);
      };
    }
    let pending = false;
    let source: BatterySource | null = null;
    const update = () => {
      if (!disposed) setBattery(readDeviceBattery(source));
    };
    const refresh = () => {
      if (disposed) return;
      if (source) {
        update();
        return;
      }
      if (pending) return;
      try {
        const getBattery = (
          navigator as Navigator & { getBattery?: () => Promise<BatterySource> }
        ).getBattery;
        if (typeof getBattery !== "function") {
          setBattery(null);
          return;
        }
        pending = true;
        void Promise.resolve(getBattery.call(navigator))
          .then((value) => {
            if (disposed) return;
            if (!value || typeof value.addEventListener !== "function") {
              setBattery(null);
              return;
            }
            source = value;
            source.addEventListener("levelchange", update);
            source.addEventListener("chargingchange", update);
            update();
          })
          .catch(() => {
            if (!disposed) setBattery(null);
          })
          .finally(() => {
            pending = false;
          });
      } catch {
        pending = false;
        setBattery(null);
      }
    };
    const resume = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("focus", resume);
    window.addEventListener("pageshow", resume);
    refresh();
    return () => {
      disposed = true;
      source?.removeEventListener("levelchange", update);
      source?.removeEventListener("chargingchange", update);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("focus", resume);
      window.removeEventListener("pageshow", resume);
    };
  }, []);
  const label = batteryLabel(battery);
  return (
    <span
      className={`classic-battery ${battery === null ? "is-fallback" : battery.level <= 0.2 && !battery.charging ? "is-low" : ""}`}
      role="img"
      aria-label={label}
      title={label}
      data-source={battery === null ? "fallback" : "device"}
    >
      <i style={{ width: `${(battery?.level ?? 1) * 100}%` }} />
      {battery?.charging && (
        <svg viewBox="0 0 12 16" aria-hidden="true">
          <path d="M7 0 1 9h4l-1 7 7-10H7Z" />
        </svg>
      )}
    </span>
  );
}
