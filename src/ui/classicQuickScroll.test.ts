import { describe, expect, it } from "vitest";
import { classic2007 } from "../models/classic";
import { ClassicQuickScroll, quickScrollIndex, quickScrollLetter } from "./classicQuickScroll";
const rows = Array.from({ length: 130 }, (_, i) => ({ key: String(i), label: `${String.fromCharCode(65 + Math.floor(i / 5))} ${i}` }));
const index = quickScrollIndex(rows), policy = classic2007.input.quickScroll;
const stroke = { degrees: 30, detents: 2, fast: true };
function enter(engine: ClassicQuickScroll, focused = 10) {
  let result;
  for (let i = 0; i < 12; i++) result = engine.move(index, focused, stroke, i * 20);
  return result;
}
describe("classic quick scrolling", () => {
  it("indexes the actual order and excludes summaries, disabled actions and unsupported initials", () => {
    const items = [{ key: "all", label: "All albums", aggregate: true }, { key: "n", label: "123" },
      { key: "c", label: "中文" }, { key: "a", label: "Álbum" }, { key: "b", label: "Birch" },
      { key: "a2", label: "Atlas" }, { key: "x", label: "X", disabled: true }];
    expect(quickScrollIndex(items).groups.map(g => [g.letter, g.key])).toEqual([["#", "n"], ["A", "a"], ["B", "b"]]);
    expect(quickScrollLetter("中文")).toBeNull(); expect(quickScrollLetter("かな")).toBeNull();
    expect(quickScrollLetter("  ")).toBeNull(); expect(quickScrollLetter("🌙 Night")).toBe("#");
  });
  it("requires sustained fast rotation and a long list, then moves both ways between real initials", () => {
    const engine = new ClassicQuickScroll(policy);
    expect(engine.move(index, 10, stroke, 0)).toBeNull();
    engine.reset(); expect(enter(engine)).toMatchObject({ letter: "C", key: "10" });
    expect(engine.move(index, 10, { ...stroke, fast: false, detents: 1 }, 250)).toMatchObject({ letter: "D", key: "15" });
    expect(engine.move(index, 15, { ...stroke, detents: -2, degrees: -30 }, 270)).toMatchObject({ letter: "B", key: "5" });
    expect(engine.move(index, 5, { ...stroke, detents: -100 }, 290)).toMatchObject({ letter: "A" });
    expect(engine.move(index, 0, { ...stroke, detents: 100 }, 310)).toMatchObject({ letter: "Z" });
    expect(engine.move(quickScrollIndex(rows.slice(0, 100)), 0, stroke, 330)).toBeNull();
  });
  it("slow strokes, alternating directions and pauses never accumulate into a false activation", () => {
    const engine = new ClassicQuickScroll(policy);
    for (let i = 0; i < 40; i++) expect(engine.move(index, 0, { ...stroke, fast: false }, i * 20)).toBeNull();
    engine.reset();
    for (let i = 0; i < 40; i++) expect(engine.move(index, 0, { ...stroke, degrees: i % 2 ? -30 : 30 }, i * 20)).toBeNull();
    engine.reset();
    for (let i = 0; i < 40; i++) expect(engine.move(index, 0, stroke, i * 400)).toBeNull();
  });
  it("tolerates one slow or coalesced frame in a fast turn without accepting slow strokes", () => {
    const engine = new ClassicQuickScroll(policy);
    for (let i = 0; i < 6; i++) engine.move(index, 10, stroke, i * 20);
    expect(engine.move(index, 10, { ...stroke, fast: false }, 150)).toBeNull();
    let result;
    for (let i = 0; i < 6; i++) result = engine.move(index, 10, stroke, 170 + i * 20);
    expect(result).toMatchObject({ letter: "C" });
  });
  it("lifting, idling and losing the eligible collection release the letter mode", () => {
    const engine = new ClassicQuickScroll(policy); enter(engine); engine.reset();
    expect(engine.move(index, 10, stroke, 300)).toBeNull();
    engine.reset(); enter(engine);
    expect(engine.move(index, 10, stroke, 1500)).toBeNull();
    engine.reset(); enter(engine);
    expect(engine.move({ groups: [], count: 0, letters: [] }, 0, stroke, 250)).toBeNull();
    expect(engine.move(index, 0, stroke, 270)).toBeNull();
  });
});
