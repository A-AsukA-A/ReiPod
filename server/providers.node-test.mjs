import test from "node:test";
import assert from "node:assert/strict";
import { createProviders, track, mediaURL } from "./providers.mjs";

test("provider IDs remain distinct and metadata carries album artwork", () => {
  assert.deepEqual(
    track("netease", {
      id: 123,
      name: "N",
      dt: 120000,
      ar: [{ name: "Artist" }],
      al: { name: "Album", picUrl: "http://example.test/cover.jpg" },
    }),
    {
      id: "123",
      title: "N",
      duration: 120,
      artist: "Artist",
      album: "Album",
      artwork: "https://example.test/cover.jpg",
      trackNumber: 0,
    },
  );
  assert.equal(
    track("qq", {
      mid: "003abc",
      name: "Q",
      interval: 100,
      album: { mid: "abc" },
    }).id,
    "003abc",
  );
  assert.equal(mediaURL("javascript:alert(1)"), undefined);
});

test("NetEase playlist pagination preserves upstream ID order even if details are reordered", async () => {
  const calls = [];
  const providers = createProviders({
    playlist_detail: async (args) => {
      calls.push(args);
      return {
        status: 200,
        body: { playlist: { trackIds: [{ id: 2 }, { id: 1 }] } },
      };
    },
    song_detail: async (args) => {
      calls.push(args);
      return {
        status: 200,
        body: {
          songs: [
            { id: 1, name: "First" },
            { id: 2, name: "Second" },
          ],
        },
      };
    },
  });
  const result = await providers.read(
    "netease",
    "playlist",
    { id: "12" },
    { cookie: "fixture" },
  );
  assert.deepEqual(
    result.tracks.map((t) => t.id),
    ["2", "1"],
  );
  assert.ok(
    calls.every((c) => c.unblock === "false" && c.randomCNIP === false),
  );
});

test("an absent playlist track is reported instead of silently changing the queue", async () => {
  const providers = createProviders({
    playlist_detail: async () => ({
      status: 200,
      body: { playlist: { trackIds: [{ id: 2 }] } },
    }),
    song_detail: async () => ({ status: 200, body: { songs: [] } }),
  });
  await assert.rejects(
    providers.read("netease", "playlist", { id: "12" }, {}),
    /部分歌曲/,
  );
});

test("a preview or unavailable source cannot be represented as full playback", async () => {
  const providers = createProviders(
    {
      song_url: async () => ({
        status: 200,
        body: {
          data: [
            {
              url: "https://example.test/preview.mp3",
              freeTrialInfo: { start: 0, end: 30 },
            },
          ],
        },
      }),
    },
    async () => ({ data: { playUrl: { mid: { url: "", error: true } } } }),
  );
  await assert.rejects(
    providers.read("netease", "playback", { id: "123" }, {}),
    /试听/,
  );
  await assert.rejects(
    providers.read("qq", "playback", { id: "mid" }, {}),
    /暂未提供/,
  );
});

test("a missing account cannot read another user's library", async () => {
  const providers = createProviders({});
  await assert.rejects(
    providers.read("netease", "library", {}, null),
    (error) => error.status === 401,
  );
});

test("standard NetEase playback uses the compatible original-platform endpoint and keeps authorization", async () => {
  let observed;
  const providers = createProviders({
    song_url: async (args) => {
      observed = args;
      return {
        status: 200,
        body: {
          code: 200,
          data: [{ url: "http://example.test/music.mp3", freeTrialInfo: null }],
        },
      };
    },
  });
  const result = await providers.read(
    "netease",
    "playback",
    { id: "123" },
    { cookie: "fixture-session" },
  );
  assert.equal(result.url, "https://example.test/music.mp3");
  assert.equal(observed.cookie, "fixture-session");
  assert.equal(observed.unblock, "false");
});

test("expired NetEase authorization is not mistaken for an empty collection", async () => {
  const providers = createProviders({
    likelist: async () => ({
      status: 200,
      body: { code: 301, message: "Login required" },
    }),
  });
  await assert.rejects(
    providers.read("netease", "library", {}, { profile: { id: "1" } }),
    (error) => error.status === 401,
  );
});

test("QQ distinguishes owned private playlists from collected public playlists", async () => {
  const calls = [];
  const providers = createProviders({}, async (path, params) => {
    calls.push({ path, params });
    if (path === "/user/playlist")
      return {
        playlist: [
          { tid: 10, title: "Owned" },
          { tid: 0, dissid: 20, dissname: "Collected" },
        ],
      };
    if (path === "/getSongListDetail/20")
      return {
        response: {
          code: 0,
          cdlist: [
            {
              songlist: [
                { mid: "song2", name: "Second" },
                { mid: "song1", name: "First" },
              ],
            },
          ],
        },
      };
    return { songs: [{ mid: "privateSong", name: "Private song" }] };
  });
  const session = { profile: { id: "1" } };
  const lists = await providers.read("qq", "playlists", {}, session);
  assert.deepEqual(
    lists.playlists.map((p) => p.id),
    ["own:10", "public:20"],
  );
  const collected = await providers.read(
    "qq",
    "playlist",
    { id: "public:20" },
    session,
  );
  assert.deepEqual(
    collected.tracks.map((t) => t.id),
    ["song2", "song1"],
  );
  await providers.read("qq", "playlist", { id: "own:10" }, session);
  assert.equal(calls.at(-1).path, "/user/playlist-detail");
  assert.equal(calls.at(-1).params.tid, "10");
});

