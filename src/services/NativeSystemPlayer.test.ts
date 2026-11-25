import { afterEach, expect, test, vi } from "vitest";
import { NativeSystemPlayer } from "./NativeSystemPlayer";
import { nativeTrack } from "./nativeMusic";
import type { NativePlayback } from "./nativeMusic";

afterEach(() => vi.unstubAllGlobals());

function setup() {
  const postMessage = vi.fn();
  vi.stubGlobal("window", {
    __REIPOD_NATIVE_MUSIC_VERSION__: 1,
    webkit: { messageHandlers: { reipodMusic: { postMessage } } },
  });
  const player = new NativeSystemPlayer();
  player.add([
    nativeTrack({ id: "1", title: "Song", duration: 120, trackNumber: 1 }),
  ]);
  return { player, postMessage };
}

function snapshot(
  sequence: number,
  status: NativePlayback["status"] = "paused",
): NativePlayback {
  return {
    sequence,
    status,
    currentId: "1",
    queue: ["1"],
    queueKnown: true,
    position: 0,
    duration: 120,
    volume: 0.5,
    repeat: "off",
  };
}

test("system status polling preserves a failed playback command's error", async () => {
  const { player, postMessage } = setup();
  postMessage.mockRejectedValue(new Error("Failed to prepare to play"));
  player.select("ios-song:1");
  await vi.waitFor(() =>
    expect(player.getSnapshot().error).toBe("Failed to prepare to play"),
  );
  player.adopt(snapshot(1));
  player.adopt(snapshot(2));
  expect(player.getSnapshot().error).toBe("Failed to prepare to play");
});

test("album shuffle refuses an unknown system queue and rebuilds a known queue at the same position", async () => {
  const { player, postMessage } = setup();
  player.setShuffle("albums");
  expect(player.getSnapshot().shuffleMode).toBe("off");
  expect(player.getSnapshot().error).toContain("现有队列不可读取");
  expect(postMessage).not.toHaveBeenCalled();
  player.adopt({ ...snapshot(1), position: 42 });
  postMessage.mockResolvedValue({ authorization: "authorized" });
  player.setShuffle("albums");
  expect(player.getSnapshot().shuffleMode).toBe("albums");
  expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({ action: "setQueue", selectedId: "1", seconds: 42, autoplay: false }));
});

test("confirmed system playback clears an earlier playback error", async () => {
  const { player, postMessage } = setup();
  postMessage.mockRejectedValue(new Error("Failed to prepare to play"));
  player.play();
  await vi.waitFor(() => expect(player.getSnapshot().error).not.toBeNull());
  player.adopt(snapshot(1, "playing"));
  expect(player.getSnapshot().error).toBeNull();
  expect(player.getSnapshot().status).toBe("playing");
});

test("a successful next command clears an earlier error even while paused", async () => {
  const { player, postMessage } = setup();
  postMessage.mockRejectedValueOnce(new Error("Failed to prepare to play"));
  player.next();
  await vi.waitFor(() => expect(player.getSnapshot().error).not.toBeNull());
  postMessage.mockResolvedValue({
    authorization: "authorized",
    playback: snapshot(1),
  });
  player.next();
  await vi.waitFor(() => expect(player.getSnapshot().error).toBeNull());
  expect(player.getSnapshot().status).toBe("paused");
});

test("podcasts start from the reported bookmark and remember confirmed session progress", async () => {
  const { player, postMessage } = setup();
  player.add([nativeTrack({ id: "2", title: "Episode", duration: 900,
    podcast: { showId: "12", showTitle: "Show", bookmark: 125 } })]);
  postMessage.mockResolvedValue({ authorization: "authorized" });
  player.activate("ios-song:2", ["ios-song:2"]);
  expect(postMessage).toHaveBeenLastCalledWith(expect.objectContaining({ action: "setQueue", selectedId: "2", seconds: 125 }));
  player.adopt({ ...snapshot(1, "playing"), currentId: "2", queue: ["2"], position: 200, duration: 900 });
  player.activate("ios-song:1", ["ios-song:1"]);
  player.activate("ios-song:2", ["ios-song:2"]);
  expect(postMessage).toHaveBeenLastCalledWith(expect.objectContaining({ selectedId: "2", seconds: 200 }));
  player.select("ios-song:2", true, 0);
  expect(postMessage).toHaveBeenLastCalledWith(expect.objectContaining({ seconds: 0 }));
});

