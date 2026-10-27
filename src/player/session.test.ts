import { expect, it } from "vitest";
import { readSession } from "./session";
it("validates browser data without accepting non-finite times or malformed queue entries", () => {
  expect(readSession(null)).toBeNull();
  expect(readSession("bad")).toBeNull();
  expect(
    readSession({
      currentId: 9,
      position: Infinity,
      volume: -5,
      queue: ["a", "a", null, 3, "b"],
      naturalOrder: false,
    }),
  ).toEqual({
    currentId: null,
    position: 0,
    volume: 0,
    queue: ["a", "b"],
    naturalOrder: [],
  });
  expect(
    readSession({ currentId: "a", position: 42, volume: 0.5 }),
  ).toMatchObject({
    currentId: "a",
    position: 42,
    volume: 0.5,
  });
});
