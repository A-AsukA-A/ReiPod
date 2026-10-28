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
export function useMusicBridge() {
  return typeof window !== "undefined" && window.__REIPOD_SERVICE_VERSION__ === 1;
}
export async function bridgeMusicRequest(
  service: ThirdPartyService,
  action: string,
  body: Record<string, unknown>,
  token: string,
  signal: AbortSignal,
) {
  const request: Request = { version: 1, service, action, body, token };
  const bridge = nativeBridge();
  if (!bridge) throw new Error("App 内置音乐服务不可用，请更新 App");
  signal.throwIfAborted();
  const reply = await bridge.postMessage(request);
  signal.throwIfAborted();
  return Response.json(reply.data, { status: reply.status });
}
