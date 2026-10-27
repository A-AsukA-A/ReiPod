import type { PlaybackSession } from "./session";
import { shuffled, shuffleAfterCurrent } from "./ordering";

export type Track = {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  albumArtist?: string;
  genres?: string[];
  composers?: string[];
  artwork?: string;
  trackNumber?: number;
  duration?: number;
  importedAt?: number;
  lyrics?: { time: number; text: string }[];
  kind?: "local" | "demo" | "apple-music";
  filename: string;
  size: number;
  url: string;
};
export type PlaybackStatus =
  "idle" | "loading" | "playing" | "paused" | "buffering" | "ended" | "error";
export type PlayerState = {
  tracks: Track[];
  queue: string[];
  shuffle: boolean;
  repeat: "off" | "all" | "one";
  favorites: string[];
  currentId: string | null;
  status: PlaybackStatus;
  position: number;
  duration: number;
  volume: number;
  volumeControl: boolean;
  error: string | null;
};

export type AudioPort = Pick<
  HTMLAudioElement,
  | "src"
  | "preload"
  | "volume"
  | "paused"
  | "currentTime"
  | "duration"
  | "error"
  | "play"
  | "pause"
  | "load"
  | "addEventListener"
  | "removeEventListener"
  | "removeAttribute"
>;

/** One shared queue, one live backend. Themes only send commands. */
export class Player {
  private state: PlayerState = {
    tracks: [],
    queue: [],
    shuffle: false,
    repeat: "off",
    favorites: [],
    currentId: null,
    status: "idle",
    position: 0,
    duration: 0,
    volume: 0.8,
    volumeControl: true,
    error: null,
  };
  private listeners = new Set<() => void>();
  private audio: AudioPort | null = null;
  private session = 0;
  private intent = 0;
  private wantsPlay = false;
  private cleanups: (() => void)[] = [];
  private naturalOrder: string[] = [];
  private queueIsLibrary = true;
  private volumeLimit = 1;

