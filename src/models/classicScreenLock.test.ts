import { expect, it } from "vitest";
import { dialDigit, formatDigits, parseScreenLock, verifyScreenLock } from "./classicScreenLock";

it("parses valid 4-digit screen lock state and enforces unlocked state when code is null", () => {
  expect(parseScreenLock(null)).toEqual({ code: null, locked: false });
  expect(parseScreenLock({ code: null, locked: true })).toEqual({ code: null, locked: false });
  expect(parseScreenLock({ code: "12ab", locked: true })).toEqual({ code: null, locked: false });
  expect(parseScreenLock({ code: "0429", locked: true })).toEqual({ code: "0429", locked: true });
});

it("wraps digits modulo 10 and verifies matching combinations", () => {
  let digits: [number, number, number, number] = [0, 0, 0, 0];
  digits = dialDigit(digits, 0, -1);
  digits = dialDigit(digits, 1, 13);
  digits = dialDigit(digits, 2, 7);
  digits = dialDigit(digits, 3, 2);
  expect(formatDigits(digits)).toBe("9372");
  expect(verifyScreenLock("9372", digits)).toBe(true);
  expect(verifyScreenLock("1234", digits)).toBe(false);
  expect(verifyScreenLock(null, [0, 0, 0, 0])).toBe(false);
});
