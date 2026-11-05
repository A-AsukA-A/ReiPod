import type { Page } from "@playwright/test";

export async function nativeMusicFixture(page: Page, denied = false, podcasts = false,
  options: { authorized?: boolean; holdMusic?: boolean; holdPodcasts?: boolean; holdPodcastTail?: boolean; failPodcasts?: boolean;
    playback?: { currentId: string; status: string; position: number } } = {}) {
  await page.addInitScript(
    ({ denied, podcasts, options }) => {
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
      const episodes = [
        { id: "9007199254740995", title: "系统单集一", artist: "嘉宾甲", duration: 1800,
          podcast: { showId: "18446744073709551612", showTitle: "系统节目", bookmark: 125 } },
        { id: "9007199254740997", title: "系统单集二", artist: "嘉宾乙", duration: 2400,
          podcast: { showId: "18446744073709551612", showTitle: "系统节目", bookmark: 42 } },
      ];
      const items = [...songs, ...episodes];
      let permission =
        localStorage.getItem("__fixture-ios-permission") || (options.authorized ? "authorized" : "notDetermined");
      let playback = JSON.parse(
        localStorage.getItem("__fixture-ios-playback") || "null",
      ) || options.playback || { currentId: null, status: "idle", position: 0 };
      if (options.playback) localStorage.setItem("__fixture-ios-playback", JSON.stringify(playback));
      let sequence = 0;
      let podcastCache: typeof episodes | undefined;
      let podcastWait = Promise.resolve();
      let releasePodcasts = () => {};
      let releaseMusic = () => {};
      const musicWait = options.holdMusic ? new Promise<void>(resolve => { releaseMusic = resolve; }) : Promise.resolve();
      const log = {
        calls: [] as string[],
        queue: [] as string[],
        settings: 0,
        opens: 0,
        emptyPodcasts: false,
        refreshes: 0,
        musicBlocked: !!options.holdMusic,
        failPodcasts: !!options.failPodcasts,
        releaseMusic() { releaseMusic(); log.musicBlocked = false; },
        holdPodcasts() { podcastWait = new Promise<void>(resolve => { releasePodcasts = resolve; }); },
        releasePodcasts() { releasePodcasts(); podcastWait = Promise.resolve(); },
        removeEpisode() { episodes.pop(); },
        libraryChanged() { window.dispatchEvent(new CustomEvent("reipod-native-music", {
          detail: { ...status(), libraryChanged: true },
        })); },
        setPermission(value: string) {
          permission = value;
          localStorage.setItem("__fixture-ios-permission", value);
          window.dispatchEvent(
            new CustomEvent("reipod-native-music", { detail: status() }),
          );
        },
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
      if (options.holdPodcasts || options.holdPodcastTail) log.holdPodcasts();
      const status = () => ({
        authorization: permission,
        ...(permission === "authorized"
          ? {
              playback: {
                ...playback,
                sequence: ++sequence,
                current: items.find((song) => song.id === playback.currentId),
                queue: log.queue.length
                  ? log.queue
                  : playback.currentId
                    ? [playback.currentId]
                    : [],
                queueKnown: !!log.queue.length,
                duration:
                  items.find((song) => song.id === playback.currentId)
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
      if (podcasts) Object.defineProperty(window, "__REIPOD_NATIVE_PODCASTS_VERSION__", { value: 1 });
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
                refresh?: boolean;
              }) {
                if (request.version !== 1) throw Error("Unsupported bridge");
                log.calls.push(request.action);
                if (request.action === "authorize") {
                  permission = denied ? "denied" : "authorized";
                  localStorage.setItem("__fixture-ios-permission", permission);
                }
                if (request.action === "openSettings") log.settings++;
                if (request.action === "openPodcasts") log.opens++;
                if (request.action === "podcasts") {
                  if (!podcasts) throw Error("Unsupported action");
                  if (permission !== "authorized") throw Error("Permission denied");
                  const authorization = permission;
                  if (!(options.holdPodcastTail && !request.offset)) await podcastWait;
                  if (log.failPodcasts) throw Error("播客读取暂时失败");
                  if (request.refresh && !request.offset) { podcastCache = undefined; log.refreshes++; }
                  const entries = podcastCache ??= log.emptyPodcasts ? [] : [...episodes];
                  const offset = request.offset || 0;
                  return { authorization, tracks: entries.slice(offset, offset + 1),
                    ...(offset + 1 < entries.length ? { nextOffset: offset + 1 } : {}) };
                }
                if (
                  ["library", "playlists", "playlistTracks"].includes(
                    request.action,
                  )
                ) {
                  if (permission !== "authorized")
                    throw Error("Permission denied");
                  await musicWait;
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
    { denied, podcasts, options },
  );
}
