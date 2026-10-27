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
import { feedback } from "./input/feedback";
import {
  addDemos,
  clearLibrary,
  importFiles,
  initializeLibrary,
  onLibraryNotice,
  player,
  removeTrack,
  usePlayer,
} from "./player/store";
import type { PlaybackStatus } from "./player/Player";
import { albumsFor, artistsFor } from "./player/library";
import { initialNavigation, navigationReducer } from "./ui/navigation";
import type { Page } from "./ui/navigation";
import { SeekSlider } from "./ui/SeekSlider";
import { AlbumArt } from "./ui/AlbumArt";
import { CoverFlow } from "./ui/CoverFlow";
import { MenuPreview } from "./ui/MenuPreview";
import { menuPreview } from "./ui/menuPreview";
import { BatteryIndicator } from "./ui/BatteryIndicator";
import { backlightTimes, optionalMainItems } from "./ui/classicSettings";
import { useBacklight } from "./ui/useBacklight";
import { ClassicClock } from "./ui/ClassicClock";
import { ClassicGlyph } from "./ui/ClassicGlyph";
import { Lyrics } from "./ui/Lyrics";
import { setPreferences, usePreferences } from "./ui/preferences";
import { PlayerIcon } from "./ui/PlayerIcon";
import { MarqueeText } from "./ui/MarqueeText";
import { useLcdMotion } from "./ui/useLcdMotion";
import { searchTracks } from "./player/search";
import { useRatings, setRating } from "./player/ratings";
import {
  usePlaylists,
  createPlaylist,
  renamePlaylist,
  deletePlaylist,
  togglePlaylistTrack,
  removePlaylistTrack,
  addToOnTheGo,
} from "./player/playlists";

type MenuItem = {
  key: string;
  label: string;
  detail?: string;
  value?: string;
  artwork?: string;
  disabled?: boolean;
  leaf?: boolean;
  action: () => void;
};
type PlayView = "art" | "seek" | "shuffle" | "rating" | "lyrics";
const playViewLabels: Record<PlayView, string> = {
  art: "封面",
  seek: "进度",
  shuffle: "随机播放",
  rating: "歌曲评分",
  lyrics: "歌词",
};
const statusText: Record<PlaybackStatus, string> = {
  idle: "未播放",
  loading: "正在载入",
  playing: "正在播放",
  paused: "已暂停",
  buffering: "正在缓冲",
  ended: "播放完毕",
  error: "无法播放",
};
const repeatText = { off: "关闭", all: "全部", one: "单曲" };

