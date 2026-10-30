import { Player } from "./Player";
import { createLocalAudio } from "./localAudio";
import { getDemoTracks } from "./demoTracks";
import { createLocalLibrary } from "./localLibrary";
import { createLibraryMutations } from "./libraryMutations";
import { readLocalMetadata } from "./readLocalMetadata";
import { clearFiles, readFiles, saveFiles, removeFile } from "./storage";

import { createSessionPersistence } from "./sessionPersistence";
import { clearRatings, setRating } from "./ratings";
import { clearPlaylists, removeFromPlaylists } from "./playlists";
export const player = new Player(createLocalAudio, URL.revokeObjectURL);
let removedDemos: string[] = [];
try {
  const hidden = JSON.parse(
    localStorage.getItem("reipod-removed-demos") ?? "[]",
  );
  removedDemos = Array.isArray(hidden)
    ? hidden.filter((id) => typeof id === "string")
    : [];
} catch {
  /* Optional browser data. */
}
const persistence = createSessionPersistence({
  player,
  read: key => localStorage.getItem(key),
  write: (key, value) => localStorage.setItem(key, value),
  schedule: (callback, delay) => {
    const timer = setTimeout(callback, delay);
    return () => clearTimeout(timer);
  },
  onPageHide: callback => {
    window.addEventListener("pagehide", callback);
    return () => window.removeEventListener("pagehide", callback);
  },
});
let showDemos = true;
try {
  showDemos = localStorage.getItem("reipod-demos") !== "hidden";
} catch {
  /* Storage can be unavailable in a private browser. */
}
if (showDemos)
  player.add(
    getDemoTracks(import.meta.env.BASE_URL).filter(
      (track) => !removedDemos.includes(track.id),
    ),
  );
export function addDemos() {
  removedDemos = [];
  try {
    localStorage.removeItem("reipod-removed-demos");
    localStorage.removeItem("reipod-demos");
  } catch {
    /* Optional storage. */
  }
  player.add(getDemoTracks(import.meta.env.BASE_URL));
}

const events = new Set<(message: string) => void>();
export const onLibraryNotice = (listener: (message: string) => void) => {
  events.add(listener);
  return () => {
    events.delete(listener);
  };
};
const notify = (message: string) =>
  events.forEach((listener) => listener(message));

const library = createLocalLibrary<File>({
  player, createUrl: file => URL.createObjectURL(file), revokeUrl: URL.revokeObjectURL,
  readMetadata: readLocalMetadata, readFiles, saveFiles, now: Date.now,
  finishRestore: () => persistence.finishRestore(), notify,
});
export const importFiles = library.importFiles;
export const initializeLibrary = library.initialize;
const mutations = createLibraryMutations({
  player, library, clearSavedSession: () => persistence.clearSavedSession(),
  removeSavedTrack(track) {
    if (track.kind !== "demo") return removeFile(track.id);
    const next = [...new Set([...removedDemos, track.id])];
    localStorage.setItem("reipod-removed-demos", JSON.stringify(next));
    removedDemos = next;
  },
  clearSavedFiles: clearFiles,
  hideDemos: () => localStorage.setItem("reipod-demos", "hidden"),
  removeRating: id => setRating(id, 0), removeFromPlaylists, clearRatings, clearPlaylists, notify,
});
export const removeTrack = mutations.removeTrack;
export const clearLibrary = mutations.clearLibrary;
persistence.restoreSettings();

// musicServices owns the single media-session publisher for every provider.

if (import.meta.hot)
  import.meta.hot.dispose(() => {
    mutations.dispose();
    library.invalidate();
    persistence.dispose();
    player.clear();
  });
