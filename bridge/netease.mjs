import CryptoJS from "crypto-js";
import QRCode from "qrcode";

// Protocol reference: api-enhanced 4.41.1 (MIT), module/ and util/crypto.js.
// Only the read/login operations used by ReiPod are implemented here.
const modulus = BigInt(
  "0xe0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7",
);
export function weapi(data) {
  const alphabet =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const secret = Array.from(
    crypto.getRandomValues(new Uint8Array(16)),
    (n) => alphabet[n % 62],
  ).join("");
  const encrypt = (text, key) =>
    CryptoJS.AES.encrypt(
      CryptoJS.enc.Utf8.parse(text),
      CryptoJS.enc.Utf8.parse(key),
      {
        iv: CryptoJS.enc.Utf8.parse("0102030405060708"),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      },
    ).toString();
  let value = BigInt(
    "0x" +
      Array.from(secret)
        .reverse()
        .map((c) => c.charCodeAt(0).toString(16))
        .join(""),
  );
  let exponent = 65537n,
    result = 1n;
  while (exponent) {
    if (exponent & 1n) result = (result * value) % modulus;
    value = (value * value) % modulus;
    exponent >>= 1n;
  }
  return {
    params: encrypt(encrypt(JSON.stringify(data), "0CoJUm6Qyw8W8jud"), secret),
    encSecKey: result.toString(16).padStart(256, "0"),
  };
}
export function createNetEase(fetcher) {
  const definitions = {
    login_status: () => ["/api/w/nuser/account/get", {}],
    login_qr_key: () => ["/api/login/qrcode/unikey", { type: 3 }],
    login_qr_check: (q) => [
      "/api/login/qrcode/client/login",
      { key: q.key, type: 3 },
    ],
    logout: () => ["/api/logout", {}],
    cloudsearch: (q) => [
      "/api/cloudsearch/pc",
      { s: q.keywords, type: 1, limit: 20, offset: 0, total: true },
    ],
    lyric: (q) => [
      "/api/song/lyric",
      { id: q.id, tv: -1, lv: -1, rv: -1, kv: -1 },
    ],
    song_url: (q) => [
      "/api/song/enhance/player/url",
      { ids: JSON.stringify(String(q.id).split(",")), br: 128000 },
    ],
    song_detail: (q) => [
      "/api/v3/song/detail",
      {
        c: JSON.stringify(
          String(q.ids)
            .split(",")
            .map((id) => ({ id })),
        ),
      },
    ],
    user_playlist: (q) => [
      "/api/user/playlist",
      { uid: q.uid, offset: q.offset ?? 0, limit: 100, includeVideo: true },
    ],
    likelist: (q) => ["/api/song/like/get", { uid: q.uid }],
    playlist_detail: (q) => [
      "/api/v6/playlist/detail",
      { id: q.id, n: 100000, s: 8 },
    ],
  };
  const api = Object.fromEntries(
    Object.entries(definitions).map(([name, definition]) => [
      name,
      async (q = {}) => {
        const [path, data] = definition(q);
        const csrf = /(?:^|;\s*)__csrf=([^;]*)/.exec(q.cookie ?? "")?.[1] ?? "";
        const response = await fetcher(
          `https://music.163.com${path.replace("/api/", "/weapi/")}?csrf_token=${encodeURIComponent(csrf)}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Referer: "https://music.163.com/",
              Cookie: q.cookie ?? "",
            },
            body: new URLSearchParams(
              weapi({ ...data, csrf_token: csrf }),
            ).toString(),
            redirect: "manual",
          },
        );
        let body = await response.json();
        if (name === "login_status") body = { data: body };
        if (name === "login_qr_key") body = { code: 200, data: body };
        if (name === "login_qr_check")
          body.cookie = response.headers
            .getSetCookie()
            .map((c) => c.split(";")[0])
            .join("; ");
        return { status: response.status, body };
      },
    ]),
  );
  api.login_qr_create = async ({ key }) => ({
    status: 200,
    body: {
      code: 200,
      data: {
        qrimg:
          "data:image/svg+xml;base64," +
          btoa(
            await QRCode.toString(
              `https://music.163.com/login?codekey=${encodeURIComponent(key)}`,
              { type: "svg", width: 256, margin: 2 },
            ),
          ),
      },
    },
  });
  return api;
}
