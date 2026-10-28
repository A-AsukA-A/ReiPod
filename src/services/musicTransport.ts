import type { ThirdPartyService } from "./thirdPartyMusic";
type Reply = { status: number; data: Record<string, unknown> };
type Request = {
  version: 1;
  service: ThirdPartyService;
  action: string;
  body: Record<string, unknown>;
  token: string;
};
declare global {
  interface Window {
    __REIPOD_SERVICE_VERSION__?: number;
  }
}
const nativeBridge = () =>
  (
    window as unknown as {
      webkit?: {
        messageHandlers?: {
          reipodService?: { postMessage: (request: Request) => Promise<Reply> };
        };
      };
    }
  ).webkit?.messageHandlers?.reipodService;
function extensionRequest(
  request: Request,
  signal: AbortSignal,
  timeout = 30000,
): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    const finish = (error?: Error, reply?: Reply) => {
      clearTimeout(timer);
      window.removeEventListener("message", receive);
      signal.removeEventListener("abort", abort);
      if (error) reject(error);
      else resolve(reply!);
    };
    const abort = () =>
      finish(new DOMException("Canceled music request", "AbortError"));
    const receive = (event: MessageEvent) => {
      if (
        event.source !== window ||
        event.origin !== location.origin ||
        event.data?.channel !== "reipod-music-reply" ||
        event.data.id !== id
      )
        return;
      const reply = event.data.reply;
      if (
        !reply ||
        !Number.isInteger(reply.status) ||
        reply.status < 200 ||
        reply.status > 599 ||
        typeof reply.data !== "object" ||
        !reply.data
      ) {
        finish(new Error("音乐扩展返回无效响应"));
        return;
      }
      finish(undefined, reply);
    };
    const timer = setTimeout(
      () =>
        finish(
          new Error(
            request.action === "bridge-status"
              ? "请安装并启用 ReiPod 音乐扩展，然后重试连接"
              : "音乐扩展响应超时，请重试",
          ),
        ),
      timeout,
    );
    window.addEventListener("message", receive);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) {
      abort();
      return;
    }
    window.postMessage(
      { channel: "reipod-music-request", id, request },
      location.origin,
    );
  });
}
export function useMusicBridge() {
  if (typeof window === "undefined") return false;
  if (window.__REIPOD_SERVICE_VERSION__ === 1) return true;
  // Keep explicit self-hosted deployments and local development operational.
  return !import.meta.env.VITE_MUSIC_API_URL && location.protocol === "https:";
}
export async function bridgeMusicRequest(
  service: ThirdPartyService,
  action: string,
  body: Record<string, unknown>,
  token: string,
  signal: AbortSignal,
) {
  const request: Request = { version: 1, service, action, body, token };
  let reply: Reply;
  if (window.__REIPOD_SERVICE_VERSION__ === 1) {
    const bridge = nativeBridge();
    if (!bridge) throw new Error("App 内置音乐服务不可用，请更新 App");
    signal.throwIfAborted();
    reply = await bridge.postMessage(request);
    signal.throwIfAborted();
  } else {
    const status = await extensionRequest(
      { ...request, action: "bridge-status", token: "", body: {} },
      signal,
      1000,
    );
    if (status.status !== 200)
      throw new Error(String(status.data.error ?? "音乐扩展不可用"));
    reply = await extensionRequest(request, signal);
    if (
      reply.status >= 400 &&
      typeof reply.data.error === "string" &&
      typeof status.data.extensionVersion === "string"
    ) {
      reply.data.error = `${reply.data.error}（扩展 ${status.data.extensionVersion}）`;
    }
  }
  return Response.json(reply.data, { status: reply.status });
}
