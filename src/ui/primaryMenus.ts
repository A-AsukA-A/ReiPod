import type { PlayerState, Track } from "../player/Player";
import type { Album } from "../player/library";
import type { Playlist } from "../player/playlists";
import type { Preferences } from "./preferences";
import type { Page } from "./navigation";
import type { MenuItem } from "./MenuRows";
import { mainMenuOrder } from "./classicSettings";
export const repeatText = { off: "关闭", all: "全部", one: "单曲" };
type PrimaryMenuContext = {
  state: PlayerState;
  prefs: Preferences;
  albums: Album[];
  photoCount: number;
  podcastShows: Album[];
  musicCount: number;
  current?: Track;
  playlists: Playlist[];
  trackById: Map<string, Track>;
  open: (page: Page, key?: string, group?: string) => void;
  shuffleAll: () => void;
  openFiles: () => void;
  loadDemos: () => void;
  editName: (id?: string) => void;
  openDocument: (path: string) => void;
  beginText: () => void;
};
export function createPrimaryMenus({
  state,
  prefs,
  albums,
  photoCount,
  podcastShows,
  musicCount,
  current,
  playlists,
  trackById,
  open,
  shuffleAll,
  openFiles,
  loadDemos,
  editName,
  openDocument,
  beginText,
}: PrimaryMenuContext) {
  const allHomeItems: MenuItem[] = [
    {
      key: "music",
      label: "音乐",
      detail: `${musicCount} 首歌曲`,
      action: () => open("music"),
    },
    {
      key: "photos",
      label: "照片",
      detail: `${photoCount} 张照片`,
      action: () => open("photos", photoCount ? "all-photos" : "photo-import"),
    },
    {
      key: "podcasts",
      label: "播客",
      detail: `${podcastShows.length} 个节目`,
      action: () => open("podcasts", podcastShows[0]?.id ?? "podcast-import"),
    },
    {
      key: "coverflow",
      label: "Cover Flow",
      detail: `${albums.length} 张专辑`,
      action: () => open("coverflow"),
    },
    {
      key: "settings",
      label: "设置",
      detail: "声音与外观",
      action: () => open("settings"),
    },
    {
      key: "shuffle-all",
      label: "随机播放歌曲",
      detail: `${musicCount} 首歌曲`,
      leaf: true,
      action: shuffleAll,
    },
    {
      key: "extras",
      label: "附加功能",
      detail: "时钟",
      action: () => open("extras", "clock"),
    },
    ...(current
      ? [
          {
            key: "playing",
            label: "正在播放",
            detail: current.title,
            action: () => open("playing"),
          },
        ]
      : []),
  ];
  const homeItems = allHomeItems
    .filter(
      (item) =>
        item.key === "music" ||
        item.key === "settings" ||
        prefs.mainMenu.includes(item.key),
    )
    .sort(
      (a, b) => mainMenuOrder.indexOf(a.key) - mainMenuOrder.indexOf(b.key),
    );
  const musicItems: MenuItem[] = [
    { key: "coverflow", label: "Cover Flow", action: () => open("coverflow") },
    { key: "playlists", label: "播放列表", action: () => open("playlists") },
    {
      key: "artists",
      label: "艺人",
      action: () => open("artists"),
    },
    {
      key: "albums",
      label: "专辑",
      action: () => open("albums"),
    },
    {
      key: "songs",
      label: "歌曲",
      action: () => open("songs"),
    },
    { key: "genres", label: "风格", action: () => open("genres") },
    { key: "composers", label: "作曲者", action: () => open("composers") },
    {
      key: "search",
      label: "搜索",
      action: () => {
        beginText();
        open("search");
      },
    },
    { key: "import", label: "导入音乐", action: openFiles },
    { key: "demo", label: "试听音乐", action: loadDemos },
  ];
  const visibleMusicItems = musicItems.filter(
    (item) =>
      ["import", "demo"].includes(item.key) ||
      prefs.musicMenu.includes(item.key),
  );
  const playlistItems: MenuItem[] = [
    {
      key: "all",
      label: "全部歌曲",
      value: `${musicCount}`,
      action: () => open("songs"),
    },
    {
      key: "favorites",
      label: "我的收藏",
      value: `${state.favorites.filter((id) => trackById.has(id)).length}`,
      action: () => open("favorites"),
    },
    { key: "recent", label: "最近添加", action: () => open("recent") },
    { key: "demo", label: "试听精选", action: loadDemos },
    ...playlists.map((item) => ({
      key: item.id,
      label: item.name,
      value: `${item.trackIds.filter((id) => trackById.has(id)).length}`,
      action: () => open("playlist-tracks", undefined, item.id),
    })),
    { key: "new-playlist", label: "新建歌单…", action: () => editName() },
  ];
  const settingsItems: MenuItem[] = [
    { key: "about", label: "关于本机", action: () => open("about", "done") },
    {
      key: "shuffle",
      label: "随机播放",
      value: state.shuffle ? "开启" : "关闭",
      action: () => open("shuffle-mode", String(state.shuffle)),
    },
    {
      key: "repeat",
      label: "重复播放",
      value: repeatText[state.repeat],
      action: () => open("repeat-mode", state.repeat),
    },
    {
      key: "main-menu",
      label: "主菜单",
      action: () => open("main-menu", "coverflow"),
    },
    {
      key: "music-menu",
      label: "音乐菜单",
      action: () => open("music-menu", "coverflow"),
    },
    {
      key: "volume-limit",
      label: "音量上限",
      value: `${Math.round(prefs.volumeLimit * 100)}%`,
      action: () => open("volume-limit", "done"),
    },
    {
      key: "backlight",
      label: "背光时间",
      value: prefs.backlight ? `${prefs.backlight} 秒` : "始终开启",
      action: () => open("backlight", `backlight-${prefs.backlight}`),
    },
    {
      key: "brightness",
      label: "亮度",
      value: `${Math.round(prefs.brightness * 100)}%`,
      action: () => open("brightness", "done"),
    },
    {
      key: "click",
      label: "转轮声音",
      value: prefs.clickSound ? "开启" : "关闭",
      action: () => open("click-sound", String(prefs.clickSound)),
    },
    {
      key: "finish",
      label: "机身颜色",
      value: prefs.finish === "silver" ? "银色" : "黑色",
      action: () => open("finish", prefs.finish),
    },
    {
      key: "background",
      label: "背景",
      value: prefs.background === "warm" ? "浅色" : "深色",
      action: () => open("background", prefs.background),
    },
    {
      key: "clear",
      label: "清空音乐资料库",
      disabled: !musicCount,
      action: () => open("confirm-clear", "cancel"),
    },
    {
      key: "licenses",
      label: "开源许可",
      action: () => openDocument("third-party-licenses.txt"),
    },
    {
      key: "credits",
      label: "试听曲目版权",
      action: () => openDocument("music/credits.txt"),
    },
  ];
  return {
    homeItems,
    musicItems: visibleMusicItems,
    playlistItems,
    settingsItems,
  };
}
