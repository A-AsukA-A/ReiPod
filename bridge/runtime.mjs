import { createQQRelay } from "../server/qq-relay.mjs";
import { createProviders, ServiceError } from "../server/providers.mjs";
import { handleRequest } from "@yakult-green-tea/qq-music-api/serverless";
import { createNetEase } from "./netease.mjs";
import { createMusicService } from "./service.mjs";

export async function createRuntime({ fetcher, storage, secret }) {
  // This module runs only in an isolated WKContentWorld.
  // QQ's serverless adapter uses global fetch; never install this in the page world.
  let qqNetworkFailure;
  globalThis.fetch = async (url, options) => {
    try {
      return await fetcher(url, options);
    } catch (error) {
      const target = new URL(String(url));
      qqNetworkFailure = `QQ 音乐请求失败：${target.hostname}${target.pathname}，请重试或切换微信扫码。`;
      throw error;
    }
  };
  const qqRelay = createQQRelay();
  const providers = createProviders(
    createNetEase(fetcher, { deviceId: secret.slice(0, 32) }),
    async (path, params = {}, token) => {
      const appLogin = params.channel === "qqmusic" || String(params.key ?? "").startsWith("app:");
      if (String(params.key ?? "").startsWith("app:")) params = { ...params, key: params.key.slice(4) };
      const url = new URL(path, "https://reipod-music.local");
      for (const [key, value] of Object.entries(params))
        if (value !== undefined) url.searchParams.set(key, String(value));
      const raw = token?.startsWith("qqmusic_session=")
        ? token.slice("qqmusic_session=".length).split(";")[0]
        : token;
      qqNetworkFailure = undefined;
      const response = await handleRequest(
        new Request(url, { headers: raw ? { "X-QQ-Session": raw } : {} }),
        { QQ_SESSION_SECRET: secret },
        appLogin ? { qqRelay } : {},
      );
      const body = await response.json();
      if (path === "/login/qr/check" && body.code === 801 && qqNetworkFailure)
        throw new ServiceError(qqNetworkFailure, 502);
      if (!response.ok) {
        throw new ServiceError(
          body.failureHint || body.message || "QQ 音乐请求失败",
          response.status === 401 ? 401 : 502,
        );
      }
      return body;
    },
  );
  return createMusicService({ providers, storage });
}