test("legacy shells never receive unsupported volume commands", () => {
  const { player, postMessage } = setup();
  player.adopt(snapshot(1));
  player.setVolume(0.2);
  expect(postMessage).not.toHaveBeenCalled();
  expect(player.getSnapshot()).toMatchObject({ volume: 0.5, volumeControl: false });
});

test("fast native volume input combines targets without rolling back or canceling transport", async () => {
  const { player, postMessage } = setup();
  const replies: ((value: unknown) => void)[] = [];
  postMessage.mockImplementation(() => new Promise(resolve => replies.push(resolve)));
  player.adopt({ ...snapshot(1, "playing"), volumeControl: true });
  player.setVolume(0.525);
  player.setVolume(0.55);
  player.setVolume(0.575);
  expect(postMessage).toHaveBeenCalledTimes(1);
  player.pause();
  player.adopt({ ...snapshot(2), volume: 0.5, volumeControl: true, position: 25 });
  expect(player.getSnapshot()).toMatchObject({ volume: 0.575, position: 25 });
  replies[0]({ authorization: "authorized", playback: { ...snapshot(3), volume: 0.525, volumeControl: true } });
  await vi.waitFor(() => expect(postMessage).toHaveBeenCalledTimes(3));
  expect(postMessage).toHaveBeenLastCalledWith({ version: 1, action: "volume", volume: 0.575 });
  // Pausing was issued while the volume write was in flight; its acknowledgement
  // must still be accepted instead of being superseded by a volume command.
  replies[1]({ authorization: "authorized", playback: { ...snapshot(4), volumeControl: true, position: 26 } });
  await vi.waitFor(() => expect(player.getSnapshot().position).toBe(26));
  expect(player.getSnapshot().volume).toBe(0.575);
  replies[2]({ authorization: "authorized", playback: { ...snapshot(5), volume: 0.575, volumeControl: true, position: 26 } });
  await vi.waitFor(() => expect(player.getSnapshot()).toMatchObject({ status: "paused", volume: 0.575, position: 26 }));
  player.adopt({ ...snapshot(6), volumeControl: true, volume: 0.25 });
  await vi.waitFor(() => expect(player.getSnapshot().volume).toBe(0.25)); // iPhone side-button change.
  expect(postMessage.mock.calls.map(([request]) => request.action)).toEqual(["volume", "pause", "volume"]);
});

test("native wheel volume respects limits and failure preserves playback", async () => {
  const { player, postMessage } = setup();
  let sequence = 1;
  player.adopt({ ...snapshot(sequence, "playing"), volume: 0.3, volumeControl: true, position: 42 });
  postMessage.mockImplementation(async ({ volume }) => ({ authorization: "authorized",
    playback: { ...snapshot(++sequence, "playing"), volume, volumeControl: true, position: 42 } }));
  player.setVolumeLimit(0.6);
  player.setVolume(5);
  await vi.waitFor(() => expect(player.getSnapshot().volume).toBe(0.6));
  expect(postMessage).toHaveBeenLastCalledWith({ version: 1, action: "volume", volume: 0.6 });
  await Promise.resolve();
  player.setVolume(-1);
  await vi.waitFor(() => expect(player.getSnapshot().volume).toBe(0));
  await Promise.resolve();
  postMessage.mockRejectedValue(new Error("输出路线不可调音量"));
  player.setVolume(0.2);
  await vi.waitFor(() => expect(player.getSnapshot().error).toBe("输出路线不可调音量"));
  expect(player.getSnapshot()).toMatchObject({ status: "playing", position: 42, volume: 0, queue: ["ios-song:1"] });
  const count = postMessage.mock.calls.length;
  player.setVolume(NaN);
  expect(postMessage).toHaveBeenCalledTimes(count);
});

test("disconnect ignores late native volume acknowledgements", async () => {
  const { player, postMessage } = setup();
  let reply!: (value: unknown) => void;
  postMessage.mockImplementation(() => new Promise(resolve => { reply = resolve; }));
  player.adopt({ ...snapshot(1), volumeControl: true });
  player.setVolume(0.4);
  player.clear();
  reply({ authorization: "authorized", playback: { ...snapshot(2, "playing"), volume: 0.4, volumeControl: true } });
  await Promise.resolve();
  await Promise.resolve();
  expect(player.getSnapshot()).toMatchObject({ currentId: null, volumeControl: false, tracks: [] });
});
