import { useSyncExternalStore } from "react";
import type { Track } from "../player/Player";
import type { Playlist } from "../player/playlists";
import { player as localPlayer } from "../player/store";
import { readSession } from "../player/session";
import { applePlayer, setMusicKitPlayer } from "./applePlayer";
import { loadMusicKit, validDeveloperToken } from "./musicKit";
import type { MusicKitInstance } from "./musicKit";
import {
  hasNativeMusic,
  nativeMusicRequest,
  nativeLibrary,
  nativePlaylist,
} from "./nativeMusic";
import type { NativeReply } from "./nativeMusic";
import type { MusicAccountProfile } from "./thirdPartyMusic";
import { NativeSystemPlayer } from "./NativeSystemPlayer";
import { searchTracks } from "../player/search";
import {
  isThirdParty,
  thirdPartyState,
  thirdPartyPlayerFor,
  thirdPartyPlayers,
  onThirdPartyChange,
  prepareThirdParty,
  authorizeThirdParty,
  signOutThirdParty,
  refreshThirdParty,
  loadThirdPartyPlaylist,
  searchThirdParty,
  cancelThirdPartyLogin,
} from "./thirdPartyMusic";

export type MusicService = "local" | "apple-music" | "netease" | "qq";
type ServiceState = {
  transport: "web" | "ios";
  nativeAuthorization?: NativeReply["authorization"];
  selected: MusicService;
  playback: MusicService;
  auth: "unconfigured" | "loading" | "signed-out" | "authorized" | "error";
  ready: boolean;
  syncing: boolean;
  error: string;
  libraryTracks: Track[];
  playlists: Playlist[];
  searchResults: Track[];
  qrImage?: string;
  loginUrl?: string;
  loginMessage?: string;
  profile?: MusicAccountProfile;
};
const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const save = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* Session works without persistence. */
  }
};
let state: ServiceState = {
  transport: hasNativeMusic() ? "ios" : "web",
  selected: ["apple-music", "netease", "qq"].includes(
    read("reipod-music-service") ?? "",
  )
    ? (read("reipod-music-service") as MusicService)
    : "local",
  playback: "local",
  auth: "unconfigured",
  ready: false,
  syncing: false,
  error: "",
  libraryTracks: [],
  playlists: [],
  searchResults: [],
};
const listeners = new Set<() => void>();
let exposedState = state;
function publish() {
  exposedState = isThirdParty(state.selected)
    ? { ...state, ...thirdPartyState(state.selected), transport: "web" }
    : state;
  listeners.forEach((fn) => fn());
}
function update(patch: Partial<ServiceState>) {
  state = { ...state, ...patch };
  publish();
}
onThirdPartyChange(publish);
publish();
export const useMusicServices = () =>
  useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    () => exposedState,
  );
export const getMusicServices = () => exposedState;
export function playerFor(service: MusicService) {
  return service === "local"
    ? localPlayer
    : service === "apple-music"
      ? applePlayer
      : thirdPartyPlayerFor(service);
}
let remoteSnapshot = applePlayer.getSnapshot();
function syncRemoteSnapshot() {
  const service = state.playback === "local" ? state.selected : state.playback;
  remoteSnapshot = {
    ...playerFor(service === "local" ? "apple-music" : service).getSnapshot(),
    tracks: [
      ...applePlayer.getSnapshot().tracks,
      ...thirdPartyPlayers.flatMap((player) => player.getSnapshot().tracks),
    ],
  };
}
const remoteListeners = new Set<() => void>();
const changedRemote = () => {
  syncRemoteSnapshot();
  remoteListeners.forEach((fn) => fn());
};
applePlayer.subscribe(changedRemote);
thirdPartyPlayers.forEach((player) => player.subscribe(changedRemote));
listeners.add(changedRemote);
export const useRemotePlayer = () =>
  useSyncExternalStore(
    (fn) => {
      remoteListeners.add(fn);
      return () => {
        remoteListeners.delete(fn);
      };
    },
    () => remoteSnapshot,
  );
let instance: MusicKitInstance | undefined;
let developerToken = "";
let tokenUrl = "";
let storefront = "us";
let generation = 0;
let accountRequests = new AbortController();
function nextAccountGeneration() {
  generation++;
  accountRequests.abort();
  accountRequests = new AbortController();
  return generation;
}
let preparing: Promise<void> | undefined;
let initialized = false;
let sessionReady = false;
const loadedPlaylists = new Set<string>();

