import { afterEach, expect, it, vi } from "vitest";
import { Player } from "./Player";
import type { AudioPort } from "./ports";

afterEach(() => vi.unstubAllGlobals());

it("runs queues, playback events and resource cleanup with only injected ports and no browser globals", () => {
  vi.stubGlobal("Audio", undefined);
  vi.stubGlobal("URL", undefined);
  const listeners = new Map<string, Set<() => void>>();
  const port: AudioPort = {
    src: "", preload: "", volume: 1, paused: true, currentTime: 0, duration: 120, error: null,
    play: vi.fn(async () => {}), pause: vi.fn(), load: vi.fn(),
    addEventListener(name, listener) {
      const group = listeners.get(name) ?? new Set();
      group.add(listener); listeners.set(name, group);
    },
    removeEventListener(name, listener) { listeners.get(name)?.delete(listener); },
    removeAttribute(name) { if (name === "src") this.src = ""; },
  };
  const emit = (name: string) => listeners.get(name)?.forEach(listener => listener());
  const create = vi.fn(() => port), revoke = vi.fn();
  const player = new Player(create, revoke);
  const track = { id: "local", title: "Song", filename: "song.m4a", url: "blob:song", artwork: "blob:cover", size: 1 };
  player.add([track]);
  player.setQueue([track.id]);
  expect(create).not.toHaveBeenCalled();
  player.activate(track.id);
  expect(create).toHaveBeenCalledOnce();
  expect(port.play).toHaveBeenCalledOnce();
  emit("loadedmetadata"); emit("playing");
  port.currentTime = 23;
  emit("timeupdate");
  expect(player.getSnapshot()).toMatchObject({ currentId: track.id, status: "playing", position: 23, duration: 120 });
  player.clear();
  expect(revoke.mock.calls.flat()).toEqual(["blob:song", "blob:cover"]);
  expect(port.src).toBe("");
  expect([...listeners.values()].every(group => !group.size)).toBe(true);
  expect(player.getSnapshot()).toMatchObject({ queue: [], currentId: null, status: "idle" });
});
