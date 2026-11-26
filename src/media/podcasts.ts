import { useSyncExternalStore } from "react";
import { player, importFiles } from "../player/store";
let ids: string[] = [];
let positions: Record<string, number> = {};
try {
  ids = JSON.parse(localStorage.getItem("reipod-podcasts") ?? "[]").filter(
    (id: unknown) => typeof id === "string",
  );
  positions = JSON.parse(
    localStorage.getItem("reipod-podcast-positions") ?? "{}",
  );
} catch {
  /* Optional storage. */
}
const listeners = new Set<() => void>();
export const usePodcastIds = () =>
  useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
    () => ids,
  );
let subscribed = false;
function ensureSubscription() {
  if (subscribed) return;
  subscribed = true;
  player.subscribe(() => {
    const state = player.getSnapshot();
    if (
      !state.currentId ||
      !ids.includes(state.currentId) ||
      state.status === "loading"
    )
      return;
    const position = state.status === "ended" ? 0 : Math.floor(state.position);
    if (positions[state.currentId] === position) return;
    positions[state.currentId] = position;
    try {
      localStorage.setItem(
        "reipod-podcast-positions",
        JSON.stringify(positions),
      );
    } catch {
      /* Still playable. */
    }
  });
}
export function importPodcasts(files: File[]) {
  ensureSubscription();
  const result = importFiles(files);
  const tracks = player.getSnapshot().tracks;
  ids = [
    ...new Set([
      ...ids,
      ...files
        .map((file) => `${file.name}:${file.size}:${file.lastModified}`)
        .filter((id) => tracks.some((track) => track.id === id)),
    ]),
  ];
  let persisted = true;
  try {
    localStorage.setItem("reipod-podcasts", JSON.stringify(ids));
  } catch {
    persisted = false;
  }
  listeners.forEach((fn) => fn());
  return { ...result, persisted };
}
export function removePodcast(id: string) {
  const hadId = ids.includes(id);
  const hadPos = Object.hasOwn(positions, id);
  if (hadId) ids = ids.filter((item) => item !== id);
  if (hadPos) delete positions[id];
  let persisted = true;
  try {
    if (hadId) localStorage.setItem("reipod-podcasts", JSON.stringify(ids));
    if (hadPos)
      localStorage.setItem(
        "reipod-podcast-positions",
        JSON.stringify(positions),
      );
  } catch {
    persisted = false;
  }
  if (hadId) listeners.forEach((fn) => fn());
  return persisted;
}
export function clearPodcasts() {
  const hadAny = ids.length > 0 || Object.keys(positions).length > 0;
  ids = [];
  positions = {};
  let persisted = true;
  try {
    localStorage.removeItem("reipod-podcasts");
    localStorage.removeItem("reipod-podcast-positions");
  } catch {
    persisted = false;
  }
  if (hadAny) listeners.forEach((fn) => fn());
  return persisted;
}
export function playPodcast(id: string, queue: string[]) {
  ensureSubscription();
  if (player.getSnapshot().currentId === id) {
    player.activate(id);
    return;
  }
  player.setQueue(queue, id);
  player.select(id, true, Number.isFinite(positions[id]) ? positions[id] : 0);
}
