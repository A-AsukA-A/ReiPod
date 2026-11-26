import { afterEach, expect, it, vi } from "vitest";
import { LocalGainAudio, createLocalAudio, setLocalEq, setLocalSoundCheck } from "./localAudio";
import { Player } from "./Player";

afterEach(() => {
  setLocalEq([0, 0, 0]);
  setLocalSoundCheck(false);
  vi.unstubAllGlobals();
});

function setup() {
  const audio = Object.assign(new EventTarget(), {
    src: "", preload: "metadata", paused: true, error: null,
    duration: 120, currentTime: 0,
    load: vi.fn(), pause: vi.fn(), removeAttribute: vi.fn(),
    play: vi.fn().mockResolvedValue(undefined),
  });
  const volumeWrite = vi.fn();
  Object.defineProperty(audio, "volume", { get: () => 1, set: volumeWrite });
  const param = { value: 1, cancelAndHoldAtTime: vi.fn(), setTargetAtTime: vi.fn() };
  const gain = { gain: param, connect: vi.fn(), disconnect: vi.fn() };
  const source = { connect: vi.fn(), disconnect: vi.fn() };
  const context = Object.assign(new EventTarget(), {
    state: "running", currentTime: 10, destination: {}, resume: vi.fn().mockResolvedValue(undefined),
    createGain: vi.fn(() => gain), createMediaElementSource: vi.fn(() => source),
  });
  const port = new LocalGainAudio(audio as unknown as HTMLAudioElement, () => context as unknown as AudioContext);
  return { port, audio, context, source, gain, param, volumeWrite };
}

it("keeps rapid local volume changes on one graph and can recover from zero without pausing", async () => {
  const { port, audio, context, param, volumeWrite } = setup();
  const player = new Player(() => port, vi.fn());
  player.add([{ id: "local", title: "Local", filename: "a.mp3", size: 1, url: "blob:local" }]);
  player.setVolume(0.8);
  player.select("local");
  await Promise.resolve();
  audio.dispatchEvent(new Event("playing"));
  const playCalls = audio.play.mock.calls.length;
  for (let i = 0; i < 100; i++) player.setVolume((i % 11) / 10);
  player.setVolume(0);
  player.setVolume(0.6);
  expect(player.getSnapshot()).toMatchObject({ status: "playing", volume: 0.6, volumeControl: true });
  expect(param.setTargetAtTime).toHaveBeenLastCalledWith(0.6, 10, 0.015);
  expect(param.cancelAndHoldAtTime).toHaveBeenLastCalledWith(10);
  expect(context.createMediaElementSource).toHaveBeenCalledTimes(1);
  expect(audio.play).toHaveBeenCalledTimes(playCalls);
  expect(audio.pause).not.toHaveBeenCalled();
  expect(volumeWrite).not.toHaveBeenCalled();
});

it("resumes on play, reuses the source on retry, and disconnects a released track", async () => {
  const { port, context, source, gain, audio } = setup();
  const audioSession = { type: "auto" };
  vi.stubGlobal("navigator", { audioSession });
  port.volume = 0.4;
  await port.play();
  expect(audioSession.type).toBe("playback");
  expect(gain.gain.value).toBe(0.4);
  port.pause();
  await port.play();
  expect(context.resume).toHaveBeenCalledTimes(2);
  expect(context.createMediaElementSource).toHaveBeenCalledTimes(1);
  port.removeAttribute("src");
  expect(source.disconnect).toHaveBeenCalledOnce();
  expect(gain.disconnect).toHaveBeenCalledOnce();
  await port.play();
  expect(audio.play).toHaveBeenCalledTimes(2);
});

it.each([
  { userAgent: "iPhone", platform: "iPhone", maxTouchPoints: 5, gain: true },
  { userAgent: "Macintosh", platform: "MacIntel", maxTouchPoints: 5, gain: true },
  { userAgent: "Macintosh", platform: "MacIntel", maxTouchPoints: 0, gain: false },
])("selects the local audio route for $platform with $maxTouchPoints touch points", ({ gain, ...navigator }) => {
  vi.stubGlobal("navigator", navigator);
  vi.stubGlobal("Audio", class extends EventTarget {});
  expect(createLocalAudio() instanceof LocalGainAudio).toBe(gain);
});

