import { useSyncExternalStore } from "react";
export function parseRatings(input: unknown): Record<string, number> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  return Object.fromEntries(
    Object.entries(input).filter(
      ([, value]) =>
        typeof value === "number" &&
        Number.isInteger(value) &&
        value >= 1 &&
        value <= 5,
    ),
  );
}
let ratings: Record<string, number> = {};
try {
  ratings = parseRatings(
    JSON.parse(localStorage.getItem("reipod-ratings") ?? "{}"),
  );
} catch {
  /* Optional local ratings. */
}
const listeners = new Set<() => void>();
function save(next: Record<string, number>) {
  ratings = next;
  let persisted = true;
  try {
    localStorage.setItem("reipod-ratings", JSON.stringify(next));
  } catch {
    persisted = false;
  }
  listeners.forEach((listener) => listener());
  return persisted;
}
export function setRating(id: string, value: number) {
  if (!Number.isFinite(value)) return false;
  const next = { ...ratings };
  const rating = Math.max(0, Math.min(5, Math.round(value)));
  if (rating) next[id] = rating;
  else delete next[id];
  return save(next);
}
export const clearRatings = () => save({});
export const useRatings = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => ratings,
  );
