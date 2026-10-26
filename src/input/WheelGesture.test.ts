import { describe, expect, it } from "vitest";
import { angleDelta } from "./geometry";
import { WheelGesture } from "./WheelGesture";

const point = (angle: number, radius = 90) => ({
  x: Math.cos((angle * Math.PI) / 180) * radius,
  y: Math.sin((angle * Math.PI) / 180) * radius,
});
const center = { x: 0, y: 0 };

describe("classic wheel input", () => {
  it("unwraps both directions across the circular boundary", () => {
    expect(angleDelta(179, -179)).toBe(2);
    expect(angleDelta(-179, 179)).toBe(-2);
    const gesture = new WheelGesture(point(175), center, 100, 0);
    expect(gesture.move(point(-175), 100)).toBe(0);
    expect(gesture.move(point(-168), 200)).toBe(1);
  });
  it("keeps slow strokes precise, accelerates fast strokes, and reverses without lag", () => {
    const slow = new WheelGesture(point(0), center, 100, 0);
    expect(slow.move(point(16), 200)).toBe(1);
    expect(slow.move(point(0), 400)).toBe(-1);
    const fast = new WheelGesture(point(0), center, 100, 0);
    expect(fast.move(point(16), 10)).toBe(3);
  });
  it("does not confirm a circular drag, even after returning to the start", () => {
    const gesture = new WheelGesture(point(-90), center, 100, 0);
    for (let angle = -60; angle <= 270; angle += 30)
      gesture.move(point(angle), angle + 120);
    expect(gesture.canClick(point(-90))).toBe(false);
  });
  it("ignores the center dead zone and reanchors after leaving it", () => {
    const gesture = new WheelGesture(point(0), center, 100, 0);
    expect(gesture.move(center, 20)).toBe(0);
    expect(gesture.move(point(180), 40)).toBe(0);
    expect(gesture.canClick(point(0))).toBe(false);
    const centerPress = new WheelGesture(center, center, 100, 0);
    expect(centerPress.canClick({ x: 1, y: 2 })).toBe(true);
    expect(centerPress.move(point(90), 20)).toBe(0);
    expect(centerPress.canClick(center)).toBe(false);
  });
  it("cancels a linear drag and ignores movement outside the ring", () => {
    const gesture = new WheelGesture(point(0), center, 100, 0);
    expect(gesture.move(point(90, 200), 20)).toBe(0);
    expect(gesture.move(point(180), 30)).toBe(0);
    expect(gesture.canClick(point(0))).toBe(false);
  });
});
