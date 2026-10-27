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
export function importPodcasts(files: File[]) {
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
    localStorage.setItem("reipod-podcast-positions", JSON.stringify(positions));
  } catch {
    /* Still playable. */
  }
});
export function playPodcast(id: string, queue: string[]) {
  if (player.getSnapshot().currentId === id) {
    player.activate(id);
    return;
  }
  player.setQueue(queue, id);
  player.select(id, true, Number.isFinite(positions[id]) ? positions[id] : 0);
}
