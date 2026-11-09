import type { WheelRotation } from "../input/WheelGesture";
import type { MenuItem } from "./MenuRows";

export type LetterGroup = { letter: string; key: string; row: number };
export type LetterIndex = { groups: LetterGroup[]; count: number; letters: (string | null)[] };

/** Preserve the actual browse order; never guess pinyin or original sort-as tags. */
export function quickScrollLetter(label: string): string | null {
  const first = [...label.trim().normalize("NFD").replace(/\p{M}/gu, "")][0];
  if (!first) return null;
  if (/^[a-z]$/i.test(first)) return first.toUpperCase();
  return /\p{L}/u.test(first) ? null : "#";
}
export function quickScrollIndex(rows: readonly Pick<MenuItem, "key" | "label" | "aggregate" | "disabled">[]): LetterIndex {
  const groups: LetterGroup[] = [], seen = new Set<string>();
  const letters = rows.map(row => row.disabled || row.aggregate ? null : quickScrollLetter(row.label));
  let count = 0;
  rows.forEach((row, index) => {
    if (row.disabled || row.aggregate) return;
    count++;
    const letter = letters[index];
    if (!letter || seen.has(letter)) return;
    seen.add(letter); groups.push({ letter, key: row.key, row: index });
  });
  return { groups, count, letters };
}

type Policy = { minimumItems: number; enterDegrees: number; streakGap: number; idle: number };
/** Ephemeral wheel recognition only; thresholds are the model's labelled input adaptation. */
export class ClassicQuickScroll {
  private travel = 0;
  private direction = 0;
  private lastTime = -Infinity;
  private burstStart = -Infinity;
  private group: number | null = null;
  constructor(private policy: Policy) {}
  reset() { this.travel = 0; this.direction = 0; this.lastTime = -Infinity; this.burstStart = -Infinity; this.group = null; }
  move(index: LetterIndex, focusedRow: number, rotation: WheelRotation, now: number) {
    if (index.count <= this.policy.minimumItems || index.groups.length < 2) {
      this.reset(); return null;
    }
    if (now - this.lastTime >= this.policy.idle) this.reset();
    if (this.group !== null) {
      this.lastTime = now;
      this.group = Math.max(0, Math.min(index.groups.length - 1, this.group + rotation.detents));
      return index.groups[this.group];
    }
    const direction = Math.sign(rotation.degrees);
    // Coalesced pointer events and an occasional slow frame must not erase an
    // otherwise fast turn. Slow input alone still contributes no fast distance.
    if (now - this.lastTime > this.policy.streakGap || direction !== this.direction ||
        now - this.burstStart >= this.policy.idle) {
      this.travel = 0; this.burstStart = now;
    }
    this.direction = direction;
    this.lastTime = now;
    if (rotation.fast) this.travel += Math.abs(rotation.degrees);
    if (this.travel < this.policy.enterDegrees) return null;
    if (!index.letters[focusedRow]) { this.travel = 0; return null; }
    // Enter at the current letter, then subsequent detents move between initials.
    this.group = 0;
    for (let i = 0; i < index.groups.length; i++)
      if (index.groups[i].row <= focusedRow) this.group = i;
    return index.groups[this.group];
  }
}
