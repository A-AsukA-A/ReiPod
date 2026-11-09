import { expect, it } from "vitest";
import { extrasReducer, parseExtras, stopwatchElapsed, lapDurations } from "./classicExtras";
it("stopwatch accounts for paused intervals, restores a running session, and archives independent laps", () => {
  let state = parseExtras(null, 1000);
  state = extrasReducer(state, { type: "toggle", now: 1000 });
  state = extrasReducer(state, { type: "lap", now: 2200 });
  state = parseExtras(JSON.parse(JSON.stringify(state)), 3000);
  state = extrasReducer(state, { type: "pause", now: 3500 });
  expect(stopwatchElapsed(state.current, 9000)).toBe(2500);
  state = extrasReducer(state, { type: "toggle", now: 10000 });
  state = extrasReducer(state, { type: "lap", now: 11500 });
  expect(lapDurations(state.current)).toEqual([1200, 2800]);
  state = extrasReducer(state, { type: "new", now: 12000 });
  expect(state.logs[0]).toMatchObject({ elapsed: 4500, started: null });
  const current = state.current;
  expect(extrasReducer(state, { type: "clear-logs" }).current).toBe(current);
});
it("invalid persisted sessions cannot start timers and city additions stay unique", () => {
  let state = parseExtras({ clocks: ["made-up", "tokyo", "tokyo"], current: { elapsed: -1 }, logs: [null] }, 1000);
  expect(state.clocks).toEqual(["tokyo"]);
  expect(state.current.started).toBeNull();
  state = extrasReducer(state, { type: "add-clock", id: "tokyo" });
  state = extrasReducer(state, { type: "add-clock", id: "not-a-city" });
  expect(state.clocks).toEqual(["tokyo"]);
});
