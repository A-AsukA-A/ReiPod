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
