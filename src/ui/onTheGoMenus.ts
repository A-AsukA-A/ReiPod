import { onTheGoId } from "../player/playlistModel";
import type { Playlist } from "../player/playlistModel";
import type { Track } from "../player/Player";
import type { MenuItem } from "./MenuRows";
import type { Page } from "./navigation";

/** Only the local composition installs these rows. Playback is never edited by saving/clearing. */
export function createOnTheGoMenus({ page, groupKey, playlist, tracks, open, back, notice, save, clear, play }: {
  page: Page; groupKey?: string; playlist?: Playlist; tracks: Track[];
  open: (page: Page, key?: string, group?: string) => void; back: () => void; notice: (text: string) => void;
  save: () => { playlist: Playlist | null; persisted: boolean }; clear: () => boolean;
  play: (id: string) => void;
}): Partial<Record<Page, MenuItem[]>> {
  const rows: Partial<Record<Page, MenuItem[]>> = {};
  if (page === "playlist-tracks" && (groupKey === onTheGoId || playlist?.savedOnTheGo)) {
    rows["playlist-tracks"] = [
      ...tracks.map(track => ({ key: track.id, label: track.title, action: () => play(track.id) })),
      ...(groupKey === onTheGoId ? [
        { key: "save-on-the-go", label: "保存播放列表", disabled: !tracks.length, action: () => {
          if (!tracks.length) return;
          const result = save();
          if (!result.persisted) notice("保存失败，On-The-Go 原列表已保留，请重试");
          else if (result.playlist) { back(); notice(`已保存为「${result.playlist.name}」`); }
        } },
        { key: "clear-on-the-go", label: "清空播放列表…", disabled: !tracks.length,
          action: () => { if (tracks.length) open("confirm-clear-on-the-go", "cancel", onTheGoId); } },
      ] : []),
    ];
  }
  if (page === "confirm-clear-on-the-go") rows[page] = [
    { key: "cancel", label: "取消", leaf: true, action: back },
    { key: "clear", label: "清空", leaf: true, action: () => {
      if (clear()) { back(); notice("On-The-Go 已清空"); }
      else notice("清空未能保存，原列表已保留，请重试");
    } },
  ];
  return rows;
}
