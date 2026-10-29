import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { qrLoginURL, validLoginURL } from "./login-links.mjs";
const require = createRequire(new URL('../package.json', import.meta.url));
const QRCode = require('qrcode');
test("extracts the exact session authorization URL from upstream PNG", async () => {
  const url = 'qqmusic://qq.com/other/openid?p=session-fixture';
  const png = await QRCode.toDataURL(url);
  assert.equal(qrLoginURL(png), url);
  assert.equal(validLoginURL('qq', qrLoginURL(png)), url);
  assert.equal(validLoginURL('netease', url), undefined);
});
test("does not trust arbitrary URLs decoded from upstream images", async () => {
  const image = await QRCode.toDataURL('https://evil.test/');
  assert.equal(validLoginURL('qq', qrLoginURL(image)), undefined);
  assert.equal(qrLoginURL('https://evil.test/qr.png'), undefined);
  assert.equal(validLoginURL('netease', 'https://music.163.com/login?codekey=fixture'), 'https://music.163.com/login?codekey=fixture');
});

test("resolves only the fixed QQ short-link route and refuses foreign redirects", async () => {
  const { resolveQQLoginURL } = await import('./login-links.mjs');
  const authorization = 'https://y.qq.com/m/client/qr_code_login/authorize.html?qrcodeID=fixture';
  let calls = 0;
  assert.equal(await resolveQQLoginURL('https://c6.y.qq.com/base/fcgi-bin/u?__=fixture', async () => {
    calls++;
    return new Response(null, { status: 302, headers: { location: authorization } });
  }), authorization);
  assert.equal(calls, 1);
  assert.equal(await resolveQQLoginURL('https://c6.y.qq.com/base/fcgi-bin/u?__=fixture', async () =>
    new Response(null, { status: 302, headers: { location: 'https://evil.test/' } })), undefined);
  assert.equal(await resolveQQLoginURL('https://evil.test/', () => { throw new Error('must not fetch'); }), undefined);
});

test("decodes packed one-bit palette PNG used by QQ upstream", async () => {
  const { encode } = await import('fast-png');
  const url = 'https://y.qq.com/m/client/qr_code_login/authorize.html?qrcodeID=fixture';
  const modules = QRCode.create(url).modules;
  const width = (modules.size + 8) * 3, rowBytes = Math.ceil(width / 8);
  const data = new Uint8Array(rowBytes * width).fill(255);
  for (let y = 0; y < width; y++) for (let x = 0; x < width; x++) {
    const mx = Math.floor(x / 3) - 4, my = Math.floor(y / 3) - 4;
    if (mx >= 0 && my >= 0 && mx < modules.size && my < modules.size && modules.get(my, mx)) data[y * rowBytes + (x >> 3)] &= ~(1 << (7 - x % 8));
  }
  const image = 'data:image/png;base64,' + Buffer.from(encode({width, height: width, channels: 1, depth: 1, palette: [[0,0,0],[255,255,255]], data})).toString('base64');
  assert.equal(qrLoginURL(image), url);
});
