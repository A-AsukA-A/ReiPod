import { describe, expect, it, vi } from "vitest";
import { Player } from "./Player";
import { getDemoTracks } from "./demoTracks";
import type { AudioPort, Track } from "./Player";

class FakeAudio extends EventTarget {
  src = "";
  preload = "";
  volume = 1;
  paused = true;
  currentTime = 0;
  duration = 120;
  error: { code: number } | null = null;
  rejectPlay: ((error: Error) => void) | null = null;
  captured = new Map<string, EventListener>();
  play = vi.fn(() => {
    this.paused = false;
    return new Promise<void>((_, reject) => {
      this.rejectPlay = reject;
    });
  });
  pause = vi.fn(() => {
    this.paused = true;
  });
  load = vi.fn();
  removeAttribute = vi.fn(() => {
    this.src = "";
  });
  override addEventListener(type: string, callback: EventListener) {
    this.captured.set(type, callback);
    super.addEventListener(type, callback);
  }
  emit(type: string) {
    this.dispatchEvent(new Event(type));
  }
}
const tracks: Track[] = [1, 2, 3].map((id) => ({
  id: `${id}`,
  title: `Song ${id}`,
  filename: `${id}.wav`,
  size: 100,
  url: `blob:${id}`,
}));
function setup() {
  const audios: FakeAudio[] = [];
  const revoke = vi.fn();
  const player = new Player(() => {
    const audio = new FakeAudio();
    audios.push(audio);
    return audio as unknown as AudioPort;
  }, revoke);
  player.add(tracks);
  return { player, audios, revoke };
}

