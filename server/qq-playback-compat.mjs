import { dirname, join } from 'node:path';

// A narrow compatibility retry for the observed legacy-RPC failure, using the
// same credential/device, song and quality. Never replaces sources or rights.
export function compatiblePlayback(original, call, probe = probeMP3, report = () => {}) {
  return async (http, auth, selector, songmid, quality = 128, mediaId, options = {}, hints = true) => {
    const result = await original(http, auth, selector, songmid, quality, mediaId, options, hints);
    if (String(quality) !== '128' || options.preview || !auth?.credential) return result;
    for (const mid of songmid.split(',').slice(0, 10)) {
      const entry = result[mid];
      if (entry?.url || entry?.restriction?.key !== 'url_unavailable' || entry?.restriction?.codes?.result !== 104003 || entry?.restriction?.codes?.subcode !== 1) continue;
      try {
        const detail = await call(http, auth.device, 'compat-song-detail', 'music.pf_song_detail_svr', 'get_song_detail_yqq', { song_type: 0, song_mid: mid }, auth.credential);
        const track = detail.track_info;
        const media = track?.file?.media_mid;
        if (track?.mid !== mid || !/^[a-zA-Z0-9]{14}$/.test(media ?? '')) continue;
        const data = await call(http, auth.device, 'compat-get-evkey', 'music.vkey.GetEVkey', 'CgiGetEVkey', {
          filename: [`M500${media}.mp3`], songmid: [mid], songtype: [0],
          guid: String(Date.now()) + String(Math.floor(Math.random() * 1000000)).padStart(6, '0'),
          uin: String(auth.credential.str_musicid ?? auth.credential.musicid), loginflag: 1, platform: '20', xcdn: 1,
        }, auth.credential, { ct: 24, cv: 0, format: 'json', uin: String(auth.credential.str_musicid ?? auth.credential.musicid) });
        const matched = data.midurlinfo?.find(item => item.songmid === mid);
        const codes = {};
        for (const key of ['result', 'subcode', 'errtype', 'code'])
          if (Number.isSafeInteger(matched?.[key])) codes[key] = matched[key];
        report({ songId: mid, stage: 'candidate-response', codes, hasMatchingEntry: Boolean(matched), hasPurl: Boolean(matched?.purl), granted: Boolean(data.midurlinfo?.some(item => item.songmid === mid && item.result === 0 && item.purl)) });
        const granted = data.midurlinfo?.find(item => item.songmid === mid && item.result === 0 && item.purl);
        if (!granted || granted.preview || granted.purl.split('?')[0] !== `M500${media}.mp3`) continue;
        const roots = Array.isArray(data.sip) ? data.sip.slice(0, 3) : [];
        for (const root of roots) {
          const url = new URL(granted.purl, root);
          if (url.username || url.password || url.port || !url.hostname.endsWith('.qq.com') || !['http:', 'https:'].includes(url.protocol)) continue;
          url.protocol = 'https:';
          if (!await probe(url.href)) continue;
          result[mid] = { url: url.href, error: false };
          report({ songId: mid, stage: 'mp3-probe-passed' });
          break;
        }
      } catch { /* A failed candidate must preserve the original restriction. */ }
    }
    return result;
  };
}
export async function probeMP3(url) {
  const response = await fetch(url, { headers: { Range: 'bytes=0-4095' }, redirect: 'error', signal: AbortSignal.timeout(10000) });
  try {
    if (![200, 206].includes(response.status) || !response.body) return false;
    const reader = response.body.getReader();
    const { value } = await reader.read();
    await reader.cancel();
    if (!value || value.length < 3) return false;
    return (value[0] === 73 && value[1] === 68 && value[2] === 51) ||
      (value[0] === 255 && (value[1] & 0xe0) === 0xe0);
  } finally { if (!response.body?.locked) await response.body?.cancel(); }
}
export function installQQPlaybackCompat(require) {
  const root = dirname(require.resolve('@yakult-green-tea/qq-music-api/package.json'));
  if (require(join(root, 'package.json')).version !== '3.3.5') throw new Error('Review QQ playback compatibility before changing dependency version');
  const playback = require(join(root, 'dist/src/services/auth/playback.js'));
  const { callMusicu } = require(join(root, 'dist/src/services/auth/musicuProtocol.js'));
  playback.getAuthenticatedPlayUrls = compatiblePlayback(playback.getAuthenticatedPlayUrls, callMusicu, probeMP3, data => console.info("reipod.qq-playback-compat", JSON.stringify(data)));
}
