import { Player } from "../player/Player";
import type { AudioPort } from "../player/Player";
import type { MusicKitInstance } from "./musicKit";
import { hasNativeMusic } from "./nativeMusic";
import { NativeSystemPlayer } from "./NativeSystemPlayer";

let kit: MusicKitInstance | undefined;
let active: AppleAudio | undefined;
let queueWork = Promise.resolve();
export function setMusicKitPlayer(instance: MusicKitInstance) {
  kit = instance;
}

/** MusicKit remains the DRM playback engine; Player owns ReiPod's queue/order. */
class AppleAudio extends EventTarget implements AudioPort {
  src = "";
  preload: AudioPort["preload"] = "metadata";
  paused = true;
  error: MediaError | null = null;
  private ready: Promise<void> | undefined;
  private prepared = false;
  private wanted = false;
  private ended = false;
  private time = 0;
  private length = 0;
  private gain = 0.8;
  private cleanups: (() => void)[] = [];
  constructor() {
    super();
    active = this;
    if (!kit) throw new Error("Apple Music 尚未就绪");
    const instance = kit;
    const on = (name: string, callback: () => void) => {
      const listener = () => {
        if (active === this && this.prepared && this.src) callback();
      };
      instance.addEventListener(name, listener);
      this.cleanups.push(() => instance.removeEventListener(name, listener));
    };
    on("playbackTimeDidChange", () => {
      this.time = Number.isFinite(instance.currentPlaybackTime)
        ? instance.currentPlaybackTime
        : 0;
      this.length = instance.currentPlaybackDuration || this.length;
      this.emit("timeupdate");
    });
    on("playbackStateDidChange", () => {
      const states = window.MusicKit!.PlaybackStates;
      if (instance.playbackState === states.playing) {
        this.paused = false;
        this.emit("playing");
      } else if (instance.playbackState === states.paused) {
        this.paused = true;
        this.emit("pause");
      } else if (
        [states.waiting, states.stalled, states.loading].includes(
          instance.playbackState,
        )
      )
        this.emit("waiting");
      else if (
        [states.ended, states.completed].includes(instance.playbackState) &&
        !this.ended
      ) {
        this.ended = true;
        this.paused = true;
        this.emit("ended");
      }
    });
    on("mediaPlaybackError", () => this.fail());
  }
  private emit(name: string) {
    this.dispatchEvent(new Event(name));
  }
  private fail() {
    this.error = { code: 4 } as MediaError;
    this.emit("error");
  }
  get currentTime() {
    return this.time;
  }
  set currentTime(value: number) {
    this.time = value;
    if (this.prepared && active === this)
      void kit?.seekToTime(value).catch(() => this.fail());
  }
  get duration() {
    return this.length;
  }
  get volume() {
    return active === this && kit && Number.isFinite(kit.volume)
      ? kit.volume
      : this.gain;
  }
  set volume(value: number) {
    this.gain = value;
    if (active === this && kit) kit.volume = value;
  }
  load() {
    if (!this.src || this.ready) return;
    const instance = kit!;
    const url = new URL(this.src);
    const id = decodeURIComponent(url.pathname.slice(1));
    if (!["library-songs", "songs"].includes(url.hostname)) {
      this.fail();
      return;
    }
    this.length = Number(url.searchParams.get("duration")) || 0;
    this.ready = queueWork.then(async () => {
      if (active !== this || !this.src) return;
      // Unloaded descriptors use `kind`; `type` would mark this as a full API resource.
      await instance.setQueue({ items: [{ id, kind: "song" }] });
      if (active !== this || !this.src) return;
      this.prepared = true;
      instance.volume = this.gain;
      this.length = instance.currentPlaybackDuration || this.length;
      this.emit("loadedmetadata");
      this.emit("canplay");
    });
    queueWork = this.ready.catch(() => {});
    void this.ready.catch(() => {
      if (active === this && this.src) this.fail();
    });
  }
  async play() {
    this.wanted = true;
    this.load();
    await this.ready;
    await queueWork;
    if (active !== this || !this.src || !this.wanted) return;
    await kit!.play();
  }
  pause() {
    this.wanted = false;
    this.paused = true;
    if (active === this && kit) {
      const instance = kit;
      queueWork = queueWork.then(() => instance.pause()).catch(() => {});
    }
  }
  removeAttribute(name: string) {
    if (name !== "src") return;
    this.src = "";
    this.wanted = false;
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
    if (active === this) active = undefined;
  }
}
export const applePlayer = hasNativeMusic()
  ? new NativeSystemPlayer()
  : new Player(() => new AppleAudio(), URL.revokeObjectURL);
