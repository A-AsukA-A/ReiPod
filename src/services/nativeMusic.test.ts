import { afterEach, expect, test, vi } from "vitest";
import { nativeLibrary, nativePodcasts, nativePodcastShows, nativeTrack } from "./nativeMusic";

afterEach(() => vi.unstubAllGlobals());
function bridge(podcasts: boolean, postMessage = vi.fn()) {
  vi.stubGlobal("window", { __REIPOD_NATIVE_MUSIC_VERSION__: 1,
    __REIPOD_NATIVE_PODCASTS_VERSION__: podcasts ? 1 : undefined,
    webkit: { messageHandlers: { reipodMusic: { postMessage } } } });
  return postMessage;
}
test("older shells do not receive podcast actions", async () => {
  const request = bridge(false);
  request.mockResolvedValue({ authorization: "authorized", tracks: [] });
  await nativeLibrary();
  expect(await nativePodcasts()).toEqual([]);
  expect(request.mock.calls.map(([message]) => message.action)).toEqual(["library", "playlists"]);
});
test("system episodes page separately from songs and group by 64-bit show identity", async () => {
  const request = bridge(true);
  request.mockImplementation(async ({ action, offset }) => ({ authorization: "authorized",
    tracks: action === "podcasts" ? [{ id: offset ? "18446744073709551615" : "9007199254740993",
      title: "Episode", artist: offset ? "Guest B" : "Guest A", duration: 100,
      podcast: { showId: "18446744073709551614", showTitle: "Show", bookmark: 20 } }] : [],
    nextOffset: action === "podcasts" && !offset ? 1 : undefined }));
  const podcasts = await nativePodcasts(true);
  expect(request.mock.calls.map(([message]) => message)).toEqual([
    { version: 1, action: "podcasts", offset: 0, limit: 100, refresh: true },
    { version: 1, action: "podcasts", offset: 1, limit: 100, refresh: false },
  ]);
  expect(podcasts.map(track => track.id)).toEqual(["ios-song:9007199254740993", "ios-song:18446744073709551615"]);
  const shows = nativePodcastShows(podcasts);
  expect(shows).toHaveLength(1);
  expect(shows[0].id).toBe("ios-podcast-show:18446744073709551614");
  expect(shows[0].tracks).toHaveLength(2);
});
test("podcast pagination rejects revoked access and repeated offsets", async () => {
  const request = bridge(true);
  request.mockImplementation(async ({ action }) => ({ authorization: action === "podcasts" ? "denied" : "authorized" }));
  await expect(nativePodcasts()).rejects.toThrow("权限");
  request.mockImplementation(async ({ action }) => ({ authorization: "authorized", nextOffset: action === "podcasts" ? 0 : undefined }));
  await expect(nativePodcasts()).rejects.toThrow("分页");
});
test("native conversion retains podcast metadata without exposing an asset URL", () => {
  const track = nativeTrack({ id: "42", title: "Episode", duration: 120,
    podcast: { showId: "12", showTitle: "Show", bookmark: 35 } });
  expect(track.podcast?.bookmark).toBe(35);
  expect(track.url).toBe("iosmusic://song/42");
});
