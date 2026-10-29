import { qrLoginURL, resolveQQLoginURL } from "./login-links.mjs";
export class ServiceError extends Error {
  constructor(message, status = 502, kind) {
    super(message);
    this.status = status;
    this.kind = kind;
  }
}
// A missing URL alone does not prove that a subscription is required.
export function playbackRestriction(source, entry) {
  const key = entry?.restriction?.key;
  const hint = entry?.restriction?.hint?.key;
  if (
    key === "purchase_required" ||
    hint === "playback.maybe-music-pack" ||
    (source === "netease" && Number(entry?.fee) === 4)
  )
    return new ServiceError(
      "这首歌需要单独购买或付费音乐包，请在音乐 App 中确认购买权益后重试。",
      422,
      "purchase",
    );
  if (
    key === "membership_required" ||
    hint === "playback.maybe-membership" ||
    (source === "netease" && [1, 8].includes(Number(entry?.fee)))
  )
    return new ServiceError(
      "这首 VIP 歌曲当前未获完整播放权限，请在音乐 App 中确认会员权益后重试。",
      422,
      "vip",
    );
  if (entry?.freeTrialInfo || entry?.preview || key === "preview_only")
    return new ServiceError(
      "当前账号仅能试听这首歌，ReiPod 暂不播放试听片段。请在音乐 App 中确认完整播放权限。",
      422,
      "preview",
    );
  if (
    key === "region_restricted" ||
    hint === "playback.maybe-region-restricted"
  )
    return new ServiceError(
      "这首歌可能受地区限制，请在音乐 App 中确认当前地区是否可播放。",
      422,
      "unavailable",
    );
  return new ServiceError(
    "平台暂未提供完整播放链接，可能涉及 VIP、单曲购买、地区或版权限制。请在音乐 App 中确认后重试。",
    422,
    "unavailable",
  );
}
export function mediaURL(value) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol)) return undefined;
    url.protocol = "https:";
    return url.href;
  } catch {
    return undefined;
  }
}
export function track(source, song) {
  const qq = source === "qq";
  const album = qq ? song.album : (song.al ?? song.album);
  const albumMID = album?.mid ?? song.albummid;
  const artists = qq ? song.singer : (song.ar ?? song.artists);
  const id = String(qq ? (song.mid ?? song.songmid ?? "") : (song.id ?? ""));
  if (!/^[a-zA-Z0-9]+$/.test(id))
    throw new ServiceError("音乐服务返回了无效歌曲标识");
  // Catalog labels describe the song, not the signed-in user's current entitlement.
  const access = qq
    ? Number(song.pay?.pay_play ?? song.pay?.payplay) === 1
      ? "vip"
      : undefined
    : Number(song.fee) === 4
      ? "purchase"
      : [1, 8].includes(Number(song.fee))
        ? "vip"
        : undefined;
  return {
    id,
    title: song.name ?? song.title ?? song.songname ?? "未知歌曲",
    artist: artists
      ?.map((a) => a.name)
      .filter(Boolean)
      .join(" / "),
    album: album?.name ?? song.albumname,
    duration: qq
      ? (song.interval ?? 0)
      : (song.dt ?? song.duration ?? 0) / 1000,
    artwork: mediaURL(
      qq
        ? albumMID
          ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${albumMID}.jpg`
          : undefined
        : album?.picUrl,
    ),
    trackNumber: song.no ?? song.index_album ?? 0,
    ...(access ? { access } : {}),
  };
}
const next = (offset, size, total) =>
  offset + size < total ? offset + size : undefined;

/** Only expose read/play operations. No unlock, replacement-source or account-write routes. */
export function createProviders(netease, qqRequest) {
  async function net(name, args = {}, session) {
    try {
      const result = await netease[name]({
        ...args,
        cookie: session?.cookie,
        timeout: 20000,
        unblock: "false",
        randomCNIP: false,
      });
      const body = result.body;
      if (
        result.status >= 400 ||
        (body.code && ![200, 800, 801, 802, 803].includes(body.code))
      )
        throw new ServiceError(
          body.message || "网易云音乐请求失败",
          body.code === 301 ? 401 : 502,
        );
      return body;
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      throw new ServiceError("网易云音乐暂不可用，请稍后重试");
    }
  }
  const qq = (path, args, session) => qqRequest(path, args, session?.cookie);
  const profile = async (source, session) => {
    if (source === "netease") {
      const data = (await net("login_status", {}, session)).data;
      if (!data?.account?.id)
        throw new ServiceError("网易云音乐登录已失效，请重新扫码", 401);
      return {
        id: String(data.account.id),
        name: data.profile?.nickname ?? "网易云用户",
        avatar: mediaURL(data.profile?.avatarUrl),
      };
    }
    const data = (await qq("/login/status", {}, session)).data?.profile;
    if (!data) throw new ServiceError("QQ 音乐登录已失效，请重新扫码", 401);
    return {
      id: String(data.str_musicid ?? data.musicid ?? ""),
      name: data.nickname ?? data.nick ?? "QQ 音乐用户",
      avatar: mediaURL(data.avatarUrl),
    };
  };
  return {
    profile,
    async start(source, channel) {
      if (source === "netease") {
        const key = (await net("login_qr_key")).data?.unikey;
        if (!key) throw new ServiceError("未能生成网易云音乐登录二维码");
        const image = (await net("login_qr_create", { key, qrimg: true })).data
          ?.qrimg;
        return { key, image, loginUrl: `https://music.163.com/login?codekey=${encodeURIComponent(key)}` };
      }
      if (!["qq", "wechat", "qqmusic"].includes(channel)) channel = "qq";
      const key = (await qq("/login/qr/key", { channel })).data?.unikey;
      if (!key) throw new ServiceError("未能生成 QQ 音乐登录二维码");
      const image = (await qq("/login/qr/create", { key: channel === "qqmusic" ? `app:${key}` : key })).data?.qrimg;
      let loginUrl;
      if (channel === "qqmusic") {
        try { loginUrl = await resolveQQLoginURL(qrLoginURL(image)); } catch { /* Desktop QR remains usable. */ }
      }
      return { key: channel === "qqmusic" ? `app:${key}` : key, image, loginUrl };
    },
    async check(source, key) {
      const body =
        source === "netease"
          ? await net("login_qr_check", { key })
          : await qq("/login/qr/check", { key });
      return { code: body.code, cookie: body.cookie, message: body.message };
    },
    async cancel(source, key) {
      if (source === "qq") await qq("/login/qr/cancel", { key });
    },
    async logout(source, session) {
      if (source === "netease") await net("logout", {}, session);
      else await qq("/logout", {}, session);
    },
    async read(source, action, params, session) {
      const offset = params.offset ?? 0;
      const limit = 100;
      if (action === "search") {
        const term = String(params.term ?? "")
          .trim()
          .slice(0, 60);
        if (!term) return { tracks: [] };
        const body =
          source === "netease"
            ? await net(
                "cloudsearch",
                { keywords: term, type: 1, limit: 20 },
                session,
              )
            : await qq(
                "/search",
                { keyword: term, type: "song", page: 1, limit: 20 },
                session,
              );
        return {
          tracks: (source === "netease"
            ? (body.result?.songs ?? [])
            : (body.items ?? [])
          ).map((s) => track(source, s)),
        };
      }
      if (action === "lyrics" || action === "playback") {
        const id = String(params.id ?? "");
        if (!/^[a-zA-Z0-9]+$/.test(id))
          throw new ServiceError("无效歌曲标识", 400);
        if (action === "lyrics") {
          if (source === "netease") {
            let body;
            try {
              body = await net("lyric_new", { id }, session);
            } catch (error) {
              if (error.status === 401) throw error;
              body = await net("lyric", { id }, session);
            }
            return {
              lyric: typeof body.lrc?.lyric === "string" ? body.lrc.lyric : "",
              ...(typeof body.yrc?.lyric === "string" ? { yrc: body.yrc.lyric } : {}),
            };
          }
          const body = (await qq("/getLyric", { songmid: id }, session))
            .response;
          if (!body || body.code !== 0)
            throw new ServiceError("歌词暂时无法读取，请稍后重试");
          return { lyric: typeof body.lyric === "string" ? body.lyric : "" };
        }
        const entry =
          source === "netease"
            ? (await net("song_url", { id, br: 128000 }, session)).data?.[0]
            : (await qq(`/getMusicPlay/${id}`, { quality: "128" }, session))
                .data?.playUrl?.[id];
        const url = mediaURL(entry?.url);
        if (!url || entry?.freeTrialInfo || entry?.preview) {
          // Older URL responses sometimes omit fee. Read same-account metadata only on failure.
          let detail;
          if (
            source === "netease" &&
            entry?.fee === undefined &&
            netease.song_detail
          ) {
            try {
              detail = (await net("song_detail", { ids: id }, session))
                .songs?.[0];
            } catch (error) {
              if (error.status === 401) throw error;
            }
          }
          throw playbackRestriction(source, { ...detail, ...entry });
        }
        return { url };
      }
      if (!session) throw new ServiceError("请先扫码登录", 401);
      if (action === "playlists") {
        if (source === "netease") {
          const body = await net(
            "user_playlist",
            { uid: session.profile.id, offset, limit },
            session,
          );
          const lists = body.playlist ?? [];
          return {
            playlists: lists.map((p) => ({ id: String(p.id), name: p.name })),
            nextOffset:
              body.more && lists.length ? offset + lists.length : undefined,
          };
        }
        const body = await qq(
          "/user/playlist",
          offset ? { favoriteOffset: offset } : {},
          session,
        );
        return {
          playlists: (body.playlist ?? [])
            .map((p) => {
              const own = p.tid && String(p.tid) !== "0";
              const id = String(own ? p.tid : (p.dissid ?? p.diss_id ?? ""));
              return {
                id: `${own ? "own" : "public"}:${id}`,
                name: p.title ?? p.dissname ?? p.name ?? "未命名歌单",
              };
            })
            .filter((p) => /^(?:own|public):[1-9]\d*$/.test(p.id)),
          nextOffset: body.nextFavoriteOffset,
        };
      }
      if (action !== "library" && action !== "playlist")
        throw new ServiceError("未知音乐操作", 404);
      if (source === "qq") {
        if (action === "playlist" && String(params.id).startsWith("public:")) {
          const body = await qq(
            `/getSongListDetail/${params.id.slice("public:".length)}`,
            {},
            session,
          );
          if (body.response?.code !== 0)
            throw new ServiceError(
              "QQ 音乐暂未允许读取这个收藏歌单，请稍后重试",
            );
          const songs = body.response.cdlist?.[0]?.songlist;
          if (!Array.isArray(songs))
            throw new ServiceError("QQ 音乐歌单内容暂不可用");
          return {
            tracks: songs
              .slice(offset, offset + limit)
              .map((s) => track(source, s)),
            nextOffset: next(
              offset,
              Math.min(limit, Math.max(0, songs.length - offset)),
              songs.length,
            ),
          };
        }
        const body = await qq(
          action === "library" ? "/user/liked-songs" : "/user/playlist-detail",
          {
            offset,
            limit,
            ...(action === "playlist"
              ? { tid: String(params.id).replace(/^own:/, "") }
              : {}),
          },
          session,
        );
        const songs = body.songs ?? [];
        return {
          tracks: songs.map((s) => track(source, s)),
          nextOffset:
            body.more && songs.length ? offset + songs.length : undefined,
        };
      }
      let ids;
      if (action === "library")
        ids =
          (await net("likelist", { uid: session.profile.id }, session)).ids ??
          [];
      else {
        const playlist = (
          await net("playlist_detail", { id: params.id }, session)
        ).playlist;
        ids = playlist?.trackIds?.map((t) => t.id) ?? [];
      }
      const selected = ids.slice(offset, offset + limit);
      if (!selected.length) return { tracks: [] };
      const songs =
        (await net("song_detail", { ids: selected.join(",") }, session))
          .songs ?? [];
      const byID = new Map(songs.map((s) => [String(s.id), s]));
      const ordered = selected.map((id) => byID.get(String(id)));
      if (ordered.some((s) => !s))
        throw new ServiceError("歌单部分歌曲暂不可读取，请刷新重试");
      return {
        tracks: ordered.map((s) => track(source, s)),
        nextOffset: next(offset, selected.length, ids.length),
      };
    },
  };
}
