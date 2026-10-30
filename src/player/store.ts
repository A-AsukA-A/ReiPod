import { Player } from "./Player";
import { createLocalAudio } from "./localAudio";
import { getDemoTracks } from "./demoTracks";
import { createLocalLibrary } from "./localLibrary";
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
export async function removeTrack(id: string) {
  const track = player.getSnapshot().tracks.find((item) => item.id === id);
  if (!track) return false;
  try {
    if (track.kind === "demo") {
      removedDemos = [...new Set([...removedDemos, id])];
      localStorage.setItem(
        "reipod-removed-demos",
        JSON.stringify(removedDemos),
      );
    } else await removeFile(id);
  } catch {
    notify("未能删除已保存的歌曲，请重试");
    return false;
  }
  library.forget(id);
  player.remove(id);
  setRating(id, 0);
  if (!removeFromPlaylists(id)) notify("歌单更改未能保存，本次仍生效");
  return true;
}

export function clearLibrary() {
  library.invalidate();
  persistence.clearSavedSession();
  clearPlaylists();
  clearRatings();
  try {
    localStorage.setItem("reipod-demos", "hidden");
  } catch {
    /* Optional storage. */
  }
  player.clear();
  void clearFiles().catch(() => notify("曲库保存状态清理失败，请重试"));
}
persistence.restoreSettings();

// musicServices owns the single media-session publisher for every provider.

if (import.meta.hot)
  import.meta.hot.dispose(() => {
    library.invalidate();
    persistence.dispose();
    player.clear();
  });
