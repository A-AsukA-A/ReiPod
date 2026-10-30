import type { Player, Track } from "./Player";

export type RemoveTrackResult = { removed: boolean; persistenceError?: "track" | "related-data" };
type Context = {
  player: Pick<Player, "getSnapshot" | "remove" | "clear">;
  library: { forget(id: string): void; invalidate(): void };
  clearSavedSession: () => void;
  removeSavedTrack: (track: Track) => void | Promise<void>;
  clearSavedFiles: () => Promise<void>;
  hideDemos: () => void;
  removeRating: (id: string) => boolean;
  removeFromPlaylists: (id: string) => boolean;
  clearRatings: () => boolean;
  clearPlaylists: () => boolean;
  notify: (message: string) => void;
};
const persist = (action: () => boolean | void) => {
  try { return action() !== false; } catch { return false; }
};
const run = (action: () => void | Promise<void>) => {
  try { return Promise.resolve(action()); } catch (error) { return Promise.reject(error); }
};

/** Coordinate destructive library commands without owning browser storage or a second queue. */
export function createLibraryMutations({ player, library, clearSavedSession, removeSavedTrack,
  clearSavedFiles, hideDemos, removeRating, removeFromPlaylists, clearRatings, clearPlaylists, notify }: Context) {
  let epoch = 0, disposed = false;
  type Pending = { url: string; generation: number; promise: Promise<RemoveTrackResult> };
  const pending = new Map<string, Pending>();
  return {
    removeTrack(id: string): Promise<RemoveTrackResult> {
      const track = player.getSnapshot().tracks.find(item => item.id === id);
      if (!track || disposed) return Promise.resolve({ removed: false });
      const generation = epoch;
      const previous = pending.get(id);
      if (previous?.url === track.url && previous.generation === generation) return previous.promise;
      const current = () => !disposed && generation === epoch &&
        player.getSnapshot().tracks.some(item => item.id === id && item.url === track.url);
      // Submit before returning so later clear/import storage commands retain their order.
      const saving = run(() => removeSavedTrack(track));
      const entry: Pending = { url: track.url, generation, promise: saving.then((): RemoveTrackResult => {
        if (!current()) return { removed: false };
        library.forget(id);
        const ratingSaved = persist(() => removeRating(id));
        const playlistsSaved = persist(() => removeFromPlaylists(id));
        player.remove(id);
        return ratingSaved && playlistsSaved ? { removed: true }
          : { removed: true, persistenceError: "related-data" };
      }, (): RemoveTrackResult => current() ? { removed: false, persistenceError: "track" } : { removed: false })
        .finally(() => { if (pending.get(id) === entry) pending.delete(id); }) };
      pending.set(id, entry);
      return entry.promise;
    },
    clearLibrary(): Promise<boolean> {
      if (disposed) return Promise.resolve(false);
      const generation = ++epoch;
      pending.clear();
      library.invalidate();
      clearSavedSession();
      const playlistsSaved = persist(clearPlaylists);
      const ratingsSaved = persist(clearRatings);
      const demosSaved = persist(hideDemos);
      player.clear();
      return run(clearSavedFiles).then(() => true, () => false).then(filesSaved => {
        if (disposed || generation !== epoch) return false;
        const relatedSaved = playlistsSaved && ratingsSaved && demosSaved;
        if (!filesSaved && !relatedSaved) notify("曲库文件及部分评级、歌单或试听偏好未能清理保存，请重试");
        else if (!filesSaved) notify("曲库保存状态清理失败，请重试");
        else if (!relatedSaved) notify("部分评级、歌单或试听偏好未能保存，本次清空仍生效");
        return filesSaved && relatedSaved;
      });
    },
    dispose() { disposed = true; epoch++; pending.clear(); },
  };
}
