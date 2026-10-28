import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { ClickWheel } from "./input/ClickWheel";
import type { WheelCommand } from "./input/ClickWheel";
import type { Track } from "./player/Player";
import { feedback } from "./input/feedback";
import {
  addDemos,
  clearLibrary,
  importFiles,
  initializeLibrary,
  onLibraryNotice,
  player as localPlayer,
  usePlayer as useLocalPlayer,
} from "./player/store";
import {
  albumsFor,
  artistsFor,
  tracksForArtist,
  songsByTitle,
  coverFlowOrder,
} from "./player/library";
import {
  initialNavigation,
  navigationReducer,
  splitPages,
} from "./ui/navigation";
import type { Page } from "./ui/navigation";
import { CoverFlow } from "./ui/CoverFlow";
import { MenuPreview } from "./ui/MenuPreview";
import { menuPreview } from "./ui/menuPreviewModel";
import { BatteryIndicator } from "./ui/BatteryIndicator";
import {
  backlightTimes,
  optionalMainItems,
  optionalMusicItems,
  mainMenuOrder,
} from "./ui/classicSettings";
import { HoldSwitch } from "./ui/HoldSwitch";
import { useBacklight } from "./ui/useBacklight";
import { ClassicClock } from "./ui/ClassicClock";
import { ClassicGlyph } from "./ui/ClassicGlyph";
import { setPreferences, usePreferences } from "./ui/preferences";
import { PlayerIcon } from "./ui/PlayerIcon";
import { useLcdMotion } from "./ui/useLcdMotion";
import { lcdMotionStyle } from "./ui/motion";
import { searchTracks } from "./player/search";
import { useRatings, setRating } from "./player/ratings";
import {
  usePlaylists,
  createPlaylist,
  renamePlaylist,
} from "./player/playlists";

import { MenuRows } from "./ui/MenuRows";
import type { MenuItem } from "./ui/MenuRows";
import { createPrimaryMenus, repeatText } from "./ui/primaryMenus";

import { NowPlayingScreen } from "./ui/NowPlayingScreen";
import { MusicAccountHeader } from "./ui/MusicAccountHeader";
import { canShowLyrics, playingViews, restingPlayView } from "./ui/nowPlaying";
import type { PlayView } from "./ui/nowPlaying";
import { createMediaMenus } from "./ui/mediaMenus";
import { createLibraryMenus } from "./ui/libraryMenus";
import { FileImports } from "./ui/FileImports";
import { ReadOnlyScreen } from "./ui/ReadOnlyScreen";
import { settingChoices } from "./ui/settingChoices";
import { restorePhotos, usePhotos } from "./media/photos";
import { usePodcastIds, playPodcast } from "./media/podcasts";
import { PhotoScreen } from "./ui/PhotoScreen";
import { useWheelTextEntry, WheelTextEntry } from "./ui/WheelTextEntry";
import {
  builtinDocuments,
  deleteText,
  importTexts,
  restoreTexts,
  saveReadingPosition,
  useTexts,
} from "./media/textDocuments";
import { TextReader } from "./ui/TextReader";
import type { TextReaderHandle } from "./ui/TextReader";
import { applePlayer } from "./services/applePlayer";
import {
  authorizeAppleMusic,
  getMusicServices,
  initializeMusicServices,
  loadApplePlaylist,
  playbackFrom,
  prepareAppleMusic,
  refreshAppleLibrary,
  searchAppleMusic,
  selectMusicService,
  signOutAppleMusic,
  useApplePlayer,
  useMusicServices,
  openNativeMusicSettings,
  playerFor,
} from "./services/musicServices";
import {
  isThirdParty,
  thirdPartyNames,
  loadThirdPartyLyrics,
} from "./services/thirdPartyMusic";
import type { MusicService } from "./services/musicServices";

const trackService = (track?: Track): MusicService =>
  track?.kind === "apple-music" ||
  track?.kind === "netease" ||
  track?.kind === "qq"
    ? track.kind
    : "local";