describe("shared playback session", () => {
  it("plays an album queue without leaking unrelated library songs into auto-next", () => {
    const { player, audios } = setup();
    player.activate("2", ["2", "3"]);
    player.add([
      {
        id: "4",
        title: "New import",
        filename: "4.mp3",
        size: 1,
        url: "blob:4",
      },
    ]);
    expect(player.getSnapshot().queue).toEqual(["2", "3"]);
    audios[0].emit("ended");
    expect(player.getSnapshot().currentId).toBe("3");
    audios[1].emit("ended");
    expect(player.getSnapshot().status).toBe("ended");
  });
  it("implements repeat-one, manual skip, and repeat-all at queue boundaries", () => {
    const { player, audios } = setup();
    player.activate("2", ["2", "3"]);
    player.setRepeat("one");
    audios[0].emit("ended");
    expect(player.getSnapshot().currentId).toBe("2");
    expect(audios).toHaveLength(2);
    player.next();
    expect(player.getSnapshot().currentId).toBe("3");
    player.setRepeat("all");
    audios[2].emit("ended");
    expect(player.getSnapshot().currentId).toBe("2");
  });
  it("toggles shuffle without restarting and anchors a manual song selection", () => {
    const { player, audios } = setup();
    player.select("1");
    audios[0].currentTime = 20;
    audios[0].emit("timeupdate");
    player.setShuffle(true);
    expect(player.getSnapshot().queue[0]).toBe("1");
    expect(player.getSnapshot().position).toBe(20);
    expect(audios).toHaveLength(1);
    player.activate("2", ["1", "2", "3"]);
    expect(player.getSnapshot().queue[0]).toBe("2");
    player.setShuffle(false);
    expect(player.getSnapshot().queue).toEqual(["1", "2", "3"]);
    player.toggleFavorite("2");
    expect(player.getSnapshot().favorites).toEqual(["2"]);
    player.toggleFavorite("2");
    expect(player.getSnapshot().favorites).toEqual([]);
  });
  it("reopens and resumes the current song without restarting its session", () => {
    const { player, audios } = setup();
    player.activate("1");
    audios[0].emit("playing");
    audios[0].currentTime = 42;
    audios[0].emit("timeupdate");
    player.activate("1");
    expect(audios).toHaveLength(1);
    expect(audios[0].play).toHaveBeenCalledTimes(1);
    expect(player.getSnapshot().position).toBe(42);
    player.pause();
    player.activate("1");
    expect(audios).toHaveLength(1);
    expect(audios[0].play).toHaveBeenCalledTimes(2);
    expect(audios[0].currentTime).toBe(42);
    player.activate("2");
    expect(audios).toHaveLength(2);
  });
  it("adds hosted demos once without replacing an active imported song", () => {
    const { player, audios } = setup();
    player.select("1");
    audios[0].emit("playing");
    audios[0].currentTime = 7;
    audios[0].emit("timeupdate");
    const demos = getDemoTracks("/ReiPod/");
    expect(demos.every((track) => track.url.startsWith("/ReiPod/music/"))).toBe(
      true,
    );
    player.add(demos);
    player.add(getDemoTracks("/ReiPod/"));
    expect(player.getSnapshot()).toMatchObject({
      currentId: "1",
      status: "playing",
      position: 7,
    });
    expect(player.getSnapshot().tracks).toHaveLength(6);
    expect(audios).toHaveLength(1);
  });
  it("derives playback and progress from the backend and preserves it across UI subscribers", () => {
    const { player, audios } = setup();
    player.select("1");
    expect(player.getSnapshot().status).toBe("loading");
    audios[0].emit("playing");
    audios[0].currentTime = 12;
    audios[0].emit("timeupdate");
    const unsubscribe = player.subscribe(vi.fn());
    unsubscribe();
    expect(player.getSnapshot()).toMatchObject({
      status: "playing",
      position: 12,
      duration: 120,
    });
    expect(audios).toHaveLength(1);
    player.pause();
    expect(player.getSnapshot().status).toBe("paused");
  });
  it("ignores stale media callbacks and rejected play promises after rapid changes", async () => {
    const { player, audios } = setup();
    player.select("1");
    const staleTime = audios[0].captured.get("timeupdate")!;
    const staleError = audios[0].captured.get("error")!;
    player.next();
    player.next();
    audios[2].emit("playing");
    audios[0].currentTime = 99;
    staleTime(new Event("timeupdate"));
    staleError(new Event("error"));
    audios[0].rejectPlay!(new Error("Old request failed"));
    await Promise.resolve();
    expect(player.getSnapshot()).toMatchObject({
      currentId: "3",
      status: "playing",
      position: 0,
      error: null,
    });
    expect(audios[0].pause).toHaveBeenCalled();
    expect(audios[1].removeAttribute).toHaveBeenCalledWith("src");
  });
  it("does not resume after pausing a pending play request", async () => {
    const { player, audios } = setup();
    player.select("1");
    player.pause();
    audios[0].emit("playing");
    audios[0].rejectPlay!(new Error("Interrupted"));
    await Promise.resolve();
    expect(player.getSnapshot().status).toBe("paused");
    expect(audios[0].pause).toHaveBeenCalled();
  });
  it("advances automatically through the queue and ends without looping forever", () => {
    const { player, audios } = setup();
    player.select("1");
    audios[0].emit("ended");
    expect(player.getSnapshot().currentId).toBe("2");
    audios[1].emit("ended");
    audios[2].emit("loadedmetadata");
    audios[2].emit("ended");
    expect(player.getSnapshot()).toMatchObject({
      currentId: "3",
      status: "ended",
      position: 120,
    });
    expect(audios).toHaveLength(3);
  });
  it("surfaces decode errors and recovers on another track without auto-skipping failures", () => {
    const { player, audios } = setup();
    player.select("1");
    audios[0].error = { code: 4 };
    audios[0].emit("error");
    expect(player.getSnapshot().status).toBe("error");
    expect(audios).toHaveLength(1);
    player.next();
    audios[1].emit("playing");
    expect(player.getSnapshot()).toMatchObject({
      currentId: "2",
      status: "playing",
      error: null,
    });
  });
  it("restarts before skipping previous, clamps seeking, and revokes imported URLs on clear", () => {
    const { player, audios, revoke } = setup();
    player.select("2");
    audios[0].currentTime = 5;
    audios[0].emit("timeupdate");
    player.previous();
    expect(player.getSnapshot()).toMatchObject({ currentId: "2", position: 0 });
    player.previous();
    expect(player.getSnapshot().currentId).toBe("1");
    audios[1].emit("loadedmetadata");
    player.seek(999);
    expect(player.getSnapshot().position).toBe(120);
    player.add([{ ...tracks[0], url: "blob:duplicate" }]);
    expect(revoke).toHaveBeenCalledWith("blob:duplicate");
    player.clear();
    expect(player.getSnapshot()).toMatchObject({
      tracks: [],
      currentId: null,
      status: "idle",
    });
    expect(revoke).toHaveBeenCalledTimes(4);
  });
});

