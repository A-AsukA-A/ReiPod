import { ServiceError } from "../server/providers.mjs";
const actions = new Set([
  "status",
  "login-start",
  "login-check",
  "login-cancel",
  "logout",
  "library",
  "playlists",
  "playlist",
  "search",
  "lyrics",
  "playback",
]);
export function validateOperation(request) {
  if (
    !request ||
    request.version !== 1 ||
    !["netease", "qq"].includes(request.service) ||
    !actions.has(request.action)
  )
    throw new ServiceError("无效音乐桥接请求", 400);
  if (JSON.stringify(request).length > 16384)
    throw new ServiceError("音乐请求过大", 400);
  const body = request.body ?? {};
  if (typeof body !== "object" || Array.isArray(body))
    throw new ServiceError("无效音乐参数", 400);
  if (
    body.offset !== undefined &&
    (!Number.isSafeInteger(body.offset) || body.offset < 0)
  )
    throw new ServiceError("无效分页位置", 400);
  if (
    request.action === "playlist" &&
    !(request.service === "qq" ? /^(?:(?:own|public):)?\d+$/ : /^\d+$/).test(
      String(body.id ?? ""),
    )
  )
    throw new ServiceError("无效歌单标识", 400);
  return { ...request, body };
}
const randomID = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
// Storage belongs to the privileged host; platform cookies never cross the UI bridge.
export function createMusicService({ providers, storage, now = Date.now }) {
  let queue = Promise.resolve();
  const execute = async (raw) => {
    const { service: source, action, body, token } = validateOperation(raw);
    const state = (await storage.load()) ?? { sessions: {}, pending: {} };
    state.sessions ??= {};
    state.pending ??= {};
    for (const [key, item] of Object.entries(state.pending))
      if (item.expires < now()) delete state.pending[key];
    const session = token ? state.sessions[token] : undefined;
    if (session && session.source !== source)
      throw new ServiceError("登录会话与音乐服务不匹配", 401);
    const save = () => storage.save(state);
    if (action === "status") {
      if (!session) return { authorized: false };
      try {
        return {
          authorized: true,
          profile: await providers.profile(source, session),
        };
      } catch (error) {
        if (error.status === 401) {
          delete state.sessions[token];
          await save();
        }
        throw error;
      }
    }
    if (action === "login-start") {
      if (Object.keys(state.pending).length >= 20)
        throw new ServiceError("登录请求过多，请稍后重试", 429);
      const challenge = await providers.start(source, body.channel);
      if (!/^data:image\/(png|jpeg|svg\+xml);/.test(challenge.image ?? ""))
        throw new ServiceError("二维码暂不可用");
      const key = randomID();
      state.pending[key] = {
        source,
        key: challenge.key,
        expires: now() + 180000,
      };
      await save();
      return { key, image: challenge.image };
    }
    if (action === "login-check" || action === "login-cancel") {
      const item = state.pending[body.key];
      if (!item || item.source !== source) {
        if (action === "login-cancel") return {};
        throw new ServiceError("登录二维码已过期，请重新生成", 410);
      }
      if (action === "login-cancel") {
        if (item.token) delete state.sessions[item.token];
        delete state.pending[body.key];
        await save();
        await providers.cancel(source, item.key).catch(() => {});
        return {};
      }
      if (item.token && state.sessions[item.token])
        return {
          status: "authorized",
          token: item.token,
          profile: state.sessions[item.token].profile,
        };
      const check = await providers.check(source, item.key);
      if (check.code !== 803) {
        if (![801, 802].includes(check.code))
          throw new ServiceError("二维码已过期或登录未完成，请重新扫码", 410);
        return { status: check.code === 802 ? "scanned" : "waiting" };
      }
      if (!check.cookie) throw new ServiceError("平台未返回登录会话");
      const candidate = { source, cookie: check.cookie };
      // Confirmation cookies may precede the account endpoint becoming ready.
      for (let attempt = 0; ; attempt++) {
        try {
          candidate.profile = await providers.profile(source, candidate);
          break;
        } catch (error) {
          if (source !== "netease" || error.status !== 401 || attempt >= 2)
            throw error;
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
      const id = randomID();
      state.sessions[id] = candidate;
      item.token = id;
      await save();
      return { status: "authorized", token: id, profile: candidate.profile };
    }
    if (action === "logout") {
      if (session) {
        delete state.sessions[token];
        await save();
        await providers.logout(source, session).catch(() => {});
      }
      return {};
    }
    if (action !== "search" && !session)
      throw new ServiceError("请先扫码登录", 401);
    try {
      return await providers.read(source, action, body, session);
    } catch (error) {
      if (error.status === 401 && session) {
        delete state.sessions[token];
        await save();
      }
      throw error;
    }
  };
  return (raw) => {
    // Serialize read/modify/save transactions, including cancellation and revocation.
    const work = queue.then(() => execute(raw));
    queue = work.catch(() => {});
    return work.then(
      (data) => ({ status: 200, data }),
      (error) => ({
        status: error instanceof ServiceError ? error.status : 502,
        data: {
          error:
            error instanceof ServiceError
              ? error.message
              : "音乐服务暂不可用，请稍后重试",
          kind: error.kind,
        },
      }),
    );
  };
}
