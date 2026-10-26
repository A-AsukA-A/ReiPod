import { useSyncExternalStore } from "react";
import { Player } from "./Player";
import { getDemoTracks } from "./demoTracks";
import { parseLyrics } from "./library";
import { clearFiles, readFiles, saveFiles } from "./storage";

export const player = new Player();
let showDemos = true;
try {
  showDemos = localStorage.getItem("reipod-demos") !== "hidden";
} catch {
  /* Storage can be unavailable in a private browser. */
}
if (showDemos) player.add(getDemoTracks(import.meta.env.BASE_URL));
export function addDemos() {
  try {
    localStorage.removeItem("reipod-demos");
  } catch {
    /* Optional storage. */
  }
  player.add(getDemoTracks(import.meta.env.BASE_URL));
}
export const usePlayer = () =>
  useSyncExternalStore(player.subscribe, player.getSnapshot);

let epoch = 0;
let metadataJobs = Promise.resolve();
let restoring: Promise<void> | null = null;
const events = new Set<(message: string) => void>();
export const onLibraryNotice = (listener: (message: string) => void) => {
  events.add(listener);
  return () => {
    events.delete(listener);
  };
};
const notify = (message: string) =>
  events.forEach((listener) => listener(message));

export function importFiles(files: File[], persist = true) {
  const generation = epoch;
  const previous = new Set(
    player.getSnapshot().tracks.map((track) => track.id),
  );
  let rejected = 0;
  const tracks = files.flatMap((file) => {
    if (/\.lrc$/i.test(file.name)) return [];
    if (
      !/\.(mp3|m4a|aac|wav|wave|flac|ogg|oga|opus|aif|aiff|mp4)$/i.test(
        file.name,
      ) &&
      !file.type.startsWith("audio/")
    ) {
      rejected++;
      return [];
    }
    return [
      {
        id: `${file.name}:${file.size}:${file.lastModified}`,
        title: file.name.replace(/\.[^.]+$/, ""),
        filename: file.name,
        size: file.size,
        url: URL.createObjectURL(file),
        importedAt: Date.now(),
        kind: "local" as const,
      },
    ];
  });
  const added = player.add(tracks);
  const audioFiles = files.filter((file) =>
    tracks.some(
      (track) => track.id === `${file.name}:${file.size}:${file.lastModified}`,
    ),
  );
  for (const file of audioFiles) {
    const id = `${file.name}:${file.size}:${file.lastModified}`;
    if (previous.has(id)) continue;
    metadataJobs = metadataJobs.then(async () => {
      if (generation !== epoch) return;
      try {
        const { parseBlob, selectCover } = await import("music-metadata");
        const metadata = await parseBlob(file, {
          duration: false,
          skipPostHeaders: true,
        });
        if (generation !== epoch) return;
        const cover = selectCover(metadata.common.picture);
        const artwork =
          cover && cover.data.byteLength < 8 * 1024 * 1024
            ? URL.createObjectURL(
                new Blob([new Uint8Array(cover.data)], { type: cover.format }),
              )
            : undefined;
        const text = metadata.common.lyrics?.[0]?.text;
        player.updateTrack(id, {
          title:
            metadata.common.title?.trim() || file.name.replace(/\.[^.]+$/, ""),
          artist: metadata.common.artist?.trim(),
          album: metadata.common.album?.trim(),
          albumArtist: metadata.common.albumartist?.trim(),
          trackNumber: metadata.common.track.no ?? undefined,
          duration: metadata.format.duration,
          ...(artwork ? { artwork } : {}),
          ...(text &&
          !player.getSnapshot().tracks.find((track) => track.id === id)?.lyrics
            ?.length
            ? { lyrics: parseLyrics(text) }
            : {}),
        });
      } catch {
        /* A bad or missing tag does not prevent decoding the original audio. */
      }
    });
  }
  const lyricFiles = files.filter((file) => /\.lrc$/i.test(file.name));
  for (const file of lyricFiles)
    void file
      .text()
      .then((text) => {
        if (generation !== epoch) return;
        const stem = file.name.replace(/\.lrc$/i, "").toLocaleLowerCase();
        const matches = player
          .getSnapshot()
          .tracks.filter(
            (track) =>
              track.filename.replace(/\.[^.]+$/, "").toLocaleLowerCase() ===
                stem || track.title.toLocaleLowerCase() === stem,
          );
        for (const track of matches)
          player.updateTrack(track.id, { lyrics: parseLyrics(text) });
        if (!matches.length && persist)
          notify(`歌词「${file.name}」未找到同名歌曲`);
      })
      .catch(() => {
        if (persist) notify("歌词文件读取失败");
      });
  if (persist && (audioFiles.length || lyricFiles.length))
    void saveFiles([...audioFiles, ...lyricFiles]).catch(() =>
      notify("浏览器未能保存文件，本次仍可播放"),
    );
  return { added, rejected, lyrics: lyricFiles.length };
}

