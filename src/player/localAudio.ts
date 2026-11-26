import type { AudioPort } from "./Player";

let context: AudioContext | undefined;
const playbackContext = () => (context ??= new AudioContext({ latencyHint: "playback" }));
let activeEq: readonly [number, number, number] = [0, 0, 0];
let activeSoundCheck = false;
let activePlaybackRate = 1;
const instances = new Set<LocalGainAudio>();
const plainAudios = new Set<WeakRef<HTMLAudioElement>>();

export function setLocalEq(gains: readonly [number, number, number]) {
  activeEq = gains;
  for (const instance of instances) instance.applyEq(gains);
}

export function setLocalSoundCheck(enabled: boolean) {
  activeSoundCheck = enabled;
  for (const instance of instances) instance.applySoundCheck(enabled);
}

export function setLocalPlaybackRate(rate: number) {
  if (!Number.isFinite(rate)) return;
  activePlaybackRate = Math.max(0.5, Math.min(2, rate));
  for (const instance of instances) instance.applyPlaybackRate(activePlaybackRate);
  for (const ref of plainAudios) {
    const audio = ref.deref();
    if (!audio) { plainAudios.delete(ref); continue; }
    audio.defaultPlaybackRate = activePlaybackRate;
    audio.playbackRate = activePlaybackRate;
  }
}

/** iOS element.volume is not a reliable software fader. Local/blob and same-origin
 * demo audio can safely use a gain node without moving remote/DRM playback here. */
export class LocalGainAudio implements AudioPort {
  private level = 1;
  private source?: MediaElementAudioSourceNode;
  private gain?: GainNode;
  private filters?: readonly [BiquadFilterNode, BiquadFilterNode, BiquadFilterNode];
  private compressor?: DynamicsCompressorNode;
  private context?: AudioContext;
  private released = false;
  private wanted = false;
  private resuming?: Promise<void>;
  applyEq(gains: readonly [number, number, number]) {
    if (!this.filters) return;
    this.filters[0].gain.value = gains[0];
    this.filters[1].gain.value = gains[1];
    this.filters[2].gain.value = gains[2];
  }
  applySoundCheck(enabled: boolean) {
    if (!this.compressor) return;
    this.compressor.threshold.value = enabled ? -24 : 0;
    this.compressor.knee.value = enabled ? 24 : 0;
    this.compressor.ratio.value = enabled ? 4 : 1;
    this.compressor.attack.value = 0.005;
    this.compressor.release.value = 0.25;
  }
  applyPlaybackRate(rate: number) {
    this.audio.defaultPlaybackRate = rate;
    this.audio.playbackRate = rate;
  }
  private resumeOutput() {
    if (this.resuming) return this.resuming;
    const promise = this.context!.resume();
    this.resuming = promise;
    void promise.then(
      () => { this.resuming = undefined; },
      () => { this.resuming = undefined; },
    );
    return promise;
  }
  private recoverOutput = () => {
    if (!this.wanted || this.released || !this.context ||
        this.context.state === "running" || this.context.state === "closed" ||
        (typeof document !== "undefined" && document.hidden)) return;
    // Buffering may finish on the media element while Safari leaves its Web
    // Audio output interrupted. Resume output only, never reload or auto-play
    // a paused element. Coalesce pending resumes during rapid input.
    void this.resumeOutput().catch(() => {});
  };

