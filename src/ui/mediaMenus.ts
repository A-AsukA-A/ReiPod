import type { Photo } from "../media/photos";
import type { Album } from "../player/library";
import {
  defaultSlideshowSettings,
  slideshowDurations,
  slideshowDurationLabel,
  slideshowMusicLabel,
  slideshowTransitions,
  slideshowTransitionLabel,
  type SlideshowSettings,
} from "../models/slideshowSettings";
import type { Page, NavigationState } from "./navigation";
import type { MenuItem } from "./MenuRows";
type PhotoSummary = Pick<Photo, "id" | "name" | "album" | "url">;
type SlideshowPlaylistSummary = { id: string; name: string; count: number };
type MediaMenuContext = {
  photos: readonly PhotoSummary[];
  activePhotos: readonly PhotoSummary[];
  podcastShows: Album[];
  podcastSystemRows?: MenuItem[];
  openPhotos: (folder: boolean) => void;
  deletePhoto: (id: string) => Promise<void>;
  groupKey?: string;
  open: (page: Page, key?: string, group?: string) => void;
  back: (levels?: number) => void;
  setNotice: (message: string) => void;
  setSlideshow: (value: boolean) => void;
  slideshowSettings?: SlideshowSettings;
  setSlideshowSettings?: (patch: Partial<SlideshowSettings>) => void;
  slideshowPlaylists?: readonly SlideshowPlaylistSummary[];
  getNavigation: () => NavigationState;
  systemPhotos?: boolean;
  photoSettingsRows?: MenuItem[];
};
export function createMediaMenus({
  photos,
  activePhotos,
  podcastShows,
  podcastSystemRows = [],
  openPhotos,
  deletePhoto,
  groupKey,
  open,
  back,
  setNotice,
  setSlideshow,
  slideshowSettings = defaultSlideshowSettings,
  setSlideshowSettings,
  slideshowPlaylists = [],
  getNavigation,
  systemPhotos = false,
  photoSettingsRows = [],
}: MediaMenuContext): Partial<Record<Page, MenuItem[]>> {
  const selectedMusicKey =
    typeof slideshowSettings.music === "string"
      ? slideshowSettings.music
      : slideshowSettings.music.playlistId;
  return {
    photos: [
      {
        key: "all-photos",
        label: "所有照片",
        detail: `${photos.length} 张照片`,
        artwork: photos[0]?.url,
        disabled: !photos.length,
        action: () => open("photo-grid", photos[0]?.id),
      },
      ...[...new Set(photos.map((photo) => photo.album))].map((album) => ({
        key: album,
        label: album,
        detail: `${photos.filter((photo) => photo.album === album).length} 张照片`,
        artwork: photos.find((photo) => photo.album === album)?.url,
        action: () =>
          open(
            "photo-grid",
            photos.find((photo) => photo.album === album)?.id,
            album,
          ),
      })),
      ...(!photos.length ? [{ key: "photo-status", label: "暂无照片",
        detail: "可在照片设置中导入", action: () => open("photo-settings") }] : []),
    ],
    "photo-settings": [
      ...photoSettingsRows,
      {
        key: "photo-import",
        label: "导入照片…",
        action: () => openPhotos(false),
      },
      {
        key: "photo-folder",
        label: "导入相册文件夹…",
        action: () => openPhotos(true),
      },
      {
        key: "slideshow-settings",
        label: "幻灯片设置",
        action: () => open("slideshow-settings"),
      },
    ],
    "slideshow-settings": [
      {
        key: "time",
        label: "每张停留时间",
        value: slideshowDurationLabel(slideshowSettings.timePerSlide),
        action: () => open("slideshow-duration", String(slideshowSettings.timePerSlide)),
      },
      {
        key: "music",
        label: "背景音乐",
        value: slideshowMusicLabel(slideshowSettings.music, slideshowPlaylists),
        action: () => open("slideshow-music", selectedMusicKey),
      },
      {
        key: "repeat",
        label: "重复播放",
        value: slideshowSettings.repeat ? "开启" : "关闭",
        leaf: true,
        action: () => setSlideshowSettings?.({ repeat: !slideshowSettings.repeat }),
      },
      {
        key: "shuffle",
        label: "随机照片",
        value: slideshowSettings.shuffle ? "开启" : "关闭",
        leaf: true,
        action: () => setSlideshowSettings?.({ shuffle: !slideshowSettings.shuffle }),
      },
      {
        key: "transition",
        label: "过渡效果",
        value: slideshowTransitionLabel(slideshowSettings.transition),
        action: () => open("slideshow-transition", slideshowSettings.transition),
      },
    ],
    "slideshow-music": [
      {
        key: "keep",
        label: "保持当前",
        value: slideshowSettings.music === "keep" ? "✓" : undefined,
        leaf: true,
        action: () => {
          setSlideshowSettings?.({ music: "keep" });
          back();
        },
      },
      {
        key: "off",
        label: "关闭",
        value: slideshowSettings.music === "off" ? "✓" : undefined,
        leaf: true,
        action: () => {
          setSlideshowSettings?.({ music: "off" });
          back();
        },
      },
      ...slideshowPlaylists.map((playlist) => ({
        key: playlist.id,
        label: playlist.name,
        value:
          typeof slideshowSettings.music === "object" &&
          slideshowSettings.music.playlistId === playlist.id
            ? "✓"
            : `${playlist.count} 首`,
        leaf: true,
        action: () => {
          setSlideshowSettings?.({
            music: { playlistId: playlist.id, playlistName: playlist.name },
          });
          back();
        },
      })),
    ],
    "slideshow-duration": slideshowDurations.map((seconds) => ({
      key: String(seconds),
      label: slideshowDurationLabel(seconds),
      value: slideshowSettings.timePerSlide === seconds ? "✓" : undefined,
      leaf: true,
      action: () => {
        setSlideshowSettings?.({ timePerSlide: seconds });
        back();
      },
    })),
    "slideshow-transition": slideshowTransitions.map((transition) => ({
      key: transition,
      label: slideshowTransitionLabel(transition),
      value: slideshowSettings.transition === transition ? "✓" : undefined,
      leaf: true,
      action: () => {
        setSlideshowSettings?.({ transition });
        back();
      },
    })),
    "photo-grid": activePhotos.map((photo) => ({
      key: photo.id,
      label: photo.name,
      action: () => open("photo-full", photo.id, groupKey),
    })),
    "photo-full": activePhotos.map((photo) => ({
      key: photo.id,
      label: photo.name,
      action: () => {},
    })),
    "photo-options": [
      {
        key: "slideshow",
        label: "开始幻灯片",
        action: () => {
          back();
          setSlideshow(true);
        },
      },
      {
        key: "slideshow-settings",
        label: "幻灯片设置",
        action: () => open("slideshow-settings"),
      },
      ...(!systemPhotos ? [{
        key: "delete",
        label: "删除照片…",
        action: () => open("photo-delete", "cancel", groupKey),
      }] : []),
      { key: "cancel", label: "返回照片", action: () => back() },
    ],
    "photo-delete": [
      { key: "cancel", label: "取消", action: () => back() },
      {
        key: "confirm",
        label: "删除此照片",
        action: () => {
          if (groupKey)
            void deletePhoto(groupKey)
              .then(() => {
                const { screen } = getNavigation();
                if (
                  screen.page === "photo-delete" &&
                  screen.groupKey === groupKey
                )
                  back(3);
                setNotice("已删除浏览器中的照片副本");
              })
              .catch(() => setNotice("照片删除失败，请重试"));
        },
      },
    ],
    podcasts: [
      ...podcastShowRows(podcastShows, open),
      ...podcastSystemRows,
    ],
  };
}

export function podcastShowRows(shows: Album[], open: MediaMenuContext["open"], local = false): MenuItem[] {
  return shows.map(show => ({
    key: show.id,
    label: `${local ? "本地 · " : ""}${show.title === "未知专辑" ? show.artist : show.title}`,
    artwork: show.artwork,
    detail: `${show.tracks.length} 集`,
    action: () => open("podcast-episodes", undefined, show.id),
  }));
}
