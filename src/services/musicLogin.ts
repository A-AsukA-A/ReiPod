/** Official destinations only; opening them does not establish a ReiPod session. */
export const musicWebsites = {
  netease: "https://music.163.com/",
  qq: "https://y.qq.com/",
} as const;

export function usesExternalMusicLogin() {
  return (
    window.__REIPOD_SERVICE_VERSION__ === 1 ||
    /Android|iPhone|iPod|iPad|Mobile/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export async function openMusicLogin(service: keyof typeof musicWebsites) {
  if (window.__REIPOD_SERVICE_VERSION__ === 1) {
    const bridge = (window as unknown as {
      webkit?: { messageHandlers?: {
        reipodService?: { postMessage: (body: unknown) => Promise<unknown> };
      } };
    }).webkit?.messageHandlers?.reipodService;
    if (!bridge) throw new Error("App 登录跳转不可用，请更新 App");
    await bridge.postMessage({ version: 1, service, action: "open-login" });
    return;
  }
  // Called synchronously from the wheel action, before any network request.
  const destination = window.open("about:blank", "_blank");
  if (!destination) {
    window.location.assign(musicWebsites[service]);
    return;
  }
  destination.opener = null;
  destination.location.replace(musicWebsites[service]);
}