it("recovers interrupted output after buffering, coalesces resumes, and respects pause and release", async () => {
  const { port, audio, context } = setup();
  await port.play();
  let resolveResume!: () => void;
  context.resume.mockImplementationOnce(() => new Promise<void>(resolve => { resolveResume = resolve; }));
  context.state = "interrupted";
  context.dispatchEvent(new Event("statechange"));
  audio.dispatchEvent(new Event("waiting"));
  audio.dispatchEvent(new Event("playing"));
  for (let i = 0; i < 100; i++) port.volume = (i % 10) / 10;
  expect(context.resume).toHaveBeenCalledTimes(2);
  expect(audio.play).toHaveBeenCalledTimes(1);
  expect(context.createMediaElementSource).toHaveBeenCalledTimes(1);
  context.state = "running";
  resolveResume();
  await Promise.resolve();
  port.pause();
  context.state = "interrupted";
  context.dispatchEvent(new Event("statechange"));
  audio.dispatchEvent(new Event("playing"));
  expect(context.resume).toHaveBeenCalledTimes(2);
  port.removeAttribute("src");
  context.dispatchEvent(new Event("statechange"));
  expect(context.resume).toHaveBeenCalledTimes(2);
});

it("wires 3-band BiquadFilterNode EQ and updates active gain nodes", async () => {
  const filters: { type: string; frequency: { value: number }; Q: { value: number }; gain: { value: number }; connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[] = [];
  const audio = Object.assign(new EventTarget(), {
    src: "", preload: "metadata", paused: true, error: null, duration: 120, currentTime: 0,
    load: vi.fn(), pause: vi.fn(), removeAttribute: vi.fn(), play: vi.fn().mockResolvedValue(undefined),
  });
  const gain = { gain: { value: 1, cancelAndHoldAtTime: vi.fn(), setTargetAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() };
  const source = { connect: vi.fn(), disconnect: vi.fn() };
  const context = Object.assign(new EventTarget(), {
    state: "running", currentTime: 0, destination: {}, resume: vi.fn().mockResolvedValue(undefined),
    createGain: vi.fn(() => gain), createMediaElementSource: vi.fn(() => source),
    createBiquadFilter: vi.fn(() => {
      const node = { type: "", frequency: { value: 0 }, Q: { value: 0 }, gain: { value: 0 }, connect: vi.fn(), disconnect: vi.fn() };
      filters.push(node);
      return node;
    }),
  });
  setLocalEq([5, -1, 4]);
  const port = new LocalGainAudio(audio as unknown as HTMLAudioElement, () => context as unknown as AudioContext);
  await port.play();
  expect(filters.map((f) => [f.type, f.frequency.value, f.gain.value])).toEqual([
    ["lowshelf", 120, 5],
    ["peaking", 1000, -1],
    ["highshelf", 8000, 4],
  ]);
  setLocalEq([0, 0, 0]);
  expect(filters.map((f) => f.gain.value)).toEqual([0, 0, 0]);
  port.removeAttribute("src");
  expect(filters.every((f) => f.disconnect.mock.calls.length === 1)).toBe(true);
});

it("wires DynamicsCompressorNode for Sound Check and updates desktop audio routing", async () => {
  class FakeAudio {}
  vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (Macintosh)", platform: "MacIntel", maxTouchPoints: 0 });
  vi.stubGlobal("Audio", FakeAudio);
  expect(createLocalAudio()).toBeInstanceOf(FakeAudio);
  setLocalSoundCheck(true);
  expect(createLocalAudio()).toBeInstanceOf(LocalGainAudio);

  const audio = Object.assign(new EventTarget(), {
    src: "", preload: "metadata", paused: true, error: null, duration: 120, currentTime: 0,
    load: vi.fn(), pause: vi.fn(), removeAttribute: vi.fn(), play: vi.fn().mockResolvedValue(undefined),
  });
  const gain = { gain: { value: 1, cancelAndHoldAtTime: vi.fn(), setTargetAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() };
  const source = { connect: vi.fn(), disconnect: vi.fn() };
  const compressor = {
    threshold: { value: 0 }, knee: { value: 0 }, ratio: { value: 1 }, attack: { value: 0 }, release: { value: 0 },
    connect: vi.fn(), disconnect: vi.fn(),
  };
  const context = Object.assign(new EventTarget(), {
    state: "running", currentTime: 0, destination: {}, resume: vi.fn().mockResolvedValue(undefined),
    createGain: vi.fn(() => gain), createMediaElementSource: vi.fn(() => source),
    createDynamicsCompressor: vi.fn(() => compressor),
  });
  const port = new LocalGainAudio(audio as unknown as HTMLAudioElement, () => context as unknown as AudioContext);
  await port.play();
  expect(source.connect).toHaveBeenCalledWith(compressor);
  expect(compressor.connect).toHaveBeenCalledWith(gain);
  expect([compressor.threshold.value, compressor.knee.value, compressor.ratio.value]).toEqual([-24, 24, 4]);
  setLocalSoundCheck(false);
  expect([compressor.threshold.value, compressor.knee.value, compressor.ratio.value]).toEqual([0, 0, 1]);
  port.removeAttribute("src");
  expect(compressor.disconnect).toHaveBeenCalledTimes(1);
});
