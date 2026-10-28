import type { Track, PlaybackStatus } from "../player/Player";
import type { Playlist } from "../player/playlists";

export type NativeTrack = {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  albumArtist?: string;
  duration: number;
  artwork?: string;
  trackNumber?: number;
};
export type NativePlayback = {
  sequence: number;
  currentId: string | null;
  current?: NativeTrack;
  queue: string[];
  queueKnown: boolean;
  status: PlaybackStatus;
  position: number;
  duration: number;
  volume: number;
  repeat: "off" | "one" | "all";
};
export type NativeReply = {
  authorization: "notDetermined" | "authorized" | "denied" | "restricted";
  playback?: NativePlayback;
  tracks?: NativeTrack[];
  playlists?: { id: string; name: string }[];
  nextOffset?: number;
  total?: number;
};
type NativeAction =
  | "status"
  | "authorize"
  | "library"
  | "playlists"
  | "playlistTracks"
  | "setQueue"
  | "play"
  | "pause"
  | "next"
  | "previous"
  | "seek"
  | "repeat"
  | "openSettings";
type NativePayload = {
  id?: string;
  ids?: string[];
  selectedId?: string;
  offset?: number;
  limit?: number;
  seconds?: number;
  autoplay?: boolean;
  mode?: "off" | "one" | "all";
};
declare global {
  interface Window {
    __REIPOD_NATIVE_MUSIC_VERSION__?: number;
    webkit?: {
      messageHandlers?: {
        reipodMusic?: {
          postMessage(
            message: NativePayload & { version: number; action: NativeAction },
          ): Promise<NativeReply>;
        };
      };
    };
  }
}
export const hasNativeMusic = () =>
  window.__REIPOD_NATIVE_MUSIC_VERSION__ === 1 &&
  !!window.webkit?.messageHandlers?.reipodMusic;
export async function nativeMusicRequest(
  action: NativeAction,
  payload: NativePayload = {},
): Promise<NativeReply> {
  const bridge = window.webkit?.messageHandlers?.reipodMusic;
  if (!hasNativeMusic() || !bridge)
    throw new Error("此功能需要在 ReiPod iPhone App 内使用");
  const value = await bridge.postMessage({ version: 1, action, ...payload });
  if (
    !value ||
    !["notDetermined", "authorized", "denied", "restricted"].includes(
      value.authorization,
    )
  )
    throw new Error("系统音乐桥接返回了无效状态，请更新 App");
  return value;
}
export function nativeTrack(track: NativeTrack): Track {
  return {
    ...track,
    id: `ios-song:${track.id}`,
    kind: "apple-music",
    url: `iosmusic://song/${encodeURIComponent(track.id)}`,
    filename: "",
    size: 0,
  };
}
export const nativePersistentId = (id: string) =>
  id.startsWith("ios-song:") ? id.slice("ios-song:".length) : null;
export async function nativeLibrary() {
  const tracks: Track[] = [],
    playlists: Playlist[] = [];
  for (const action of ["library", "playlists"] as const) {
    let offset: number | undefined = 0;
    const seen = new Set<number>();
    while (offset !== undefined) {
      if (seen.has(offset)) throw new Error("系统音乐分页未能完成，请刷新");
      seen.add(offset);
      const page = await nativeMusicRequest(action, { offset, limit: 100 });
      if (page.authorization !== "authorized")
        throw new Error("系统音乐资料库权限不可用，请在系统设置中允许访问");
      if (action === "library")
        tracks.push(...(page.tracks ?? []).map(nativeTrack));
      else
        playlists.push(
          ...(page.playlists ?? []).map((entry) => ({
            id: `ios-playlist:${entry.id}`,
            name: entry.name,
            trackIds: [],
          })),
        );
      offset = page.nextOffset;
    }
  }
  return { tracks, playlists };
}
export async function nativePlaylist(id: string) {
  if (!id.startsWith("ios-playlist:")) throw new Error("无效的系统歌单");
  const tracks: Track[] = [];
  let offset: number | undefined = 0;
  const seen = new Set<number>();
  while (offset !== undefined) {
    if (seen.has(offset)) throw new Error("系统歌单分页未能完成，请刷新");
    seen.add(offset);
    const page = await nativeMusicRequest("playlistTracks", {
      id: id.slice("ios-playlist:".length),
      offset,
      limit: 100,
    });
    if (page.authorization !== "authorized")
      throw new Error("系统音乐资料库权限不可用");
    tracks.push(...(page.tracks ?? []).map(nativeTrack));
    offset = page.nextOffset;
  }
  return tracks;
}
