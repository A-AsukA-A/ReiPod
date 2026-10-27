import type { RefObject } from "react";
import type { Track, PlayerState } from "../player/Player";
import type { Playlist } from "../player/playlists";
import {
  deletePlaylist,
  togglePlaylistTrack,
  removePlaylistTrack,
  addToOnTheGo,
} from "../player/playlists";
import { player, removeTrack } from "../player/store";
import type { Page, NavigationState } from "./navigation";
import type { MenuItem } from "./MenuRows";
type LibraryMenuContext = {
  page: Page;
  groupKey?: string;
  playlists: Playlist[];
  state: PlayerState;
  visibleTracks: Track[];
  playlistTrackIds: Set<string>;
  optionTrack?: Track;
  contextPlaylist: string | null;
  deleting: boolean;
  editName: (id?: string) => void;
  saveName: () => void;
  beginText: () => void;
  setDeleting: (value: boolean) => void;
  setNotice: (value: string) => void;
  open: (page: Page, key?: string, group?: string) => void;
  back: (levels?: number) => void;
  navigationRef: RefObject<NavigationState>;
  playTrack: (id: string, queue?: string[]) => void;
  toggleFavorite: (id?: string) => void;
};
export function createLibraryMenus({
  page,
  groupKey,
  playlists,
  state,
  visibleTracks,
  playlistTrackIds,
  optionTrack,
  contextPlaylist,
  deleting,
  editName,
  saveName,
  beginText,
  setDeleting,
  setNotice,
  open,
  back,
  navigationRef,
  playTrack,
  toggleFavorite,
}: LibraryMenuContext): Partial<Record<Page, MenuItem[]>> {
  return {
    "playlist-name": [
      { key: "edit-name", label: "修改名称", action: beginText },
      {
        key: "save",
        label: groupKey ? "保存名称" : "创建歌单",
        action: saveName,
      },
      { key: "cancel", label: "取消", action: () => back() },
    ],
    "playlist-options": [
      {
        key: "add",
        label: "添加 / 移除歌曲",
        action: () => open("playlist-add-tracks", undefined, groupKey),
      },
      { key: "rename", label: "重命名", action: () => editName(groupKey) },
      {
        key: "delete",
        label: "删除歌单…",
        action: () => open("confirm-delete-playlist", "cancel", groupKey),
      },
    ],
    "playlist-tracks":
      page === "playlist-tracks"
        ? [
            ...visibleTracks.map((track) => ({
              key: track.id,
              label: track.title,
              action: () => playTrack(track.id),
            })),
            ...(!visibleTracks.length
              ? [
                  {
                    key: "add",
                    label: "添加歌曲",
                    action: () =>
                      open("playlist-add-tracks", undefined, groupKey),
                  },
                ]
              : []),
            {
              key: "manage-playlist",
              label: "管理歌单…",
              action: () => open("playlist-options", "add", groupKey),
            },
          ]
        : [],
    "playlist-add-tracks":
      page === "playlist-add-tracks"
        ? [
            ...state.tracks.map((track) => ({
              key: track.id,
              label: track.title,
              value: playlistTrackIds.has(track.id) ? "✓" : "+",
              action: () => {
                if (groupKey && !togglePlaylistTrack(groupKey, track.id))
                  setNotice("更改未能保存，本次仍生效");
              },
            })),
            { key: "done", label: "完成选择", action: () => back() },
          ]
        : [],
    "pick-playlist": [
      ...playlists.map((item) => ({
        key: item.id,
        label: item.name,
        value: item.trackIds.includes(groupKey ?? "") ? "已添加" : "+",
        action: () => {
          if (!groupKey) return;
          if (item.trackIds.includes(groupKey)) {
            setNotice("歌曲已在歌单中");
            return;
          }
          const persisted = togglePlaylistTrack(item.id, groupKey);
          back();
          setNotice(
            persisted ? `已加入「${item.name}」` : "更改未能保存，本次仍生效",
          );
        },
      })),
      { key: "new-playlist", label: "新建歌单…", action: () => editName() },
    ],
    "track-options": optionTrack
      ? [
          {
            key: "queue",
            label: "查看播放队列",
            action: () => open("queue", optionTrack.id),
          },
          {
            key: "favorite",
            label: state.favorites.includes(optionTrack.id)
              ? "取消收藏"
              : "收藏歌曲",
            action: () => toggleFavorite(optionTrack.id),
          },
          {
            key: "play-next",
            label: "播放下一首",
            disabled: optionTrack.id === state.currentId,
            action: () => {
              player.playNext(optionTrack.id);
              setNotice("已设为下一首播放");
            },
          },
          {
            key: "on-the-go",
            label: "添加到 On-The-Go",
            leaf: true,
            action: () => {
              const result = addToOnTheGo(optionTrack.id);
              setNotice(
                result.persisted
                  ? result.added
                    ? "已加入 On-The-Go"
                    : "歌曲已在 On-The-Go 中"
                  : "本次已添加，歌单未能保存",
              );
            },
          },
          {
            key: "add-playlist",
            label: "添加到歌单…",
            action: () => open("pick-playlist", undefined, optionTrack.id),
          },
          ...(contextPlaylist
            ? [
                {
                  key: "remove-playlist",
                  label: "从此歌单移除",
                  action: () => {
                    const persisted = removePlaylistTrack(
                      contextPlaylist,
                      optionTrack.id,
                    );
                    back();
                    setNotice(
                      persisted ? "已从歌单移除" : "更改未能保存，本次仍生效",
                    );
                  },
                },
              ]
            : []),
          {
            key: "delete",
            label: "从曲库删除…",
            action: () =>
              open("confirm-delete-track", "cancel", optionTrack.id),
          },
        ]
      : [{ key: "back", label: "歌曲已不在曲库中", action: () => back() }],
    "confirm-delete-track": [
      { key: "cancel", label: "取消", action: () => back() },
      {
        key: "confirm",
        label: deleting ? "正在删除…" : "删除歌曲",
        disabled: deleting,
        action: () => {
          if (!groupKey || deleting) return;
          setDeleting(true);
          void removeTrack(groupKey)
            .then((removed) => {
              if (removed) {
                const screen = navigationRef.current.screen;
                if (
                  screen.page === "confirm-delete-track" &&
                  screen.groupKey === groupKey
                )
                  back(2);
                setNotice("歌曲已从曲库删除");
              }
            })
            .finally(() => setDeleting(false));
        },
      },
    ],
    "confirm-delete-playlist": [
      { key: "cancel", label: "取消", action: () => back() },
      {
        key: "confirm",
        label: "删除歌单",
        action: () => {
          if (!groupKey) return;
          const persisted = deletePlaylist(groupKey);
          back(3);
          setNotice(
            persisted
              ? "歌单已删除，歌曲仍在曲库中"
              : "删除未能保存，本次仍生效",
          );
        },
      },
    ],
  };
}
