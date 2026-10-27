import { expect, it } from "vitest";
import { MouseWheel } from "./MouseWheel";
it("moves exactly one row even when a mouse sends a large notch delta", () => {
  const wheel = new MouseWheel();
  expect(wheel.move(120, 0, 0)).toBe(1);
  expect(wheel.move(1200, 0, 20)).toBe(1);
  expect(wheel.move(-600, 0, 40)).toBe(-1);
  expect(wheel.move(3, 1, 60)).toBe(1);
});
it("accumulates precision input, clearing stale and reversed movement", () => {
  const wheel = new MouseWheel();
  expect(wheel.move(16, 0, 0)).toBe(0);
  expect(wheel.move(16, 0, 20)).toBe(1);
  expect(wheel.move(20, 0, 30)).toBe(0);
  expect(wheel.move(-16, 0, 40)).toBe(0);
  expect(wheel.move(-16, 0, 50)).toBe(-1);
  expect(wheel.move(20, 0, 60)).toBe(0);
  expect(wheel.move(20, 0, 300)).toBe(0);
});
