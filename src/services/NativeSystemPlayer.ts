import { Player } from "../player/Player";
import type { PlaybackStatus } from "../player/Player";
import {
  nativeMusicRequest,
  nativePersistentId,
  nativeTrack,
} from "./nativeMusic";
import type { NativePlayback } from "./nativeMusic";

/** Owns the interface state; iOS owns the full queue and continues in background. */
export class NativeSystemPlayer extends Player {
  private sequence = -1;
  private nativeIntent = 0;
  private issuedQueue = false;
  private queueKnown = false;
  constructor() {
    super(() => { throw new Error("System music does not use web audio"); }, URL.revokeObjectURL);
    this.syncExternalPlayback({ volumeControl: false });
  }
  adopt(snapshot: NativePlayback) {
    if (snapshot.sequence <= this.sequence) return;
    this.sequence = snapshot.sequence;
    const current = snapshot.current;
    if (
      current &&
      !this.getSnapshot().tracks.some((track) => track.id === `ios-song:${current.id}`)
    ) this.add([nativeTrack(current)]);
    const currentId = snapshot.currentId
      ? `ios-song:${snapshot.currentId}`
      : null;
    const ids = new Set(this.getSnapshot().tracks.map((track) => track.id));
    const queue = snapshot.queue
      .map((id) => `ios-song:${id}`)
      .filter((id) => ids.has(id));
    if (snapshot.queueKnown && !this.issuedQueue)
      super.setQueue(queue, currentId ?? undefined);
    this.queueKnown = snapshot.queueKnown;
    this.syncExternalPlayback({
      currentId: currentId && ids.has(currentId) ? currentId : null,
      queue,
      status: snapshot.status,
      position: Number.isFinite(snapshot.position)
        ? Math.max(0, snapshot.position)
        : 0,
      duration: Number.isFinite(snapshot.duration)
        ? Math.max(0, snapshot.duration)
        : 0,
      volume: Number.isFinite(snapshot.volume)
        ? Math.max(0, Math.min(1, snapshot.volume))
        : 1,
      volumeControl: false,
      repeat: snapshot.repeat,
      error: snapshot.status === "playing" ? null : this.getSnapshot().error,
    });
  }
  private async command(
    action:
      "setQueue" | "play" | "pause" | "next" | "previous" | "seek" | "repeat",
    payload: Parameters<typeof nativeMusicRequest>[1] = {},
    optimistic?: PlaybackStatus,
  ) {
    const intent = ++this.nativeIntent;
    if (optimistic)
      this.syncExternalPlayback({ status: optimistic, error: null });
    try {
      const response = await nativeMusicRequest(action, payload);
      if (intent !== this.nativeIntent) return;
      this.syncExternalPlayback({ error: null });
      if (response.playback) this.adopt(response.playback);
    } catch (error) {
      if (intent === this.nativeIntent)
        this.syncExternalPlayback({
          status: "error",
          error:
            error instanceof Error ? error.message : "系统音乐操作失败，请重试",
        });
    }
  }
  override select(id: string, autoplay = true, startAt = 0) {
    const persistentId = nativePersistentId(id);
    if (
      !persistentId ||
      !this.getSnapshot().tracks.some((track) => track.id === id)
    )
      return;
    if (!this.getSnapshot().queue.includes(id)) this.setQueue([id], id);
    const ids = this.getSnapshot()
      .queue.map(nativePersistentId)
      .filter((value): value is string => value !== null);
    this.issuedQueue = true;
    this.queueKnown = true;
    this.syncExternalPlayback({
      currentId: id,
      position: startAt,
      duration:
        this.getSnapshot().tracks.find((track) => track.id === id)?.duration ??
        0,
    });
    void this.command(
      "setQueue",
      { ids, selectedId: persistentId, autoplay, seconds: startAt },
      "loading",
    );
  }
  override activate(id: string, queue?: string[]) {
    const before = this.getSnapshot();
    const changed =
      !!queue &&
      (queue.length !== before.queue.length ||
        queue.some((entry, index) => entry !== before.queue[index]));
    if (queue) this.setQueue(queue, id);
    if (id === this.getSnapshot().currentId && !changed) {
      if (this.getSnapshot().status !== "playing") this.play();
      return;
    }
    this.select(id, true, id === before.currentId ? before.position : 0);
  }
  override play() {
    void this.command("play", {}, "loading");
  }
  override pause() {
    void this.command("pause", {}, "paused");
  }
  override toggle() {
    if (["playing", "loading", "buffering"].includes(this.getSnapshot().status))
      this.pause();
    else this.play();
  }
  override next() {
    void this.command("next");
  }
  override previous() {
    void this.command("previous");
  }
  override seek(position: number) {
    if (Number.isFinite(position))
      void this.command("seek", {
        seconds: Math.max(0, Math.min(position, this.getSnapshot().duration)),
      });
  }
  override setVolume(_volume: number) {
    /* System output volume belongs to the iPhone side buttons. */
  }
  override setShuffle(shuffle: boolean) {
    super.setShuffle(shuffle);
    this.rebuildQueue();
  }
  override setRepeat(repeat: "off" | "one" | "all") {
    super.setRepeat(repeat);
    void this.command("repeat", { mode: repeat });
  }
  override playNext(id: string) {
    super.playNext(id);
    this.rebuildQueue();
  }
  private rebuildQueue() {
    const state = this.getSnapshot();
    if (!this.queueKnown) {
      this.syncExternalPlayback({
        error: "系统的现有队列不可读取，请先在 ReiPod 中选择歌曲或歌单",
      });
      return;
    }
    if (state.currentId)
      this.select(state.currentId, state.status === "playing", state.position);
  }
  override clear() {
    this.nativeIntent++;
    this.issuedQueue = false;
    this.queueKnown = false;
    this.sequence = -1;
    super.clear();
    this.syncExternalPlayback({ volumeControl: false });
  }
}