export function App() {
  const state = usePlayer();
  const prefs = usePreferences();
  const playlists = usePlaylists();
  const ratings = useRatings();
  const trackById = useMemo(
    () => new Map(state.tracks.map((track) => [track.id, track])),
    [state.tracks],
  );
  const current = state.currentId ? trackById.get(state.currentId) : undefined;
  const albums = useMemo(() => albumsFor(state.tracks), [state.tracks]);
  const artists = useMemo(() => artistsFor(state.tracks), [state.tracks]);
  const [navigation, dispatch] = useReducer(
    navigationReducer,
    initialNavigation,
  );
  const navigationRef = useRef(navigation);
  navigationRef.current = navigation;
  const { page, groupKey } = navigation.screen;
  const [notice, setNotice] = useState("");
  const [held, setHeld] = useState(false);
  const [sleeping, setSleeping] = useState(false);
  const { dimmed, activate } = useBacklight(prefs.backlight, sleeping);
  const [query, setQuery] = useState("");
  const [playlistName, setPlaylistName] = useState("");
  const [contextPlaylist, setContextPlaylist] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [playView, setPlayView] = useState<PlayView>("art");
  const [lyricWheel, setLyricWheel] = useState(0);
  const [volumeOverlay, setVolumeOverlay] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const selectedRow = useRef<HTMLButtonElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const dragDepth = useRef(0);
  const capture = useLcdMotion(
    content,
    `${page}:${groupKey ?? ""}:${page === "playing" && playView === "lyrics" ? "lyrics" : "page"}`,
  );
  const active = state.status === "playing";
  const busy = state.status === "loading" || state.status === "buffering";
  const selectedAlbum = albums.find((album) => album.id === groupKey);
  const selectedPlaylist = playlists.find((item) => item.id === groupKey);
  const optionTrack = groupKey ? trackById.get(groupKey) : undefined;
  const playlistTrackIds = useMemo(
    () => new Set(selectedPlaylist?.trackIds ?? []),
    [selectedPlaylist],
  );
  const trackPages: Page[] = [
    "songs",
    "demos",
    "album-tracks",
    "artist-tracks",
    "favorites",
    "recent",
    "queue",
    "playlist-tracks",
    "playlist-add-tracks",
    "search",
  ];
  const isTrackList = trackPages.includes(page);
  const visibleTracks = useMemo(() => {
    if (page === "search") return searchTracks(state.tracks, query);
    if (page === "playlist-tracks") {
      return (selectedPlaylist?.trackIds ?? []).flatMap(
        (id) => trackById.get(id) ?? [],
      );
    }
    if (page === "queue")
      return state.queue.flatMap((id) => trackById.get(id) ?? []);
    if (page === "demos")
      return state.tracks.filter((track) => track.kind === "demo");
    if (page === "album-tracks")
      return albums.find((album) => album.id === groupKey)?.tracks ?? [];
    if (page === "artist-tracks")
      return state.tracks.filter(
        (track) => (track.artist?.trim() || "未知艺人") === groupKey,
      );
    if (page === "favorites")
      return state.tracks.filter((track) => state.favorites.includes(track.id));
    if (page === "recent")
      return [...state.tracks].sort(
        (a, b) => (b.importedAt ?? 0) - (a.importedAt ?? 0),
      );
    return state.tracks;
  }, [
    page,
    groupKey,
    state.tracks,
    state.favorites,
    state.queue,
    albums,
    query,
    selectedPlaylist,
    trackById,
  ]);
  const visibleIds = useMemo(
    () => new Set(visibleTracks.map((track) => track.id)),
    [visibleTracks],
  );

  const open = (target: Page, selectedKey?: string, group?: string) => {
    const latest = player.getSnapshot();
    const defaultKey =
      target === "home"
        ? "music"
        : target === "settings"
          ? "about"
          : target === "confirm-clear"
            ? "cancel"
            : target === "music"
              ? "playlists"
              : target === "coverflow" || target === "albums"
                ? (albums.find((album) =>
                    album.tracks.some((track) => track.id === latest.currentId),
                  )?.id ?? albums[0]?.id)
                : target === "artists"
                  ? artists[0]
                  : target === "playlists"
                    ? "all"
                    : (latest.currentId ?? latest.tracks[0]?.id ?? "import");
    if (target !== page || group !== groupKey) capture("forward");
    dispatch({
      type: "open",
      page: target,
      selectedKey,
      defaultKey,
      groupKey: group,
    });
    setNotice("");
  };
  const back = (levels = 1) => {
    if (navigation.history.length) capture("back");
    dispatch({ type: "back", levels });
    setNotice("");
  };
  const openFiles = () => input.current?.click();
  const addFiles = (files: File[]) => {
    if (!files.length) return;
    const before = new Set(
      player.getSnapshot().tracks.map((track) => track.id),
    );
    const { added, rejected, lyrics } = importFiles(files);
    if (added) {
      open(
        "songs",
        player.getSnapshot().tracks.find((track) => !before.has(track.id))?.id,
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
    player.activate(
      id,
      page === "queue" ? undefined : queue.length ? queue : undefined,
    );
    setPlayView("art");
    open("playing");
  };
  const playAlbum = (albumId: string) => {
    const album = albums.find((item) => item.id === albumId);
    if (album?.tracks[0])
      playTrack(
        album.tracks[0].id,
        album.tracks.map((track) => track.id),
      );
  };
  const openDocument = (path: string) => {
    window.open(
      `${import.meta.env.BASE_URL}${path}`,
      "_blank",
      "noopener,noreferrer",
    );
  };
  const shuffleAll = () => {
    const tracks = player.getSnapshot().tracks;
    if (!tracks.length) {
      openFiles();
      return;
    }
    const first = tracks[Math.floor(Math.random() * tracks.length)];
    player.setShuffle(true);
    player.setQueue(
      tracks.map((track) => track.id),
      first.id,
    );
    player.activate(first.id);
    setPlayView("art");
    open("playing");
  };
  const toggleFavorite = (id?: string) => {
    if (!id || !trackById.has(id)) return;
    player.toggleFavorite(id);
    setNotice(
      player.getSnapshot().favorites.includes(id)
        ? "已加入我的收藏"
        : "已从收藏移除",
    );
  };
  const editName = (id?: string) => {
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
    open("track-options", "favorite", id);
  };
  const allHomeItems: MenuItem[] = [
    {
      key: "music",
      label: "音乐",
      detail: `${state.tracks.length} 首歌曲`,
      action: () => open("music"),
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
      detail: `${state.tracks.length} 首歌曲`,
      leaf: true,
      action: shuffleAll,
    },
    {
      key: "import",
      label: "导入音乐",
      detail: "音频 / LRC",
      leaf: true,
      action: openFiles,
    },
    {
      key: "demo",
      label: "试听音乐",
      detail: "内置音乐精选",
      action: loadDemos,
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
  const homeItems = allHomeItems.filter(
    (item) =>
      item.key === "music" ||
      item.key === "settings" ||
      prefs.mainMenu.includes(item.key),
  );
  const musicItems: MenuItem[] = [
    { key: "playlists", label: "播放列表", action: () => open("playlists") },
    {
      key: "artists",
      label: "艺人",
      value: `${artists.length}`,
      action: () => open("artists"),
    },
    {
      key: "albums",
      label: "专辑",
      value: `${albums.length}`,
      action: () => open("albums"),
    },
    {
      key: "songs",
      label: "歌曲",
      value: `${state.tracks.length}`,
      action: () => open("songs"),
    },
    { key: "search", label: "搜索", action: () => open("search") },
    {
      key: "shuffle-all",
      label: "随机播放所有",
      leaf: true,
      action: shuffleAll,
    },
    { key: "import", label: "导入音乐", action: openFiles },
  ];
  const playlistItems: MenuItem[] = [
    {
      key: "all",
      label: "全部歌曲",
      value: `${state.tracks.length}`,
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
      leaf: true,
      label: "随机播放",
      value: state.shuffle ? "开启" : "关闭",
      action: () => player.setShuffle(!player.getSnapshot().shuffle),
    },
    {
      key: "repeat",
      leaf: true,
      label: "重复播放",
      value: repeatText[state.repeat],
      action: () =>
        player.setRepeat(
          state.repeat === "off"
            ? "all"
            : state.repeat === "all"
              ? "one"
              : "off",
        ),
    },
    {
      key: "main-menu",
      label: "主菜单",
      action: () => open("main-menu", "coverflow"),
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
      leaf: true,
      label: "转轮声音",
      value: prefs.clickSound ? "开启" : "关闭",
      action: () => setPreferences({ clickSound: !prefs.clickSound }),
    },
    {
      key: "finish",
      leaf: true,
      label: "机身颜色",
      value: prefs.finish === "silver" ? "银色" : "黑色",
      action: () =>
        setPreferences({
          finish: prefs.finish === "silver" ? "black" : "silver",
        }),
    },
    {
      key: "background",
      leaf: true,
      label: "背景",
      value: prefs.background === "warm" ? "浅色" : "深色",
      action: () =>
        setPreferences({
          background: prefs.background === "warm" ? "dark" : "warm",
        }),
    },
    {
      key: "clear",
      label: "清空资料库",
      disabled: !state.tracks.length,
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
  const emptyItems: MenuItem[] = [
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
  const managedRows: Partial<Record<Page, MenuItem[]>> = {
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
    ],
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
    ],
    clock: [{ key: "done", label: "返回", action: () => back() }],
    "playlist-name": [
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
  const albumRows: MenuItem[] = (
    page === "coverflow" || page === "albums" ? albums : []
  ).map((album) => ({
    key: album.id,
    label: album.title,
    detail: album.artist,
    value: `${album.tracks.length}`,
    artwork: album.artwork,
    action: () => open("album-tracks", album.tracks[0]?.id, album.id),
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
                ? albums.length
                  ? albumRows
                  : emptyItems
                : page === "artists"
                  ? artists.length
                    ? artists.map((artist) => ({
                        key: artist,
                        label: artist,
                        action: () => open("artist-tracks", undefined, artist),
                      }))
                    : emptyItems
                  : isTrackList && visibleTracks.length
                    ? visibleTracks.map((track) => ({
                        key: track.id,
                        label: track.title,
                        detail: track.artist || track.album || track.filename,
                        action: () => playTrack(track.id),
                      }))
                    : page === "favorites" ||
                        page === "search" ||
                        page === "playlist-tracks" ||
                        page === "playlist-add-tracks"
                      ? []
                      : !current || isTrackList
                        ? emptyItems
                        : []);
  const selectedIndex = Math.max(
    0,
    rows.findIndex(
      (row) => row.key === navigation.screen.selectedKey && !row.disabled,
    ),
  );
  const focusedRow = rows[selectedIndex]?.disabled
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
    const keys = rows.filter((row) => !row.disabled).map((row) => row.key);
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
      feedback("release");
      dispatch({ type: "select", key: row.key });
      row.action();
    }
  };
  const changePlayView = (view: PlayView) => {
    if ((view === "lyrics") !== (playView === "lyrics")) capture("replace");
    setPlayView(view);
    setVolumeOverlay(false);
  };
  const playViews: PlayView[] = [
    "art",
    "seek",
    "shuffle",
    "rating",
    ...(current?.lyrics?.length ? ["lyrics" as const] : []),
  ];
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
    if (value === "sleep") {
      player.pause();
      setSleeping(true);
      return;
    }
    if (value === "seek-forward" || value === "seek-backward") {
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
      if (page !== "home") capture("back");
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
      if (page === "playing" && current) cyclePlayView();
      else if (focusedRow) chooseRow(focusedRow);
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
        if (albums.length && focusedRow) playAlbum(focusedRow.key);
        else if (focusedRow) chooseRow(focusedRow);
      } else if (isTrackList && visibleIds.has(focusedRow?.key ?? "")) {
        if (focusedRow!.key === player.getSnapshot().currentId) player.toggle();
        else chooseRow(focusedRow!);
      } else if (player.getSnapshot().currentId) player.toggle();
      else {
        if (!player.getSnapshot().tracks.length) addDemos();
        const first = player.getSnapshot().tracks[0];
        if (first)
          playTrack(
            first.id,
            player.getSnapshot().tracks.map((track) => track.id),
          );
      }
    }
    if (value === "next" || value === "previous") {
      if (!state.tracks.length) {
        setNotice("先选择一首歌曲");
        return;
      }
      if (value === "next") player.next();
      else player.previous();
      if (!current) open("playing");
    }
  };

  useEffect(() => {
    player.setVolumeLimit(prefs.volumeLimit);
  }, [prefs.volumeLimit]);
  useEffect(() => {
    void initializeLibrary();
    return onLibraryNotice(setNotice);
  }, []);
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
      : page === "artist-tracks"
        ? (groupKey ?? "艺人")
        : {
            about: "关于本机",
            "main-menu": "主菜单",
            backlight: "背光时间",
            brightness: "亮度",
            "volume-limit": "音量上限",
            extras: "附加功能",
            clock: "时钟",
            home: "ReiPod",
            music: "音乐",
            songs: "歌曲",
            demos: "试听音乐",
            playing: playView === "lyrics" ? "歌词" : "正在播放",
            settings: "设置",
            "confirm-clear": "清空资料库",
            coverflow: "Cover Flow",
            artists: "艺人",
            albums: "专辑",
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
  const renderRows = () =>
    rows.map((row) => (
      <button
        key={row.key}
        ref={row.key === focusedRow?.key ? selectedRow : undefined}
        disabled={row.disabled}
        aria-current={row.key === focusedRow?.key ? "true" : undefined}
        aria-pressed={
          page === "playlist-add-tracks"
            ? (playlistTrackIds.has(row.key) ?? false)
            : undefined
        }
        className={`screen-row ${row.key === focusedRow?.key ? "selected" : ""} ${row.key === "confirm" ? "destructive" : ""} ${page === "albums" ? "album-row" : ""} ${isTrackList && visibleIds.has(row.key) ? "track-row" : ""}`}
        onFocus={() => {
          if (!row.disabled) dispatch({ type: "select", key: row.key });
        }}
        onPointerMove={(event) => {
          if (event.pointerType === "mouse" && !event.buttons && !row.disabled)
            dispatch({ type: "select", key: row.key });
        }}
        onPointerDown={() => {
          feedback("press");
          dispatch({ type: "select", key: row.key });
        }}
        onClick={() => chooseRow(row)}
      >
        {page === "albums" && (
          <AlbumArt src={row.artwork} title={row.label} artist={row.detail} />
        )}
        <span className="row-label">
          <span className="row-title">
            {isTrackList && state.currentId === row.key && (
              <span className="track-playing-marker" aria-hidden="true">
                <PlayerIcon name={active ? "play" : "pause"} filled={active} />
              </span>
            )}
            <MarqueeText
              text={row.label}
              active={row.key === focusedRow?.key}
            />
          </span>
          {(page === "albums" || page === "search") && (
            <small>{row.detail}</small>
          )}
        </span>
        {row.value && <span className="row-value">{row.value}</span>}
        {!row.leaf && (
          <span className="row-chevron" aria-hidden="true">
            <PlayerIcon name="chevron" />
          </span>
        )}
      </button>
    ));
  return (
    <main
      className="app-shell"
      aria-label="ReiPod 音乐播放器"
      data-finish={prefs.finish}
      onPointerDownCapture={() => {
        if (!held) activate();
      }}
      onKeyDownCapture={() => {
        if (!held) activate();
      }}
      onWheelCapture={() => {
        if (!held) activate();
      }}
      data-background={prefs.background}
      onDragEnter={(event) => {
        event.preventDefault();
        if (event.dataTransfer.types.includes("Files")) {
          dragDepth.current++;
          setDragging(true);
        }
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        event.preventDefault();
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (!dragDepth.current) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        if (held || sleeping) {
          dragDepth.current = 0;
          setDragging(false);
          return;
        }
        dragDepth.current = 0;
        setDragging(false);
        addFiles(Array.from(event.dataTransfer.files));
      }}
    >
      <input
        ref={input}
        id="audio-files"
        className="sr-only"
        type="file"
        accept="audio/*,.mp3,.m4a,.aac,.wav,.flac,.ogg,.opus,.aiff,.lrc"
        multiple
        aria-label="选择本地音频或歌词文件"
        disabled={held || sleeping}
        onChange={(event) => {
          addFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
      <section
        className={`classic-device ${dragging ? "is-dragging" : ""}`}
        aria-label="classic 播放器"
      >
        <button
          type="button"
          className="top-hold"
          role="switch"
          aria-label="HOLD 锁定"
          aria-checked={held}
          data-held={held}
          onClick={() => {
            activate();
            setHeld(!held);
          }}
        >
          <i />
        </button>
        <div className="screen-glass">
          <div
            className="lcd-screen"
            data-page={page}
            data-sleeping={sleeping}
            style={{ filter: `brightness(${prefs.brightness})` }}
            data-view={page === "playing" ? playView : undefined}
          >
            <div className="screen-viewport" inert={held || sleeping}>
              <div className="screen-content" ref={content}>
                <div className="screen-status">
                  <button
                    className="screen-back"
                    aria-label="返回上一级"
                    disabled={!navigation.history.length}
                    onClick={() => back()}
                  >
                    <PlayerIcon name="back" />
                  </button>
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
                  {current ? (
                    <button
                      className="screen-playing-link"
                      aria-label="返回正在播放"
                      onClick={() => open("playing")}
                    >
                      <span aria-hidden="true">
                        {busy ? (
                          <i className="lcd-loading" />
                        ) : (
                          <PlayerIcon
                            name={active ? "play" : "pause"}
                            filled={active}
                          />
                        )}
                      </span>
                    </button>
                  ) : (
                    <span className="screen-header-spacer" />
                  )}
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
                  <BatteryIndicator />
                </div>
                {page === "search" && (
                  <form
                    className="lcd-text-entry"
                    onSubmit={(event) => {
                      event.preventDefault();
                      document
                        .querySelector<HTMLElement>(".click-wheel")
                        ?.focus();
                    }}
                  >
                    <input
                      type="search"
                      aria-label="搜索音乐"
                      placeholder="歌名、艺人、专辑"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (
                          event.key === "ArrowDown" &&
                          !event.nativeEvent.isComposing
                        ) {
                          event.preventDefault();
                          document
                            .querySelector<HTMLElement>(".click-wheel")
                            ?.focus();
                        }
                        if (event.key === "Escape") back();
                      }}
                    />
                    {query && (
                      <button
                        type="button"
                        aria-label="清除搜索"
                        onClick={() => setQuery("")}
                      >
                        ×
                      </button>
                    )}
                  </form>
                )}
                {page === "playlist-name" && (
                  <form
                    className="lcd-text-entry name-entry"
                    onSubmit={(event) => {
                      event.preventDefault();
                      saveName();
                    }}
                  >
                    <label htmlFor="playlist-name">歌单名称</label>
                    <input
                      id="playlist-name"
                      value={playlistName}
                      maxLength={60}
                      placeholder="例如：通勤路上"
                      onChange={(event) => setPlaylistName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") back();
                      }}
                    />
                  </form>
                )}
                {(page === "playlist-tracks" ||
                  page === "playlist-add-tracks") && (
                  <div className="lcd-toolbar">
                    <span>{selectedPlaylist?.name ?? "歌单"}</span>
                    <button
                      onClick={() =>
                        page === "playlist-tracks"
                          ? open("playlist-options", "add", groupKey)
                          : back()
                      }
                    >
                      {page === "playlist-tracks" ? "管理" : "完成"}
                    </button>
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
                    <input
                      type="range"
                      min={page === "brightness" ? 0.25 : 0.1}
                      max={1}
                      step={0.05}
                      aria-label={
                        page === "brightness" ? "屏幕亮度" : "最高音量"
                      }
                      value={
                        page === "brightness"
                          ? prefs.brightness
                          : prefs.volumeLimit
                      }
                      onChange={(event) =>
                        setPreferences(
                          page === "brightness"
                            ? { brightness: Number(event.target.value) }
                            : { volumeLimit: Number(event.target.value) },
                        )
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
                      onChoose={(album) =>
                        open("album-tracks", album.tracks[0]?.id, album.id)
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
                {page === "coverflow" &&
                  (albums.length ? (
                    <CoverFlow
                      albums={albums}
                      index={selectedIndex}
                      onMove={(steps, source) => rotate(steps, source)}
                      onChoose={() => focusedRow && chooseRow(focusedRow)}
                      animate
                    />
                  ) : (
                    <div className="screen-empty">
                      <strong>暂无专辑</strong>
                      <nav className="empty-actions" aria-label="添加音乐">
                        {renderRows()}
                      </nav>
                    </div>
                  ))}
                {(page === "settings" ||
                  page === "confirm-clear" ||
                  page === "artists" ||
                  page === "albums" ||
                  page === "playlists" ||
                  (managedRows[page] !== undefined &&
                    page !== "playlist-add-tracks" &&
                    page !== "playlist-tracks" &&
                    !["about", "brightness", "volume-limit", "clock"].includes(
                      page,
                    ))) && (
                  <div
                    className={`settings-screen ${page === "settings" ? "split-settings-screen" : ""}`}
                  >
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
                        清空资料库及已保存的文件？
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
                    {page === "settings" && (
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
                        onChoose={(album) =>
                          open("album-tracks", album.tracks[0]?.id, album.id)
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
                        {page === "albums" ? albums.length : artists.length}{" "}
                        {page === "albums" ? "张专辑" : "位艺人"}
                      </div>
                    )}
                  </div>
                )}
                {(isTrackList || (page === "playing" && !current)) &&
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
                        {page !== "playlist-add-tracks" &&
                          focusedRow &&
                          visibleTracks.some(
                            (track) => track.id === focusedRow.key,
                          ) && (
                            <button
                              className="list-options"
                              onClick={() => trackOptions(focusedRow.key)}
                            >
                              歌曲选项
                            </button>
                          )}
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
                        <small>试试其他歌名、艺人或专辑</small>
                      ) : page === "playlist-tracks" ? (
                        <nav className="empty-actions" aria-label="管理空歌单">
                          {renderRows()}
                        </nav>
                      ) : page === "favorites" ? (
                        <small>播放时长按中心键加入收藏</small>
                      ) : (
                        <nav className="empty-actions" aria-label="添加音乐">
                          {renderRows()}
                        </nav>
                      )}
                    </div>
                  ))}
                {page === "playing" && current && (
                  <div
                    className={`now-playing-screen view-${playView}`}
                    data-volume={volumeOverlay && playView === "art"}
                  >
                    {playView === "lyrics" ? (
                      <Lyrics
                        track={current}
                        position={state.position}
                        wheelStep={lyricWheel}
                        onQueue={() => open("queue", current.id)}
                        onClose={() => changePlayView("art")}
                      />
                    ) : (
                      <div className="now-playing-top">
                        <div className="np-cover">
                          <AlbumArt
                            src={current.artwork}
                            title={current.album ?? current.title}
                            artist={current.artist}
                          />
                          <div
                            className="np-cover-reflection"
                            aria-hidden="true"
                          >
                            <AlbumArt
                              src={current.artwork}
                              title={current.album ?? current.title}
                              artist={current.artist}
                            />
                          </div>
                        </div>
                        <div className="np-info">
                          <div className="np-index">
                            {state.queue.indexOf(current.id) + 1} /{" "}
                            {state.queue.length}
                          </div>
                          <strong>
                            <MarqueeText text={current.title} active />
                          </strong>
                          <span>
                            <MarqueeText
                              text={current.artist || "未知艺人"}
                              active
                            />
                          </span>
                          <span>
                            <MarqueeText
                              text={current.album || "未知专辑"}
                              active
                            />
                          </span>
                          {playView === "shuffle" && (
                            <div className="np-firmware-control">
                              <small>随机播放</small>
                              <div className="np-shuffle-options">
                                <button
                                  aria-pressed={!state.shuffle}
                                  onClick={() => player.setShuffle(false)}
                                >
                                  关闭
                                </button>
                                <button
                                  aria-pressed={state.shuffle}
                                  onClick={() => player.setShuffle(true)}
                                >
                                  歌曲
                                </button>
                              </div>
                            </div>
                          )}
                          {playView === "rating" && (
                            <div className="np-firmware-control">
                              <small>歌曲评分</small>
                              <div className="classic-rating">
                                {[1, 2, 3, 4, 5].map((value) => (
                                  <button
                                    key={value}
                                    aria-label={`评分 ${value} 星`}
                                    aria-pressed={
                                      (ratings[current.id] ?? 0) >= value
                                    }
                                    onClick={() => {
                                      if (
                                        !setRating(
                                          current.id,
                                          ratings[current.id] === value
                                            ? 0
                                            : value,
                                        )
                                      )
                                        setNotice("评分未能保存，本次仍生效");
                                    }}
                                  >
                                    <PlayerIcon
                                      name="star"
                                      filled={
                                        (ratings[current.id] ?? 0) >= value
                                      }
                                    />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          {state.status !== "playing" && (
                            <small>{statusText[state.status]}</small>
                          )}
                        </div>
                      </div>
                    )}
                    <SeekSlider state={state} />
                    {volumeOverlay && playView === "art" && (
                      <div
                        className="classic-volume"
                        role="status"
                        aria-label={`音量 ${Math.round(state.volume * 100)}%`}
                      >
                        <PlayerIcon name="volume" />
                        <div className="classic-volume-track">
                          <i style={{ width: `${state.volume * 100}%` }} />
                        </div>
                        <PlayerIcon name="volume" />
                      </div>
                    )}
                    <div className="np-actions">
                      <button
                        aria-label="歌曲选项"
                        onClick={() => trackOptions(current.id)}
                      >
                        <PlayerIcon name="more" />
                      </button>
                      <button
                        aria-label={
                          state.favorites.includes(current.id)
                            ? "取消收藏"
                            : "收藏歌曲"
                        }
                        aria-pressed={state.favorites.includes(current.id)}
                        onClick={() => toggleFavorite(current.id)}
                      >
                        <PlayerIcon
                          name="star"
                          filled={state.favorites.includes(current.id)}
                        />
                      </button>
                      <span
                        className="play-view-dots"
                        aria-label={`${playViewLabels[playView]}视图`}
                      >
                        {playViews.map((view) => (
                          <i
                            key={view}
                            className={playView === view ? "active" : ""}
                          />
                        ))}
                      </span>
                      <button
                        aria-label="查看播放队列"
                        onClick={() => open("queue", current.id)}
                      >
                        <PlayerIcon name="queue" />
                      </button>
                      <button
                        aria-label={
                          playView === "lyrics" ? "返回封面" : "查看歌词"
                        }
                        onClick={() =>
                          changePlayView(
                            playView === "lyrics" ? "art" : "lyrics",
                          )
                        }
                      >
                        <PlayerIcon name="lyrics" filled />
                      </button>
                    </div>
                    {state.error && (
                      <div className="screen-error" role="alert">
                        <p>{state.error}</p>
                        <button onClick={() => player.play()}>重试</button>
                        <button onClick={() => player.next()}>下一首</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            {dimmed && <div className="lcd-backlight-dim" aria-hidden="true" />}
            {(notice || dragging) && (
              <div className="screen-notice" role="status">
                {dragging ? "松开以导入音乐" : notice}
              </div>
            )}
          </div>
        </div>
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