export function initializeLibrary() {
  const generation = epoch;
  restoring ??= readFiles()
    .then((records) => {
      if (generation === epoch) {
        importFiles(
          records.map((record) => record.file),
          false,
        );
        for (const { file, importedAt } of records)
          player.updateTrack(`${file.name}:${file.size}:${file.lastModified}`, {
            importedAt,
          });
        if (!player.getSnapshot().currentId)
          player.setQueue(player.getSnapshot().tracks.map((track) => track.id));
      }
    })
    .catch(() => {});
  return restoring;
}
export function clearLibrary() {
  epoch++;
  try {
    localStorage.setItem("reipod-demos", "hidden");
  } catch {
    /* Optional storage. */
  }
  player.clear();
  void clearFiles().catch(() => notify("曲库保存状态清理失败，请重试"));
}
try {
  const saved = JSON.parse(localStorage.getItem("reipod-playback") ?? "null");
  if (saved) {
    player.setRepeat(
      saved.repeat === "all" || saved.repeat === "one" ? saved.repeat : "off",
    );
    player.setFavorites(
      Array.isArray(saved.favorites)
        ? saved.favorites.filter((id: unknown) => typeof id === "string")
        : [],
    );
    if (saved.shuffle === true) {
      player.setShuffle(true);
      player.setQueue(player.getSnapshot().tracks.map((track) => track.id));
    }
  }
} catch {
  /* Browser-local settings are optional. */
}
let lastSettings = "";
player.subscribe(() => {
  const { shuffle, repeat, favorites } = player.getSnapshot();
  const saved = JSON.stringify({ shuffle, repeat, favorites });
  if (saved !== lastSettings) {
    lastSettings = saved;
    try {
      localStorage.setItem("reipod-playback", saved);
    } catch {
      /* Playback still works. */
    }
  }
});

// The browser may expose these controls on a lock screen; native background support is a separate milestone.
if ("mediaSession" in navigator) {
  const handlers: Partial<
    Record<MediaSessionAction, MediaSessionActionHandler>
  > = {
    play: () => player.play(),
    pause: () => player.pause(),
    previoustrack: () => player.previous(),
    nexttrack: () => player.next(),
    seekto: (details) => {
      if (details.seekTime !== undefined) player.seek(details.seekTime);
    },
  };
  for (const [action, handler] of Object.entries(handlers)) {
    try {
      navigator.mediaSession.setActionHandler(
        action as MediaSessionAction,
        handler!,
      );
    } catch {
      /* Optional host capability. */
    }
  }
  let lastMetadata = "";
  player.subscribe(() => {
    const state = player.getSnapshot();
    const track = state.tracks.find((item) => item.id === state.currentId);
    const metadataKey = JSON.stringify([
      track?.id,
      track?.title,
      track?.artist,
      track?.artwork,
    ]);
    if (metadataKey !== lastMetadata) {
      lastMetadata = metadataKey;
      navigator.mediaSession.metadata =
        track && typeof MediaMetadata !== "undefined"
          ? new MediaMetadata({
              title: track.title,
              artist: track.artist ?? "本地音乐",
              album: track.album ?? "ReiPod",
              artwork: track.artwork
                ? [{ src: new URL(track.artwork, location.href).href }]
                : [],
            })
          : null;
    }
    navigator.mediaSession.playbackState =
      state.status === "playing"
        ? "playing"
        : state.currentId
          ? "paused"
          : "none";
  });
}

if (import.meta.hot)
  import.meta.hot.dispose(() => {
    epoch++;
    player.clear();
  });
