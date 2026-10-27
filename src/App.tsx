import { useEffect, useMemo, useReducer, useRef, useState } from "react";
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
  usePlayer,
} from "./player/store";
import type { PlaybackStatus } from "./player/Player";
import { albumsFor, artistsFor } from "./player/library";
import { initialNavigation, navigationReducer } from "./ui/navigation";
import type { Page } from "./ui/navigation";
import { SeekSlider } from "./ui/SeekSlider";
import { AlbumArt } from "./ui/AlbumArt";
import { CoverFlow } from "./ui/CoverFlow";
import { Lyrics } from "./ui/Lyrics";
import { setPreferences, usePreferences } from "./ui/preferences";
import { PlayerIcon } from "./ui/PlayerIcon";
import { MarqueeText } from "./ui/MarqueeText";
import { useLcdMotion } from "./ui/useLcdMotion";

type MenuItem = {
  key: string;
  label: string;
  detail?: string;
  value?: string;
  artwork?: string;
  disabled?: boolean;
  action: () => void;
};
type PlayView = "art" | "seek" | "lyrics";
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
  const current = state.tracks.find((track) => track.id === state.currentId);
  const albums = useMemo(() => albumsFor(state.tracks), [state.tracks]);
  const artists = useMemo(() => artistsFor(state.tracks), [state.tracks]);
  const [navigation, dispatch] = useReducer(
    navigationReducer,
    initialNavigation,
  );
  const { page, groupKey } = navigation.screen;
  const [notice, setNotice] = useState("");
  const [dragging, setDragging] = useState(false);
  const [playView, setPlayView] = useState<PlayView>("art");
  const [lyricWheel, setLyricWheel] = useState(0);
  const [coverMotion, setCoverMotion] = useState(true);
  const [volumeOverlay, setVolumeOverlay] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const selectedRow = useRef<HTMLButtonElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const dragDepth = useRef(0);
  const lastInput = useRef("pointer");
  const capture = useLcdMotion(
    content,
    `${page}:${groupKey ?? ""}:${page === "playing" && playView === "lyrics" ? "lyrics" : "page"}`,
    lastInput,
  );
  const active = state.status === "playing";
  const busy = state.status === "loading" || state.status === "buffering";
  const selectedAlbum = albums.find((album) => album.id === groupKey);
  const trackPages: Page[] = [
    "songs",
    "demos",
    "album-tracks",
    "artist-tracks",
    "favorites",
    "recent",
    "queue",
  ];
  const isTrackList = trackPages.includes(page);
  const visibleTracks = useMemo(() => {
    if (page === "queue")
      return state.queue.flatMap((id) => {
        const track = state.tracks.find((track) => track.id === id);
        return track ? [track] : [];
      });
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
  }, [page, groupKey, state.tracks, state.favorites, state.queue, albums]);

  const open = (target: Page, selectedKey?: string, group?: string) => {
    const latest = player.getSnapshot();
    const defaultKey =
      target === "home"
        ? "coverflow"
        : target === "settings"
          ? "shuffle"
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
  const back = () => {
    if (navigation.history.length) capture("back");
    dispatch({ type: "back" });
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
    if (!id) return;
    player.toggleFavorite(id);
    setNotice(
      player.getSnapshot().favorites.includes(id)
        ? "已加入我的收藏"
        : "已从收藏移除",
    );
  };
  const homeItems: MenuItem[] = [
    {
      key: "coverflow",
      label: "Cover Flow",
      detail: `${albums.length} 张专辑`,
      action: () => open("coverflow"),
    },
    {
      key: "music",
      label: "音乐",
      detail: `${state.tracks.length} 首歌曲`,
      action: () => open("music"),
    },
    {
      key: "playing",
      label: "正在播放",
      detail: current?.title ?? "未播放",
      disabled: !current,
      action: () => open("playing"),
    },
    {
      key: "import",
      label: "导入音乐",
      detail: "音频 / LRC",
      action: openFiles,
    },
    {
      key: "demo",
      label: "试听音乐",
      detail: "内置音乐精选",
      action: loadDemos,
    },
    {
      key: "settings",
      label: "设置",
      detail: "声音与外观",
      action: () => open("settings"),
    },
  ];
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
    { key: "shuffle-all", label: "随机播放所有", action: shuffleAll },
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
      value: `${state.favorites.filter((id) => state.tracks.some((track) => track.id === id)).length}`,
      action: () => open("favorites"),
    },
    { key: "recent", label: "最近添加", action: () => open("recent") },
    { key: "demo", label: "试听精选", action: loadDemos },
  ];
  const settingsItems: MenuItem[] = [
    {
      key: "shuffle",
      label: "随机播放",
      value: state.shuffle ? "开启" : "关闭",
      action: () => player.setShuffle(!player.getSnapshot().shuffle),
    },
    {
      key: "repeat",
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
      key: "click",
      label: "转轮声音",
      value: prefs.clickSound ? "开启" : "关闭",
      action: () => setPreferences({ clickSound: !prefs.clickSound }),
    },
    {
      key: "finish",
      label: "机身颜色",
      value: prefs.finish === "silver" ? "银色" : "黑色",
      action: () =>
        setPreferences({
          finish: prefs.finish === "silver" ? "black" : "silver",
        }),
    },
    {
      key: "background",
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
    { key: "cancel", label: "取消", action: back },
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
  const albumRows: MenuItem[] = albums.map((album) => ({
    key: album.id,
    label: album.title,
    detail: album.artist,
    value: `${album.tracks.length}`,
    artwork: album.artwork,
    action: () => open("album-tracks", album.tracks[0]?.id, album.id),
  }));
  const rows: MenuItem[] =
    page === "home"
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
                        action: () => playTrack(track.id),
                      }))
                    : page === "favorites"
                      ? []
                      : !current || isTrackList
                        ? emptyItems
                        : [];
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
    source: "pointer" | "wheel" | "keyboard" = "pointer",
  ) => {
    lastInput.current = source;
    setCoverMotion(source !== "keyboard");
    if (page === "playing" && current) {
      if (playView === "seek")
        player.seek(player.getSnapshot().position + steps * 2);
      else if (playView === "lyrics") setLyricWheel((value) => value + steps);
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
  const cyclePlayView = () =>
    changePlayView(
      playView === "art" ? "seek" : playView === "seek" ? "lyrics" : "art",
    );
  const command = (value: WheelCommand) => {
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
      if (page === "coverflow" || page === "albums") {
        if (albums.length && focusedRow) playAlbum(focusedRow.key);
        else if (focusedRow) chooseRow(focusedRow);
      } else if (
        isTrackList &&
        visibleTracks.some((track) => track.id === focusedRow?.key)
      ) {
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
  useEffect(() => {
    const row = selectedRow.current,
      container = row?.parentElement;
    if (!row || !container) return;
    if (row.offsetTop < container.scrollTop)
      container.scrollTop = row.offsetTop;
    else if (
      row.offsetTop + row.offsetHeight >
      container.scrollTop + container.clientHeight
    )
      container.scrollTop =
        row.offsetTop + row.offsetHeight - container.clientHeight;
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
          }[page];
  const renderRows = () =>
    rows.map((row) => (
      <button
        key={row.key}
        ref={row.key === focusedRow?.key ? selectedRow : undefined}
        disabled={row.disabled}
        aria-current={row.key === focusedRow?.key ? "true" : undefined}
        className={`screen-row ${row.key === focusedRow?.key ? "selected" : ""} ${row.key === "confirm" ? "destructive" : ""} ${page === "albums" ? "album-row" : ""} ${isTrackList ? "track-row" : ""}`}
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
          {page === "albums" && <small>{row.detail}</small>}
        </span>
        {row.value && <span className="row-value">{row.value}</span>}
        <span className="row-chevron" aria-hidden="true">
          <PlayerIcon name="chevron" />
        </span>
      </button>
    ));
  const previewTrack = current ?? state.tracks[0];
  return (
    <main
      className="app-shell"
      aria-label="ReiPod 音乐播放器"
      data-finish={prefs.finish}
      data-background={prefs.background}
      onKeyDownCapture={() => {
        lastInput.current = "keyboard";
      }}
      onPointerDownCapture={() => {
        lastInput.current = "pointer";
      }}
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
        onChange={(event) => {
          addFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
      <section
        className={`classic-device ${dragging ? "is-dragging" : ""}`}
        aria-label="classic 播放器"
      >
        <div className="top-hold" aria-hidden="true">
          <i />
        </div>
        <div className="screen-glass">
          <div
            className="lcd-screen"
            data-page={page}
            data-view={page === "playing" ? playView : undefined}
          >
            <div className="screen-status">
              <button
                className="screen-back"
                aria-label="返回上一级"
                disabled={!navigation.history.length}
                onClick={back}
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
            </div>
            <div className="screen-viewport">
              <div className="screen-content" ref={content}>
                {(page === "home" || page === "music") && (
                  <div className="home-screen">
                    <nav
                      className="screen-menu"
                      aria-label={page === "home" ? "主菜单" : "音乐菜单"}
                    >
                      {renderRows()}
                    </nav>
                    <div className="screen-preview">
                      {page === "home" && focusedRow?.key === "coverflow" ? (
                        <div className="preview-stack">
                          {albums.slice(0, 3).map((album) => (
                            <AlbumArt
                              key={album.id}
                              src={album.artwork}
                              title={album.title}
                              artist={album.artist}
                            />
                          ))}
                        </div>
                      ) : (
                        <AlbumArt
                          src={previewTrack?.artwork}
                          title={previewTrack?.album ?? "ReiPod"}
                          artist={previewTrack?.artist}
                        />
                      )}
                      <strong>
                        {page === "home" && focusedRow?.key === "playing"
                          ? current?.title
                          : focusedRow?.label}
                      </strong>
                      <span>
                        {focusedRow?.detail ?? `${state.tracks.length} 首歌曲`}
                      </span>
                    </div>
                  </div>
                )}
                {page === "coverflow" &&
                  (albums.length ? (
                    <CoverFlow
                      albums={albums}
                      index={selectedIndex}
                      onMove={(steps, source) => rotate(steps, source)}
                      onChoose={() => focusedRow && chooseRow(focusedRow)}
                      animate={coverMotion}
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
                  page === "playlists") && (
                  <div className="settings-screen">
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
                        {selectedIndex + 1} / {visibleTracks.length}
                      </div>
                    </div>
                  ) : (
                    <div className="screen-empty">
                      <span className="music-note" aria-hidden="true">
                        ♫
                      </span>
                      <strong>
                        {page === "favorites" ? "还没有收藏的歌曲" : "暂无歌曲"}
                      </strong>
                      {page === "favorites" ? (
                        <small>播放时长按中心键加入收藏</small>
                      ) : (
                        <nav className="empty-actions" aria-label="添加音乐">
                          {renderRows()}
                        </nav>
                      )}
                    </div>
                  ))}
                {page === "playing" && current && (
                  <div className={`now-playing-screen view-${playView}`}>
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
                          {state.status !== "playing" && (
                            <small>{statusText[state.status]}</small>
                          )}
                        </div>
                      </div>
                    )}
                    <SeekSlider state={state} />
                    <div className="np-actions">
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
                        aria-label={
                          playView === "seek" ? "进度视图" : "封面视图"
                        }
                      >
                        <i className={playView === "art" ? "active" : ""} />
                        <i className={playView === "seek" ? "active" : ""} />
                        <i />
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
            {volumeOverlay && (
              <div className="volume-overlay">
                <span>音量</span>
                <progress value={state.volume} max={1} />
                <strong>{Math.round(state.volume * 100)}%</strong>
              </div>
            )}
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
          playLabel={busy ? "取消载入" : active ? "暂停" : "播放"}
          onFeedback={feedback}
        />
      </section>
    </main>
  );
}
