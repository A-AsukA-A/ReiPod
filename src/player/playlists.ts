import { useSyncExternalStore } from "react";
import { onTheGoId } from "./playlistModel";
import type { Playlist } from "./playlistModel";
export { onTheGoId, withOnTheGo } from "./playlistModel";
export type { Playlist } from "./playlistModel";

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
        ...(entry.id !== onTheGoId && Number.isSafeInteger(entry.savedOnTheGo) && entry.savedOnTheGo > 0
          ? { savedOnTheGo: entry.savedOnTheGo } : {}),
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
let playlistsPersisted = true;
function save(next: Playlist[]) {
  playlists = next;
  let persisted = true;
  try {
    localStorage.setItem("reipod-playlists", JSON.stringify(next));
  } catch {
    persisted = false;
  }
  playlistsPersisted = persisted;
  listeners.forEach((listener) => listener());
  return persisted;
}
export function createPlaylist(name: string) {
  const clean = name.trim().slice(0, 60);
  if (!clean) return null;
  // Custom WKWebView schemes may not expose secure-context randomUUID().
  const id = crypto.randomUUID?.() ?? Array.from(
    crypto.getRandomValues(new Uint8Array(16)),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  const playlist = { id, name: clean, trackIds: [] };
  return { playlist, persisted: save([...playlists, playlist]) };
}
export function renamePlaylist(id: string, name: string) {
  if (id === onTheGoId || playlists.find(item => item.id === id)?.savedOnTheGo) return false;
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
  if (id === onTheGoId && !playlists.some(item => item.id === id)) return addToOnTheGo(trackId).persisted;
  if (playlists.find(item => item.id === id)?.savedOnTheGo) return false;
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
  if (playlists.find(item => item.id === id)?.savedOnTheGo) return false;
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
export function addToOnTheGo(trackIds: string | string[]) {
  const existing = playlists.find((item) => item.id === onTheGoId);
  const additions = [...new Set(typeof trackIds === "string" ? [trackIds] : trackIds)]
    .filter(id => !existing?.trackIds.includes(id));
  if (!additions.length)
    return { added: false, persisted: playlistsPersisted };
  return {
    added: true,
    persisted: save(
      existing
        ? playlists.map((item) =>
            item.id === onTheGoId
              ? { ...item, trackIds: [...item.trackIds, ...additions] }
              : item,
          )
        : [
            ...playlists,
            { id: onTheGoId, name: "On-The-Go", trackIds: additions },
          ],
    ),
  };
}

/** Save-and-clear is one durable write. Failed writes leave the working list intact. */
function commitOnTheGo(next: Playlist[]) {
  try { localStorage.setItem("reipod-playlists", JSON.stringify(next)); }
  catch { return false; }
  playlists = next;
  playlistsPersisted = true;
  listeners.forEach(listener => listener());
  return true;
}
export function saveOnTheGo() {
  const working = playlists.find(item => item.id === onTheGoId);
  if (!working?.trackIds.length) return { playlist: null, persisted: true };
  let serial = Math.max(0, ...playlists.map(item => item.savedOnTheGo ?? 0)) + 1;
  if (!Number.isSafeInteger(serial)) return { playlist: null, persisted: false };
  while (playlists.some(item => item.id === `on-the-go-saved:${serial}` || item.name === `New Playlist ${serial}`)) serial++;
  if (!Number.isSafeInteger(serial)) return { playlist: null, persisted: false };
  const playlist: Playlist = { id: `on-the-go-saved:${serial}`, name: `New Playlist ${serial}`,
    trackIds: [...working.trackIds], savedOnTheGo: serial };
  const next = playlists.map(item => item.id === onTheGoId ? { ...item, trackIds: [] } : item);
  const persisted = commitOnTheGo([...next, playlist]);
  return { playlist: persisted ? playlist : null, persisted };
}
export function clearOnTheGo() {
  return commitOnTheGo(playlists.map(item => item.id === onTheGoId ? { ...item, trackIds: [] } : item));
}
export function clearPlaylists() {
  return save([]);
}
export const getPlaylists = () => playlists;
export const usePlaylists = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getPlaylists,
  );
