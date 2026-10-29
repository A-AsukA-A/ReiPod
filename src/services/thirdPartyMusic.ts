import { openMusicLogin, usesExternalMusicLogin } from "./musicLogin";
import { bridgeMusicRequest, useMusicBridge } from "./musicTransport";
import { Player, PlaybackError } from "../player/Player";
import type { AudioPort, Track, PlaybackErrorKind } from "../player/Player";
import { parseLyrics } from "../player/library";
import type { Playlist } from "../player/playlists";

export type ThirdPartyService = "netease" | "qq";
export const isThirdParty = (value: string): value is ThirdPartyService =>
  value === "netease" || value === "qq";
export const thirdPartyNames = { netease: "网易云音乐", qq: "QQ 音乐" };
export type MusicAccountProfile = { id: string; name: string; avatar?: string };
type ServiceView = {
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
const initial = (): ServiceView => ({
  auth: "unconfigured",
  ready: false,
  syncing: false,
  error: "",
  profile: undefined,
  libraryTracks: [],
  playlists: [],
  searchResults: [],
});
const states: Record<ThirdPartyService, ServiceView> = {
  netease: initial(),
  qq: initial(),
};
const epochs = { netease: 0, qq: 0 };
const controllers = {
  netease: new AbortController(),
  qq: new AbortController(),
};
const challenges: Partial<Record<ThirdPartyService, string>> = {};
type PendingLogin = { key: string; loginUrl: string; expires: number };
const pendingKey = (service: ThirdPartyService) => `reipod-${service}-pending-login`;
function pendingLogin(service: ThirdPartyService): PendingLogin | undefined {
  try {
    const value = JSON.parse(sessionStorage.getItem(pendingKey(service)) || "null");
    if (value && typeof value.key === "string" && typeof value.loginUrl === "string" && value.expires > Date.now()) return value;
  } catch { /* Session storage can be disabled. */ }
}
function savePendingLogin(service: ThirdPartyService, value?: PendingLogin) {
  try {
    if (value) sessionStorage.setItem(pendingKey(service), JSON.stringify(value));
    else sessionStorage.removeItem(pendingKey(service));
  } catch { /* The current document can still finish its login. */ }
}
const listeners = new Set<() => void>();
const loaded = new Set<string>();
const storageKey = (service: ThirdPartyService) => `reipod-${service}-session`;
const readToken = (service: ThirdPartyService) => {
  try {
    return localStorage.getItem(storageKey(service)) ?? "";
  } catch {
    return "";
  }
};
const tokens = { netease: readToken("netease"), qq: readToken("qq") };
function saveToken(service: ThirdPartyService, value: string) {
  tokens[service] = value;
  try {
    if (value) localStorage.setItem(storageKey(service), value);
    else localStorage.removeItem(storageKey(service));
  } catch {
    /* This session remains usable. */
  }
}
function update(service: ThirdPartyService, patch: Partial<ServiceView>) {
  states[service] = { ...states[service], ...patch };
  listeners.forEach((fn) => fn());
}
export const thirdPartyState = (service: ThirdPartyService) => states[service];
export const onThirdPartyChange = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
class MusicServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly kind?: PlaybackErrorKind,
  ) {
    super(message);
  }
}
function endpoint(service: ThirdPartyService, action: string) {
  const base =
    import.meta.env.VITE_MUSIC_API_URL ||
    new URL("api/music/", location.href).href;
  const root = new URL(base.endsWith("/") ? base : base + "/", location.href);
  if (
    root.protocol !== "https:" &&
    !(
      root.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(root.hostname)
    )
  )
    throw new Error("请为音乐服务配置 HTTPS 接口地址");
  return new URL(`${service}/${action}`, root);
}
async function request(
  service: ThirdPartyService,
  action: string,
  body: Record<string, unknown> = {},
  signal = controllers[service].signal,
) {
  const epoch = epochs[service];
  const token = tokens[service];
  let response: Response;
  try {
    response = useMusicBridge()
      ? await bridgeMusicRequest(
          service,
          action,
          body,
          token,
          AbortSignal.any([signal, AbortSignal.timeout(30000)]),
        )
      : await fetch(endpoint(service, action), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(body),
          signal: AbortSignal.any([signal, AbortSignal.timeout(30000)]),
          cache: "no-store",
        });
  } catch (error) {
    if (signal.aborted)
      throw new DOMException("Canceled music request", "AbortError");
    throw new Error(
      error instanceof Error &&
        (error.message.includes("HTTPS") || useMusicBridge())
        ? error.message
        : "音乐服务暂未连接，请确认自托管音乐服务已启动",
    );
  }
  if (epoch !== epochs[service] || token !== tokens[service])
    throw new DOMException("Canceled music session", "AbortError");
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("音乐服务暂未连接，请检查接口配置");
  }
  if (epoch !== epochs[service] || token !== tokens[service])
    throw new DOMException("Canceled music session", "AbortError");
  if (!response.ok) {
    if (response.status === 401 && token) {
      saveToken(service, "");
      epochs[service]++;
      controllers[service].abort();
      controllers[service] = new AbortController();
      clearTracks(service);
      update(service, {
        ...initial(),
        ready: true,
        auth: "signed-out",
        error: "登录已失效，请重新扫码",
      });
    }
    throw new MusicServiceError(
      data.error || "音乐服务请求失败，请重试",
      response.status,
      ["vip", "purchase", "preview", "unavailable"].includes(data.kind)
        ? data.kind
        : undefined,
    );
  }
  return data;
}
type RemoteTrack = {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  artwork?: string;
  duration?: number;
  trackNumber?: number;
  access?: Track["access"];
};
export function thirdPartyTrack(
  service: ThirdPartyService,
  item: RemoteTrack,
): Track {
  return {
    ...item,
    access:
      item.access === "vip" || item.access === "purchase"
        ? item.access
        : undefined,
    id: `${service}:${item.id}`,
    kind: service,
    filename: "",
    size: 0,
    url: `reipod-music://${service}/${encodeURIComponent(item.id)}`,
  };
}
async function pages(
  service: ThirdPartyService,
  action: string,
  body: Record<string, unknown> = {},
) {
  const epoch = epochs[service];
  const tracks: Track[] = [],
    playlists: Playlist[] = [];
  const seen = new Set<number>();
  let offset: number | undefined = 0;
  while (offset !== undefined) {
    if (seen.has(offset) || seen.size >= 10000)
      throw new Error("音乐服务分页未能完成，请重试");
    seen.add(offset);
    const result = await request(service, action, { ...body, offset });
    if (epoch !== epochs[service])
      throw new DOMException("Canceled music session", "AbortError");
    tracks.push(
      ...(result.tracks ?? []).map((t: RemoteTrack) =>
        thirdPartyTrack(service, t),
      ),
    );
    playlists.push(
      ...(result.playlists ?? []).map((p: { id: string; name: string }) => ({
        id: `${service}-playlist:${p.id}`,
        name: p.name,
        trackIds: [],
      })),
    );
    offset = result.nextOffset;
    if (offset !== undefined && (!Number.isSafeInteger(offset) || offset < 0))
      throw new Error("音乐服务返回了无效分页");
  }
  return { tracks, playlists };
}
function clearTracks(service: ThirdPartyService) {
  for (const item of thirdPartyPlayerFor(service).getSnapshot().tracks)
    if (item.kind === service) thirdPartyPlayerFor(service).remove(item.id);
  for (const id of loaded)
    if (id.startsWith(service + "-playlist:")) loaded.delete(id);
}
export async function refreshThirdParty(service: ThirdPartyService) {
  if (states[service].auth !== "authorized") return;
  const epoch = epochs[service];
  update(service, { syncing: true, error: "" });
  try {
    const [library, lists] = await Promise.all([
      pages(service, "library"),
      pages(service, "playlists"),
    ]);
    if (epoch !== epochs[service]) return;
    thirdPartyPlayerFor(service).add(library.tracks);
    library.tracks.forEach((track) =>
      thirdPartyPlayerFor(service).updateTrack(track.id, track),
    );
    update(service, {
      libraryTracks: library.tracks,
      playlists: lists.playlists,
    });
    for (const id of loaded)
      if (id.startsWith(service + "-playlist:")) loaded.delete(id);
  } catch (error) {
    if (epoch === epochs[service]) update(service, { error: message(error) });
  } finally {
    if (epoch === epochs[service]) update(service, { syncing: false });
  }
}
export async function prepareThirdParty(service: ThirdPartyService) {
  if (states[service].auth === "loading") return;
  const epoch = epochs[service];
  update(service, { auth: "loading", error: "" });
  try {
    const result = await request(service, "status");
    if (epoch !== epochs[service]) return;
    if (!result.authorized) {
      saveToken(service, "");
      clearTracks(service);
    }
    update(service, {
      ready: true,
      auth: result.authorized ? "authorized" : "signed-out",
      profile: result.authorized ? result.profile : undefined,
    });
    if (result.authorized) await refreshThirdParty(service);
    else {
      const pending = pendingLogin(service);
      if (pending && usesExternalMusicLogin()) await runThirdPartyLogin(service, "qq", pending);
    }
  } catch (error) {
    if (epoch === epochs[service])
      update(service, { auth: "error", ready: false, error: message(error) });
  }
}
const message = (error: unknown) =>
  error instanceof Error ? error.message : "音乐服务暂不可用，请重试";
