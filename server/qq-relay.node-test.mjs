import test from "node:test";
import assert from "node:assert/strict";
import { createQQRelay } from "./qq-relay.mjs";
test("relay delivers authorization before a subsequent transport error and cancels listeners", async () => {
  let emit, fail, closed = 0;
  const relay = createQQRelay(undefined, () => (_id, callback) => {
    emit = callback;
    return { ready: Promise.resolve(), done: new Promise((_, reject) => { fail = reject; }), close: () => { closed++; } };
  });
  await relay.open('fixture', 'image', 5000);
  const authorization = { type: 'authorized', payload: { fixture: true } };
  emit(authorization);
  fail(new Error('socket closed after authorization'));
  await Promise.resolve();
  assert.deepEqual(await relay.poll('fixture'), [authorization]);
  await assert.rejects(relay.poll('fixture'), /socket closed/);
  await relay.close('fixture');
  assert.equal(closed, 1);
  await assert.rejects(relay.image('fixture'), /已过期/);
});
test("an unready or failed subscription never exposes an authorization image", async () => {
  let closed = 0;
  const relay = createQQRelay(undefined, () => () => ({ ready: Promise.reject(new Error('subscribe failed')), done: Promise.resolve(), close: () => { closed++; } }));
  await assert.rejects(relay.open('fixture', 'image', 5000), /subscribe failed/);
  assert.equal(closed, 1);
  await assert.rejects(relay.image('fixture'), /已过期/);
});