describe("library editing and resume", () => {
  it("removes a queued song without disturbing the active audio and cleans favorites and URLs", () => {
    const { player, audios, revoke } = setup();
    player.select("1");
    audios[0].currentTime = 28;
    audios[0].emit("timeupdate");
    player.toggleFavorite("2");
    player.updateTrack("2", { artwork: "blob:cover" });
    player.remove("2");
    expect(player.getSnapshot()).toMatchObject({
      currentId: "1",
      position: 28,
      queue: ["1", "3"],
      favorites: [],
    });
    expect(audios).toHaveLength(1);
    expect(revoke.mock.calls.flat()).toEqual(["blob:2", "blob:cover"]);
    player.setShuffle(true);
    player.setShuffle(false);
    expect(player.getSnapshot().queue).toEqual(["1", "3"]);
  });
  it("advances when deleting the active song but keeps a paused session paused", () => {
    const { player, audios } = setup();
    player.activate("2", ["2", "3"]);
    player.pause();
    const stale = audios[0].captured.get("ended")!;
    player.remove("2");
    expect(player.getSnapshot().currentId).toBe("3");
    expect(audios[1].play).not.toHaveBeenCalled();
    audios[1].emit("loadedmetadata");
    expect(player.getSnapshot().status).toBe("paused");
    stale(new Event("ended"));
    expect(player.getSnapshot().currentId).toBe("3");
    player.remove("3");
    expect(player.getSnapshot()).toMatchObject({
      currentId: null,
      status: "idle",
      queue: [],
    });
  });
  it("continues playback with the successor when the playing song is removed", () => {
    const { player, audios } = setup();
    player.select("2");
    player.remove("2");
    expect(player.getSnapshot().currentId).toBe("3");
    expect(audios[1].play).toHaveBeenCalledOnce();
  });
  it("restores the exact shuffle queue and seeks only after metadata, without autoplay", () => {
    const { player, audios } = setup();
    player.setShuffle(true);
    player.restoreSession({
      currentId: "2",
      position: 42,
      volume: 0.4,
      queue: ["2", "missing", "3", "1"],
      naturalOrder: ["1", "2", "3"],
    });
    expect(player.getSnapshot().queue).toEqual(["2", "3", "1"]);
    expect(audios[0].play).not.toHaveBeenCalled();
    expect(audios[0].currentTime).toBe(0);
    audios[0].emit("loadedmetadata");
    expect(player.getSnapshot()).toMatchObject({
      currentId: "2",
      status: "paused",
      position: 42,
      volume: 0.4,
    });
    player.setShuffle(false);
    expect(player.getSnapshot().queue).toEqual(["1", "2", "3"]);
  });
  it("does not let late storage restoration override a user-selected song", () => {
    const { player } = setup();
    player.select("1");
    player.restoreSession({
      currentId: "2",
      position: 10,
      volume: 0.1,
      queue: ["2"],
      naturalOrder: ["2"],
    });
    expect(player.getSnapshot()).toMatchObject({
      currentId: "1",
      position: 0,
      volume: 0.8,
    });
  });
});

it("moves a requested song immediately after the current one without restarting audio or duplicating it", () => {
  const { player, audios } = setup();
  player.select("1");
  player.playNext("3");
  expect(player.getSnapshot().queue).toEqual(["1", "3", "2"]);
  player.playNext("3");
  player.playNext("1");
  player.playNext("missing");
  expect(player.getSnapshot().queue).toEqual(["1", "3", "2"]);
  expect(audios).toHaveLength(1);
  player.setShuffle(true);
  player.playNext("2");
  expect(player.getSnapshot().queue[1]).toBe("2");
  player.setShuffle(false);
  expect(player.getSnapshot().queue).toEqual(["1", "2", "3"]);
});

it("enforces the volume cap on wheel changes and session restoration", () => {
  const { player, audios } = setup();
  player.setVolumeLimit(0.35);
  player.restoreSession({
    currentId: "1",
    position: 3,
    volume: 0.9,
    queue: ["1"],
    naturalOrder: ["1"],
  });
  expect(player.getSnapshot().volume).toBe(0.35);
  expect(audios[0].volume).toBe(0.35);
  player.setVolume(1);
  expect(audios[0].volume).toBe(0.35);
  player.setVolumeLimit(0.2);
  expect(player.getSnapshot().volume).toBe(0.2);
  player.setVolume(NaN);
  expect(player.getSnapshot().volume).toBe(0.2);
});
