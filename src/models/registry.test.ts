import { expect, it } from "vitest";
import { classic2007 } from "./classic";
import { getDeviceModel, implementedModels } from "./registry";

it("exposes classic2007 with documented hardware metrics and falls back cleanly on unknown ids", () => {
  expect(implementedModels).toContain(classic2007);
  expect(getDeviceModel("classic-2007")).toBe(classic2007);
  expect(getDeviceModel("unknown-device")).toBe(classic2007);
  expect(classic2007.body.evidence).toBe("documented");
  expect(classic2007.lcd.evidence).toBe("documented");
  expect(classic2007.input.displayOnly).toBe(true);
});