export function selectMusicService(service: MusicService) {
  if (isThirdParty(state.selected) && state.selected !== service)
    cancelThirdPartyLogin(state.selected);
  save("reipod-music-service", service);
  update({ selected: service });
  if (service === "apple-music") void prepareAppleMusicInternal();
  else if (isThirdParty(service)) void prepareThirdParty(service);
}
export function playbackFrom(service: MusicService) {
  if (state.playback !== service) {
    playerFor(state.playback).pause();
    update({ playback: service });
  }
  save("reipod-playback-source", service);
}

async function configuration() {
  let config: { developerToken?: string; tokenUrl?: string } = {};
  try {
    const response = await fetch(
      `${import.meta.env.BASE_URL}music-services.json`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (response.ok) config = (await response.json()).appleMusic ?? {};
  } catch {
    /* Build-time configuration can work independently of this optional file. */
  }
  tokenUrl =
    import.meta.env.VITE_APPLE_MUSIC_TOKEN_URL || config.tokenUrl || "";
  developerToken =
    import.meta.env.VITE_APPLE_MUSIC_DEVELOPER_TOKEN ||
    config.developerToken ||
    "";
}
async function freshDeveloperToken() {
  if (tokenUrl) {
    const url = new URL(tokenUrl, location.href);
    if (
      url.protocol !== "https:" &&
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    )
      throw new Error("Apple Music 配置地址需要 HTTPS");
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error("Apple Music 配置服务暂不可用");
    const value = await response.json();
    developerToken = value.developerToken ?? value.token ?? "";
  }
  if (!validDeveloperToken(developerToken))
    throw new Error("Apple Music 网站授权配置无效或已到期，请联系网站维护者");
  return developerToken;
}
export async function initializeMusicServices() {
  if (initialized) return;
  initialized = true;
  if (isThirdParty(state.selected)) {
    await prepareThirdParty(state.selected);
    return;
  }
  if (hasNativeMusic()) {
    if (!read("reipod-music-service")) update({ selected: "apple-music" });
    await prepareAppleMusicInternal();
    return;
  }
  await configuration();
  if (!read("reipod-music-service") && (developerToken || tokenUrl))
    update({ selected: "apple-music" });
  if (state.selected === "apple-music" || read("reipod-apple-user"))
    await prepareAppleMusicInternal();
}
function prepareAppleMusicInternal() {
  return (preparing ??= (async () => {
    if (hasNativeMusic()) {
      update({ auth: "loading", error: "" });
      try {
        const reply = await nativeMusicRequest("status");
        update({
          ready: true,
          nativeAuthorization: reply.authorization,
          auth: "signed-out",
        });
        if (
          reply.authorization === "authorized" &&
          read("reipod-ios-music-connected") !== "false"
        )
          await connectNativeMusic(reply);
      } catch (error) {
        update({ auth: "error", error: message(error) });
      }
      return;
    }
    await configuration();
    if (!developerToken && !tokenUrl) {
      update({ auth: "unconfigured", ready: false });
      return;
    }
    if (instance) return;
    update({ auth: "loading", error: "" });
    try {
      const token = await freshDeveloperToken();
      const sdk = await loadMusicKit();
      instance = await sdk.configure({
        developerToken: token,
        app: { name: "ReiPod", build: "0.2.0" },
      });
      setMusicKitPlayer(instance);
      update({ ready: true, auth: "signed-out" });
      const stored = read("reipod-apple-user");
      if (stored && !instance.musicUserToken) instance.musicUserToken = stored;
      if (instance.musicUserToken)
        await completeAuthorization(instance.musicUserToken);
      instance.addEventListener("authorizationStatusDidChange", () => {
        if (!instance?.musicUserToken && state.auth === "authorized")
          invalidateAuthorization();
      });
    } catch (error) {
      update({ auth: "error", error: message(error) });
    }
  })().finally(() => {
    preparing = undefined;
  }));
}
function message(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Apple Music 请求失败，请重试";
}
async function connectNativeMusic(reply: NativeReply) {
  const epoch = nextAccountGeneration();
  update({ ready: true, nativeAuthorization: reply.authorization });
  if (reply.authorization !== "authorized") {
    update({
      auth: "signed-out",
      error:
        reply.authorization === "notDetermined"
          ? ""
          : "请在 iPhone 系统设置中允许 ReiPod 访问音乐资料库",
    });
    return;
  }
  save("reipod-ios-music-connected", "true");
  update({ auth: "authorized", error: "" });
  await refreshAppleLibraryInternal();
  if (epoch !== generation) return;
  const latest = await nativeMusicRequest("status");
  if (epoch !== generation) return;
  if (latest.playback && applePlayer instanceof NativeSystemPlayer) {
    applePlayer.adopt(latest.playback);
    if (
      latest.playback.currentId &&
      (latest.playback.status === "playing" ||
        read("reipod-playback-source") === "apple-music")
    )
      playbackFrom("apple-music");
  }
}
export function openNativeMusicSettings() {
  return nativeMusicRequest("openSettings");
}
window.addEventListener("reipod-native-music", (event) => {
  if (!hasNativeMusic()) return;
  const reply = (
    event as CustomEvent<NativeReply & { libraryChanged?: boolean }>
  ).detail;
  if (!reply) return;
  if (reply.authorization !== state.nativeAuthorization)
    update({ nativeAuthorization: reply.authorization });
  if (state.auth !== "authorized") {
    if (
      reply.authorization === "authorized" &&
      state.auth !== "loading" &&
      read("reipod-ios-music-connected") !== "false"
    ) {
      void connectNativeMusic(reply).catch((error: unknown) =>
        update({ auth: "error", error: message(error) }),
      );
    }
    return;
  }
  if (reply.authorization !== "authorized") {
    invalidateAuthorization();
    update({
      nativeAuthorization: reply.authorization,
      error: "系统音乐权限已改变，请重新授权",
    });
    return;
  }
  if (reply.playback && applePlayer instanceof NativeSystemPlayer) {
    applePlayer.adopt(reply.playback);
    if (reply.playback.status === "playing") playbackFrom("apple-music");
  }
  if (reply.libraryChanged && !state.syncing)
    void refreshAppleLibraryInternal();
});
class AppleApiError extends Error {
  constructor(public status: number) {
    super(
      status === 401
        ? "Apple Music 授权已失效，请重新登录"
        : status === 403
          ? "Apple Music 未允许此操作，请检查订阅或资料库权限"
          : `Apple Music 暂不可用（${status}），请重试`,
    );
  }
}
function invalidateAuthorization() {
  nextAccountGeneration();
  sessionReady = false;
  save("reipod-apple-user", null);
  update({
    auth: "signed-out",
    syncing: false,
    libraryTracks: [],
    playlists: [],
    searchResults: [],
  });
  if (instance) instance.musicUserToken = "";
  applePlayer.clear();
  loadedPlaylists.clear();
  if (state.playback === "apple-music") playbackFrom("local");
}
async function request(path: string, epoch = generation) {
  const accountSignal = accountRequests.signal;
  const userToken = instance?.musicUserToken;
  const assertCurrentAccount = () => {
    if (
      epoch !== generation ||
      accountSignal.aborted ||
      instance?.musicUserToken !== userToken
    )
      throw new DOMException(
        "Previous Apple Music account request canceled",
        "AbortError",
      );
  };
  assertCurrentAccount();
  if (!userToken) throw new Error("请先登录 Apple Music");
  const url = new URL(path, "https://api.music.apple.com");
  if (
    url.origin !== "https://api.music.apple.com" ||
    !url.pathname.startsWith("/v1/")
  )
    throw new Error("Apple Music 返回了无效的分页地址");
  if (!validDeveloperToken(developerToken)) await freshDeveloperToken();
  assertCurrentAccount();
  const controller = new AbortController();
  const cancel = () => controller.abort();
  accountSignal.addEventListener("abort", cancel, { once: true });
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${developerToken}`,
        "Music-User-Token": userToken,
      },
      signal: controller.signal,
    });
    // A previous login's failure must never sign out the current account.
    assertCurrentAccount();
    if (!response.ok) {
      const error = new AppleApiError(response.status);
      if (response.status === 401) {
        invalidateAuthorization();
        update({ error: error.message });
      }
      throw error;
    }
    const data = await response.json();
    assertCurrentAccount();
    return data;
  } finally {
    clearTimeout(timeout);
    accountSignal.removeEventListener("abort", cancel);
  }
}
type Resource = {
  id: string;
  type: string;
  attributes?: {
    name?: string;
    artistName?: string;
    albumName?: string;
    durationInMillis?: number;
    genreNames?: string[];
    trackNumber?: number;
    artwork?: { url?: string };
  };
};
async function allPages(path: string, epoch: number) {
  const result: Resource[] = [],
    seen = new Set<string>();
  let next: string | undefined = path;
  while (next) {
    if (seen.has(next))
      throw new Error("Apple Music 分页未能完成，请刷新资料库");
    seen.add(next);
    const response = await request(next, epoch);
    result.push(...(response.data ?? []));
    next = response.next;
  }
  return result;
}
export function appleTrack(resource: Resource): Track {
  const attributes = resource.attributes ?? {};
  const type = resource.type === "library-songs" ? "library-songs" : "songs";
  const artwork = attributes.artwork?.url
    ?.replaceAll("{w}", "600")
    .replaceAll("{h}", "600")
    .replaceAll("{f}", "jpg");
  const duration = (attributes.durationInMillis ?? 0) / 1000;
  return {
    id: `apple:${type}:${resource.id}`,
    title: attributes.name || "未知歌曲",
    artist: attributes.artistName,
    album: attributes.albumName,
    artwork,
    duration,
    genres: attributes.genreNames,
    trackNumber: attributes.trackNumber,
    kind: "apple-music",
    filename: "",
    size: 0,
    url: `musickit://${type}/${encodeURIComponent(resource.id)}?duration=${duration}`,
  };
}
async function completeAuthorization(token: string) {
  const epoch = nextAccountGeneration();
  try {
    const response = await request("/v1/me/storefront");
    if (epoch !== generation) return;
    const region = response.data?.[0]?.id;
    if (typeof region !== "string" || !/^[a-z]{2}$/.test(region))
      throw new Error("未能读取 Apple Music 账户地区，请重试");
    storefront = region;
    instance!.storefrontId = storefront;
    save("reipod-apple-user", token);
    update({ auth: "authorized", error: "" });
    await refreshAppleLibraryInternal();
    if (epoch !== generation) return;
    if (!sessionReady && read("reipod-playback-source") === "apple-music") {
      let saved = null;
      try {
        saved = readSession(JSON.parse(read("reipod-apple-session") || "null"));
      } catch {
        save("reipod-apple-session", null);
      }
      if (
        saved &&
        applePlayer
          .getSnapshot()
          .tracks.some((track) => track.id === saved.currentId)
      ) {
        // Only resume the display/position; browsers require a gesture for sound.
        playbackFrom("apple-music");
        applePlayer.restoreSession(saved);
      }
    }
    sessionReady = true;
  } catch (error) {
    if (epoch !== generation) return;
    if (error instanceof AppleApiError && error.status === 401)
      invalidateAuthorization();
    else update({ auth: "error" });
    update({ error: message(error) });
  }
}
async function authorizeAppleMusicInternal() {
  if (hasNativeMusic()) {
    update({ auth: "loading", error: "" });
    try {
      await connectNativeMusic(await nativeMusicRequest("authorize"));
    } catch (error) {
      update({ auth: "error", error: message(error) });
    }
    return;
  }
  if (!instance || !state.ready) {
    await prepareAppleMusicInternal();
    return;
  }
  const epoch = generation;
  try {
    // Called before any await so the official login popup retains the user gesture.
    const promise = instance.authorize();
    update({ auth: "loading", error: "" });
    const token = await promise;
    if (epoch !== generation) return;
    if (!token) throw new Error("Apple Music 登录已取消");
    await completeAuthorization(token);
  } catch {
    if (epoch !== generation) return;
    update({ auth: "signed-out", error: "Apple Music 登录未完成，可重试" });
  }
}
async function signOutAppleMusicInternal() {
  if (hasNativeMusic()) {
    if (state.playback === "apple-music") applePlayer.pause();
    save("reipod-ios-music-connected", "false");
    invalidateAuthorization();
    update({ error: "" });
    return;
  }
  invalidateAuthorization();
  update({ auth: "loading" });
  save("reipod-apple-session", null);
  try {
    await instance?.unauthorize();
  } catch {
    if (instance) instance.musicUserToken = "";
  } finally {
    update({ auth: "signed-out" });
  }
}
async function refreshAppleLibraryInternal() {
  if (state.auth !== "authorized") return;
  const epoch = generation;
  update({ syncing: true, error: "" });
  try {
    if (hasNativeMusic()) {
      const library = await nativeLibrary();
      if (epoch !== generation) return;
      applePlayer.add(library.tracks);
      library.tracks.forEach((track) =>
        applePlayer.updateTrack(track.id, track),
      );
      loadedPlaylists.clear();
      update({ libraryTracks: library.tracks, playlists: library.playlists });
      return;
    }
    const [songs, lists] = await Promise.all([
      allPages("/v1/me/library/songs?limit=100", epoch),
      allPages("/v1/me/library/playlists?limit=100", epoch),
    ]);
    if (epoch !== generation) return;
    const tracks = songs
      .filter((song) => song.type === "library-songs")
      .map(appleTrack);
    applePlayer.add(tracks);
    tracks.forEach((track) => applePlayer.updateTrack(track.id, track));
    loadedPlaylists.clear();
    update({
      libraryTracks: tracks,
      playlists: lists.map((list) => ({
        id: `apple-playlist:${list.id}`,
        name: list.attributes?.name || "未命名歌单",
        trackIds: [],
      })),
    });
  } catch (error) {
    if (epoch !== generation) return;
    if (error instanceof AppleApiError && error.status === 401)
      invalidateAuthorization();
    update({ error: message(error) });
  } finally {
    if (epoch === generation) update({ syncing: false });
  }
}
async function loadApplePlaylistInternal(id: string) {
  if (loadedPlaylists.has(id)) return true;
  const playlist = state.playlists.find((entry) => entry.id === id);
  if (!playlist) return false;
  const epoch = generation;
  update({ syncing: true, error: "" });
  try {
    if (hasNativeMusic()) {
      const tracks = await nativePlaylist(id);
      if (epoch !== generation) return false;
      applePlayer.add(tracks);
      loadedPlaylists.add(id);
      update({
        playlists: state.playlists.map((entry) =>
          entry.id === id
            ? { ...entry, trackIds: tracks.map((track) => track.id) }
            : entry,
        ),
      });
      return true;
    }
    const items = await allPages(
      `/v1/me/library/playlists/${encodeURIComponent(id.slice("apple-playlist:".length))}/tracks?limit=100`,
      epoch,
    );
    if (epoch !== generation) return false;
    const tracks = items
      .filter((item) => ["songs", "library-songs"].includes(item.type))
      .map(appleTrack);
    applePlayer.add(tracks);
    loadedPlaylists.add(id);
    update({
      playlists: state.playlists.map((entry) =>
        entry.id === id
          ? { ...entry, trackIds: tracks.map((track) => track.id) }
          : entry,
      ),
    });
    return true;
  } catch (error) {
    if (epoch === generation) update({ error: message(error) });
    return false;
  } finally {
    if (epoch === generation) update({ syncing: false });
  }
}
let searchVersion = 0;
async function searchAppleMusicInternal(term: string) {
  const version = ++searchVersion,
    epoch = generation;
  update({ searchResults: [], error: "" });
  if (!term.trim() || state.auth !== "authorized") return;
  if (hasNativeMusic()) {
    update({ searchResults: searchTracks(state.libraryTracks, term) });
    return;
  }
  try {
    const result = await request(
      `/v1/catalog/${encodeURIComponent(storefront)}/search?types=songs&limit=25&term=${encodeURIComponent(term.trim())}`,
      epoch,
    );
    if (version !== searchVersion || epoch !== generation) return;
    const tracks = ((result.results?.songs?.data ?? []) as Resource[]).map(
      appleTrack,
    );
    applePlayer.add(tracks);
    update({ searchResults: tracks });
  } catch (error) {
    if (version === searchVersion && epoch === generation)
      update({ error: message(error) });
  }
}
let lastSession = "";
applePlayer.subscribe(() => {
  if (hasNativeMusic()) return; // iOS owns the live system session; never replace it on launch.
  if (!sessionReady || state.auth !== "authorized") return;
  const session = applePlayer.getSession();
  session.position = Math.floor(session.position);
  const value = JSON.stringify(session);
  if (value !== lastSession) {
    lastSession = value;
    save("reipod-apple-session", value);
  }
});

