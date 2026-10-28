import type { Page } from "@playwright/test";

export async function nativeMusicFixture(page: Page, denied = false) {
  await page.addInitScript(
    ({ denied }) => {
      const songs = [
        {
          id: "9007199254740993",
          title: "Phone First",
          artist: "Phone Artist",
          album: "Phone Album",
          duration: 180,
        },
        {
          id: "18446744073709551614",
          title: "Phone Second",
          artist: "Phone Artist",
          album: "Phone Album",
          duration: 200,
        },
      ];
      let permission =
        localStorage.getItem("__fixture-ios-permission") || "notDetermined";
      let playback = JSON.parse(
        localStorage.getItem("__fixture-ios-playback") || "null",
      ) || { currentId: null, status: "idle", position: 0 };
      let sequence = 0;
      const log = {
        calls: [] as string[],
        queue: [] as string[],
        settings: 0,
        update(patch: Record<string, unknown>) {
          playback = { ...playback, ...patch };
          localStorage.setItem(
            "__fixture-ios-playback",
            JSON.stringify(playback),
          );
          window.dispatchEvent(
            new CustomEvent("reipod-native-music", { detail: status() }),
          );
        },
      };
      const status = () => ({
        authorization: permission,
        ...(permission === "authorized"
          ? {
              playback: {
                ...playback,
                sequence: ++sequence,
                current: songs.find((song) => song.id === playback.currentId),
                queue: log.queue.length
                  ? log.queue
                  : playback.currentId
                    ? [playback.currentId]
                    : [],
                queueKnown: !!log.queue.length,
                duration:
                  songs.find((song) => song.id === playback.currentId)
                    ?.duration || 0,
                volume: 0.6,
                repeat: "off",
              },
            }
          : {}),
      });
      Object.defineProperty(window, "__REIPOD_NATIVE_MUSIC_VERSION__", {
        value: 1,
      });
      Object.defineProperty(window, "webkit", {
        value: {
          messageHandlers: {
            reipodMusic: {
              async postMessage(request: {
                version: number;
                action: string;
                ids?: string[];
                selectedId?: string;
                seconds?: number;
                autoplay?: boolean;
                offset?: number;
              }) {
                if (request.version !== 1) throw Error("Unsupported bridge");
                log.calls.push(request.action);
                if (request.action === "authorize") {
                  permission = denied ? "denied" : "authorized";
                  localStorage.setItem("__fixture-ios-permission", permission);
                }
                if (request.action === "openSettings") log.settings++;
                if (
                  ["library", "playlists", "playlistTracks"].includes(
                    request.action,
                  )
                ) {
                  if (permission !== "authorized")
                    throw Error("Permission denied");
                  if (request.action === "playlists")
                    return {
                      authorization: permission,
                      playlists: [
                        { id: "18446744073709551615", name: "系统歌单" },
                      ],
                    };
                  return request.offset
                    ? { authorization: permission, tracks: [songs[1]] }
                    : {
                        authorization: permission,
                        tracks: [songs[0]],
                        nextOffset: 1,
                      };
                }
                if (request.action === "setQueue") {
                  log.queue = request.ids || [];
                  playback = {
                    currentId: request.selectedId,
                    status: request.autoplay ? "playing" : "paused",
                    position: request.seconds || 0,
                  };
                }
                if (request.action === "pause") playback.status = "paused";
                if (request.action === "play") playback.status = "playing";
                if (request.action === "seek")
                  playback.position = request.seconds;
                if (["next", "previous"].includes(request.action)) {
                  const index = log.queue.indexOf(playback.currentId);
                  playback.currentId =
                    log.queue[
                      (index +
                        (request.action === "next"
                          ? 1
                          : log.queue.length - 1)) %
                        log.queue.length
                    ];
                  playback.position = 0;
                }
                if (
                  [
                    "setQueue",
                    "play",
                    "pause",
                    "next",
                    "previous",
                    "seek",
                  ].includes(request.action)
                ) {
                  localStorage.setItem(
                    "__fixture-ios-playback",
                    JSON.stringify(playback),
                  );
                  window.dispatchEvent(
                    new CustomEvent("reipod-native-music", {
                      detail: status(),
                    }),
                  );
                }
                return status();
              },
            },
          },
        },
      });
      (window as unknown as { __nativeTest: typeof log }).__nativeTest = log;
    },
    { denied },
  );
}
