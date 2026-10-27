import { expect, test } from "vitest";
import { validDeveloperToken } from "./musicKit";
const token = (exp: number, alg = "ES256") =>
  `${btoa(JSON.stringify({ alg }))}.${btoa(JSON.stringify({ exp }))}.signature`;
test("unconfigured, malformed, wrong-algorithm and expired developer tokens cannot enable login", () => {
  expect(validDeveloperToken("")).toBe(false);
  expect(validDeveloperToken("broken.value")).toBe(false);
  expect(validDeveloperToken(token(Date.now() / 1000 - 10))).toBe(false);
  expect(validDeveloperToken(token(Date.now() / 1000 + 3600, "none"))).toBe(
    false,
  );
  expect(validDeveloperToken(token(Date.now() / 1000 + 3600))).toBe(true);
});
