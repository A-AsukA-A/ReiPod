import type { NativePhotoState } from "../services/nativePhotos";
import type { MenuItem } from "./MenuRows";
import type { Page } from "./navigation";

type Actions = { open: (page: Page, key?: string, group?: string) => void; refresh: () => void;
  manage: (action: "refresh" | "limited" | "openSettings") => void };

export function nativePhotoAlbumRows(state: NativePhotoState, { open }: Actions): MenuItem[] {
  if (state.albums.some(album => album.count)) return state.albums.map(album => ({ key: album.id, label: album.title,
    artwork: album.thumbnail, detail: `${album.count} 张照片`, disabled: !album.count,
    action: () => open("photo-grid", undefined, `ios-photo-album:${album.id}`) }));
  return [{ key: "photo-status", label: state.loading ? "正在读取相册…" : state.error ? "系统相册暂不可用" : "暂无可用照片",
    detail: state.error, leaf: state.loading, action: () => { if (!state.loading) open("photo-settings"); } }];
}

export function nativePhotoSettingsRows(state: NativePhotoState, actions: Actions): MenuItem[] {
  const denied = ["denied", "restricted"].includes(state.authorization);
  return [
    { key: "photo-status", label: denied ? "打开系统设置" : "刷新系统相册",
      detail: state.error ?? (state.authorization === "limited" ? "仅显示允许访问的照片" : "只读浏览，不修改系统照片"),
      action: () => actions.manage(denied ? "openSettings" : "refresh") },
    ...(state.authorization === "limited" ? [{ key: "photo-limited", label: "选择可访问的照片…",
      action: () => actions.manage("limited") }] : []),
  ];
}
