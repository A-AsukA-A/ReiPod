import type { MusicServiceState } from "../services/musicServices";
import type { MenuItem } from "./MenuRows";

/** Wheel actions stay on the LCD's existing menu grid. No permission on render. */
export function createNativePodcastRows(
  state: MusicServiceState["nativePodcasts"],
  actions: { retry: () => void; refresh: () => void; settings: () => void; openApp: () => void },
): MenuItem[] {
  if (!state) return [];
  const connected = state.auth === "authorized";
  const denied = state.authorization === "denied" || state.authorization === "restricted";
  const busy = state.auth === "loading" || state.syncing || (!connected && !denied && !state.error);
  return [
    { key: "podcast-status", label: busy ? "正在读取系统播客…" : connected ? "刷新系统播客" : denied ? "打开系统设置" : "重新读取系统播客",
      action: busy ? () => {} : connected ? actions.refresh : denied ? actions.settings : actions.retry,
      detail: state.error || (connected
        ? state.tracks.length ? `${state.tracks.length} 集系统播客` : "系统未提供已下载播客，可打开 Apple 播客或导入文件"
        : "通过系统媒体资料库授权读取可访问的已下载播客") },
    { key: "podcast-app", label: "打开 Apple 播客", detail: "切换到 iPhone 的播客 App", action: actions.openApp },
  ];
}

/** Actual shows occupy the main menu. A first-load status never launches another app. */
export function createNativePodcastStatusRows(
  state: MusicServiceState["nativePodcasts"], hasShows: boolean, openSettings: () => void,
): MenuItem[] {
  if (hasShows) return [];
  if (!state) return [{ key: "podcast-status", label: "暂无播客",
    detail: "可在播客设置导入本地节目", action: openSettings }];
  const busy = state.auth === "loading" || state.syncing ||
    (state.auth !== "authorized" && !state.error && state.authorization !== "denied" && state.authorization !== "restricted");
  return [{ key: "podcast-status", label: busy ? "正在读取播客…"
    : state.error ? "系统播客暂不可用" : "暂无系统播客",
    detail: state.error || (busy ? "节目会自动显示" : "系统未提供已下载播客，可在播客设置查看"),
    leaf: busy, action: busy ? () => {} : openSettings }];
}
