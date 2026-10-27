import { useSyncExternalStore } from "react";
export type Playlist = { id: string; name: string; trackIds: string[] };

export function parsePlaylists(input: unknown): Playlist[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  return input.flatMap((entry) => {
    if (
      !entry ||
      typeof entry !== "object" ||
      typeof entry.id !== "string" ||
      typeof entry.name !== "string" ||
      !entry.name.trim() ||
      seen.has(entry.id)
    )
      return [];
    seen.add(entry.id);
    return [
      {
        id: entry.id,
        name: entry.name.trim().slice(0, 60),
        trackIds: Array.isArray(entry.trackIds)
          ? [
              ...new Set<string>(
                entry.trackIds.filter((id: unknown) => typeof id === "string"),
              ),
            ]
          : [],
      },
    ];
  });
}
let playlists: Playlist[] = [];
try {
  playlists = parsePlaylists(
    JSON.parse(localStorage.getItem("reipod-playlists") ?? "[]"),
  );
} catch {
  /* Empty until the user creates a playlist. */
}
const listeners = new Set<() => void>();
function save(next: Playlist[]) {
  playlists = next;
  let persisted = true;
  try {
    localStorage.setItem("reipod-playlists", JSON.stringify(next));
  } catch {
    persisted = false;
  }
  listeners.forEach((listener) => listener());
  return persisted;
}
export function createPlaylist(name: string) {
  const clean = name.trim().slice(0, 60);
  if (!clean) return null;
  const playlist = { id: crypto.randomUUID(), name: clean, trackIds: [] };
  return { playlist, persisted: save([...playlists, playlist]) };
}
export function renamePlaylist(id: string, name: string) {
  const clean = name.trim().slice(0, 60);
  if (!clean) return false;
  return save(
    playlists.map((item) => (item.id === id ? { ...item, name: clean } : item)),
  );
}
export function deletePlaylist(id: string) {
  return save(playlists.filter((item) => item.id !== id));
}
export function togglePlaylistTrack(id: string, trackId: string) {
  return save(
    playlists.map((item) =>
      item.id !== id
        ? item
        : {
            ...item,
            trackIds: item.trackIds.includes(trackId)
              ? item.trackIds.filter((entry) => entry !== trackId)
              : [...item.trackIds, trackId],
          },
    ),
  );
}
export function removePlaylistTrack(id: string, trackId: string) {
  return save(
    playlists.map((item) =>
      item.id !== id
        ? item
        : {
            ...item,
            trackIds: item.trackIds.filter((entry) => entry !== trackId),
          },
    ),
  );
}
export function removeFromPlaylists(trackId: string) {
  return save(
    playlists.map((item) => ({
      ...item,
      trackIds: item.trackIds.filter((id) => id !== trackId),
    })),
  );
}
export function clearPlaylists() {
  return save([]);
}
export const usePlaylists = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => playlists,
  );