test("VIP, purchase, preview and unknown restrictions produce distinct actionable errors", async () => {
  for (const [entry, kind, text] of [
    [{ url: null, fee: 1 }, "vip", /VIP/],
    [{ url: null, fee: 4 }, "purchase", /单独购买/],
    [
      { url: "https://example.test/clip.mp3", freeTrialInfo: {} },
      "preview",
      /试听/,
    ],
    [{ url: null, fee: 0 }, "unavailable", /可能涉及 VIP/],
  ]) {
    const providers = createProviders({
      song_url: async () => ({ status: 200, body: { data: [entry] } }),
    });
    await assert.rejects(
      providers.read("netease", "playback", { id: "1" }, {}),
      (error) =>
        error.status === 422 && error.kind === kind && text.test(error.message),
    );
  }
  const providers = createProviders({}, async () => ({
    data: {
      playUrl: {
        mid: {
          url: "",
          restriction: { hint: { key: "playback.maybe-membership" } },
        },
      },
    },
  }));
  await assert.rejects(
    providers.read("qq", "playback", { id: "mid" }, {}),
    (error) => error.kind === "vip",
  );
});

test("missing NetEase fee metadata is resolved without rejecting an authorized VIP full URL", async () => {
  const providers = createProviders({
    song_url: async ({ id }) => ({
      status: 200,
      body: {
        data: [
          id === "1"
            ? { url: null }
            : { url: "https://example.test/full.mp3", fee: 1 },
        ],
      },
    }),
    song_detail: async () => ({ status: 200, body: { songs: [{ fee: 1 }] } }),
  });
  await assert.rejects(
    providers.read("netease", "playback", { id: "1" }, {}),
    (error) => error.kind === "vip",
  );
  assert.equal(
    (await providers.read("netease", "playback", { id: "2" }, {})).url,
    "https://example.test/full.mp3",
  );
});

test("lyrics normalize both providers and distinguish an absent lyric from an upstream failure", async () => {
  const calls = [];
  const providers = createProviders(
    {
      lyric: async ({ id }) => ({
        status: 200,
        body:
          id === "1"
            ? { lrc: { lyric: "[00:01.00]网易歌词" } }
            : { nolyric: true },
      }),
    },
    async (path, params) => {
      calls.push([path, params]);
      return { response: { code: 0, lyric: "[00:02.00]QQ歌词" } };
    },
  );
  assert.deepEqual(await providers.read("netease", "lyrics", { id: "1" }, {}), {
    lyric: "[00:01.00]网易歌词",
  });
  assert.deepEqual(await providers.read("netease", "lyrics", { id: "2" }, {}), {
    lyric: "",
  });
  assert.deepEqual(await providers.read("qq", "lyrics", { id: "mid" }, {}), {
    lyric: "[00:02.00]QQ歌词",
  });
  assert.deepEqual(calls, [["/getLyric", { songmid: "mid" }]]);
  await assert.rejects(
    providers.read("qq", "lyrics", { id: "../bad" }, {}),
    (error) => error.status === 400,
  );
  const unavailable = createProviders({}, async () => ({
    response: { code: -1 },
  }));
  await assert.rejects(
    unavailable.read("qq", "lyrics", { id: "mid" }, {}),
    /暂时无法读取/,
  );
});

test("catalog VIP and purchase badges survive normalization without guessing from download-only flags", () => {
  for (const fee of [1, 8, "1"])
    assert.equal(track("netease", { id: 1, fee }).access, "vip");
  assert.equal(track("netease", { id: 1, fee: 4 }).access, "purchase");
  for (const fee of [0, 16, undefined])
    assert.equal(track("netease", { id: 1, fee }).access, undefined);
  assert.equal(track("qq", { mid: "mid", pay: { pay_play: 1 } }).access, "vip");
  assert.equal(
    track("qq", { mid: "mid", pay: { payplay: "1" } }).access,
    "vip",
  );
  assert.equal(
    track("qq", { mid: "mid", pay: { pay_down: 1, pay_play: 0 } }).access,
    undefined,
  );
  assert.equal(track("qq", { mid: "mid" }).access, undefined);
});

test("account profiles expose public identity and HTTPS avatars, never credentials", async () => {
  const providers = createProviders(
    {
      login_status: async () => ({
        status: 200,
        body: {
          data: {
            account: { id: 123 },
            profile: {
              nickname: "Net user",
              avatarUrl: "http://example.test/avatar.jpg",
            },
            cookie: "secret",
          },
        },
      }),
    },
    async () => ({
      data: {
        profile: {
          musicid: "0",
          str_musicid: "456",
          nickname: "QQ user",
          avatarUrl: "https://example.test/qq.jpg",
          musickey: "secret",
        },
      },
    }),
  );
  assert.deepEqual(await providers.profile("netease", {}), {
    id: "123",
    name: "Net user",
    avatar: "https://example.test/avatar.jpg",
  });
  assert.deepEqual(await providers.profile("qq", {}), {
    id: "456",
    name: "QQ user",
    avatar: "https://example.test/qq.jpg",
  });
});
