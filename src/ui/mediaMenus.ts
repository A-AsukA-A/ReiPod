import type { Photo } from "../media/photos";
import type { Album } from "../player/library";
import type { Page, NavigationState } from "./navigation";
import type { MenuItem } from "./MenuRows";
type PhotoSummary = Pick<Photo, "id" | "name" | "album" | "url">;
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
  getNavigation,
  systemPhotos = false,
  photoSettingsRows = [],
}: MediaMenuContext): Partial<Record<Page, MenuItem[]>> {
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
    ],
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
