import jsQR from "jsqr";
import { decode } from "fast-png";

// Decode only the bounded, upstream-provided PNG; never fetch a URL supplied by the UI.
export function qrLoginURL(image) {
  if (typeof image !== "string" || !image.startsWith("data:image/png;base64,") || image.length > 1_000_000) return;
  const bytes = Uint8Array.from(atob(image.split(",")[1]), c => c.charCodeAt(0));
  if (bytes.length < 24) return;
  const header = new DataView(bytes.buffer);
  if (header.getUint32(16) > 2048 || header.getUint32(20) > 2048) return;
  const png = decode(bytes);
  const rgba = new Uint8ClampedArray(png.width * png.height * 4);
  for (let i = 0; i < png.width * png.height; i++) {
    const offset = i * png.channels;
    const rowBytes = Math.ceil(png.width * png.depth / 8);
    const packedIndex = Math.floor(i / png.width) * rowBytes + Math.floor((i % png.width) * png.depth / 8);
    const sample = png.depth < 8 ? (png.data[packedIndex] >> (8 - png.depth - ((i % png.width) * png.depth % 8))) & ((1 << png.depth) - 1) : png.data[offset];
    const pixel = png.palette?.[sample];
    const scale = png.depth === 16 ? 257 : png.depth < 8 ? ((1 << png.depth) - 1) / 255 : 1;
    const gray = sample / scale;
    rgba.set(pixel ? [pixel[0], pixel[1], pixel[2], pixel[3] ?? 255] :
      png.channels < 3 ? [gray, gray, gray, png.channels === 2 ? png.data[offset + 1] / scale : 255] :
      [gray, png.data[offset + 1] / scale, png.data[offset + 2] / scale, png.channels === 4 ? png.data[offset + 3] / scale : 255], i * 4);
  }
  return jsQR(rgba, png.width, png.height)?.data;
}
export function validLoginURL(source, raw) {
  try {
    const url = new URL(raw);
    if (url.username || url.password || url.port || raw.length > 8192) return;
    if (source === "netease" && url.protocol === "https:" && url.hostname === "music.163.com" && url.pathname === "/login" && url.searchParams.get("codekey")) return url.href;
    if (source === "qq" && ((url.protocol === "qqmusic:" && url.hostname === "qq.com" && url.pathname === "/other/openid") ||
      (url.protocol === "https:" && url.hostname === "y.qq.com" && url.pathname === "/m/client/qr_code_login/authorize.html"))) return url.href;
  } catch { /* Invalid upstream link. */ }
}

export async function resolveQQLoginURL(raw, fetcher = globalThis.fetch) {
  if (validLoginURL("qq", raw)) return validLoginURL("qq", raw);
  let url;
  try { url = new URL(raw); } catch { return; }
  for (let redirects = 0; redirects < 3; redirects++) {
    if (url.protocol !== "https:" || url.username || url.password || url.port ||
        url.hostname !== "c6.y.qq.com" || url.pathname !== "/base/fcgi-bin/u") return;
    const response = await fetcher(url.href, { redirect: "manual", signal: AbortSignal.timeout(10000) });
    const location = response.headers.get("location");
    await response.body?.cancel();
    if (![301, 302, 303, 307, 308].includes(response.status) || !location) return;
    url = new URL(location, url);
    const target = validLoginURL("qq", url.href);
    if (target) return target;
  }
}
