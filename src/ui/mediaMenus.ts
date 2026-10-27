import type { RefObject } from "react";
import type { Photo } from "../media/photos";
import { deletePhoto } from "../media/photos";
import type { Album } from "../player/library";
import type { Page, NavigationState } from "./navigation";
import type { MenuItem } from "./MenuRows";
type MediaMenuContext = {
  photos: Photo[];
  activePhotos: Photo[];
  podcastShows: Album[];
  photoInput: RefObject<HTMLInputElement | null>;
  podcastInput: RefObject<HTMLInputElement | null>;
  groupKey?: string;
  open: (page: Page, key?: string, group?: string) => void;
  back: (levels?: number) => void;
  setNotice: (message: string) => void;
  setSlideshow: (value: boolean) => void;
  navigationRef: RefObject<NavigationState>;
};
export function createMediaMenus({
  photos,
  activePhotos,
  podcastShows,
  photoInput,
  podcastInput,
  groupKey,
  open,
  back,
  setNotice,
  setSlideshow,
  navigationRef,
}: MediaMenuContext): Partial<Record<Page, MenuItem[]>> {
  return {
    photos: [
      {
        key: "all-photos",
        label: "所有照片",
        value: String(photos.length),
        disabled: !photos.length,
        action: () => open("photo-grid", photos[0]?.id),
      },
      ...[...new Set(photos.map((photo) => photo.album))].map((album) => ({
        key: album,
        label: album,
        action: () =>
          open(
            "photo-grid",
            photos.find((photo) => photo.album === album)?.id,
            album,
          ),
      })),
      {
        key: "photo-import",
        label: "导入照片…",
        action: () => {
          photoInput.current?.removeAttribute("webkitdirectory");
          photoInput.current?.click();
        },
      },
      {
        key: "photo-folder",
        label: "导入相册文件夹…",
        action: () => {
          photoInput.current?.setAttribute("webkitdirectory", "");
          photoInput.current?.click();
        },
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
      {
        key: "delete",
        label: "删除照片…",
        action: () => open("photo-delete", "cancel", groupKey),
      },
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
                if (
                  navigationRef.current.screen.page === "photo-delete" &&
                  navigationRef.current.screen.groupKey === groupKey
                )
                  back(3);
                setNotice("已删除浏览器中的照片副本");
              })
              .catch(() => setNotice("照片删除失败，请重试"));
        },
      },
    ],
    podcasts: [
      ...podcastShows.map((show) => ({
        key: show.id,
        label: show.title === "未知专辑" ? show.artist : show.title,
        value: String(show.tracks.length),
        action: () => open("podcast-episodes", show.tracks[0]?.id, show.id),
      })),
      {
        key: "podcast-import",
        label: "导入播客…",
        action: () => podcastInput.current?.click(),
      },
    ],
  };
}
