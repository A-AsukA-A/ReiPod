import { useSyncExternalStore } from "react";
import { parsePreferences } from "./classicSettings";
import type { Preferences } from "./classicSettings";
export type { Preferences } from "./classicSettings";
let preferences = parsePreferences(null);
try {
  preferences = parsePreferences(
    JSON.parse(localStorage.getItem("reipod-appearance") ?? "null"),
  );
} catch {
  /* Defaults also migrate older appearance-only settings. */
}
const listeners = new Set<() => void>();
export function setPreferences(patch: Partial<Preferences>) {
  preferences = parsePreferences({ ...preferences, ...patch });
  try {
    localStorage.setItem("reipod-appearance", JSON.stringify(preferences));
  } catch {
    /* Controls remain usable for this session. */
  }
  listeners.forEach((listener) => listener());
}
export const getPreferences = () => preferences;
export const usePreferences = () =>
  useSyncExternalStore((callback) => {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  }, getPreferences);