export function cancelThirdPartyLogin(service: ThirdPartyService) {
  const key = challenges[service];
  delete challenges[service];
  savePendingLogin(service);
  if (!key && states[service].auth !== "loading") return;
  epochs[service]++;
  controllers[service].abort();
  controllers[service] = new AbortController();
  update(service, {
    qrImage: undefined,
    loginUrl: undefined,
    loginMessage: undefined,
    auth: tokens[service] ? "authorized" : "signed-out",
  });
  if (key) void request(service, "login-cancel", { key }).catch(() => {});
}
export async function authorizeThirdParty(
  service: ThirdPartyService,
  channel = "qq",
) {
  cancelThirdPartyLogin(service);
  await runThirdPartyLogin(service, channel);
}
async function runThirdPartyLogin(service: ThirdPartyService, channel: string, resume?: PendingLogin) {
  const external = usesExternalMusicLogin();
  const epoch = ++epochs[service];
  controllers[service].abort();
  controllers[service] = new AbortController();
  const signal = controllers[service].signal;
  update(service, {
    auth: "loading",
    error: "",
    qrImage: undefined,
    loginUrl: undefined,
    loginMessage: external ? "正在准备 App 授权…" : "正在生成二维码…",
  });
  try {
    const result = resume ?? await request(service, "login-start", { channel: external && service === "qq" ? "qqmusic" : channel });
    if (epoch !== epochs[service]) return;
    challenges[service] = result.key;
    update(service, {
      qrImage: external ? undefined : result.image,
      loginUrl: external ? result.loginUrl : undefined,
      loginMessage: external ? "请在音乐 App 确认授权，然后返回 ReiPod；未打开可再次按中心键。" :
        service === "netease"
          ? "请用网易云音乐 App 扫码确认"
          : channel === "wechat"
            ? "请用微信扫码确认"
            : "请用手机 QQ 扫码确认",
    });
    if (external) {
      if (!result.loginUrl) throw new Error("音乐后端尚未提供 App 授权链接，请更新后端或稍后重试");
      savePendingLogin(service, { key: result.key, loginUrl: result.loginUrl, expires: resume?.expires ?? Date.now() + 180000 });
      if (!resume) void reopenThirdPartyLogin(service);
    }
    for (
      let attempts = 0;
      attempts < 90 && epoch === epochs[service];
      attempts++
    ) {
      await new Promise<void>((resolve) => {
        const done = () => {
          clearTimeout(timer);
          signal.removeEventListener("abort", done);
          resolve();
        };
        const timer = setTimeout(done, 2000);
        signal.addEventListener("abort", done, { once: true });
      });
      if (signal.aborted) return;
      const check = await request(service, "login-check", { key: result.key });
      if (epoch !== epochs[service]) return;
      if (check.status === "authorized" && check.token) {
        saveToken(service, check.token);
        delete challenges[service];
        savePendingLogin(service);
        update(service, {
          auth: "authorized",
          ready: true,
          profile: check.profile,
          qrImage: undefined,
          loginUrl: undefined,
          loginMessage: undefined,
        });
        await refreshThirdParty(service);
        return;
      }
      if (check.status === "scanned")
        update(service, { loginMessage: external ? "请在音乐 App 确认授权，然后返回 ReiPod" : "已扫码，请在手机上确认" });
    }
    throw new Error(external ? "授权已过期，请重新打开登录" : "二维码已过期，请重新扫码");
  } catch (error) {
    if (epoch === epochs[service]) {
      const key = challenges[service];
      delete challenges[service];
      savePendingLogin(service);
      if (key) void request(service, "login-cancel", { key }).catch(() => {});
      update(service, {
        auth: "signed-out",
        qrImage: undefined,
        loginUrl: undefined,
        loginMessage: undefined,
        error: message(error),
      });
    }
  }
}
export async function reopenThirdPartyLogin(service: ThirdPartyService) {
  const url = states[service].loginUrl;
  if (!url) return;
  const epoch = epochs[service];
  try {
    await openMusicLogin(service, url);
    if (epoch === epochs[service]) update(service, { error: "" });
  } catch (error) {
    if (epoch === epochs[service]) update(service, { error: message(error) });
  }
}
export async function signOutThirdParty(service: ThirdPartyService) {
  cancelThirdPartyLogin(service);
  epochs[service]++;
  controllers[service].abort();
  controllers[service] = new AbortController();
  const token = tokens[service];
  // Build the revocation request before clearing the browser's token.
  const revoke = token ? request(service, "logout") : Promise.resolve();
  saveToken(service, "");
  clearTracks(service);
  update(service, { ...initial(), auth: "signed-out", ready: true });
  await revoke.catch(() => {});
}
export async function loadThirdPartyPlaylist(
  service: ThirdPartyService,
  id: string,
) {
  if (loaded.has(id)) return true;
  const epoch = epochs[service];
  update(service, { syncing: true, error: "" });
  try {
    const result = await pages(service, "playlist", {
      id: id.slice(`${service}-playlist:`.length),
    });
    if (epoch !== epochs[service]) return false;
    thirdPartyPlayerFor(service).add(result.tracks);
    result.tracks.forEach((track) =>
      thirdPartyPlayerFor(service).updateTrack(track.id, track),
    );
    loaded.add(id);
    update(service, {
      playlists: states[service].playlists.map((p) =>
        p.id === id ? { ...p, trackIds: result.tracks.map((t) => t.id) } : p,
      ),
    });
    return true;
  } catch (error) {
    if (epoch === epochs[service]) update(service, { error: message(error) });
    return false;
  } finally {
    if (epoch === epochs[service]) update(service, { syncing: false });
  }
}
const searches = { netease: 0, qq: 0 };
export async function searchThirdParty(
  service: ThirdPartyService,
  term: string,
) {
  const version = ++searches[service],
    epoch = epochs[service];
  update(service, { searchResults: [], error: "" });
  if (!term.trim()) return;
  try {
    const result = await request(service, "search", { term });
    if (version !== searches[service] || epoch !== epochs[service]) return;
    const tracks = (result.tracks ?? []).map((t: RemoteTrack) =>
      thirdPartyTrack(service, t),
    );
    thirdPartyPlayerFor(service).add(tracks);
    update(service, { searchResults: tracks });
  } catch (error) {
    if (version === searches[service] && epoch === epochs[service])
      update(service, { error: message(error) });
  }
}

