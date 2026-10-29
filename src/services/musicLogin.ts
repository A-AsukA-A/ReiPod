export const musicWebsites = {
  netease: "https://music.163.com/",
  qq: "https://y.qq.com/",
} as const;
export function usesExternalMusicLogin() {
  return window.__REIPOD_SERVICE_VERSION__ === 1 ||
    /Android|iPhone|iPod|iPad|Mobile/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}
export function musicLoginTarget(service: keyof typeof musicWebsites, raw: string) {
  const url = new URL(raw);
  if (url.username || url.password || url.port || raw.length > 8192) throw new Error("无效平台授权链接");
  if (service === "netease" && url.protocol === "https:" && url.hostname === "music.163.com" && url.pathname === "/login" && url.searchParams.get("codekey"))
    // The official mobile bundle wraps HTTPS destinations with this openurl route.
    return `orpheus://openurl?url=${encodeURIComponent(url.href)}`;
  if (service === "qq" && url.protocol === "qqmusic:" && url.hostname === "qq.com" && url.pathname === "/other/openid") return url.href;
  if (service === "qq" && url.protocol === "https:" && url.hostname === "y.qq.com" && url.pathname === "/m/client/qr_code_login/authorize.html")
    return `qqmusic://qq.com/ui/openUrl?p=${encodeURIComponent(JSON.stringify({ url: url.href, _from_outside: "1" }))}`;
  throw new Error("平台尚未提供可用的 App 授权链接，请重试");
}
export async function openMusicLogin(service: keyof typeof musicWebsites, loginUrl: string) {
  const target = musicLoginTarget(service, loginUrl);
  if (window.__REIPOD_SERVICE_VERSION__ === 1) {
    const bridge = (window as unknown as { webkit?: { messageHandlers?: {
      reipodService?: { postMessage: (body: unknown) => Promise<unknown> };
    } } }).webkit?.messageHandlers?.reipodService;
    if (!bridge) throw new Error("App 登录跳转不可用，请更新 App");
    await bridge.postMessage({ version: 1, service, action: "open-login", loginUrl });
    return;
  }
  // Keep this ReiPod document alive so its bound login-check can finish on return.
  const popup = window.open("about:blank", "_blank");
  if (!popup) throw new Error("浏览器拦截了打开 App，请允许弹出窗口后再次按中心键");
  popup.opener = null;
  // Browsers cannot query installation. Fall back only while the launch tab stays visible.
  if (popup.document) {
    const timer = window.setTimeout(() => {
      try { if (!popup.closed && popup.document.visibilityState === "visible") popup.location.replace(musicWebsites[service]); } catch { /* The provider took over navigation. */ }
    }, 2000);
    popup.document.addEventListener("visibilitychange", () => {
      if (popup.document.hidden) window.clearTimeout(timer);
    }, { once: true });
    popup.addEventListener("pagehide", () => window.clearTimeout(timer), { once: true });
  }
  popup.location.replace(target);
}
