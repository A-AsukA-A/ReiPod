import { expect, it } from "vitest";
import { advanceCover, coverPose } from "./coverMotion";

it("settles at the same position at 30, 60 and 120 Hz without overshooting", () => {
  for (const rate of [30, 60, 120]) {
    let state = { position: 0, velocity: 0 };
    for (let i = 0; i < rate * 2; i++) {
      state = advanceCover(state.position, state.velocity, 3, 1 / rate);
      expect(state.position).toBeGreaterThanOrEqual(0);
      expect(state.position).toBeLessThanOrEqual(3);
    }
    expect(state.position).toBeCloseTo(3, 5);
    expect(state.velocity).toBeCloseTo(0, 5);
  }
});

it("reverses an in-flight movement continuously and settles on the new album", () => {
  let state = advanceCover(0, 0, 4, 0.06);
  const before = state.position;
  state = advanceCover(state.position, state.velocity, 0, 0);
  expect(state.position).toBe(before);
  for (let i = 0; i < 240; i++)
    state = advanceCover(state.position, state.velocity, 0, 1 / 120);
  expect(state.position).toBeCloseTo(0, 5);
});

it("keeps the main cover movement readable and reaches the same trajectory at different frame rates", () => {
  const sample = (rate: number, seconds: number) => {
    let state = { position: 0, velocity: 0 };
    for (let i = 0; i < Math.round(rate * seconds); i++)
      state = advanceCover(state.position, state.velocity, 1, 1 / rate);
    return state.position;
  };
  expect(sample(60, 0.2)).toBeLessThan(0.9);
  expect(sample(60, 0.5)).toBeGreaterThan(0.98);
  expect(sample(30, 0.2)).toBeCloseTo(sample(120, 0.2), 8);
});

it("turns adjacent covers continuously through the center with mirrored side stacks", () => {
  expect(coverPose(0)).toMatchObject({ x: 0, z: -0, angle: -0, opacity: 1 });
  for (const offset of [0.01, 0.5, 1, 2, 4]) {
    const right = coverPose(offset),
      left = coverPose(-offset);
    expect(right.x).toBe(-left.x);
    expect(right.angle).toBe(-left.angle);
    expect(right.z).toBe(left.z);
    expect(right.depth).toBe(left.depth);
  }
  expect(Math.abs(coverPose(0.001).angle)).toBeLessThan(0.1);
  expect(coverPose(5).opacity).toBe(0);
});