/** Fetch a fresh expiring URL for each playback; the shared Player still owns queue/seek/repeat. */
class ServiceAudio implements AudioPort {
  src = "";
  preload: AudioPort["preload"] = "metadata";
  private audio = new Audio();
  private wanted = false;
  private preparing?: Promise<void>;
  private controller = new AbortController();
  get paused() {
    return this.audio.paused;
  }
  get error() {
    return this.audio.error;
  }
  get duration() {
    return this.audio.duration;
  }
  get currentTime() {
    return this.audio.currentTime;
  }
  set currentTime(value: number) {
    this.audio.currentTime = value;
  }
  get volume() {
    return this.audio.volume;
  }
  set volume(value: number) {
    this.audio.volume = value;
  }
  addEventListener(name: string, fn: EventListener) {
    this.audio.addEventListener(name, fn);
  }
  removeEventListener(name: string, fn: EventListener) {
    this.audio.removeEventListener(name, fn);
  }
  load() {
    if (!this.src || this.controller.signal.aborted || this.preparing) return;
    const url = new URL(this.src);
    if (!isThirdParty(url.hostname)) throw new Error("无效音乐服务");
    this.preparing = request(
      url.hostname,
      "playback",
      { id: decodeURIComponent(url.pathname.slice(1)) },
      this.controller.signal,
    ).then((result) => {
      if (this.controller.signal.aborted) return;
      const media = new URL(result.url);
      if (media.protocol !== "https:")
        throw new Error("音乐服务返回了无效播放链接");
      this.audio.preload = this.preload;
      this.audio.src = media.href;
      this.audio.load();
    });
    void this.preparing.catch(() => {});
  }
  async play() {
    try {
      this.wanted = true;
      this.load();
      await this.preparing;
      if (this.wanted && !this.controller.signal.aborted)
        await this.audio.play();
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotAllowedError")
        throw error;
      throw new PlaybackError(
        message(error),
        error instanceof MusicServiceError ? error.kind : undefined,
      );
    }
  }
  pause() {
    this.wanted = false;
    this.audio.pause();
  }
  removeAttribute(name: string) {
    if (name === "src") {
      this.wanted = false;
      this.src = "";
      this.controller.abort();
      this.audio.removeAttribute("src");
      this.audio.load();
    }
  }
}
const players: Record<ThirdPartyService, Player> = {
  netease: new Player(() => new ServiceAudio()),
  qq: new Player(() => new ServiceAudio()),
};
export const thirdPartyPlayerFor = (service: ThirdPartyService) =>
  players[service];
