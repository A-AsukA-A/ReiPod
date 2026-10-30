import type { Page } from "./navigation";
import type { PlayView } from "./nowPlaying";
import type { Album } from "../player/library";
import type { Track } from "../player/Player";
import type { MenuItem } from "./MenuRows";
import { menuPreview } from "./menuPreviewModel";

type TitleContext = {
  page: Page; groupKey?: string; browseArtist?: string; playView: PlayView;
  albumTitle?: string; podcastTitle?: string; documentTitle?: string;
  playlistTitle?: string; serviceName: string;
};
export function classicScreenTitle({ page, groupKey, browseArtist, playView,
  albumTitle, podcastTitle, documentTitle, playlistTitle, serviceName }: TitleContext) {
  return page === "album-tracks"
      ? (albumTitle ?? "专辑")
      : page === "podcast-episodes"
        ? (podcastTitle ?? "播客")
        : page === "artist-tracks" ||
            page === "genre-tracks" ||
            page === "composer-tracks"
          ? (groupKey ?? "艺人")
          : {
              about: "关于本机",
              "main-menu": "主菜单",
              "music-menu": "音乐菜单",
              backlight: "背光时间",
              brightness: "亮度",
              "volume-limit": "音量上限",
              extras: "附加功能",
              clock: "时钟",
              notes: "文本阅读",
              "text-reader": documentTitle ?? "文本阅读",
              "text-options": "阅读选项",
              "confirm-delete-text": "删除文本",
              home: "ReiPod",
              music: "音乐",
              "music-services": "音乐服务",
              "music-account": serviceName,
              "local-songs": "本地音乐",
              songs: "歌曲",
              demos: "试听音乐",
              playing: playView === "lyrics" ? "歌词" : "正在播放",
              settings: "设置",
              "confirm-clear": "清空资料库",
              coverflow: "Cover Flow",
              "coverflow-album": "Cover Flow",
              photos: "照片",
              "photo-grid": "所有照片",
              "photo-full": "照片",
              "photo-options": "照片选项",
              "photo-delete": "删除照片",
              podcasts: "播客",
              finish: "机身颜色",
              background: "背景",
              "click-sound": "转轮声音",
              "lyrics-display": "歌词显示",
              "shuffle-mode": "随机播放",
              "repeat-mode": "重复播放",
              artists: "艺人",
              genres: "风格",
              composers: "作曲者",
              albums: browseArtist ?? "专辑",
              favorites: "我的收藏",
              recent: "最近添加",
              playlists: "播放列表",
              queue: "播放队列",
              search: "搜索",
              "playlist-tracks": playlistTitle ?? "歌单",
              "playlist-options": "管理歌单",
              "playlist-name": groupKey ? "重命名歌单" : "新建歌单",
              "playlist-add-tracks": "选择歌曲",
              "pick-playlist": "添加到歌单",
              "track-options": "歌曲选项",
              "confirm-delete-track": "删除歌曲",
              "confirm-delete-playlist": "删除歌单",
            }[page];

}

export function classicPreviewModel({ page, focusedRow, albums, current, sleeping, tracks }: {
  page: Page; focusedRow?: MenuItem; albums: Album[]; current?: Track;
  sleeping: boolean; tracks: Track[];
}) {
  return {
    spec: menuPreview(page, focusedRow?.key ?? "music", focusedRow?.label ?? "音乐",
      focusedRow?.value ?? focusedRow?.detail),
    albums, current,
    initialAlbumId: albums.find(album => album.tracks.some(track => track.id === current?.id))?.id,
    suspended: sleeping,
    count: tracks.length,
    bytes: tracks.reduce((sum, track) => sum + track.size, 0),
  };
}
