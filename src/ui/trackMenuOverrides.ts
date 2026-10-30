import type { Track } from "../player/Player";
import type { Page } from "./navigation";
import type { MenuItem } from "./MenuRows";

type Context = {
  cloud: boolean;
  optionTrack?: Track;
  localTrack: boolean;
  localFavorites: readonly string[];
  visibleTracks: Track[];
  baseOptions: MenuItem[];
  showLyrics: boolean;
  open: (page: Page, key?: string, group?: string) => void;
  back: () => void;
  playTrack: (id: string) => void;
  playNext: (id: string) => void;
  toggleFavorite: (id?: string) => void;
  onLyrics: (track: Track) => void;
};

/** Source-specific classic menu policy. Playback routing and authorization stay in App. */
export function createTrackMenuOverrides({ cloud, optionTrack: track, localTrack,
  localFavorites, visibleTracks, baseOptions, showLyrics, open, back,
  playTrack, playNext, toggleFavorite, onLyrics }: Context): Partial<Record<Page, MenuItem[]>> {
  const result: Partial<Record<Page, MenuItem[]>> = {};
  if (cloud) result["playlist-tracks"] = [
    ...visibleTracks.map(track => ({ key: track.id, label: track.title, detail: track.artist,
      action: () => playTrack(track.id) })),
    ...(!visibleTracks.length ? [{ key: "empty", label: "此歌单暂无可播放歌曲",
      disabled: true, action: () => {} }] : []),
  ];
  if (track && ((cloud && localTrack) || !localTrack)) {
    result["track-options"] = [
      ...(localTrack ? [{ key: "favorite",
        label: localFavorites.includes(track.id) ? "取消本地收藏" : "加入本地收藏",
        action: () => toggleFavorite(track.id) }] : []),
      { key: "queue", label: "播放队列", action: () => open("queue") },
      { key: "play-next", label: "下一首播放", action: () => { playNext(track.id); back(); } },
      ...(localTrack ? [{ key: "delete", label: "删除歌曲…",
        action: () => open("confirm-delete-track", "cancel", track.id) }] : []),
    ];
  }
  if (track && showLyrics) result["track-options"] = [
    { key: "lyrics", label: "歌词", action: () => onLyrics(track) },
    ...(result["track-options"] ?? baseOptions),
  ];
  return result;
}