  constructor(
    private audio: HTMLAudioElement = new Audio(),
    private getContext: () => AudioContext = playbackContext,
  ) {
    this.applyPlaybackRate(activePlaybackRate);
  }
  get src() { return this.audio.src; }
  set src(value: string) { this.audio.src = value; }
  get preload() { return this.audio.preload; }
  set preload(value: HTMLAudioElement["preload"]) { this.audio.preload = value; }
  get paused() { return this.audio.paused; }
  get error() { return this.audio.error; }
  get duration() { return this.audio.duration; }
  get currentTime() { return this.audio.currentTime; }
  set currentTime(value: number) { this.audio.currentTime = value; }
  get volume() { return this.level; }
  set volume(value: number) {
    if (!Number.isFinite(value)) return;
    this.level = Math.max(0, Math.min(1, value));
    if (!this.gain || !this.context) return;
    this.recoverOutput();
    // Replace the previous target at the audio clock's current instant. Never
    // queue ramps into the future or pause/rebuild the graph for wheel events.
    const param = this.gain.gain;
    const now = this.context.currentTime;
    if (typeof param.cancelAndHoldAtTime === "function") param.cancelAndHoldAtTime(now);
    else {
      const current = param.value;
      param.cancelScheduledValues(now);
      param.setValueAtTime(current, now);
    }
    param.setTargetAtTime(this.level, now, 0.015);
  }
  addEventListener(name: string, listener: EventListener) {
    this.audio.addEventListener(name, listener);
  }
  removeEventListener(name: string, listener: EventListener) {
    this.audio.removeEventListener(name, listener);
  }
  load() { this.audio.load(); }
  async play() {
    if (this.released) return;
    this.wanted = true;
    try {
      const session = (navigator as Navigator & {
        audioSession?: { type: string };
      }).audioSession;
      if (session && session.type !== "playback") session.type = "playback";
    } catch {
      // Optional Safari API; older versions still use the media element session.
    }
    if (!this.source) {
      const context = this.getContext();
      const gain = context.createGain();
      gain.gain.value = this.level;
      const source = context.createMediaElementSource(this.audio);
      let tail: AudioNode = source;
      if (typeof context.createBiquadFilter === "function") {
        const low = context.createBiquadFilter();
        low.type = "lowshelf";
        low.frequency.value = 120;
        const mid = context.createBiquadFilter();
        mid.type = "peaking";
        mid.frequency.value = 1000;
        mid.Q.value = 1;
        const high = context.createBiquadFilter();
        high.type = "highshelf";
        high.frequency.value = 8000;
        this.filters = [low, mid, high];
        this.applyEq(activeEq);
        tail.connect(low);
        low.connect(mid);
        mid.connect(high);
        tail = high;
      }
      if (typeof context.createDynamicsCompressor === "function") {
        const compressor = context.createDynamicsCompressor();
        this.compressor = compressor;
        this.applySoundCheck(activeSoundCheck);
        tail.connect(compressor);
        tail = compressor;
      }
      tail.connect(gain);
      gain.connect(context.destination);
      this.context = context;
      this.gain = gain;
      this.source = source;
      instances.add(this);
      context.addEventListener("statechange", this.recoverOutput);
      this.audio.addEventListener("playing", this.recoverOutput);
      if (typeof document !== "undefined")
        document.addEventListener("visibilitychange", this.recoverOutput);
    }
    // Both calls happen in the user's gesture, before awaiting either promise.
    // Resuming also handles Safari's interrupted/suspended context on retry.
    this.applyPlaybackRate(activePlaybackRate);
    await Promise.all([this.resumeOutput(), this.audio.play()]);
  }
  pause() { this.wanted = false; this.audio.pause(); }
  removeAttribute(name: string) {
    this.audio.removeAttribute(name);
    if (name === "src") {
      this.released = true;
      this.wanted = false;
      instances.delete(this);
      this.context?.removeEventListener("statechange", this.recoverOutput);
      this.audio.removeEventListener("playing", this.recoverOutput);
      if (typeof document !== "undefined")
        document.removeEventListener("visibilitychange", this.recoverOutput);
      this.source?.disconnect();
      this.filters?.forEach((filter) => filter.disconnect());
      this.compressor?.disconnect();
      this.gain?.disconnect();
    }
  }
}

export function createLocalAudio(): AudioPort {
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios || activeEq.some((value) => value !== 0) || activeSoundCheck || activePlaybackRate !== 1) {
    return new LocalGainAudio();
  }
  const audio = new Audio();
  plainAudios.add(new WeakRef(audio));
  return audio;
}
