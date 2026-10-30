import type { Player } from "./Player";
import { readSession } from "./session";

type Context = {
  player: Pick<Player, "getSession" | "getSnapshot" | "subscribe" | "restoreSession" |
    "setRepeat" | "setFavorites" | "setShuffle" | "setQueue">;
  read: (key: string) => string | null;
  write: (key: string, value: string) => void;
  schedule: (callback: () => void, delay: number) => () => void;
  onPageHide: (callback: () => void) => () => void;
};

/** Local playback persistence policy. Browser storage, timers and lifecycle are injected. */
export function createSessionPersistence({ player, read, write, schedule, onPageHide }: Context) {
  const readJson = (key: string): unknown => {
    try { return JSON.parse(read(key) ?? "null"); }
    catch { return null; }
  };
  let savedSession = readSession(readJson("reipod-session"));
  let ready = false, disposed = false;
  let lastSession = "", lastSettings = "";
  let pendingSettings: string | undefined;
  let cancelPending: (() => void) | undefined;
  let stopSettings: (() => void) | undefined;
  const cancelSave = () => { cancelPending?.(); cancelPending = undefined; };
  const flush = () => {
    cancelSave();
    if (disposed) return;
    if (pendingSettings !== undefined) {
      try { write("reipod-playback", pendingSettings); lastSettings = pendingSettings; pendingSettings = undefined; }
      catch { /* Retry after another settled change or pagehide, never per wheel event. */ }
    }
    if (!ready) return;
    const session = player.getSession();
    const text = JSON.stringify({ ...session, position: Math.floor(session.position) });
    if (text === lastSession) return;
    try { write("reipod-session", text); lastSession = text; }
    catch { /* Playback remains available; a future flush may retry. */ }
  };
  const stopSession = player.subscribe(() => {
    if (disposed) return;
    cancelSave();
    cancelPending = schedule(() => { cancelPending = undefined; flush(); }, 200);
  });
  const stopPageHide = onPageHide(flush);
  const saveSettings = () => {
    if (disposed) return;
    const { shuffle, repeat, favorites } = player.getSnapshot();
    const text = JSON.stringify({ shuffle, repeat, favorites });
    if (text === lastSettings) { pendingSettings = undefined; return; }
    if (text === pendingSettings) return;
    try { write("reipod-playback", text); lastSettings = text; pendingSettings = undefined; }
    catch { pendingSettings = text; }
  };
  return {
    flush,
    // Call after initial demos are added so restored shuffle sees the full queue.
    restoreSettings() {
      if (disposed || stopSettings) return;
      const saved = readJson("reipod-playback");
      if (saved && typeof saved === "object") {
        const settings = saved as Record<string, unknown>;
        player.setRepeat(settings.repeat === "all" || settings.repeat === "one" ? settings.repeat : "off");
        player.setFavorites(Array.isArray(settings.favorites)
          ? settings.favorites.filter((id): id is string => typeof id === "string") : []);
        if (settings.shuffle === true) {
          player.setShuffle(true);
          player.setQueue(player.getSnapshot().tracks.map(track => track.id));
        }
      }
      stopSettings = player.subscribe(saveSettings);
    },
    finishRestore() {
      if (disposed) return;
      if (!ready && savedSession) player.restoreSession(savedSession);
      savedSession = null;
      ready = true;
      flush();
    },
    clearSavedSession() {
      if (disposed) return;
      cancelSave(); savedSession = null; ready = true;
    },
    dispose() {
      if (disposed) return;
      disposed = true; ready = false;
      cancelSave(); stopSession(); stopSettings?.(); stopPageHide();
    },
  };
}
