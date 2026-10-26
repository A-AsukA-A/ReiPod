import { useEffect, useReducer, useRef, useState } from "react";
import { ClickWheel } from "./input/ClickWheel";
import type { WheelCommand } from "./input/ClickWheel";
import { importFiles, player, usePlayer } from "./player/store";
import type { PlaybackStatus } from "./player/Player";
import demoCatalog from "./player/demoCatalog.json";
import { getDemoTracks } from "./player/demoTracks";
import { initialNavigation, navigationReducer } from "./ui/navigation";
import type { Page } from "./ui/navigation";
import { SeekSlider } from "./ui/SeekSlider";

type MenuItem = {
  key: string;
  label: string;
  detail?: string;
  disabled?: boolean;
  action: () => void;
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

function RecordArt() {
  return (
    <div className="record-art small" aria-hidden="true">
      <div className="record-disc">
        <div className="record-label">
          <span>R</span>
          <i />
        </div>
      </div>
    </div>
  );
}

export function App() {
  const state = usePlayer();
  const current = state.tracks.find((track) => track.id === state.currentId);
  const [navigation, dispatch] = useReducer(
    navigationReducer,
    initialNavigation,
  );
  const page = navigation.screen.page;
  const [notice, setNotice] = useState("");
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const selectedRow = useRef<HTMLButtonElement>(null);
  const dragDepth = useRef(0);
  const active = state.status === "playing";
  const busy = state.status === "loading" || state.status === "buffering";
  const isTrackList = page === "songs" || page === "demos";
  const visibleTracks =
    page === "demos"
      ? state.tracks.filter((track) => track.kind === "demo")
      : state.tracks;

  const open = (target: Page, selectedKey?: string) => {
    const latest = player.getSnapshot();
    const tracks =
      target === "demos"
        ? latest.tracks.filter((track) => track.kind === "demo")
        : latest.tracks;
    const defaultKey =
      target === "home"
        ? "music"
        : target === "settings"
          ? "clear"
          : target === "confirm-clear"
            ? "cancel"
            : (tracks.find((track) => track.id === latest.currentId)?.id ??
              tracks[0]?.id ??
              "import");
    dispatch({ type: "open", page: target, selectedKey, defaultKey });
    setNotice("");
  };
  const back = () => {
    dispatch({ type: "back" });
    setNotice("");
  };
  const openFiles = () => input.current?.click();
  const addFiles = (files: File[]) => {
    if (!files.length) return;
    const previousIds = new Set(
      player.getSnapshot().tracks.map((track) => track.id),
    );
    const { added, rejected } = importFiles(files);
    if (added) {
      const addedTrack = player
        .getSnapshot()
        .tracks.find((track) => !previousIds.has(track.id));
      open("songs", addedTrack?.id);
      if (rejected) setNotice(`${rejected} 个非音频文件未加入`);
    } else setNotice(rejected ? "请选择音频文件" : "歌曲已在列表中");
  };
  const loadTestMusic = () => {
    player.add(getDemoTracks(import.meta.env.BASE_URL));
    open("demos");
  };
  const playTrack = (id: string) => {
    player.activate(id);
    open("playing");
  };
  const openDocument = (path: string) => {
    window.open(
      `${import.meta.env.BASE_URL}${path}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const homeItems: MenuItem[] = [
    {
      key: "music",
      label: "音乐",
      detail: `${state.tracks.length} 首歌曲`,
      action: () => open("songs"),
    },
    {
      key: "playing",
      label: "正在播放",
      detail: current?.title ?? "未播放",
      disabled: !current,
      action: () => open("playing"),
    },
    { key: "import", label: "导入音乐", detail: "本地文件", action: openFiles },
    {
      key: "demo",
      label: "试听音乐",
      detail: `${demoCatalog.length} 首内置音乐`,
      action: loadTestMusic,
    },
    { key: "settings", label: "设置", action: () => open("settings") },
  ];
  const settingsItems: MenuItem[] = [
    {
      key: "clear",
      label: "清空歌曲",
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
  const confirmItems: MenuItem[] = [
    { key: "cancel", label: "取消", action: back },
    {
      key: "confirm",
      label: "清空列表",
      action: () => {
        player.clear();
        dispatch({ type: "reset" });
        setNotice("已清空列表");
      },
    },
  ];
  const emptyItems: MenuItem[] = [
    { key: "import", label: "导入音乐", action: openFiles },
    { key: "demo", label: "试听音乐", action: loadTestMusic },
  ];
  const rows: MenuItem[] =
    page === "home"
      ? homeItems
      : page === "settings"
        ? settingsItems
        : page === "confirm-clear"
          ? confirmItems
          : isTrackList && visibleTracks.length
            ? visibleTracks.map((track) => ({
                key: track.id,
                label: track.title,
                action: () => playTrack(track.id),
              }))
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
  const rotate = (steps: number) => {
    if (page === "playing" && current) {
      player.seek(
        player.getSnapshot().position +
          Math.sign(steps) * Math.min(3, Math.abs(steps)) * 2,
      );
    } else
      dispatch({
        type: "move",
        keys: rows.filter((row) => !row.disabled).map((row) => row.key),
        steps,
      });
  };
  const chooseRow = (row: MenuItem) => {
    if (!row.disabled) {
      dispatch({ type: "select", key: row.key });
      row.action();
    }
  };
  const command = (value: WheelCommand) => {
    if (value === "home") {
      dispatch({ type: "home" });
      setNotice("");
    }
    if (value === "menu") back();
    if (value === "select") {
      if (page === "playing" && current) player.toggle();
      else if (focusedRow) chooseRow(focusedRow);
    }
    if (value === "play") {
      if (
        isTrackList &&
        visibleTracks.some((track) => track.id === focusedRow?.key)
      ) {
        if (focusedRow!.key === player.getSnapshot().currentId) player.toggle();
        else chooseRow(focusedRow!);
      } else if (player.getSnapshot().currentId) player.toggle();
      else {
        if (!player.getSnapshot().tracks.length)
          player.add(getDemoTracks(import.meta.env.BASE_URL));
        const first = player.getSnapshot().tracks[0];
        if (first) playTrack(first.id);
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
    const timeout = setTimeout(() => setNotice(""), 2500);
    return () => clearTimeout(timeout);
  }, [notice]);

  const title = {
    home: "ReiPod",
    songs: "歌曲",
    demos: "试听音乐",
    playing: "正在播放",
    settings: "设置",
    "confirm-clear": "清空歌曲",
  }[page];
  const renderRows = () =>
    rows.map((row) => (
      <button
        key={row.key}
        ref={row.key === focusedRow?.key ? selectedRow : undefined}
        disabled={row.disabled}
        aria-current={row.key === focusedRow?.key ? "true" : undefined}
        className={`screen-row ${row.key === focusedRow?.key ? "selected" : ""} ${row.key === "confirm" ? "destructive" : ""}`}
        onClick={() => chooseRow(row)}
      >
        <span>
          {isTrackList && state.currentId === row.key && (
            <span className="track-playing-marker" aria-hidden="true">
              {active ? "▶" : "Ⅱ"}{" "}
            </span>
          )}
          {row.label}
        </span>
        <span aria-hidden="true">›</span>
      </button>
    ));

  return (
    <main
      className="app-shell"
      aria-label="ReiPod 音乐播放器"
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
        accept="audio/*,.mp3,.m4a,.aac,.wav,.flac,.ogg,.opus,.aiff"
        multiple
        aria-label="选择本地音频文件"
        onChange={(event) => {
          addFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
      <section
        className={`classic-device ${dragging ? "is-dragging" : ""}`}
        aria-label="银色 classic 播放器"
      >
        <div className="top-hold" aria-hidden="true">
          <i />
        </div>
        <div className="screen-glass">
          <div className="lcd-screen">
            <div className="screen-status">
              <button
                className="screen-back"
                aria-label="返回上一级"
                disabled={!navigation.history.length}
                onClick={back}
              >
                ‹
              </button>
              <strong>{title}</strong>
              {current ? (
                <button
                  className="screen-playing-link"
                  aria-label="返回正在播放"
                  onClick={() => open("playing")}
                >
                  <span aria-hidden="true">
                    {busy ? "…" : active ? "▶" : "Ⅱ"}
                  </span>
                </button>
              ) : (
                <span className="screen-header-spacer" />
              )}
            </div>
            {page === "home" && (
              <div className="home-screen">
                <nav className="screen-menu" aria-label="主菜单">
                  {renderRows()}
                </nav>
                <div className="screen-preview">
                  <RecordArt />
                  <span>{focusedRow?.detail}</span>
                </div>
              </div>
            )}
            {(page === "settings" || page === "confirm-clear") && (
              <div className="settings-screen">
                {page === "confirm-clear" && (
                  <p className="clear-question">
                    清空本次歌曲列表？<span>不会删除设备中的文件</span>
                  </p>
                )}
                <nav
                  className="screen-menu"
                  aria-label={page === "settings" ? "设置菜单" : "清空确认"}
                >
                  {renderRows()}
                </nav>
              </div>
            )}
            {(isTrackList || (page === "playing" && !current)) &&
              (isTrackList && visibleTracks.length ? (
                <div className="song-screen">
                  <div
                    className="screen-song-list"
                    role="group"
                    aria-label={page === "demos" ? "试听歌曲列表" : "歌曲列表"}
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
                  <strong>暂无歌曲</strong>
                  <nav className="empty-actions" aria-label="添加音乐">
                    {renderRows()}
                  </nav>
                </div>
              ))}
            {page === "playing" && current && (
              <div className="now-playing-screen">
                <div className="now-playing-top">
                  <RecordArt />
                  <div>
                    <p>
                      {state.tracks.findIndex(
                        (track) => track.id === current.id,
                      ) + 1}{" "}
                      / {state.tracks.length}
                    </p>
                    <strong title={current.title}>{current.title}</strong>
                    <span>{current.artist ?? "本地音乐"}</span>
                    <span>{statusText[state.status]}</span>
                  </div>
                </div>
                <SeekSlider state={state} />
                {state.error && (
                  <div className="screen-error" role="alert">
                    <p>{state.error}</p>
                    <button onClick={() => player.play()}>重试</button>
                    <button onClick={() => player.next()}>下一首</button>
                  </div>
                )}
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
        />
        <div className="device-engraving" aria-hidden="true">
          ReiPod
        </div>
      </section>
    </main>
  );
}
