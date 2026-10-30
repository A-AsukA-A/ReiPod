import type { MusicService, MusicServiceState } from "../services/musicServices";
import type { MenuItem } from "./MenuRows";
import type { Page } from "./navigation";

type Context = {
  services: MusicServiceState;
  serviceName: string;
  externalLogin: boolean;
  localFirstId?: string;
  page: Page;
  localMusicItems: MenuItem[];
  localPlaylistItems: MenuItem[];
  open: (page: Page, key?: string, group?: string) => void;
  beginText: () => void;
  clearQuery: () => void;
  openFiles: () => void;
  loadDemos: () => void;
  actions: {
    select: (service: MusicService) => void;
    refresh: () => void;
    signOut: () => void;
    login: (channel?: string) => void;
    openPlaylist: (id: string) => Promise<void>;
  };
};

/** Current classic menus; all platform operations are supplied by the app. */
export function createMusicServiceMenus({
  services, serviceName, externalLogin, localFirstId, page,
  localMusicItems, localPlaylistItems, open, beginText, clearQuery,
  openFiles, loadDemos, actions,
}: Context) {
  const cloud = services.selected !== "local";
  const externalMusic = services.selected === "netease" || services.selected === "qq";
  const nativeMusic = services.transport === "ios";
  const account = () =>
    open("music-account", services.auth === "authorized" ? "refresh" : "login");
  const cloudAccess: MenuItem[] = [
    {
      key: "music-account",
      label:
        services.auth === "authorized"
          ? `${serviceName} 账户`
          : nativeMusic
            ? "连接系统音乐"
            : `登录 ${serviceName}`,
      action: account,
    },
  ];
  const musicItems: MenuItem[] = cloud
    ? [
        ...(services.auth === "authorized"
          ? [
              {
                key: "coverflow",
                label: "Cover Flow",
                action: () => open("coverflow"),
              },
              {
                key: "playlists",
                label: "播放列表",
                action: () => open("playlists"),
              },
              { key: "artists", label: "艺人", action: () => open("artists") },
              { key: "albums", label: "专辑", action: () => open("albums") },
              { key: "songs", label: "歌曲", action: () => open("songs") },
              {
                key: "search",
                label: nativeMusic ? "搜索资料库" : `搜索 ${serviceName}`,
                action: () => {
                  clearQuery();
                  beginText();
                  open("search");
                },
              },
            ]
          : []),
        ...cloudAccess,
        {
          key: "local-songs",
          label: "本地音乐",
          action: () =>
            open("local-songs", localFirstId ?? "import"),
        },
      ]
    : localMusicItems;
  const playlistItems: MenuItem[] = cloud
    ? [
        ...services.playlists.map((list) => ({
          key: list.id,
          label: list.name,
          action: () => {
            void actions.openPlaylist(list.id);
          },
        })),
        {
          key: "refresh",
          label: services.syncing ? "正在同步…" : `刷新 ${serviceName} 歌单`,
          disabled: services.syncing,
          action: () => {
            actions.refresh();
          },
        },
        ...cloudAccess,
      ]
    : localPlaylistItems;
  const emptyItems: MenuItem[] = cloud
    ? [
        ...(page === "search"
          ? [
              {
                key: "edit-search",
                label: "修改搜索…",
                action: beginText,
              },
            ]
          : []),
        ...cloudAccess,
      ]
    : [
        { key: "import", label: "导入音乐", action: openFiles },
        { key: "demo", label: "试听音乐", action: loadDemos },
      ];
  const managedRows: Partial<Record<Page, MenuItem[]>> = {
    "music-services": [
      {
        key: "apple-music",
        label: "Apple Music",
        value: services.selected === "apple-music" ? "✓" : "",
        action: () => {
          actions.select("apple-music");
        },
      },
      {
        key: "local",
        label: "本地音乐",
        value: services.selected === "local" ? "✓" : "",
        action: () => {
          actions.select("local");
        },
      },
      {
        key: "netease",
        label: "网易云音乐",
        value: services.selected === "netease" ? "✓" : "",
        action: () => {
          actions.select("netease");
        },
      },
      {
        key: "qq",
        label: "QQ 音乐",
        value: services.selected === "qq" ? "✓" : "",
        action: () => {
          actions.select("qq");
        },
      },
    ],
    "music-account":
      services.auth === "authorized"
        ? [
            {
              key: "refresh",
              label: services.syncing ? "正在同步…" : "刷新资料库",
              disabled: services.syncing,
              leaf: true,
              action: () => {
                actions.refresh();
              },
            },
            {
              key: "logout",
              label: nativeMusic ? "断开系统音乐" : "退出登录",
              destructive: true,
              leaf: true,
              action: () => {
                actions.signOut();
              },
            },
          ]
        : [
            {
              key: "login",
              label:
                services.auth === "loading"
                  ? services.loginUrl ? `打开 ${serviceName} 确认` : "正在连接…"
                  : externalMusic
                    ? externalLogin
                      ? `打开 ${serviceName} 登录`
                      : `扫码登录 ${serviceName}`
                    : services.ready
                      ? nativeMusic
                        ? ["denied", "restricted"].includes(
                            services.nativeAuthorization ?? "",
                          )
                          ? "打开系统设置"
                          : "允许访问音乐资料库"
                        : "登录 Apple Music"
                      : "重新检查连接",
              disabled: services.auth === "loading" && !services.loginUrl,
              action: () => {
                actions.login();
              },
            },
            ...(externalMusic
              ? [
                  ...(services.selected === "qq" &&
                  !externalLogin &&
                  services.auth !== "loading"
                    ? [
                        {
                          key: "wechat-login",
                          label: "用微信扫码登录",
                          action: () => {
                            actions.login("wechat");
                          },
                        },
                      ]
                    : []),
                  ...(services.auth === "loading"
                    ? [
                        {
                          key: "cancel-login",
                          label: "取消登录",
                          action: () => {
                            actions.signOut();
                          },
                        },
                      ]
                    : []),
                ]
              : []),
            {
              key: "local-songs",
              label: "本地音乐",
              action: () =>
                open("local-songs", localFirstId ?? "import"),
            },
          ],
  };
  return { account, musicItems, playlistItems, emptyItems, managedRows };
}
