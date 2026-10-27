import { expect, it } from "vitest";
import { durationInMilliseconds } from "./motion";

it("keeps LCD timing identical when the production minifier switches milliseconds to seconds", () => {
  expect(durationInMilliseconds("180ms")).toBe(180);
  expect(durationInMilliseconds(".18s")).toBe(180);
  expect(durationInMilliseconds("120ms")).toBe(120);
  expect(durationInMilliseconds(".12s")).toBe(120);
});