export function App() {
  const localState = useLocalPlayer();
  const appleState = useApplePlayer();
  const services = useMusicServices();
  const cloud = services.selected !== "local";
  const externalMusic = isThirdParty(services.selected);
  const serviceName = externalMusic
    ? thirdPartyNames[services.selected as "netease" | "qq"]
    : "Apple Music";
  const nativeMusic = services.transport === "ios";
  const player = playerFor(services.playback);
  const state = services.playback !== "local" ? appleState : localState;
  const prefs = usePreferences();
  const localPlaylists = usePlaylists();
  const playlists = cloud ? services.playlists : localPlaylists;
  const ratings = useRatings();
  const photos = usePhotos();
  const texts = useTexts();
  const podcastIds = usePodcastIds();
  const localMusicTracks = useMemo(
    () => localState.tracks.filter((track) => !podcastIds.includes(track.id)),
    [localState.tracks, podcastIds],
  );
  const musicTracks = cloud ? services.libraryTracks : localMusicTracks;
  const podcastTracks = useMemo(
    () => localState.tracks.filter((track) => podcastIds.includes(track.id)),
    [localState.tracks, podcastIds],
  );
  const podcastShows = useMemo(() => albumsFor(podcastTracks), [podcastTracks]);
  const trackById = useMemo(
    () =>
      new Map(
        [...localState.tracks, ...appleState.tracks].map((track) => [
          track.id,
          track,
        ]),
      ),
    [localState.tracks, appleState.tracks],
  );
  const current = state.currentId ? trackById.get(state.currentId) : undefined;
  const albums = useMemo(() => albumsFor(musicTracks), [musicTracks]);
  const flowAlbums = useMemo(() => coverFlowOrder(albums), [albums]);
  const artists = useMemo(() => artistsFor(musicTracks), [musicTracks]);
  const [navigation, dispatch] = useReducer(
    navigationReducer,
    initialNavigation,
  );
  const navigationRef = useRef(navigation);
  navigationRef.current = navigation;
  const { page, groupKey, artist: browseArtist } = navigation.screen;
  const textDocument =
    texts.find((doc) => doc.id === groupKey) ??
    builtinDocuments[groupKey ?? ""];
  const isLocalText = texts.some((doc) => doc.id === groupKey);
  const reader = useRef<TextReaderHandle>(null);
  const [importingTexts, setImportingTexts] = useState(false);
  const browseTracks = useMemo(
    () =>
      browseArtist !== undefined
        ? tracksForArtist(musicTracks, browseArtist)
        : musicTracks,
    [musicTracks, browseArtist],
  );
  const browseAlbums = useMemo(
    () => (browseArtist !== undefined ? albumsFor(browseTracks) : albums),
    [albums, browseTracks, browseArtist],
  );
  const [notice, setNotice] = useState("");
  const [held, setHeld] = useState(false);
  const [sleeping, setSleeping] = useState(false);
  const { dimmed, activate } = useBacklight(prefs.backlight, sleeping);
  const [query, setQuery] = useState("");
  const [playlistName, setPlaylistName] = useState("");
  const [contextPlaylist, setContextPlaylist] = useState<string | null>(null);
  const optionQueue = useRef<string[] | undefined>(undefined);
  const [deleting, setDeleting] = useState(false);
  const [playView, setPlayView] = useState<PlayView>("art");
  const [lyricWheel, setLyricWheel] = useState(0);
  const [volumeOverlay, setVolumeOverlay] = useState(false);
  const previousPlaybackPage = useRef({ page, trackId: current?.id });
  const [transportHint, setTransportHint] = useState<
    "seek-forward" | "seek-backward" | null
  >(null);
  const transportTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [slideshow, setSlideshow] = useState(false);
  const textEntry = useWheelTextEntry(
    state.tracks
      .map((track) => `${track.title}${track.artist ?? ""}${track.album ?? ""}`)
      .join(""),
  );
  const input = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const podcastInput = useRef<HTMLInputElement>(null);
  const textInput = useRef<HTMLInputElement>(null);
  const selectedRow = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const capture = useLcdMotion(
    content,
    `${page}:${groupKey ?? ""}:${browseArtist ?? ""}:${page === "playing" && playView === "lyrics" ? "lyrics" : page === "photo-full" ? navigation.screen.selectedKey : "page"}`,
  );
  const active = state.status === "playing";
  const busy = state.status === "loading" || state.status === "buffering";
  const selectedAlbum = browseAlbums.find((album) => album.id === groupKey);
  const selectedPlaylist = playlists.find((item) => item.id === groupKey);
  const activePhotos = useMemo(
    () =>
      groupKey && !["photo-options", "photo-delete"].includes(page)
        ? photos.filter((photo) => photo.album === groupKey)
        : photos,
    [photos, groupKey, page],
  );
  const optionTrack = groupKey ? trackById.get(groupKey) : undefined;
  const playlistTrackIds = useMemo(
    () => new Set(selectedPlaylist?.trackIds ?? []),
    [selectedPlaylist],
  );
  const trackPages: Page[] = [
    "songs",
    "local-songs",
    "demos",
    "album-tracks",
    "artist-tracks",
    "favorites",
    "recent",
    "queue",
    "playlist-tracks",
    "playlist-add-tracks",
    "search",
    "coverflow-album",
    "podcast-episodes",
    "genre-tracks",
    "composer-tracks",
  ];
  const isTrackList = trackPages.includes(page);
  const visibleTracks = useMemo(() => {
    if (page === "genre-tracks" || page === "composer-tracks")
      return musicTracks.filter((track) => {
        const values = page === "genre-tracks" ? track.genres : track.composers;
        return (
          values?.length
            ? values
            : [page === "genre-tracks" ? "未知风格" : "未知作曲者"]
        ).includes(groupKey ?? "");
      });
    if (page === "podcast-episodes")
      return (
        podcastShows
          .find((show) => show.id === groupKey)
          ?.tracks.slice()
          .sort((a, b) => (b.importedAt ?? 0) - (a.importedAt ?? 0)) ?? []
      );
    if (page === "local-songs") return songsByTitle(localMusicTracks);
    if (page === "search")
      return cloud
        ? services.searchResults
        : searchTracks(localMusicTracks, query);
    if (page === "playlist-tracks") {
      return (selectedPlaylist?.trackIds ?? []).flatMap(
        (id) => trackById.get(id) ?? [],
      );
    }
    if (page === "queue")
      return state.queue.flatMap((id) => trackById.get(id) ?? []);
    if (page === "demos")
      return localState.tracks.filter((track) => track.kind === "demo");
    if (page === "album-tracks") return selectedAlbum?.tracks ?? [];
    if (page === "coverflow-album")
      return albums.find((album) => album.id === groupKey)?.tracks ?? [];
    if (page === "artist-tracks")
      return songsByTitle(tracksForArtist(musicTracks, groupKey ?? ""));
    if (page === "songs") return songsByTitle(musicTracks);
    if (page === "favorites")
      return state.tracks.filter((track) => state.favorites.includes(track.id));
    if (page === "recent")
      return [...state.tracks].sort(
        (a, b) => (b.importedAt ?? 0) - (a.importedAt ?? 0),
      );
    return musicTracks;
  }, [
    page,
    groupKey,
    state.tracks,
    state.favorites,
    state.queue,
    albums,
    selectedAlbum,
    query,
    selectedPlaylist,
    trackById,
    musicTracks,
    podcastShows,
    localState.tracks,
    localMusicTracks,
    services.searchResults,
    cloud,
  ]);
  const visibleIds = useMemo(
    () => new Set(visibleTracks.map((track) => track.id)),
    [visibleTracks],
  );

  const open = (
    target: Page,
    selectedKey?: string,
    group?: string,
    artist?: string,
  ) => {
    const latest = player.getSnapshot();
    const defaultKey =
      target === "home"
        ? "music"
        : target === "settings"
          ? "about"
          : target === "confirm-clear"
            ? "cancel"
            : target === "music"
              ? "coverflow"
              : target === "coverflow"
                ? (flowAlbums.find((album) =>
                    album.tracks.some((track) => track.id === latest.currentId),
                  )?.id ?? flowAlbums[0]?.id)
                : target === "albums"
                  ? "all-songs"
                  : target === "artists"
                    ? "all-albums"
                    : target === "playlists"
                      ? "all"
                      : (latest.currentId ?? latest.tracks[0]?.id ?? "import");
    if (target !== page || group !== groupKey || artist !== browseArtist)
      capture(
        page === "coverflow" && target === "coverflow-album"
          ? "album-open"
          : target === "coverflow" && splitPages.has(page)
            ? "flow-open"
            : "forward",
        splitPages.has(page) && splitPages.has(target),
      );
    dispatch({
      type: "open",
      page: target,
      selectedKey,
      defaultKey,
      groupKey: group,
      artist,
    });
    setNotice("");
  };
  const back = (levels = 1) => {
    if (page === "photo-full") setSlideshow(false);
    if (navigation.history.length)
      capture(
        page === "coverflow-album" &&
          navigation.history.at(-levels)?.page === "coverflow"
          ? "album-close"
          : page === "coverflow" &&
              splitPages.has(navigation.history.at(-levels)?.page ?? "home")
            ? "flow-close"
            : "back",
        splitPages.has(page) &&
          splitPages.has(navigation.history.at(-levels)?.page ?? "home"),
      );
    dispatch({ type: "back", levels });
    setNotice("");
  };
  const openFiles = () => input.current?.click();
  const addFiles = (files: File[]) => {
    if (!files.length) return;
    const before = new Set(
      localPlayer.getSnapshot().tracks.map((track) => track.id),
    );
    const { added, rejected, lyrics } = importFiles(files);
    if (added) {
      open(
        cloud ? "local-songs" : "songs",
        localPlayer.getSnapshot().tracks.find((track) => !before.has(track.id))
          ?.id,
      );
      if (rejected) setNotice(`${rejected} 个文件未加入`);
    } else
      setNotice(
        lyrics
          ? "歌词已导入"
          : rejected
            ? "请选择音频或 LRC 文件"
            : "歌曲已在曲库中",
      );
  };
  const loadDemos = () => {
    addDemos();
    open("demos");
  };
  const playTrack = (
    id: string,
    queue = visibleTracks.map((track) => track.id),
  ) => {
    if (podcastIds.includes(id)) {
      playbackFrom("local");
      playPodcast(id, queue);
      setPlayView("art");
      open("playing");
      return;
    }
    const source = trackService(trackById.get(id));
    const remote = source !== "local";
    if (remote && services.auth !== "authorized") {
      open("music-account", "login");
      return;
    }
    const target = playerFor(source);
    playbackFrom(source);
    target.activate(
      id,
      page === "queue" ? undefined : queue.length ? queue : undefined,
    );
    setPlayView("art");
    open("playing");
  };
  const playAlbum = (albumId: string) => {
    const album = (page === "albums" ? browseAlbums : flowAlbums).find(
      (item) => item.id === albumId,
    );
    if (album?.tracks[0])
      playTrack(
        album.tracks[0].id,
        album.tracks.map((track) => track.id),
      );
  };
  const openDocument = (path: string) => {
    open("text-reader", undefined, path);
  };
  const addTextFiles = async (files: File[]) => {
    if (!files.length || importingTexts) return;
    setImportingTexts(true);
    try {
      const result = await importTexts(files);
      // Imports may finish after the user leaves the list; keep that navigation.
      if (result.firstId && navigationRef.current.screen.page === "notes")
        dispatch({ type: "select", key: result.firstId });
      setNotice(
        !result.persisted
          ? "文本未能保存，本次仍可阅读"
          : result.rejected
            ? `已导入 ${result.added} 篇；${result.rejected} 个文件不支持或超过 2 MB`
            : result.added
              ? `已导入 ${result.added} 篇文本`
              : "文本已在阅读列表中",
      );
    } finally {
      setImportingTexts(false);
    }
  };
  const shuffleAll = () => {
    const tracks = musicTracks;
    if (!tracks.length) {
      if (cloud) open("music-account", "login");
      else openFiles();
      return;
    }
    const first = tracks[Math.floor(Math.random() * tracks.length)];
    const target = playerFor(services.selected);
    playbackFrom(services.selected);
    target.setShuffle(true);
    target.setQueue(
      tracks.map((track) => track.id),
      first.id,
    );
    target.activate(first.id);
    setPlayView("art");
    open("playing");
  };
  const toggleFavorite = (id?: string) => {
    if (!id || !trackById.has(id)) return;
    if (trackService(trackById.get(id)) !== "local") {
      setNotice("在线歌曲不加入本地收藏");
      return;
    }
    localPlayer.toggleFavorite(id);
    setNotice(
      localPlayer.getSnapshot().favorites.includes(id)
        ? "已加入我的收藏"
        : "已从收藏移除",
    );
  };
  const editName = (id?: string) => {
    textEntry.begin();
    setPlaylistName(playlists.find((item) => item.id === id)?.name ?? "");
    open("playlist-name", "save", id);
  };
  const saveName = () => {
    if (!playlistName.trim()) {
      setNotice("请输入歌单名称");
      return;
    }
    if (groupKey) {
      const persisted = renamePlaylist(groupKey, playlistName);
      back();
      if (!persisted) setNotice("歌单名称未能保存，本次仍生效");
    } else {
      const result = createPlaylist(playlistName);
      if (!result) return;
      back();
      if (!result.persisted) setNotice("歌单未能保存，本次仍可使用");
      else setNotice("歌单已创建，打开歌单可添加歌曲");
    }
  };
  const trackOptions = (id: string) => {
    setContextPlaylist(page === "playlist-tracks" ? (groupKey ?? null) : null);
    optionQueue.current = isTrackList
      ? visibleTracks.map((track) => track.id)
      : undefined;
    open(
      "track-options",
      canShowLyrics(trackById.get(id), prefs.lyricsEnabled)
        ? "lyrics"
        : "favorite",
      id,
    );
  };
  const {
    homeItems,
    musicItems: localMusicItems,
    playlistItems: localPlaylistItems,
    settingsItems: originalSettingsItems,
  } = createPrimaryMenus({
    state: cloud
      ? { ...appleState, tracks: services.libraryTracks }
      : localState,
    prefs,
    albums,
    photoCount: photos.length,
    podcastShows,
    musicCount: musicTracks.length,
    current,
    playlists,
    trackById,
    open,
    shuffleAll,
    openFiles,
    loadDemos,
    editName,
    openDocument,
    beginText: textEntry.begin,
  });
  const settingsItems: MenuItem[] = [
    originalSettingsItems[0],
    {
      key: "music-services",
      label: "音乐服务",
      value: cloud ? serviceName : "本地音乐",
      action: () => open("music-services", services.selected),
    },
    ...originalSettingsItems.slice(1).map((item) =>
      item.key === "clear"
        ? {
            ...item,
            label: "清空本地音乐资料库",
            disabled: !localMusicTracks.length,
          }
        : item,
    ),
  ];
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
                  setQuery("");
                  textEntry.begin();
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
            open("local-songs", localMusicTracks[0]?.id ?? "import"),
        },
      ]
    : localMusicItems;
  const playlistItems: MenuItem[] = cloud
    ? [
        ...services.playlists.map((list) => ({
          key: list.id,
          label: list.name,
          action: () => {
            void loadApplePlaylist(list.id).then((loaded) => {
              if (
                navigationRef.current.screen.page !== "playlists" ||
                navigationRef.current.screen.selectedKey !== list.id
              )
                return;
              if (loaded) open("playlist-tracks", undefined, list.id);
              else
                setNotice(getMusicServices().error || "歌单未能载入，请重试");
            });
          },
        })),
        {
          key: "refresh",
          label: services.syncing ? "正在同步…" : `刷新 ${serviceName} 歌单`,
          disabled: services.syncing,
          action: () => {
            void refreshAppleLibrary();
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
                action: textEntry.begin,
              },
            ]
          : []),
        ...cloudAccess,
      ]
    : [
        { key: "import", label: "导入音乐", action: openFiles },
        { key: "demo", label: "试听音乐", action: loadDemos },
      ];
  const confirmItems: MenuItem[] = [
    { key: "cancel", label: "取消", action: () => back() },
    {
      key: "confirm",
      label: "清空资料库",
      action: () => {
        capture("back");
        clearLibrary();
        dispatch({ type: "reset" });
        setNotice("资料库已清空");
      },
    },
  ];
  const choices = settingChoices(
    prefs,
    state,
    setPreferences,
    (value) => player.setShuffle(value),
    (value) => player.setRepeat(value),
  );
  const splitMenu = splitPages.has(page) && page !== "home" && page !== "music";
  const photoIndex = Math.max(
    0,
    activePhotos.findIndex(
      (photo) => photo.id === navigation.screen.selectedKey,
    ),
  );
  const managedRows: Partial<Record<Page, MenuItem[]>> = {
    "music-services": [
      {
        key: "apple-music",
        label: "Apple Music",
        value: services.selected === "apple-music" ? "✓" : "",
        action: () => {
          selectMusicService("apple-music");
          back();
        },
      },
      {
        key: "local",
        label: "本地音乐",
        value: services.selected === "local" ? "✓" : "",
        action: () => {
          selectMusicService("local");
          back();
        },
      },
      {
        key: "netease",
        label: "网易云音乐",
        value: services.selected === "netease" ? "✓" : "",
        action: () => {
          selectMusicService("netease");
          open("music-account", "login");
        },
      },
      {
        key: "qq",
        label: "QQ 音乐",
        value: services.selected === "qq" ? "✓" : "",
        action: () => {
          selectMusicService("qq");
          open("music-account", "login");
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
                void refreshAppleLibrary();
              },
            },
            {
              key: "logout",
              label: nativeMusic ? "断开系统音乐" : "退出登录",
              destructive: true,
              leaf: true,
              action: () => {
                void signOutAppleMusic();
              },
            },
          ]
        : [
            {
              key: "login",
              label:
                services.auth === "loading"
                  ? "正在连接…"
                  : externalMusic
                    ? `扫码登录 ${serviceName}`
                    : services.ready
                      ? nativeMusic
                        ? ["denied", "restricted"].includes(
                            services.nativeAuthorization ?? "",
                          )
                          ? "打开系统设置"
                          : "允许访问音乐资料库"
                        : "登录 Apple Music"
                      : "重新检查连接",
              disabled: services.auth === "loading",
              action: () => {
                if (
                  nativeMusic &&
                  ["denied", "restricted"].includes(
                    services.nativeAuthorization ?? "",
                  )
                ) {
                  void openNativeMusicSettings().catch((error: unknown) =>
                    setNotice(
                      error instanceof Error
                        ? error.message
                        : "未能打开系统设置",
                    ),
                  );
                  return;
                }
                void (services.ready || externalMusic
                  ? authorizeAppleMusic()
                  : prepareAppleMusic());
              },
            },
            ...(externalMusic && services.error.includes("请安装并启用 ReiPod")
              ? [
                  {
                    key: "install-extension",
                    label: "下载扩展安装助手",
                    leaf: true,
                    action: () => {
                      window.open(
                        new URL("extension-install.html", location.href).href,
                        "_blank",
                        "noopener,noreferrer",
                      );
                    },
                  },
                ]
              : []),
            ...(externalMusic
              ? [
                  ...(services.selected === "qq" && services.auth !== "loading"
                    ? [
                        {
                          key: "wechat-login",
                          label: "用微信扫码登录",
                          action: () => {
                            void authorizeAppleMusic("wechat");
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
                            void signOutAppleMusic();
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
                open("local-songs", localMusicTracks[0]?.id ?? "import"),
            },
          ],
    "local-songs": [
      ...songsByTitle(localMusicTracks).map((track) => ({
        key: track.id,
        label: track.title,
        detail: track.artist || track.filename,
        action: () =>
          playTrack(
            track.id,
            songsByTitle(localMusicTracks).map((item) => item.id),
          ),
      })),
      { key: "import", label: "导入音乐", action: openFiles },
    ],
    genres: [
      ...new Set(
        musicTracks.flatMap((track) =>
          track.genres?.length ? track.genres : ["未知风格"],
        ),
      ),
    ]
      .sort()
      .map((name) => ({
        key: name,
        label: name,
        action: () => open("genre-tracks", undefined, name),
      })),
    composers: [
      ...new Set(
        musicTracks.flatMap((track) =>
          track.composers?.length ? track.composers : ["未知作曲者"],
        ),
      ),
    ]
      .sort()
      .map((name) => ({
        key: name,
        label: name,
        action: () => open("composer-tracks", undefined, name),
      })),
    ...Object.fromEntries(
      Object.entries(choices).map(([name, items]) => [
        name,
        items.map((item) => ({
          key: item.key,
          label: item.label,
          value: item.selected ? "✓" : undefined,
          leaf: true,
          action: () => {
            item.apply();
            back();
          },
        })),
      ]),
    ),
    ...createMediaMenus({
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
    }),
    about: [{ key: "done", label: "返回", action: () => back() }],
    "main-menu": [
      {
        key: "music",
        label: "音乐",
        value: "固定",
        disabled: true,
        action: () => {},
      },
      {
        key: "settings",
        label: "设置",
        value: "固定",
        disabled: true,
        action: () => {},
      },
      ...optionalMainItems.map((item) => ({
        key: item.key,
        label: item.label,
        value: prefs.mainMenu.includes(item.key) ? "✓" : "—",
        leaf: true,
        action: () =>
          setPreferences({
            mainMenu: prefs.mainMenu.includes(item.key)
              ? prefs.mainMenu.filter((key) => key !== item.key)
              : [...prefs.mainMenu, item.key],
          }),
      })),
    ].sort(
      (a, b) => mainMenuOrder.indexOf(a.key) - mainMenuOrder.indexOf(b.key),
    ),
    "music-menu": optionalMusicItems.map((item) => ({
      ...item,
      value: prefs.musicMenu.includes(item.key) ? "✓" : "—",
      leaf: true,
      action: () =>
        setPreferences({
          musicMenu: prefs.musicMenu.includes(item.key)
            ? prefs.musicMenu.filter((key) => key !== item.key)
            : [...prefs.musicMenu, item.key],
        }),
    })),
    backlight: backlightTimes.map((seconds) => ({
      key: `backlight-${seconds}`,
      label: seconds ? `${seconds} 秒` : "始终开启",
      value: prefs.backlight === seconds ? "✓" : undefined,
      leaf: true,
      action: () => {
        setPreferences({ backlight: seconds });
        back();
      },
    })),
    brightness: [{ key: "done", label: "完成", action: () => back() }],
    "volume-limit": [{ key: "done", label: "完成", action: () => back() }],
    extras: [
      { key: "clock", label: "时钟", action: () => open("clock", "done") },
      {
        key: "notes",
        label: "文本阅读",
        action: () => open("notes", texts[0]?.id ?? "reader-guide"),
      },
    ],
    notes: [
      ...texts.map((doc) => ({
        key: doc.id,
        label: doc.title,
        action: () => open("text-reader", undefined, doc.id),
      })),
      {
        key: "reader-guide",
        label: "阅读说明",
        action: () => open("text-reader", undefined, "reader-guide"),
      },
      {
        key: "text-import",
        label: importingTexts ? "正在导入…" : "导入文本",
        disabled: importingTexts,
        action: () => textInput.current?.click(),
      },
    ],
    "text-options": [
      { key: "resume", label: "继续阅读", action: () => back() },
      {
        key: "start",
        label: "回到开头",
        action: () => {
          if (groupKey) saveReadingPosition(groupKey, 0);
          back();
        },
      },
      ...(isLocalText
        ? [
            {
              key: "delete",
              label: "删除文本…",
              action: () => open("confirm-delete-text", "cancel", groupKey),
            },
          ]
        : []),
    ],
    "confirm-delete-text": [
      { key: "cancel", label: "取消", action: () => back() },
      {
        key: "delete",
        label: "删除文本",
        action: () => {
          if (!groupKey || deleting) return;
          setDeleting(true);
          void deleteText(groupKey)
            .then((persisted) => {
              if (persisted) {
                const latest = navigationRef.current;
                if (
                  latest.screen.groupKey === groupKey &&
                  [
                    "text-reader",
                    "text-options",
                    "confirm-delete-text",
                  ].includes(latest.screen.page)
                ) {
                  // Also handle MENU while deletion was still saving.
                  const listIndex = latest.history
                    .map((screen) => screen.page)
                    .lastIndexOf("notes");
                  back(latest.history.length - listIndex);
                }
              } else setNotice("删除失败，请重试");
            })
            .finally(() => setDeleting(false));
        },
      },
    ],
    clock: [{ key: "done", label: "返回", action: () => back() }],
    ...createLibraryMenus({
      page,
      groupKey,
      playlists: localPlaylists,
      state,
      musicTracks,
      visibleTracks,
      playlistTrackIds,
      optionTrack,
      contextPlaylist,
      deleting,
      editName,
      saveName,
      beginText: textEntry.begin,
      setDeleting,
      setNotice,
      open,
      back,
      navigationRef,
      playTrack,
      toggleFavorite,
    }),
    ...(cloud
      ? {
          "playlist-tracks": [
            ...visibleTracks.map((track) => ({
              key: track.id,
              label: track.title,
              detail: track.artist,
              action: () => playTrack(track.id),
            })),
            ...(!visibleTracks.length
              ? [
                  {
                    key: "empty",
                    label: "此歌单暂无可播放歌曲",
                    disabled: true,
                    action: () => {},
                  },
                ]
              : []),
          ],
        }
      : {}),
    ...(cloud && optionTrack && trackService(optionTrack) === "local"
      ? {
          "track-options": [
            {
              key: "favorite",
              label: localState.favorites.includes(optionTrack.id)
                ? "取消本地收藏"
                : "加入本地收藏",
              action: () => toggleFavorite(optionTrack.id),
            },
            { key: "queue", label: "播放队列", action: () => open("queue") },
            {
              key: "play-next",
              label: "下一首播放",
              action: () => {
                localPlayer.playNext(optionTrack.id);
                back();
              },
            },
            {
              key: "delete",
              label: "删除歌曲…",
              action: () =>
                open("confirm-delete-track", "cancel", optionTrack.id),
            },
          ],
        }
      : {}),
    ...(optionTrack && trackService(optionTrack) !== "local"
      ? {
          "track-options": [
            { key: "queue", label: "播放队列", action: () => open("queue") },
            {
              key: "play-next",
              label: "下一首播放",
              action: () => {
                playerFor(trackService(optionTrack)).playNext(optionTrack.id);
                back();
              },
            },
          ],
        }
      : {}),
  };
  if (optionTrack && canShowLyrics(optionTrack, prefs.lyricsEnabled)) {
    const track = optionTrack;
    managedRows["track-options"] = [
      {
        key: "lyrics",
        label: "歌词",
        action: () => {
          const source = trackService(track);
          if (source !== "local" && services.auth !== "authorized") {
            open("music-account", "login");
            return;
          }
          if (current?.id !== track.id)
            playTrack(track.id, optionQueue.current);
          else if (navigation.history.at(-1)?.page === "playing") back();
          else open("playing");
          setPlayView("lyrics");
          setVolumeOverlay(false);
        },
      },
      ...(managedRows["track-options"] ?? []),
    ];
  }
  const albumRows: MenuItem[] = (
    page === "coverflow" ? flowAlbums : page === "albums" ? browseAlbums : []
  ).map((album) => ({
    key: album.id,
    label: album.title,
    detail:
      browseArtist !== undefined
        ? `${album.tracks.length} 首歌曲`
        : album.artist,
    artwork: album.artwork,
    action: () =>
      open(
        page === "coverflow" ? "coverflow-album" : "album-tracks",
        album.tracks[0]?.id,
        album.id,
        page === "albums" ? browseArtist : undefined,
      ),
  }));
  const rows: MenuItem[] =
    managedRows[page] ??
    (page === "home"
      ? homeItems
      : page === "music"
        ? musicItems
        : page === "playlists"
          ? playlistItems
          : page === "settings"
            ? settingsItems
            : page === "confirm-clear"
              ? confirmItems
              : page === "coverflow" || page === "albums"
                ? (page === "albums" ? browseAlbums : flowAlbums).length
                  ? page === "albums"
                    ? [
                        {
                          key: "all-songs",
                          label: "全部歌曲",
                          detail: `${browseTracks.length} 首歌曲`,
                          aggregate: true,
                          action: () =>
                            browseArtist !== undefined
                              ? open("artist-tracks", undefined, browseArtist)
                              : open("songs"),
                        },
                        ...albumRows,
                      ]
                    : albumRows
                  : emptyItems
                : page === "artists"
                  ? artists.length
                    ? [
                        {
                          key: "all-albums",
                          label: "全部专辑",
                          action: () => open("albums"),
                        },
                        ...artists.map((artist) => ({
                          key: artist,
                          label: artist,
                          action: () =>
                            open("albums", undefined, undefined, artist),
                        })),
                      ]
                    : emptyItems
                  : isTrackList && visibleTracks.length
                    ? [
                        ...visibleTracks.map((track) => ({
                          key: track.id,
                          label: track.title,
                          detail: track.artist || track.album || track.filename,
                          action: () => playTrack(track.id),
                        })),
                        ...(page === "search"
                          ? [
                              {
                                key: "edit-search",
                                label: "修改搜索…",
                                action: textEntry.begin,
                              },
                            ]
                          : []),
                      ]
                    : page === "favorites" ||
                        page === "search" ||
                        page === "playlist-tracks" ||
                        page === "playlist-add-tracks"
                      ? page === "search"
                        ? [
                            {
                              key: "edit-search",
                              label: "修改搜索…",
                              action: textEntry.begin,
                            },
                          ]
                        : []
                      : !current || isTrackList
                        ? emptyItems
                        : []);
  const selectedIndex = Math.max(
    0,
    rows.findIndex(
      (row) =>
        row.key === navigation.screen.selectedKey &&
        (!row.disabled || (page === "music-account" && services.syncing)),
    ),
  );
  const focusedRow =
    rows[selectedIndex]?.disabled &&
    !(page === "music-account" && services.syncing)
      ? rows.find((row) => !row.disabled)
      : rows[selectedIndex];
  const rotate = (
    steps: number,
    _source: "pointer" | "wheel" | "keyboard" = "pointer",
  ) => {
    if (held) return;
    activate();
    if (sleeping) {
      setSleeping(false);
      return;
    }
    if (textEntry.editing && (page === "search" || page === "playlist-name")) {
      textEntry.rotate(steps);
      return;
    }
    if (page === "text-reader") {
      reader.current?.scroll(steps);
      return;
    }
    if (page === "photo-grid" || page === "photo-full") {
      const destination = Math.max(
        0,
        Math.min(activePhotos.length - 1, photoIndex + steps),
      );
      setSlideshow(false);
      if (destination === photoIndex || !activePhotos[destination]) return;
      if (page === "photo-full") capture("replace");
      dispatch({ type: "select", key: activePhotos[destination].id });
      return;
    }
    if (page === "brightness") {
      setPreferences({ brightness: prefs.brightness + steps * 0.05 });
      return;
    }
    if (page === "volume-limit") {
      setPreferences({ volumeLimit: prefs.volumeLimit + steps * 0.05 });
      return;
    }
    if (page === "playing" && current) {
      if (playView === "seek")
        player.seek(player.getSnapshot().position + steps * 2);
      else if (playView === "shuffle") player.setShuffle(steps > 0);
      else if (playView === "rating") {
        if (!setRating(current.id, (ratings[current.id] ?? 0) + steps))
          setNotice("评分未能保存，本次仍生效");
      } else if (playView === "lyrics") setLyricWheel((value) => value + steps);
      else if (state.volumeControl) {
        player.setVolume(player.getSnapshot().volume + steps * 0.025);
        setVolumeOverlay(true);
      } else setNotice("侧键调音量 · 中心键调进度");
      return;
    }
    const keys = rows
      .filter(
        (row) =>
          !row.disabled ||
          (page === "music-account" && services.auth === "authorized"),
      )
      .map((row) => row.key);
    const index = Math.max(0, keys.indexOf(focusedRow?.key ?? ""));
    if (
      keys[Math.max(0, Math.min(keys.length - 1, index + steps))] !==
      keys[index]
    )
      feedback("step");
    dispatch({ type: "move", keys, steps });
  };
  const chooseRow = (row: MenuItem) => {
    if (!row.disabled) {
      dispatch({ type: "select", key: row.key });
      row.action();
    }
  };
  const changePlayView = (view: PlayView) => {
    if ((view === "lyrics") !== (playView === "lyrics")) capture("replace");
    setPlayView(view);
    setVolumeOverlay(false);
  };
  const playViews = playingViews(current, prefs.lyricsEnabled);
  const cyclePlayView = () =>
    changePlayView(
      playViews[(playViews.indexOf(playView) + 1) % playViews.length],
    );
  const command = (value: WheelCommand) => {
    if (held) return;
    activate();
    if (sleeping) {
      setSleeping(false);
      return;
    }
    if (textEntry.editing && (page === "search" || page === "playlist-name")) {
      if (value === "select") {
        const next = textEntry.pick(page === "search" ? query : playlistName);
        if (next === null) {
          textEntry.setEditing(false);
          if (page === "playlist-name") saveName();
          else
            dispatch({
              type: "select",
              key: visibleTracks[0]?.id ?? "edit-search",
            });
        } else if (page === "search") setQuery(next);
        else setPlaylistName(next);
        return;
      }
      if (value === "menu") {
        textEntry.setEditing(false);
        return;
      }
    }
    if (page === "photo-grid" || page === "photo-full") {
      if (value === "next" || value === "previous") {
        rotate(value === "next" ? 1 : -1);
        return;
      }
      if (value === "seek-forward" || value === "seek-backward") {
        const destination = activePhotos.at(
          value === "seek-forward" ? -1 : 0,
        )?.id;
        if (!destination || destination === navigation.screen.selectedKey)
          return;
        capture("replace");
        dispatch({
          type: "select",
          key: activePhotos.at(value === "seek-forward" ? -1 : 0)?.id ?? "",
        });
        return;
      }
      if (value === "options" && activePhotos[photoIndex]) {
        setSlideshow(false);
        open("photo-options", "slideshow", activePhotos[photoIndex].id);
        return;
      }
      if (value === "play") {
        if (page === "photo-grid")
          open("photo-full", activePhotos[photoIndex]?.id, groupKey);
        setSlideshow(!slideshow);
        return;
      }
      if (value === "select" && page === "photo-full") {
        setSlideshow(!slideshow);
        return;
      }
    }
    if (value === "sleep") {
      player.pause();
      setSleeping(true);
      return;
    }
    if (page === "text-reader") {
      if (value === "next" || value === "previous") {
        reader.current?.scroll(value === "next" ? 1 : -1, true);
        return;
      }
      if (value === "seek-forward" || value === "seek-backward") {
        reader.current?.edge(value === "seek-forward");
        return;
      }
      if (value === "select" || value === "options") {
        if (!reader.current?.retry()) open("text-options", "resume", groupKey);
        return;
      }
    }
    if (value === "seek-forward" || value === "seek-backward") {
      setTransportHint(value);
      if (transportTimer.current) clearTimeout(transportTimer.current);
      transportTimer.current = setTimeout(() => setTransportHint(null), 180);
      player.seek(
        player.getSnapshot().position + (value === "seek-forward" ? 2 : -2),
      );
      return;
    }
    if (value === "options") {
      const id =
        page === "playing"
          ? current?.id
          : isTrackList && visibleIds.has(focusedRow?.key ?? "")
            ? focusedRow?.key
            : undefined;
      if (id) trackOptions(id);
      return;
    }
    if (value === "home") {
      textEntry.setEditing(false);
      setSlideshow(false);
      if (page !== "home")
        capture(
          page === "coverflow" ? "flow-close" : "back",
          splitPages.has(page),
        );
      dispatch({ type: "home" });
      setNotice("");
    }
    if (value === "menu") back();
    if (value === "favorite")
      toggleFavorite(
        page === "playing"
          ? current?.id
          : isTrackList
            ? focusedRow?.key
            : undefined,
      );
    if (value === "select") {
      if (page === "playing" && current) {
        if (state.error || state.status === "error") player.play();
        else cyclePlayView();
      } else if (focusedRow) chooseRow(focusedRow);
    }
    if (value === "play") {
      if (
        page === "playlist-add-tracks" &&
        focusedRow &&
        trackById.has(focusedRow.key)
      ) {
        playTrack(
          focusedRow.key,
          state.tracks.map((track) => track.id),
        );
      } else if (page === "coverflow" || page === "albums") {
        if (page === "albums" && focusedRow?.key === "all-songs") {
          const tracks = songsByTitle(browseTracks);
          if (tracks[0])
            playTrack(
              tracks[0].id,
              tracks.map((track) => track.id),
            );
        } else if (albums.length && focusedRow) playAlbum(focusedRow.key);
        else if (focusedRow) chooseRow(focusedRow);
      } else if (page === "artists" && focusedRow) {
        const tracks = songsByTitle(
          focusedRow.key === "all-albums"
            ? musicTracks
            : tracksForArtist(musicTracks, focusedRow.key),
        );
        if (tracks[0])
          playTrack(
            tracks[0].id,
            tracks.map((track) => track.id),
          );
      } else if (isTrackList && visibleIds.has(focusedRow?.key ?? "")) {
        if (focusedRow!.key === player.getSnapshot().currentId) player.toggle();
        else chooseRow(focusedRow!);
      } else if (player.getSnapshot().currentId) player.toggle();
      else {
        const local = page === "local-songs" || !cloud;
        if (local && !localPlayer.getSnapshot().tracks.length) addDemos();
        const tracks = local
          ? localPlayer.getSnapshot().tracks
          : services.libraryTracks;
        const first = tracks[0];
        if (first)
          playTrack(
            first.id,
            tracks.map((track) => track.id),
          );
        else if (!local) account();
      }
    }
    if (value === "next" || value === "previous") {
      if (page === "coverflow") {
        rotate(value === "next" ? 1 : -1);
        return;
      }
      if (!state.tracks.length) {
        setNotice("先选择一首歌曲");
        return;
      }
      if (value === "next") player.next();
      else player.previous();
      if (!current) open("playing");
    }
  };

  useLayoutEffect(() => {
    const previous = previousPlaybackPage.current;
    previousPlaybackPage.current = { page, trackId: current?.id };
    if (
      (previous.page === "playing" && page !== "playing") ||
      previous.trackId !== current?.id
    ) {
      setPlayView((view) =>
        canShowLyrics(current, prefs.lyricsEnabled)
          ? restingPlayView(view)
          : "art",
      );
      setVolumeOverlay(false);
      setLyricWheel(0);
    }
  }, [page, current?.id]);
  useEffect(() => {
    if (!prefs.lyricsEnabled && playView === "lyrics") changePlayView("art");
  }, [prefs.lyricsEnabled, playView]);
  useEffect(() => {
    if (
      prefs.lyricsEnabled &&
      page === "playing" &&
      playView === "lyrics" &&
      current
    )
      void loadThirdPartyLyrics(current);
    // Loading is keyed by song/view, not by the playback clock or metadata updates.
  }, [prefs.lyricsEnabled, page, playView, current?.id]);
  useEffect(() => {
    localPlayer.setVolumeLimit(prefs.volumeLimit);
    applePlayer.setVolumeLimit(prefs.volumeLimit);
    playerFor("qq").setVolumeLimit(prefs.volumeLimit);
    playerFor("netease").setVolumeLimit(prefs.volumeLimit);
  }, [prefs.volumeLimit]);
  useEffect(() => {
    if (page === "search" && cloud && !textEntry.editing)
      void searchAppleMusic(query);
  }, [page, cloud, services.selected, textEntry.editing, query]);
  useEffect(
    () => () => {
      if (transportTimer.current) clearTimeout(transportTimer.current);
    },
    [],
  );
  useEffect(() => {
    void restorePhotos();
    void restoreTexts();
    void initializeLibrary();
    void initializeMusicServices();
    return onLibraryNotice(setNotice);
  }, []);
  useEffect(() => {
    if (
      !slideshow ||
      page !== "photo-full" ||
      held ||
      sleeping ||
      activePhotos.length < 2
    )
      return;
    const timer = setTimeout(() => {
      capture("replace");
      dispatch({
        type: "select",
        key: activePhotos[(photoIndex + 1) % activePhotos.length].id,
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, [slideshow, page, photoIndex, activePhotos, held, sleeping]);
  useEffect(() => {
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute(
        "content",
        prefs.background === "dark" ? "#202124" : "#e8e3dc",
      );
  }, [prefs.background]);
  useLayoutEffect(() => {
    const row = selectedRow.current,
      container = row?.parentElement;
    if (!row || !container) return;
    const top =
      row.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop -
      container.clientTop;
    if (top < container.scrollTop) container.scrollTop = top;
    else if (
      top + row.offsetHeight >
      container.scrollTop + container.clientHeight
    )
      container.scrollTop = top + row.offsetHeight - container.clientHeight;
  }, [navigation.screen, focusedRow?.key]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 2200);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!volumeOverlay) return;
    const timer = setTimeout(() => setVolumeOverlay(false), 1300);
    return () => clearTimeout(timer);
  }, [volumeOverlay, state.volume]);
  const title =
    page === "album-tracks"
      ? (selectedAlbum?.title ?? "专辑")
      : page === "podcast-episodes"
        ? (podcastShows.find((show) => show.id === groupKey)?.title ?? "播客")
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
              "text-reader": textDocument?.title ?? "文本阅读",
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
              "playlist-tracks": selectedPlaylist?.name ?? "歌单",
              "playlist-options": "管理歌单",
              "playlist-name": groupKey ? "重命名歌单" : "新建歌单",
              "playlist-add-tracks": "选择歌曲",
              "pick-playlist": "添加到歌单",
              "track-options": "歌曲选项",
              "confirm-delete-track": "删除歌曲",
              "confirm-delete-playlist": "删除歌单",
            }[page];
  const renderRows = () => (
    <MenuRows
      rows={rows}
      focusedKey={focusedRow?.key}
      page={page}
      currentId={state.currentId}
      active={active}
      trackIds={isTrackList ? visibleIds : new Set<string>()}
      tracks={trackById}
      playlistIds={playlistTrackIds}
      selectedRow={selectedRow}
    />
  );
  return (
    <main
      className="app-shell"
      aria-label="ReiPod 音乐播放器"
      data-finish={prefs.finish}
      onPointerDownCapture={(event) => {
        if (!(event.target as Element).closest(".screen-glass") && !held)
          activate();
      }}
      onKeyDownCapture={() => {
        if (!held) activate();
      }}
      onWheelCapture={(event) => {
        if (!(event.target as Element).closest(".screen-glass") && !held)
          activate();
      }}
      data-background={prefs.background}
      data-music-service={services.selected}
      data-playback-source={services.playback}
    >
      <FileImports
        audio={input}
        photos={photoInput}
        podcasts={podcastInput}
        texts={textInput}
        locked={held || sleeping}
        onAudio={addFiles}
        onTexts={(files) => {
          void addTextFiles(files);
        }}
        onPhotos={(result) => {
          const latest = navigationRef.current.screen;
          if (
            latest.page === "photos" &&
            ["photo-import", "photo-folder"].includes(latest.selectedKey ?? "")
          )
            dispatch({
              type: "select",
              key: result.added ? "all-photos" : "photo-import",
            });
          setNotice(
            result.persisted
              ? `已导入 ${result.added} 张照片`
              : "照片未能保存，本次仍可浏览",
          );
        }}
        onPodcasts={(persisted) => {
          open("podcasts");
          if (!persisted) setNotice("播客分类未能保存，本次仍可播放");
        }}
      />
      <section className="classic-device" aria-label="classic 播放器">
        <HoldSwitch
          held={held}
          onToggle={() => {
            activate();
            setHeld(!held);
          }}
        />
        <ReadOnlyScreen scene={page}>
          <div
            className="lcd-screen"
            data-page={page}
            data-split={
              splitMenu || page === "home" || page === "music"
                ? "true"
                : undefined
            }
            data-sleeping={sleeping}
            style={{
              ...lcdMotionStyle,
              filter: `brightness(${prefs.brightness})`,
            }}
            data-view={page === "playing" ? playView : undefined}
          >
            <div className="screen-viewport" inert={held || sleeping}>
              <div className="screen-content" ref={content}>
                <div className="screen-status">
                  <strong>{title}</strong>
                  <span className="play-modes">
                    {state.shuffle && (
                      <span title="随机播放" aria-label="随机播放">
                        <PlayerIcon name="shuffle" />
                      </span>
                    )}
                    {state.repeat !== "off" && (
                      <span
                        title={`重复${repeatText[state.repeat]}`}
                        aria-label={`重复${repeatText[state.repeat]}`}
                      >
                        <PlayerIcon name="repeat" />
                        {state.repeat === "one" && <small>1</small>}
                      </span>
                    )}
                  </span>
                  {held && (
                    <svg
                      className="hold-icon"
                      viewBox="0 0 12 14"
                      aria-label="已锁定"
                      role="img"
                    >
                      <path d="M3 6V4a3 3 0 0 1 6 0v2M2 6h8v7H2Z" />
                    </svg>
                  )}
                  {current ? (
                    <span
                      className="screen-playing-link"
                      aria-label={active ? "正在播放" : "已暂停"}
                    >
                      <span aria-hidden="true">
                        {transportHint ? (
                          <PlayerIcon name={transportHint} filled />
                        ) : busy ? (
                          <i className="lcd-loading" />
                        ) : (
                          <PlayerIcon
                            name={active ? "play" : "pause"}
                            filled={active}
                          />
                        )}
                      </span>
                    </span>
                  ) : (
                    <span className="screen-header-spacer" />
                  )}
                  <BatteryIndicator />
                </div>
                {(page === "search" || page === "playlist-name") &&
                  (textEntry.editing ? (
                    <WheelTextEntry
                      text={page === "search" ? query : playlistName}
                      title={page === "search" ? "搜索音乐" : "歌单名称"}
                      characters={textEntry.characters}
                      index={textEntry.index}
                    />
                  ) : (
                    <div className="lcd-text-display">
                      {page === "search" ? query || "全部歌曲" : playlistName}
                    </div>
                  ))}
                {(page === "playlist-tracks" ||
                  page === "playlist-add-tracks") && (
                  <div className="lcd-toolbar">
                    <span>{selectedPlaylist?.name ?? "歌单"}</span>
                  </div>
                )}
                {page === "about" && (
                  <div className="classic-about">
                    <strong>ReiPod</strong>
                    <span>Classic 音乐播放器</span>
                    <dl>
                      <dt>歌曲</dt>
                      <dd>{state.tracks.length}</dd>
                      <dt>专辑</dt>
                      <dd>{albums.length}</dd>
                      <dt>艺人</dt>
                      <dd>{artists.length}</dd>
                      <dt>版本</dt>
                      <dd>0.1.0</dd>
                    </dl>
                    <nav>{renderRows()}</nav>
                  </div>
                )}
                {(page === "brightness" || page === "volume-limit") && (
                  <div className="classic-adjustment">
                    <ClassicGlyph
                      name={page === "brightness" ? "background" : "speaker"}
                    />
                    <progress
                      className="adjustment-meter"
                      max={1}
                      value={
                        page === "brightness"
                          ? prefs.brightness
                          : prefs.volumeLimit
                      }
                      aria-label={
                        page === "brightness" ? "屏幕亮度" : "最高音量"
                      }
                    />
                    <strong>
                      {Math.round(
                        (page === "brightness"
                          ? prefs.brightness
                          : prefs.volumeLimit) * 100,
                      )}
                      %
                    </strong>
                    <small>
                      {page === "volume-limit" && !state.volumeControl
                        ? "此设备使用侧键调节音量"
                        : "转动转轮调整，中心键完成"}
                    </small>
                    <nav>{renderRows()}</nav>
                  </div>
                )}
                {page === "clock" && (
                  <div className="clock-screen">
                    <ClassicClock />
                    <nav>{renderRows()}</nav>
                  </div>
                )}
                {page === "text-reader" && textDocument && (
                  <TextReader
                    source={textDocument}
                    ref={reader}
                    key={textDocument.id}
                  />
                )}
                {(page === "home" || page === "music") && (
                  <div className="home-screen">
                    <nav
                      className="screen-menu"
                      aria-label={page === "home" ? "主菜单" : "音乐菜单"}
                    >
                      {renderRows()}
                    </nav>
                    <MenuPreview
                      spec={menuPreview(
                        page,
                        focusedRow?.key ?? "music",
                        focusedRow?.label ?? "音乐",
                        focusedRow?.value ?? focusedRow?.detail,
                      )}
                      albums={albums}
                      current={current}
                      initialAlbumId={
                        albums.find((album) =>
                          album.tracks.some(
                            (track) => track.id === current?.id,
                          ),
                        )?.id
                      }
                      suspended={sleeping}
                      count={state.tracks.length}
                      bytes={state.tracks.reduce(
                        (sum, track) => sum + track.size,
                        0,
                      )}
                    />
                  </div>
                )}
                {(page === "photo-grid" || page === "photo-full") && (
                  <PhotoScreen
                    photos={activePhotos}
                    index={photoIndex}
                    full={page === "photo-full"}
                    slideshow={slideshow}
                  />
                )}
                {(page === "coverflow" || page === "coverflow-album") &&
                  (albums.length ? (
                    <CoverFlow
                      albums={flowAlbums}
                      index={
                        page === "coverflow-album"
                          ? Math.max(
                              0,
                              flowAlbums.findIndex(
                                (album) => album.id === groupKey,
                              ),
                            )
                          : selectedIndex
                      }
                      animate
                      albumOpen={page === "coverflow-album"}
                    >
                      {page === "coverflow-album" && (
                        <div
                          className="screen-song-list"
                          role="group"
                          aria-label="专辑曲目"
                        >
                          {renderRows()}
                        </div>
                      )}
                    </CoverFlow>
                  ) : (
                    <div className="screen-empty">
                      <strong>暂无专辑</strong>
                      <nav className="empty-actions" aria-label="添加音乐">
                        {renderRows()}
                      </nav>
                    </div>
                  ))}
                {(page === "settings" ||
                  page === "music-services" ||
                  page === "music-account" ||
                  page === "notes" ||
                  page === "text-options" ||
                  page === "confirm-delete-text" ||
                  page === "confirm-clear" ||
                  page === "artists" ||
                  page === "albums" ||
                  page === "playlists" ||
                  (managedRows[page] !== undefined &&
                    !isTrackList &&
                    ![
                      "about",
                      "brightness",
                      "volume-limit",
                      "clock",
                      "photo-grid",
                      "photo-full",
                    ].includes(page) &&
                    !(page === "playlist-name" && textEntry.editing))) && (
                  <div
                    className={`settings-screen ${splitMenu ? "split-settings-screen" : ""} ${page === "photos" ? "photo-album-list" : ""} ${page === "music-account" ? "music-account-screen" : ""} ${page === "music-account" && services.qrImage ? "has-login-qr" : ""}`}
                  >
                    {page === "music-account" && (
                      <MusicAccountHeader
                        profile={externalMusic ? services.profile : undefined}
                        serviceName={
                          nativeMusic ? "iPhone 系统音乐" : serviceName
                        }
                        authorized={services.auth === "authorized"}
                        syncing={services.syncing}
                        qr={!!services.qrImage}
                        status={
                          externalMusic &&
                          services.error.includes("请安装并启用 ReiPod")
                            ? "需要安装音乐扩展"
                            : nativeMusic
                              ? services.auth === "authorized"
                                ? "已连接系统音乐"
                                : "访问 iPhone 音乐资料库"
                              : services.auth === "unconfigured"
                                ? externalMusic
                                  ? "音乐服务尚未连接"
                                  : "网站尚未配置 Apple Music"
                                : services.auth === "authorized"
                                  ? `已连接 ${serviceName}`
                                  : services.auth === "loading"
                                    ? services.loginMessage ||
                                      `正在连接 ${serviceName}…`
                                    : `连接你的 ${serviceName}`
                        }
                        detail={
                          services.auth === "unconfigured"
                            ? "配置完成后即可登录并同步资料库。"
                            : services.syncing
                              ? "正在同步资料库…"
                              : services.auth === "authorized"
                                ? `${services.libraryTracks.length} 首歌曲 · ${services.playlists.length} 个歌单`
                                : nativeMusic
                                  ? "允许访问后显示系统歌单，本地音乐独立保留。"
                                  : "扫码登录后同步歌单，本地音乐独立保留。"
                        }
                        error={services.error}
                      />
                    )}
                    {page === "music-account" && services.qrImage && (
                      <div className="music-login-qr">
                        <img
                          src={services.qrImage}
                          alt={`${serviceName}登录二维码`}
                        />
                      </div>
                    )}
                    {page === "confirm-delete-text" && (
                      <p className="clear-question">
                        删除「{textDocument?.title ?? "此文本"}」？
                        <span>不会删除设备上的原始文件</span>
                      </p>
                    )}
                    {(page === "confirm-delete-track" ||
                      page === "confirm-delete-playlist") && (
                      <p className="clear-question">
                        {page === "confirm-delete-track"
                          ? `删除「${optionTrack?.title ?? "此歌曲"}」？`
                          : `删除「${selectedPlaylist?.name ?? "此歌单"}」？`}
                        <span>
                          {page === "confirm-delete-track"
                            ? "不会删除设备上的原始文件"
                            : "歌曲仍保留在曲库中"}
                        </span>
                      </p>
                    )}
                    {page === "track-options" && optionTrack && (
                      <p className="options-title">{optionTrack.title}</p>
                    )}
                    {page === "confirm-clear" && (
                      <p className="clear-question">
                        清空本地资料库及已保存的音频？
                        <span>不会删除设备上的原始文件</span>
                      </p>
                    )}
                    <nav
                      className="screen-menu"
                      aria-label={
                        page === "settings"
                          ? "设置菜单"
                          : page === "confirm-clear"
                            ? "清空确认"
                            : `${title}列表`
                      }
                    >
                      {renderRows()}
                    </nav>
                    {splitMenu && (
                      <MenuPreview
                        spec={menuPreview(
                          page,
                          focusedRow?.key ?? "music",
                          focusedRow?.label ?? "音乐",
                          focusedRow?.value ?? focusedRow?.detail,
                        )}
                        albums={albums}
                        current={current}
                        initialAlbumId={
                          albums.find((album) =>
                            album.tracks.some(
                              (track) => track.id === current?.id,
                            ),
                          )?.id
                        }
                        suspended={sleeping}
                        count={state.tracks.length}
                        bytes={state.tracks.reduce(
                          (sum, track) => sum + track.size,
                          0,
                        )}
                      />
                    )}
                    {(page === "albums" || page === "artists") && (
                      <div className="screen-footer">
                        {page === "albums"
                          ? browseAlbums.length
                          : artists.length}{" "}
                        {page === "albums" ? "张专辑" : "位艺人"}
                      </div>
                    )}
                  </div>
                )}
                {((isTrackList &&
                  page !== "coverflow-album" &&
                  !(page === "search" && textEntry.editing)) ||
                  (page === "playing" && !current)) &&
                  (isTrackList && visibleTracks.length ? (
                    <div className="song-screen">
                      <div
                        className="screen-song-list"
                        role="group"
                        aria-label={`${title}列表`}
                      >
                        {renderRows()}
                      </div>
                      <div className="screen-footer">
                        <span>
                          {visibleIds.has(focusedRow?.key ?? "")
                            ? `${visibleTracks.findIndex((track) => track.id === focusedRow?.key) + 1} / ${visibleTracks.length}`
                            : `共 ${visibleTracks.length} 首歌曲`}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="screen-empty">
                      <span className="music-note" aria-hidden="true">
                        ♫
                      </span>
                      <strong>
                        {page === "favorites"
                          ? "还没有收藏的歌曲"
                          : page === "search"
                            ? "没有匹配的歌曲"
                            : "暂无歌曲"}
                      </strong>
                      {page === "search" ? (
                        <nav className="empty-actions">{renderRows()}</nav>
                      ) : page === "playlist-tracks" ? (
                        <nav className="empty-actions" aria-label="管理空歌单">
                          {renderRows()}
                        </nav>
                      ) : page === "favorites" ? (
                        <small>长按中心键，在歌曲选项中收藏</small>
                      ) : (
                        <nav className="empty-actions" aria-label="添加音乐">
                          {renderRows()}
                        </nav>
                      )}
                    </div>
                  ))}
                {page === "playing" && current && (
                  <NowPlayingScreen
                    state={state}
                    current={current}
                    view={playView}
                    lyricWheel={lyricWheel}
                    rating={ratings[current.id] ?? 0}
                    volumeOverlay={volumeOverlay}
                  />
                )}
              </div>
            </div>
            {dimmed && <div className="lcd-backlight-dim" aria-hidden="true" />}
            {notice && (
              <div className="screen-notice" role="status">
                {notice}
              </div>
            )}
          </div>
        </ReadOnlyScreen>
        <ClickWheel
          onRotate={rotate}
          onCommand={command}
          disabled={held}
          playLabel={busy ? "取消载入" : active ? "暂停" : "播放"}
          onFeedback={feedback}
        />
      </section>
    </main>
  );
}
