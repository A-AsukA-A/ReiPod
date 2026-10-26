import { describe, expect, it } from "vitest";
import { committedSeek } from "./seek";

describe("seek release", () => {
  it("discards a drag after the track changes instead of seeking the new song", () => {
    expect(
      committedSeek({ trackId: "old", position: 90 }, "new", 120),
    ).toBeNull();
    expect(committedSeek(null, "old", 120)).toBeNull();
  });
  it("clamps a committed draft and refuses a not-yet-seekable track", () => {
    expect(committedSeek({ trackId: "same", position: 90 }, "same", 60)).toBe(
      60,
    );
    expect(committedSeek({ trackId: "same", position: -5 }, "same", 60)).toBe(
      0,
    );
    expect(
      committedSeek({ trackId: "same", position: 30 }, "same", 0),
    ).toBeNull();
  });
});