// Route lock-screen controls to the active engine, including local music while
// browsing Apple Music. Never start both players from a media-session command.
function activePlayer() {
  return playerFor(state.playback);
}
if ("mediaSession" in navigator && !hasNativeMusic()) {
  const handlers: Partial<
    Record<MediaSessionAction, MediaSessionActionHandler>
  > = {
    play: () => activePlayer().play(),
    pause: () => activePlayer().pause(),
    nexttrack: () => activePlayer().next(),
    previoustrack: () => activePlayer().previous(),
    seekto: (event) => {
      if (event.seekTime !== undefined) activePlayer().seek(event.seekTime);
    },
    seekforward: (event) =>
      activePlayer().seek(
        activePlayer().getSnapshot().position + (event.seekOffset ?? 10),
      ),
    seekbackward: (event) =>
      activePlayer().seek(
        activePlayer().getSnapshot().position - (event.seekOffset ?? 10),
      ),
    stop: () => activePlayer().pause(),
  };
  for (const [name, handler] of Object.entries(handlers))
    try {
      navigator.mediaSession.setActionHandler(
        name as MediaSessionAction,
        handler!,
      );
    } catch {
      /* Optional browser support. */
    }
  let lastMetadata = "";
  let lastPosition = "";
  const sync = () => {
    const current = activePlayer().getSnapshot();
    const track = current.tracks.find(
      (entry) => entry.id === current.currentId,
    );
    const key = JSON.stringify([
      track?.id,
      track?.title,
      track?.artist,
      track?.artwork,
    ]);
    // This router is the sole publisher for the active engine's metadata.
    if (
      key !== lastMetadata ||
      navigator.mediaSession.metadata?.title !== (track?.title ?? "")
    ) {
      lastMetadata = key;
      if (typeof MediaMetadata !== "undefined")
        navigator.mediaSession.metadata = track
          ? new MediaMetadata({
              title: track.title,
              artist: track.artist || "",
              album: track.album || "",
              artwork: track.artwork
                ? [{ src: new URL(track.artwork, location.href).href }]
                : [],
            })
          : null;
    }
    const playbackState =
      current.status === "playing"
        ? "playing"
        : current.currentId
          ? "paused"
          : "none";
    if (navigator.mediaSession.playbackState !== playbackState)
      navigator.mediaSession.playbackState = playbackState;
    const positionKey = JSON.stringify([
      state.playback, current.currentId, current.duration, current.position,
    ]);
    if (positionKey === lastPosition) return;
    lastPosition = positionKey;
    if (typeof navigator.mediaSession.setPositionState === "function")
      try {
        if (current.duration > 0 && Number.isFinite(current.duration))
          navigator.mediaSession.setPositionState({
            duration: current.duration,
            position: Math.max(0, Math.min(current.position, current.duration)),
            playbackRate: 1,
          });
        else navigator.mediaSession.setPositionState();
      } catch {
        /* Optional browser support. */
      }
  };
  localPlayer.subscribe(sync);
  applePlayer.subscribe(sync);
  thirdPartyPlayers.forEach((player) => player.subscribe(sync));
  listeners.add(sync);
}

// Public UI commands select the provider; Apple callbacks above stay on their own account.
export function prepareSelectedMusicService() {
  return isThirdParty(state.selected)
    ? prepareThirdParty(state.selected)
    : prepareAppleMusicInternal();
}
export function authorizeSelectedMusicService(channel?: string) {
  return isThirdParty(state.selected)
    ? authorizeThirdParty(state.selected, channel)
    : authorizeAppleMusicInternal();
}
export function signOutSelectedMusicService() {
  return isThirdParty(state.selected)
    ? signOutThirdParty(state.selected)
    : signOutAppleMusicInternal();
}
export function refreshSelectedMusicLibrary() {
  return isThirdParty(state.selected)
    ? refreshThirdParty(state.selected)
    : refreshAppleLibraryInternal();
}
export function loadMusicPlaylist(id: string) {
  const source = id.startsWith("netease-playlist:")
    ? "netease"
    : id.startsWith("qq-playlist:")
      ? "qq"
      : undefined;
  return source
    ? loadThirdPartyPlaylist(source, id)
    : loadApplePlaylistInternal(id);
}
export function searchSelectedMusicService(term: string) {
  return isThirdParty(state.selected)
    ? searchThirdParty(state.selected, term)
    : searchAppleMusicInternal(term);
}
