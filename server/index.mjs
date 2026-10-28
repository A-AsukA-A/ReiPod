import http from "node:http";
import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, extname } from "node:path";
import { createProviders, ServiceError } from "./providers.mjs";
import { openVault } from "./vault.mjs";

process.env.ENABLE_GENERAL_UNBLOCK = "false";
process.env.ENABLE_RANDOM_CN_IP = "false";
process.env.QQ_DISABLE_UPDATE_CHECK = "true";
const require = createRequire(import.meta.url);
const netease = require("@neteasecloudmusicapienhanced/api");
const { handleRequest } = await import(
  "@yakult-green-tea/qq-music-api/serverless"
);
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const vault = await openVault(resolve(root, ".local/music-sessions"));
const qqEnv = { QQ_SESSION_SECRET: vault.key.toString("hex") };
const providers = createProviders(netease, async (path, params = {}, token) => {
  const url = new URL(path, "https://reipod-music.local");
  for (const [key, value] of Object.entries(params))
    if (value !== undefined) url.searchParams.set(key, String(value));
  const rawToken = token?.startsWith("qqmusic_session=")
    ? token.slice("qqmusic_session=".length).split(";")[0]
    : token;
  const response = await handleRequest(
    new Request(url, { headers: rawToken ? { "X-QQ-Session": rawToken } : {} }),
    qqEnv,
  );
  const body = await response.json();
  if (!response.ok)
    throw new ServiceError(
      body.failureHint || body.message || "QQ 音乐请求失败",
      response.status === 401 ? 401 : 502,
    );
  return body;
});
const pending = new Map();
const inFlightChecks = new Map();
const port = Number(process.env.REIPOD_MUSIC_PORT ?? 3210);
const host = process.env.REIPOD_MUSIC_HOST ?? "127.0.0.1";
const origins = new Set(
  (
    process.env.REIPOD_MUSIC_ORIGINS ??
    `http://127.0.0.1:${port},http://localhost:${port},http://127.0.0.1:5173,http://localhost:5173`
  ).split(","),
);
const json = (res, status, body) => {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
};
async function bodyOf(req) {
  let text = "";
  for await (const chunk of req) {
    text += chunk;
    if (text.length > 16384) throw new ServiceError("请求过大", 413);
  }
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new ServiceError("无效请求", 400);
  }
}
const server = http.createServer(async (req, res) => {
  try {
    const origin = req.headers.origin;
    if (origin && !origins.has(origin))
      throw new ServiceError("未允许此网页访问音乐服务", 403);
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      });
      res.end();
      return;
    }
    const url = new URL(req.url, "http://localhost");
    const route = url.pathname.match(/^\/api\/music\/(netease|qq)\/([a-z-]+)$/);
    if (route) {
      if (req.method !== "POST") throw new ServiceError("请使用 POST", 405);
      const [, source, action] = route;
      const data = await bodyOf(req);
      const id = req.headers.authorization?.replace(/^Bearer /, "");
      const session = vault.sessions.get(id);
      if (session && session.source !== source)
        throw new ServiceError("登录会话与音乐服务不匹配", 401);
      if (action === "status") {
        if (!session) {
          json(res, 200, { authorized: false });
          return;
        }
        const profile = await providers.profile(source, session);
        json(res, 200, { authorized: true, profile });
        return;
      }
      if (action === "login-start") {
        for (const [key, value] of pending)
          if (value.expires < Date.now()) pending.delete(key);
        if (pending.size >= 20)
          throw new ServiceError("登录请求过多，请稍后重试", 429);
        const challenge = await providers.start(source, data.channel);
        if (
          typeof challenge.image !== "string" ||
          !/^data:image\/(png|jpeg|svg\+xml);/.test(challenge.image)
        )
          throw new ServiceError("二维码暂不可用，请重试");
        const key = randomBytes(24).toString("hex");
        pending.set(key, {
          source,
          upstreamKey: challenge.key,
          expires: Date.now() + 180000,
        });
        json(res, 200, { key, image: challenge.image });
        return;
      }
      if (action === "login-cancel") {
        const item = pending.get(data.key);
        if (item?.source === source) {
          pending.delete(data.key);
          await providers.cancel(source, item.upstreamKey).catch(() => {});
        }
        json(res, 200, {});
        return;
      }
      if (action === "login-check") {
        const item = pending.get(data.key);
        if (!item || item.source !== source || item.expires < Date.now())
          throw new ServiceError("登录二维码已过期，请重新生成", 410);
        let check = inFlightChecks.get(data.key);
        if (!check) {
          check = (async () => {
            const result = await providers.check(source, item.upstreamKey);
            if (result.code !== 803) {
              if (![801, 802].includes(result.code))
                throw new ServiceError(
                  "二维码已过期或登录未完成，请重新扫码",
                  410,
                );
              return { status: result.code === 802 ? "scanned" : "waiting" };
            }
            if (!result.cookie || pending.get(data.key) !== item)
              throw new ServiceError("登录已取消，请重新扫码", 410);
            const candidate = { source, cookie: result.cookie };
            candidate.profile = await providers.profile(source, candidate);
            if (pending.get(data.key) !== item)
              throw new ServiceError("登录已取消，请重新扫码", 410);
            const token = randomBytes(32).toString("hex");
            vault.sessions.set(token, candidate);
            await vault.save();
            pending.delete(data.key);
            return { status: "authorized", token, profile: candidate.profile };
          })();
          inFlightChecks.set(data.key, check);
        }
        try {
          json(res, 200, await check);
        } finally {
          inFlightChecks.delete(data.key);
        }
        return;
      }
      if (action === "logout") {
        if (session) {
          vault.sessions.delete(id);
          await vault.save();
          await providers.logout(source, session).catch(() => {});
        }
        json(res, 200, {});
        return;
      }
      if (
        data.offset !== undefined &&
        (!Number.isSafeInteger(data.offset) || data.offset < 0)
      )
        throw new ServiceError("无效分页位置", 400);
      if (
        ["library", "playlists", "playlist", "playback", "lyrics"].includes(
          action,
        ) &&
        !session
      )
        throw new ServiceError("请先扫码登录", 401);
      if (
        action === "playlist" &&
        !(source === "qq" ? /^(?:(?:own|public):)?\d+$/ : /^\d+$/).test(
          String(data.id ?? ""),
        )
      )
        throw new ServiceError("无效歌单标识", 400);
      json(res, 200, await providers.read(source, action, data, session));
      return;
    }
    if (req.method !== "GET") throw new ServiceError("未找到页面", 404);
    const webRoot = resolve(root, "dist");
    const file = resolve(
      webRoot,
      "." +
        decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname),
    );
    if (!file.startsWith(webRoot + "/"))
      throw new ServiceError("未找到页面", 404);
    const types = {
      ".html": "text/html",
      ".js": "application/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".svg": "image/svg+xml",
      ".woff2": "font/woff2",
      ".mp3": "audio/mpeg",
      ".txt": "text/plain",
    };
    const content = await readFile(file);
    res.writeHead(200, {
      "Content-Type": types[extname(file)] ?? "application/octet-stream",
    });
    res.end(content);
  } catch (error) {
    json(
      res,
      error instanceof ServiceError
        ? error.status
        : error.code === "ENOENT"
          ? 404
          : 502,
      {
        kind: error instanceof ServiceError ? error.kind : undefined,
        error:
          error instanceof ServiceError
            ? error.message
            : "音乐服务暂不可用，请稍后重试",
      },
    );
  }
});
server.requestTimeout = 60000;
server.listen(port, host, () =>
  console.log(`ReiPod music service: http://${host}:${port}`),
);
