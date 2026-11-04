const loopback = new Set(["localhost", "127.0.0.1", "[::1]"]);
export function musicEndpoint(service: string, action: string, pageURL: string, configured?: string) {
  const page = new URL(pageURL);
  const base = configured || (loopback.has(page.hostname)
    ? new URL("/api/music/", page).href
    : "https://julyblog.party/api/music/");
  const root = new URL(base.endsWith("/") ? base : base + "/", page);
  if (root.protocol !== "https:" && !(root.protocol === "http:" && loopback.has(root.hostname)))
    throw new Error("请为音乐服务配置 HTTPS 接口地址");
  return new URL(`${service}/${action}`, root);
}