export const thirdPartyPlayers = Object.values(players);

const lyricRequests = new Map<
  string,
  { epoch: number; promise: Promise<void> }
>();
/** Lyrics stay with their provider/track, never with whichever song finishes loading last. */
export function loadThirdPartyLyrics(track: Track): Promise<void> {
  if (!track.kind || !isThirdParty(track.kind)) return Promise.resolve();
  const service = track.kind,
    player = thirdPartyPlayerFor(service);
  const current = player
    .getSnapshot()
    .tracks.find((item) => item.id === track.id);
  if (!current || current.lyrics || current.lyricsStatus === "empty")
    return Promise.resolve();
  const pending = lyricRequests.get(track.id);
  const epoch = epochs[service];
  if (pending?.epoch === epoch) return pending.promise;
  player.updateTrack(track.id, { lyricsStatus: "loading" });
  let job!: Promise<void>;
  job = (async () => {
    try {
      const result = await request(service, "lyrics", {
        id: track.id.slice(service.length + 1),
      });
      if (epoch !== epochs[service]) return;
      const lyrics = parseLyrics(
        typeof result.lyric === "string" ? result.lyric : "",
        typeof result.yrc === "string" ? result.yrc : "",
      );
      player.updateTrack(track.id, {
        lyrics,
        lyricsStatus: lyrics.length ? "ready" : "empty",
      });
    } catch (error) {
      if (epoch === epochs[service])
        player.updateTrack(track.id, { lyricsStatus: "error" });
    } finally {
      if (lyricRequests.get(track.id)?.promise === job)
        lyricRequests.delete(track.id);
    }
  })();
  lyricRequests.set(track.id, { epoch, promise: job });
  return job;
}
