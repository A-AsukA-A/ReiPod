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
