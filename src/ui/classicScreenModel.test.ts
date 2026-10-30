import { expect, it } from "vitest";
import { classicPreviewModel, classicScreenTitle } from "./classicScreenModel";
import type { Track } from "../player/Player";

it("titles use the current browse scope and keep missing metadata fallbacks", () => {
  const base = { playView: "art" as const, serviceName: "QQ 音乐", groupKey: "中文分类",
    albumTitle: "A very long album name", podcastTitle: "节目", documentTitle: "文本", playlistTitle: "歌单" };
  for (const [page, title] of [
    ["home", "ReiPod"], ["album-tracks", base.albumTitle], ["podcast-episodes", "节目"],
    ["genre-tracks", "中文分类"], ["text-reader", "文本"], ["playlist-tracks", "歌单"],
    ["music-account", "QQ 音乐"],
  ] as const) expect(classicScreenTitle({ ...base, page })).toBe(title);
  expect(classicScreenTitle({ ...base, page: "albums", browseArtist: "所选艺人" })).toBe("所选艺人");
  expect(classicScreenTitle({ ...base, page: "album-tracks", albumTitle: undefined })).toBe("专辑");
  expect(classicScreenTitle({ ...base, page: "playlist-name", groupKey: undefined })).toBe("新建歌单");
  expect(classicScreenTitle({ ...base, page: "playlist-name" })).toBe("重命名歌单");
  expect(classicScreenTitle({ ...base, page: "playing", playView: "lyrics" })).toBe("歌词");
});

it("preview keeps full Now Playing artwork intent and derives totals from the supplied playback library", () => {
  const current: Track = { id: "local", title: "本地", filename: "a.mp3", url: "blob:a", size: 12 };
  const other: Track = { ...current, id: "qq:1", size: 20 };
  const albums = [{ id: "remote", title: "远程", artist: "艺人", tracks: [other] }];
  const context = { page: "home" as const, focusedRow: { key: "playing", label: "正在播放", action: () => {} },
    albums, current, sleeping: true, tracks: [current, other] };
  const preview = classicPreviewModel(context);
  expect(preview.spec.kind).toBe("playing");
  expect(preview.current).toBe(current);
  expect(preview.initialAlbumId).toBeUndefined();
  expect(preview.count).toBe(2);
  expect(preview.bytes).toBe(32);
  expect(preview.suspended).toBe(true);
  expect(classicPreviewModel({ ...context, current: other }).initialAlbumId).toBe("remote");
});

it("preview respects setting values before detail and tolerates no focused row or current song", () => {
  const base = { page: "finish" as const, albums: [], sleeping: false, tracks: [] };
  expect(classicPreviewModel({ ...base, focusedRow: { key: "black", label: "黑色", value: "✓", detail: "旧提示", action: () => {} } }).spec)
    .toEqual({ kind: "card", icon: "finish", title: "黑色", detail: undefined });
  const empty = classicPreviewModel({ ...base, page: "home" });
  expect(empty.spec.kind).toBe("covers");
  expect(empty.count).toBe(0);
  expect(empty.bytes).toBe(0);
  expect(empty.initialAlbumId).toBeUndefined();
});
