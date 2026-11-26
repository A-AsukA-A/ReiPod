import { useSyncExternalStore } from "react";
import { parsePlayHistory, recordPlay, type PlayHistory } from "./playHistoryModel";

export type { PlayHistory, PlayHistoryEntry } from "./playHistoryModel";

const STORAGE_KEY = "reipod-play-history-v1";
let playHistory: PlayHistory = {};
try {
  playHistory = parsePlayHistory(
    JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}"),
  );
} catch {
  /* Optional local play history. */
}

const listeners = new Set<() => void>();

function save(next: PlayHistory) {
  playHistory = next;
  let persisted = true;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    persisted = false;
  }
  listeners.forEach((listener) => listener());
  return persisted;
}

export function recordTrackPlay(id: string, at = Date.now()) {
  const next = recordPlay(playHistory, id, at);
  if (next === playHistory) return false;
  return save(next);
}

export const clearPlayHistory = () => save({});

export const usePlayHistory = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => playHistory,
  );
