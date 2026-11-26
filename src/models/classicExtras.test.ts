import { expect, it } from "vitest";
import { extrasReducer, formatClassicTime, lapDurations, parseExtras, stopwatchElapsed } from "./classicExtras";
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

it("formats 24h and 12h clock times accurately with optional time zone", () => {
  const morning = Date.UTC(2026, 10, 26, 0, 5, 0);
  const afternoon = Date.UTC(2026, 10, 26, 14, 30, 0);
  expect(formatClassicTime(morning, "24h", "UTC")).toEqual({ time: "00:05", text: "00:05" });
  expect(formatClassicTime(afternoon, "24h", "UTC")).toEqual({ time: "14:30", text: "14:30" });
  expect(formatClassicTime(morning, "12h", "UTC")).toEqual({ time: "12:05", meridiem: "AM", text: "12:05 AM" });
  expect(formatClassicTime(afternoon, "12h", "UTC")).toEqual({ time: "2:30", meridiem: "PM", text: "2:30 PM" });
});
