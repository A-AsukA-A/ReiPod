import { ServiceError } from "../server/providers.mjs";
import { handleRequest } from "@yakult-green-tea/qq-music-api/serverless";
import { createNetEase } from "./netease.mjs";
import { createMusicService, createProviders } from "./service.mjs";

export async function createRuntime({ fetcher, storage, secret }) {
  // This module runs only in the extension worker or an isolated WKContentWorld.
  // QQ's serverless adapter uses global fetch; never install this in the page world.
  globalThis.fetch = fetcher;
  const providers = createProviders(
    createNetEase(fetcher),
    async (path, params = {}, token) => {
      const url = new URL(path, "https://reipod-music.local");
      for (const [key, value] of Object.entries(params))
        if (value !== undefined) url.searchParams.set(key, String(value));
      const raw = token?.startsWith("qqmusic_session=")
        ? token.slice("qqmusic_session=".length).split(";")[0]
        : token;
      const response = await handleRequest(
        new Request(url, { headers: raw ? { "X-QQ-Session": raw } : {} }),
        { QQ_SESSION_SECRET: secret },
      );
      const body = await response.json();
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
