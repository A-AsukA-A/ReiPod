export type DeviceBattery = { level: number; charging: boolean };

/** Reject invalid readings; a filled fallback icon is never a numeric reading. */
export function readDeviceBattery(value: unknown): DeviceBattery | null {
  try {
    if (!value || typeof value !== "object") return null;
    const source = value as Partial<DeviceBattery>;
    if (
      typeof source.level !== "number" ||
      !Number.isFinite(source.level) ||
      source.level < 0 ||
      source.level > 1 ||
      typeof source.charging !== "boolean"
    )
      return null;
    return { level: source.level, charging: source.charging };
  } catch {
    return null;
  }
}
export function batteryLabel(battery: DeviceBattery | null) {
  return battery
    ? `设备电量 ${Math.round(battery.level * 100)}%${battery.charging ? "，正在充电" : "，电池供电"}`
    : "设备未提供电量，默认显示满格";
}
