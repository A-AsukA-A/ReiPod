const domains = [
  "api.tencentmusic.com",
  "y.gtimg.cn",
  "music.163.com",
  "interface.music.163.com",
  "interfacepc.music.163.com",
  "interface3.music.163.com",
  "u.y.qq.com",
  "c.y.qq.com",
  "c6.y.qq.com",
  "y.qq.com",
  "ssl.ptlogin2.qq.com",
  "ssl.ptlogin2.graph.qq.com",
  "xui.ptlogin2.qq.com",
  "ptlogin2.qq.com",
  "graph.qq.com",
  "open.weixin.qq.com",
  "lp.open.weixin.qq.com",
  "login.weixin.qq.com",
  "qrcode.music.163.com",
];
export function allowedURL(value) {
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !u.port &&
      domains.includes(u.hostname)
    );
  } catch {
    return false;
  }
}
export function restoreResponse(reply) {
  const bytes = Uint8Array.from(atob(reply.body), (c) => c.charCodeAt(0));
  const response = new Response(
    [204, 205, 304].includes(reply.status) ? null : bytes,
    { status: reply.status, headers: reply.headers },
  );
  Object.defineProperty(response.headers, "getSetCookie", {
    value: () =>
      reply.headers
        .filter(([key]) => key.toLowerCase() === "set-cookie")
        .map(([, value]) => value),
  });
  return response;
}
export const providerDomains = domains;
