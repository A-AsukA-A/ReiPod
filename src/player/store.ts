import { useSyncExternalStore } from "react";
import { Player } from "./Player";

export const player = new Player();
export const usePlayer = () =>
  useSyncExternalStore(player.subscribe, player.getSnapshot);

export function importFiles(files: File[]) {
  let rejected = 0;
  const tracks = files.flatMap((file) => {
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
      },
    ];
  });
  return { added: player.add(tracks), rejected };
}

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
  let lastId: string | null = null;
  player.subscribe(() => {
    const state = player.getSnapshot();
    if (state.currentId !== lastId) {
      lastId = state.currentId;
      const track = state.tracks.find((item) => item.id === lastId);
      navigator.mediaSession.metadata =
        track && typeof MediaMetadata !== "undefined"
          ? new MediaMetadata({
              title: track.title,
              artist: track.artist ?? "本地音乐",
              album: "ReiPod",
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

if (import.meta.hot) import.meta.hot.dispose(() => player.clear());
