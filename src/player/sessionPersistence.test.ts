import { afterEach, expect, it, vi } from "vitest";
import { Player } from "./Player";
import { createSessionPersistence } from "./sessionPersistence";
import type { AudioPort } from "./ports";

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
function fixture(saved: Record<string, string> = {}) {
  vi.useFakeTimers();
  const ports: AudioPort[] = [];
  const callbacks: Map<string, Set<() => void>>[] = [];
  const player = new Player(() => {
    const events = new Map<string, Set<() => void>>();
    const port: AudioPort = {
      src: "", preload: "", paused: true, volume: 1, currentTime: 0, duration: 120, error: null,
      play: vi.fn(async () => {}), pause: vi.fn(), load: vi.fn(), removeAttribute() { this.src = ""; },
      addEventListener(name, callback) { const group = events.get(name) ?? new Set(); group.add(callback); events.set(name, group); },
      removeEventListener(name, callback) { events.get(name)?.delete(callback); },
    };
    ports.push(port); callbacks.push(events); return port;
  }, vi.fn());
  player.add(["one", "two"].map(id => ({ id, title: id, filename: id + ".m4a", url: "blob:" + id, size: 1 })));
  const storage = new Map(Object.entries(saved));
  const write = vi.fn((key: string, value: string) => { storage.set(key, value); });
  let hide!: () => void;
  const stopHide = vi.fn();
  const subscribe = vi.spyOn(player, "subscribe");
  const persistence = createSessionPersistence({
    player, read: key => storage.get(key) ?? null, write,
    schedule: (callback, delay) => { const timer = setTimeout(callback, delay); return () => clearTimeout(timer); },
    onPageHide: callback => { hide = callback; return stopHide; },
  });
  const sessionWrites = () => write.mock.calls.filter(([key]) => key === "reipod-session");
  const metadata = () => callbacks.at(-1)?.get("loadedmetadata")?.forEach(callback => callback());
  return { player, ports, storage, write, persistence, subscribe, sessionWrites, hide: () => hide(), stopHide, metadata };
}

it("gates session writes until restoration and merges rapid volume changes for 200ms", () => {
  const f = fixture();
  f.persistence.restoreSettings();
  f.player.setVolume(0.6);
  vi.advanceTimersByTime(200);
  expect(f.sessionWrites()).toHaveLength(0);
  f.persistence.finishRestore();
  expect(f.sessionWrites()).toHaveLength(1);
  for (let i = 0; i < 100; i++) f.player.setVolume(0.2 + i * 0.001);
  vi.advanceTimersByTime(199);
  expect(f.sessionWrites()).toHaveLength(1);
  vi.advanceTimersByTime(1);
  expect(f.sessionWrites()).toHaveLength(2);
  expect(JSON.parse(f.storage.get("reipod-session")!).volume).toBeCloseTo(0.299);
});
it("rounds only the saved position, skips unchanged whole seconds and flushes pagehide immediately", () => {
  const f = fixture();
  f.persistence.finishRestore();
  f.player.select("one", false); f.metadata(); f.player.seek(10.2);
  vi.advanceTimersByTime(200);
  const count = f.sessionWrites().length;
  expect(JSON.parse(f.storage.get("reipod-session")!).position).toBe(10);
  expect(f.player.getSnapshot().position).toBe(10.2);
  f.player.seek(10.9); vi.advanceTimersByTime(200);
  expect(f.sessionWrites()).toHaveLength(count);
  f.player.seek(11.4); f.hide();
  expect(JSON.parse(f.storage.get("reipod-session")!).position).toBe(11);
  expect(vi.getTimerCount()).toBe(0);
});
it.each([false, true])("restores paused unless the user has already chosen a song (chosen=%s)", chosen => {
  const f = fixture({ "reipod-session": JSON.stringify({ currentId: "one", position: 44, volume: 0.3, queue: ["one"], naturalOrder: ["one"] }) });
  if (chosen) f.player.select("two");
  f.persistence.finishRestore(); f.metadata();
  expect(f.player.getSnapshot().currentId).toBe(chosen ? "two" : "one");
  if (!chosen) {
    expect(f.player.getSnapshot()).toMatchObject({ position: 44, status: "paused", volume: 0.3 });
    expect(f.ports[0].play).not.toHaveBeenCalled();
  } else expect(f.ports).toHaveLength(1);
});
it("clearing during library restoration prevents the old saved song from returning", () => {
  const f = fixture({ "reipod-session": JSON.stringify({ currentId: "one", position: 44, queue: ["one"] }) });
  f.persistence.clearSavedSession(); f.player.clear(); f.persistence.finishRestore();
  expect(f.ports).toHaveLength(0);
  expect(JSON.parse(f.storage.get("reipod-session")!)).toMatchObject({ currentId: null, queue: [] });
});
it("failed session and preference writes remain eligible for retry", () => {
  const f = fixture();
  const failures = new Set(["reipod-session", "reipod-playback"]);
  f.write.mockImplementation((key, value) => { if (failures.delete(key)) throw new Error("storage unavailable"); f.storage.set(key, value); });
  f.persistence.restoreSettings(); f.persistence.finishRestore();
  expect(f.storage.has("reipod-session")).toBe(false);
  f.persistence.flush();
  expect(f.storage.has("reipod-session")).toBe(true);
  f.player.setRepeat("all");
  expect(f.storage.has("reipod-playback")).toBe(false);
  f.player.setVolume(0.4);
  vi.advanceTimersByTime(200);
  expect(JSON.parse(f.storage.get("reipod-playback")!).repeat).toBe("all");
});
it("dispose cancels pending work, unsubscribes both observers and ignores a late lifecycle callback", () => {
  const f = fixture();
  f.persistence.restoreSettings(); f.persistence.finishRestore(); f.player.setVolume(0.4);
  f.write.mockClear(); f.persistence.dispose(); f.persistence.dispose();
  f.hide(); f.player.clear(); vi.runAllTimers();
  expect(f.write).not.toHaveBeenCalled();
  expect(f.stopHide).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
});
it("invalid session data does not prevent settings restoration and duplicate setup adds no observer", () => {
  const f = fixture({ "reipod-session": "invalid JSON", "reipod-playback": JSON.stringify({ repeat: "one", shuffle: true, favorites: ["one", 2] }) });
  f.persistence.restoreSettings(); f.persistence.restoreSettings(); f.persistence.finishRestore();
  expect(f.player.getSnapshot()).toMatchObject({ repeat: "one", shuffle: true, favorites: ["one"] });
  expect(f.subscribe).toHaveBeenCalledTimes(2);
  expect(f.player.getSession().queue).toHaveLength(2);
  expect(f.ports).toHaveLength(0);
});

it("failed preference retries are coalesced and reverting cancels a stale pending value", () => {
  const f = fixture();
  f.persistence.restoreSettings(); f.persistence.finishRestore();
  f.player.setRepeat("off");
  f.write.mockImplementation((key, value) => { if (key === "reipod-playback") throw new Error("quota"); f.storage.set(key, value); });
  f.write.mockClear(); f.player.setRepeat("all");
  for (let i = 0; i < 100; i++) f.player.setVolume(0.2 + i * 0.001);
  expect(f.write.mock.calls.filter(([key]) => key === "reipod-playback")).toHaveLength(1);
  f.player.setRepeat("off"); vi.advanceTimersByTime(200);
  expect(f.write.mock.calls.filter(([key]) => key === "reipod-playback")).toHaveLength(1);
  expect(JSON.parse(f.storage.get("reipod-playback")!).repeat).toBe("off");
});
