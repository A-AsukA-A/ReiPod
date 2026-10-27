import { expect, it } from "vitest";
import { batteryLabel, readDeviceBattery } from "./battery";
it("accepts real empty and full batteries without substituting a fallback reading", () => {
  expect(readDeviceBattery({ level: 0, charging: false })).toEqual({
    level: 0,
    charging: false,
  });
  expect(readDeviceBattery({ level: 1, charging: true })).toEqual({
    level: 1,
    charging: true,
  });
  expect(batteryLabel({ level: 0.37, charging: false })).toBe(
    "设备电量 37%，电池供电",
  );
});
it("falls back for unavailable, invalid or inaccessible readings without inventing a percentage", () => {
  for (const value of [
    null,
    {},
    { level: NaN, charging: false },
    { level: Infinity, charging: true },
    { level: -0.1, charging: false },
    { level: 1.1, charging: true },
    { level: 0.5, charging: "yes" },
  ])
    expect(readDeviceBattery(value)).toBeNull();
  expect(
    readDeviceBattery({
      get level() {
        throw new Error("Unavailable");
      },
    }),
  ).toBeNull();
  expect(batteryLabel(null)).toBe("设备未提供电量，默认显示满格");
  expect(batteryLabel(null)).not.toContain("100%");
});