  constructor(
    private createAudio: () => AudioPort = () => new Audio(),
    private revoke = URL.revokeObjectURL,
  ) {}
  getSnapshot = () => this.state;
  subscribe = (callback: () => void) => {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  };
  private update(patch: Partial<PlayerState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  add(tracks: Track[]) {
    const ids = new Set(this.state.tracks.map((track) => track.id));
    const unique = tracks.filter((track) => {
      if (ids.has(track.id)) {
        if (track.url.startsWith("blob:")) this.revoke(track.url);
        return false;
      }
      ids.add(track.id);
      return true;
    });
    if (this.queueIsLibrary)
      this.naturalOrder.push(...unique.map((track) => track.id));
    this.update({
      tracks: [...this.state.tracks, ...unique],
      queue: this.queueIsLibrary
        ? [...this.state.queue, ...unique.map((track) => track.id)]
        : this.state.queue,
    });
    return unique.length;
  }

  updateTrack(id: string, patch: Partial<Track>) {
    const existing = this.state.tracks.find((track) => track.id === id);
    if (!existing) {
      if (patch.artwork?.startsWith("blob:")) this.revoke(patch.artwork);
      return;
    }
    if (
      patch.artwork &&
      existing.artwork?.startsWith("blob:") &&
      existing.artwork !== patch.artwork
    )
      this.revoke(existing.artwork);
    this.update({
      tracks: this.state.tracks.map((track) =>
        track.id === id
          ? { ...track, ...patch, id: track.id, url: track.url }
          : track,
      ),
    });
  }

  setQueue(ids: string[], selectedId?: string) {
    const valid = new Set(this.state.tracks.map((track) => track.id));
    const order = [...new Set(ids)].filter((id) => valid.has(id));
    this.naturalOrder = order;
    this.queueIsLibrary =
      order.length === this.state.tracks.length &&
      order.every((id, index) => this.state.tracks[index]?.id === id);
    const current = selectedId ?? this.state.currentId;
    const queue = this.state.shuffle
      ? current && order.includes(current)
        ? [current, ...shuffled(order.filter((id) => id !== current))]
        : shuffled(order)
      : order;
    this.update({ queue });
  }

  playNext(id: string) {
    if (
      id === this.state.currentId ||
      !this.state.tracks.some((track) => track.id === id)
    )
      return;
    const insert = (order: string[]) => {
      const next = order.filter((item) => item !== id);
      const currentIndex = this.state.currentId
        ? next.indexOf(this.state.currentId)
        : -1;
      next.splice(currentIndex + 1, 0, id);
      return next;
    };
    this.naturalOrder = insert(this.naturalOrder);
    this.queueIsLibrary = false;
    this.update({ queue: insert(this.state.queue) });
  }

  setShuffle(shuffle: boolean) {
    if (shuffle === this.state.shuffle) return;
    this.update({
      shuffle,
      queue: shuffle
        ? shuffleAfterCurrent(this.state.queue, this.state.currentId)
        : [...this.naturalOrder],
    });
  }

  setRepeat(repeat: PlayerState["repeat"]) {
    this.update({ repeat });
  }
  setFavorites(favorites: string[]) {
    this.update({ favorites: [...new Set(favorites)] });
  }
  toggleFavorite(id: string) {
    if (!this.state.tracks.some((track) => track.id === id)) return;
    this.setFavorites(
      this.state.favorites.includes(id)
        ? this.state.favorites.filter((item) => item !== id)
        : [...this.state.favorites, id],
    );
  }

  private release() {
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
    if (this.audio) {
      this.audio.pause();
      this.audio.removeAttribute("src");
      this.audio.load();
      this.audio = null;
    }
  }

  select(id: string, autoplay = true, startAt = 0) {
    const track = this.state.tracks.find((item) => item.id === id);
    if (!track) return;
    if (!this.state.queue.includes(id))
      this.setQueue(this.state.tracks.map((item) => item.id));
    this.session++;
    this.intent++;
    this.release();
    const session = this.session;
    const audio = this.createAudio();
    this.audio = audio;
    this.wantsPlay = autoplay;
    audio.preload = "metadata";
    audio.volume = this.state.volume;
    this.update({
      currentId: id,
      status: "loading",
      position: startAt,
      duration: 0,
      error: null,
      volumeControl: Math.abs(audio.volume - this.state.volume) < 0.01,
    });
    const on = (event: string, callback: () => void) => {
      const guarded = () => {
        if (this.session === session && this.audio === audio) callback();
      };
      audio.addEventListener(event, guarded);
      this.cleanups.push(() => audio.removeEventListener(event, guarded));
    };
    const syncTime = () =>
      this.update({
        position: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
        duration: Number.isFinite(audio.duration) ? audio.duration : 0,
      });
    let pendingStart = Math.max(0, startAt);
    const restorePosition = () => {
      if (!pendingStart || !Number.isFinite(audio.duration) || !audio.duration)
        return;
      try {
        audio.currentTime = Math.min(pendingStart, audio.duration);
        pendingStart = 0;
      } catch {
        /* Retry when the resource becomes seekable. */
      }
    };
    on("canplay", () => {
      restorePosition();
      syncTime();
    });
    on("loadedmetadata", () => {
      restorePosition();
      syncTime();
      if (!this.wantsPlay) this.update({ status: "paused" });
    });
    on("durationchange", syncTime);
    on("timeupdate", syncTime);
    on("playing", () => {
      if (!this.wantsPlay) {
        audio.pause();
        return;
      }
      this.update({ status: "playing", error: null });
    });
    on("pause", () => {
      if (this.state.status !== "error" && this.state.status !== "ended") {
        this.wantsPlay = false;
        this.intent++;
        this.update({ status: "paused" });
      }
    });
    on("waiting", () => {
      if (this.wantsPlay) this.update({ status: "buffering" });
    });
    on("ended", () => {
      const index = this.state.queue.indexOf(id);
      if (this.state.repeat === "one") this.select(id);
      else if (index >= 0 && index < this.state.queue.length - 1)
        this.select(this.state.queue[index + 1]);
      else if (this.state.repeat === "all" && this.state.queue.length)
        this.select(this.state.queue[0]);
      else {
        this.wantsPlay = false;
        this.update({ status: "ended", position: this.state.duration });
      }
    });
    on("error", () => {
      this.wantsPlay = false;
      this.intent++;
      this.update({
        status: "error",
        error:
          track.kind === "apple-music"
            ? "Apple Music 播放失败，请检查订阅、地区或网络后重试。"
            : audio.error?.code === 2
              ? track.kind === "demo"
                ? "试听音乐读取中断，请检查网络后重试。"
                : "文件读取中断，请重新导入这首歌。"
              : "这首歌无法解码或文件已损坏。请换用 MP3、AAC / M4A 或 PCM WAV。",
      });
    });
    audio.src = track.url;
    // Calling play synchronously keeps Safari's user activation from a wheel press.
    if (autoplay) this.play();
    else audio.load();
  }

  /** Opening the current song keeps its session and progress. */
  activate(id: string, queue?: string[]) {
    if (
      queue &&
      (id !== this.state.currentId ||
        queue.length !== this.naturalOrder.length ||
        queue.some((item, index) => this.naturalOrder[index] !== item))
    )
      this.setQueue(queue, id);
    if (id === this.state.currentId && this.audio) {
      if (!this.wantsPlay) this.play();
      return;
    }
    this.select(id);
  }

  play() {
    if (!this.audio) {
      const first = this.state.queue[0] ?? this.state.tracks[0]?.id;
      if (first) this.select(first);
      return;
    }
    if (this.state.status === "error" && this.state.currentId) {
      this.select(this.state.currentId);
      return;
    }
    if (this.state.status === "ended") this.audio.currentTime = 0;
    const audio = this.audio;
    const session = this.session;
    const intent = ++this.intent;
    this.wantsPlay = true;
    this.update({ status: "loading", error: null });
    void audio.play().catch((error: unknown) => {
      if (
        session !== this.session ||
        intent !== this.intent ||
        !this.wantsPlay ||
        this.state.status === "error"
      )
        return;
      this.wantsPlay = false;
      const name = error instanceof Error ? error.name : "";
      this.update(
        name === "NotAllowedError"
          ? {
              status: "paused",
              error: "浏览器需要一次手动播放，请按播放键重试。",
            }
          : {
              status: "error",
              error: "播放失败，请重试或换用浏览器支持的音频文件。",
            },
      );
    });
  }
  pause() {
    this.wantsPlay = false;
    this.intent++;
    this.audio?.pause();
    if (this.audio && this.state.status !== "error")
      this.update({ status: "paused" });
  }
  toggle() {
    if (this.wantsPlay) this.pause();
    else this.play();
  }
  next() {
    this.skip(1);
  }
  previous() {
    if (this.state.position > 3 && this.audio) {
      this.seek(0);
      return;
    }
    this.skip(-1);
  }
  private skip(direction: number) {
    const { queue, currentId } = this.state;
    if (!queue.length) return;
    const index = currentId ? queue.indexOf(currentId) : -1;
    this.select(
      queue[index < 0 ? 0 : (index + direction + queue.length) % queue.length],
    );
  }
  seek(position: number) {
    if (!this.audio || !this.state.duration) return;
    try {
      this.audio.currentTime = Math.max(
        0,
        Math.min(position, this.state.duration),
      );
      this.update({ position: this.audio.currentTime });
    } catch {
      /* A not-yet-seekable resource will report its next real timeupdate. */
    }
  }
  setVolumeLimit(limit: number) {
    if (!Number.isFinite(limit)) return;
    this.volumeLimit = Math.max(0.1, Math.min(1, limit));
    if (this.state.volume > this.volumeLimit) this.setVolume(this.volumeLimit);
  }
  setVolume(volume: number) {
    if (!Number.isFinite(volume)) return;
    const value = Math.max(0, Math.min(this.volumeLimit, volume));
    if (this.audio) this.audio.volume = value;
    this.update({
      volume: this.audio ? this.audio.volume : value,
      volumeControl: !this.audio || Math.abs(this.audio.volume - value) < 0.01,
    });
  }
  getSession(): PlaybackSession {
    return {
      currentId: this.state.currentId,
      position: this.state.position,
      volume: this.state.volume,
      queue: this.state.queue,
      naturalOrder: [...this.naturalOrder],
    };
  }
  restoreSession(saved: PlaybackSession) {
    if (this.state.currentId) return; // A user action wins over asynchronous restoration.
    this.setVolume(saved.volume);
    const valid = new Set(this.state.tracks.map((track) => track.id));
    const queue = saved.queue.filter((id) => valid.has(id));
    const natural = saved.naturalOrder.filter((id) => valid.has(id));
    if (!saved.currentId || !valid.has(saved.currentId)) return;
    if (!queue.includes(saved.currentId)) queue.unshift(saved.currentId);
    this.naturalOrder = [...new Set([...natural, ...queue])];
    this.queueIsLibrary =
      this.naturalOrder.length === this.state.tracks.length &&
      this.naturalOrder.every(
        (id, index) => this.state.tracks[index]?.id === id,
      );
    this.update({ queue });
    this.select(saved.currentId, false, saved.position);
  }
  remove(id: string) {
    const track = this.state.tracks.find((item) => item.id === id);
    if (!track) return;
    const wasCurrent = this.state.currentId === id;
    const resume = this.wantsPlay;
    const oldIndex = this.state.queue.indexOf(id);
    const queue = this.state.queue.filter((item) => item !== id);
    if (wasCurrent) {
      this.session++;
      this.intent++;
      this.wantsPlay = false;
      this.release();
    }
    this.naturalOrder = this.naturalOrder.filter((item) => item !== id);
    this.update({
      tracks: this.state.tracks.filter((item) => item.id !== id),
      queue,
      favorites: this.state.favorites.filter((item) => item !== id),
      ...(wasCurrent
        ? {
            currentId: null,
            status: "idle" as const,
            position: 0,
            duration: 0,
            error: null,
          }
        : {}),
    });
    if (track.url.startsWith("blob:")) this.revoke(track.url);
    if (track.artwork?.startsWith("blob:")) this.revoke(track.artwork);
    if (wasCurrent && queue.length)
      this.select(
        queue[Math.min(Math.max(oldIndex, 0), queue.length - 1)],
        resume,
      );
  }
  clear() {
    this.session++;
    this.intent++;
    this.wantsPlay = false;
    this.release();
    this.state.tracks.forEach((track) => {
      if (track.url.startsWith("blob:")) this.revoke(track.url);
      if (track.artwork?.startsWith("blob:")) this.revoke(track.artwork);
    });
    this.naturalOrder = [];
    this.queueIsLibrary = true;
    this.update({
      tracks: [],
      queue: [],
      favorites: [],
      currentId: null,
      status: "idle",
      position: 0,
      duration: 0,
      error: null,
    });
  }
}
