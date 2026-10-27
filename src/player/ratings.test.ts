import { expect, it } from "vitest";
import { parseRatings } from "./ratings";
it("recovers only valid whole-star ratings from saved data", () => {
  expect(parseRatings(null)).toEqual({});
  expect(parseRatings([])).toEqual({});
  expect(
    parseRatings({ a: 5, b: 1, c: 0, d: 6, e: 2.5, f: "4", g: null }),
  ).toEqual({ a: 5, b: 1 });
});
