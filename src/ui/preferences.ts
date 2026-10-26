import { useSyncExternalStore } from "react";
export type Preferences = {
  finish: "silver" | "black";
  background: "warm" | "dark";
  clickSound: boolean;
};
let preferences: Preferences = {
  finish: "silver",
  background: "warm",
  clickSound: true,
};
try {
  const saved = JSON.parse(localStorage.getItem("reipod-appearance") ?? "null");
  if (saved)
    preferences = {
      finish: saved.finish === "black" ? "black" : "silver",
      background: saved.background === "dark" ? "dark" : "warm",
      clickSound: saved.clickSound !== false,
    };
} catch {
  /* Use defaults when storage is unavailable. */
}
const listeners = new Set<() => void>();
export function setPreferences(patch: Partial<Preferences>) {
  preferences = { ...preferences, ...patch };
  try {
    localStorage.setItem("reipod-appearance", JSON.stringify(preferences));
  } catch {
    /* Controls still work for this session. */
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
