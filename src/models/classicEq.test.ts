import { expect, test } from "vitest";
import {
  classicEqPresets,
  eqPresetGains,
  eqPresetLabel,
  parseEqPreset,
} from "./classicEq";

test("classicEqPresets contains off plus 22 Apple presets and parses/resolves safely", () => {
  expect(classicEqPresets).toHaveLength(23);
  expect(parseEqPreset(undefined)).toBe("off");
  expect(parseEqPreset("invalid-preset")).toBe("off");
  expect(parseEqPreset("bass-booster")).toBe("bass-booster");
  expect(eqPresetLabel("bass-booster")).toBe("重低音增强");
  expect(eqPresetLabel("off")).toBe("关闭");
  expect(eqPresetGains("off")).toEqual([0, 0, 0]);
  expect(eqPresetGains("flat")).toEqual([0, 0, 0]);
  expect(eqPresetGains("bass-booster")).toEqual([6, 0, 0]);
});
