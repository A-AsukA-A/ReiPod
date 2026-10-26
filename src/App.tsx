import { useEffect, useRef, useState } from "react";
import { ClickWheel } from "./input/ClickWheel";
import type { WheelCommand } from "./input/ClickWheel";
import { importFiles, player, usePlayer } from "./player/store";
import type { PlaybackStatus } from "./player/Player";
import demoCatalog from "./player/demoCatalog.json";
import { getDemoTracks } from "./player/demoTracks";

type Page = "home" | "songs" | "playing" | "settings";
type MenuItem = { label: string; detail?: string; action: () => void };
const statusText: Record<PlaybackStatus, string> = {
  idle: "未播放",
  loading: "正在载入",
  playing: "正在播放",
  paused: "已暂停",
  buffering: "正在缓冲",
  ended: "播放完毕",
  error: "无法播放",
};
const time = (value: number) =>
  `${Math.floor(value / 60)}:${Math.floor(value % 60)
    .toString()
    .padStart(2, "0")}`;

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
  const [page, setPage] = useState<Page>("home");
  const [selection, setSelection] = useState(0);
  const [notice, setNotice] = useState("");
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const selectedRow = useRef<HTMLButtonElement>(null);
  const remembered = useRef<Partial<Record<Page, number>>>({});
  const previousPage = useRef<Page>("home");
  const dragDepth = useRef(0);
  const active = state.status === "playing";

  const navigate = (next: Page) => {
    remembered.current[page] = selection;
    if (next === "playing" && page !== "playing") previousPage.current = page;
    setPage(next);
    setSelection(remembered.current[next] ?? 0);
    setNotice("");
  };
  const openFiles = () => input.current?.click();
  const addFiles = (files: File[]) => {
    if (!files.length) return;
    const { added, rejected } = importFiles(files);
    if (added) {
      navigate("songs");
      setSelection(0);
      remembered.current.songs = 0;
      if (rejected) setNotice(`${rejected} 个非音频文件未加入`);
    } else setNotice(rejected ? "请选择音频文件" : "歌曲已在列表中");
  };
  const loadTestMusic = () => {
    player.add(getDemoTracks(import.meta.env.BASE_URL));
    navigate("songs");
    const firstDemo = player
      .getSnapshot()
      .tracks.findIndex((track) => track.kind === "demo");
    setSelection(Math.max(0, firstDemo));
    remembered.current.songs = Math.max(0, firstDemo);
    setNotice("");
  };

  const homeItems: MenuItem[] = [
    {
      label: "音乐",
      detail: `${state.tracks.length} 首歌曲`,
      action: () => navigate("songs"),
    },
    {
      label: "正在播放",
      detail: current?.title ?? "未播放",
      action: () => navigate("playing"),
    },
    { label: "导入音乐", detail: "本地文件", action: openFiles },
    {
      label: "试听音乐",
      detail: `${demoCatalog.length} 首内置音乐`,
      action: loadTestMusic,
    },
    { label: "设置", action: () => navigate("settings") },
  ];
  const settingsItems: MenuItem[] = [
    {
      label: "清空歌曲",
      action: () => {
        player.clear();
        navigate("home");
        remembered.current = {};
        setSelection(0);
      },
    },
    {
      label: "开源许可",
      action: () => {
        window.open(
          `${import.meta.env.BASE_URL}third-party-licenses.txt`,
          "_blank",
          "noopener,noreferrer",
        );
      },
    },
    {
      label: "试听曲目版权",
      action: () => {
        window.open(
          `${import.meta.env.BASE_URL}music/credits.txt`,
          "_blank",
          "noopener,noreferrer",
        );
      },
    },
  ];
  const items =
    page === "home" ? homeItems : page === "settings" ? settingsItems : [];
  const rotate = (steps: number) => {
    if (page === "playing") {
      player.seek(player.getSnapshot().position + steps * 5);
      return;
    }
    const count = page === "songs" ? state.tracks.length : items.length;
    if (count)
      setSelection((index) => Math.max(0, Math.min(count - 1, index + steps)));
  };
  const playTrack = (index: number) => {
    const track = state.tracks[index];
    if (!track) {
      openFiles();
      return;
    }
    player.select(track.id);
    navigate("playing");
    remembered.current.songs = index;
  };
  const select = () => {
    if (page === "songs") playTrack(selection);
    else if (page === "playing") {
      if (current) player.toggle();
      else openFiles();
    } else items[selection]?.action();
  };
  const command = (value: WheelCommand) => {
    if (value === "select") select();
    if (value === "menu")
      navigate(page === "playing" ? previousPage.current : "home");
    if (value === "play") {
      if (!state.tracks.length) {
        openFiles();
        return;
      }
      const selected = state.tracks[selection];
      if (page === "songs" && selected && selected.id !== state.currentId)
        playTrack(selection);
      else player.toggle();
    }
    if (value === "next") player.next();
    if (value === "previous") player.previous();
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
  }, [selection, page]);
  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(""), 3000);
    return () => clearTimeout(timeout);
  }, [notice]);

  const title = {
    home: "ReiPod",
    songs: "歌曲",
    playing: "正在播放",
    settings: "设置",
  }[page];
  const emptyScreen = (
    <div className="screen-empty">
      <span className="music-note" aria-hidden="true">
        ♫
      </span>
      <strong>暂无歌曲</strong>
      <button onClick={openFiles}>导入音乐</button>
      <button onClick={loadTestMusic}>试听音乐</button>
    </div>
  );

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
              <strong>{title}</strong>
              <span className="screen-indicators">
                <span role="img" aria-label={active ? "播放中" : "未播放"}>
                  {active ? "▶" : current ? "Ⅱ" : ""}
                </span>
                <span className="screen-power" aria-hidden="true">
                  <i />
                </span>
              </span>
            </div>
            {(page === "home" || page === "settings") && (
              <div
                className={page === "home" ? "home-screen" : "settings-screen"}
              >
                <nav
                  className="screen-menu"
                  aria-label={page === "home" ? "主菜单" : "设置菜单"}
                >
                  {items.map((item, index) => (
                    <button
                      key={item.label}
                      ref={index === selection ? selectedRow : undefined}
                      aria-current={selection === index ? "true" : undefined}
                      className={`screen-row ${selection === index ? "selected" : ""}`}
                      onClick={() => {
                        setSelection(index);
                        item.action();
                      }}
                    >
                      <span>{item.label}</span>
                      <span aria-hidden="true">›</span>
                    </button>
                  ))}
                </nav>
                {page === "home" && (
                  <div className="screen-preview">
                    <RecordArt />
                    <span>{items[selection]?.detail}</span>
                  </div>
                )}
              </div>
            )}
            {page === "songs" &&
              (state.tracks.length ? (
                <div className="song-screen">
                  <div
                    className="screen-song-list"
                    role="group"
                    aria-label="歌曲列表"
                  >
                    {state.tracks.map((track, index) => (
                      <button
                        key={track.id}
                        ref={index === selection ? selectedRow : undefined}
                        aria-current={selection === index ? "true" : undefined}
                        className={`screen-row ${selection === index ? "selected" : ""}`}
                        onClick={() => playTrack(index)}
                      >
                        <span>
                          {state.currentId === track.id && (
                            <span
                              className="track-playing-marker"
                              aria-hidden="true"
                            >
                              {active ? "▶" : "Ⅱ"}{" "}
                            </span>
                          )}
                          {track.title}
                        </span>
                        <span aria-hidden="true">›</span>
                      </button>
                    ))}
                  </div>
                  <div className="screen-footer">
                    {selection + 1} / {state.tracks.length}
                  </div>
                </div>
              ) : (
                emptyScreen
              ))}
            {page === "playing" &&
              (current ? (
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
                      <span>
                        {current.artist ?? "本地音乐"} ·{" "}
                        {current.filename.split(".").pop()?.toUpperCase()}
                      </span>
                      <span>{statusText[state.status]}</span>
                    </div>
                  </div>
                  <div className="screen-progress">
                    <input
                      type="range"
                      min={0}
                      max={state.duration || 1}
                      step="0.1"
                      value={state.position}
                      disabled={!state.duration}
                      aria-label="调整播放进度"
                      onChange={(event) =>
                        player.seek(Number(event.target.value))
                      }
                    />
                    <div>
                      <span>{time(state.position)}</span>
                      <span>
                        −{time(Math.max(0, state.duration - state.position))}
                      </span>
                    </div>
                  </div>
                  {state.error && (
                    <div className="screen-error" role="alert">
                      <p>{state.error}</p>
                      <button onClick={() => player.play()}>重试</button>
                      <button onClick={() => player.next()}>下一首</button>
                    </div>
                  )}
                </div>
              ) : (
                emptyScreen
              ))}
            {(notice || dragging) && (
              <div className="screen-notice" role="status">
                {dragging ? "松开以导入音乐" : notice}
              </div>
            )}
          </div>
        </div>
        <ClickWheel onRotate={rotate} onCommand={command} />
        <div className="device-engraving" aria-hidden="true">
          ReiPod
        </div>
      </section>
    </main>
  );
}
