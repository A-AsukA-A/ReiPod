import { describe, expect, it } from "vitest";
import { shuffleAfterCurrent } from "./ordering";

describe("shuffle queue", () => {
  it("keeps played history and current song, shuffling the remainder exactly once", () => {
    const ids = ["a", "b", "c", "d", "e"];
    const result = shuffleAfterCurrent(ids, "b", () => 0);
    expect(result.slice(0, 2)).toEqual(["a", "b"]);
    expect(new Set(result)).toEqual(new Set(ids));
    expect(result.slice(2)).not.toEqual(ids.slice(2));
    expect(ids).toEqual(["a", "b", "c", "d", "e"]);
  });
});
