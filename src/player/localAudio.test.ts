import { afterEach, expect, it, vi } from "vitest";
import { LocalGainAudio, createLocalAudio } from "./localAudio";
import { Player } from "./Player";

afterEach(() => vi.unstubAllGlobals());

function setup() {
  const audio = Object.assign(new EventTarget(), {
    src: "", preload: "metadata", paused: true, error: null,
    duration: 120, currentTime: 0,
    load: vi.fn(), pause: vi.fn(), removeAttribute: vi.fn(),
    play: vi.fn().mockResolvedValue(undefined),
  });
  const volumeWrite = vi.fn();
  Object.defineProperty(audio, "volume", { get: () => 1, set: volumeWrite });
  const param = { value: 1, cancelScheduledValues: vi.fn(), setTargetAtTime: vi.fn() };
  const gain = { gain: param, connect: vi.fn(), disconnect: vi.fn() };
  const source = { connect: vi.fn(), disconnect: vi.fn() };
  const context = {
    currentTime: 10, destination: {}, resume: vi.fn().mockResolvedValue(undefined),
    createGain: vi.fn(() => gain), createMediaElementSource: vi.fn(() => source),
  };
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
  expect(param.cancelScheduledValues).toHaveBeenLastCalledWith(10);
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
