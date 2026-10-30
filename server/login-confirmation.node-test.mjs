import test from 'node:test';
import assert from 'node:assert/strict';
import { loginConfirmation } from './login-confirmation.mjs';

test('a profile timeout retries the saved confirmation without consuming QR again', async () => {
  let checks = 0, profiles = 0, saves = 0;
  const item = { upstreamKey: 'upstream' };
  const providers = {
    check: async () => { checks++; return { code: 803, cookie: 'MUSIC_U=private' }; },
    profile: async (_source, candidate) => {
      assert.equal(candidate.cookie, 'MUSIC_U=private');
      if (++profiles === 1) throw new Error('network timeout');
      return { id: '1' };
    },
  };
  await assert.rejects(loginConfirmation('netease', item, providers, async () => { saves++; }), /timeout/);
  assert.equal(saves, 1);
  const result = await loginConfirmation('netease', structuredClone(item), providers);
  assert.equal(result.candidate.profile.id, '1');
  assert.equal(checks, 1);
});
test('delayed account readiness remains retryable instead of expiring confirmed QR', async () => {
  const item = { key: 'upstream' };
  const providers = {
    check: async () => ({ code: 803, cookie: 'private' }),
    profile: async () => { throw Object.assign(new Error('not ready'), { status: 401 }); },
  };
  await assert.rejects(loginConfirmation('netease', item, providers), e => e.status === 503);
  assert.equal(item.cookie, 'private');
});
test('waiting/scanned states never fetch profiles or disclose cookies', async () => {
  for (const [code, status] of [[801, 'waiting'], [802, 'scanned']]) {
    assert.deepEqual(await loginConfirmation('netease', {}, { check: async () => ({ code }) }), { status });
  }
  await assert.rejects(loginConfirmation('netease', {}, { check: async () => ({ code: 800 }) }), e => e.status === 410);
  await assert.rejects(loginConfirmation('netease', {}, { check: async () => ({ code: 803 }) }), /未返回/);
});
