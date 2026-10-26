export type Track = {
  id: string;
  title: string;
  artist?: string;
  kind?: "local" | "demo";
  filename: string;
  size: number;
  url: string;
};
export type PlaybackStatus =
  "idle" | "loading" | "playing" | "paused" | "buffering" | "ended" | "error";
export type PlayerState = {
  tracks: Track[];
  currentId: string | null;
  status: PlaybackStatus;
  position: number;
  duration: number;
  volume: number;
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
    currentId: null,
    status: "idle",
    position: 0,
    duration: 0,
    volume: 0.8,
    error: null,
  };
  private listeners = new Set<() => void>();
  private audio: AudioPort | null = null;
  private session = 0;
  private intent = 0;
  private wantsPlay = false;
  private cleanups: (() => void)[] = [];

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
        this.revoke(track.url);
        return false;
      }
      ids.add(track.id);
      return true;
    });
    this.update({ tracks: [...this.state.tracks, ...unique] });
    return unique.length;
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

  select(id: string, autoplay = true) {
    const track = this.state.tracks.find((item) => item.id === id);
    if (!track) return;
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
      position: 0,
      duration: 0,
      error: null,
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
    on("loadedmetadata", () => {
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
      const index = this.state.tracks.findIndex((item) => item.id === id);
      if (index < this.state.tracks.length - 1)
        this.select(this.state.tracks[index + 1].id);
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
          audio.error?.code === 2
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

  play() {
    if (!this.audio) {
      if (this.state.tracks[0]) this.select(this.state.tracks[0].id);
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
    const { tracks, currentId } = this.state;
    if (!tracks.length) return;
    const index = tracks.findIndex((track) => track.id === currentId);
    this.select(
      tracks[
        index < 0 ? 0 : (index + direction + tracks.length) % tracks.length
      ].id,
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
  setVolume(volume: number) {
    const value = Math.max(0, Math.min(1, volume));
    if (this.audio) this.audio.volume = value;
    this.update({ volume: value });
  }
  clear() {
    this.session++;
    this.intent++;
    this.wantsPlay = false;
    this.release();
    this.state.tracks.forEach((track) => this.revoke(track.url));
    this.update({
      tracks: [],
      currentId: null,
      status: "idle",
      position: 0,
      duration: 0,
      error: null,
    });
  }
}
