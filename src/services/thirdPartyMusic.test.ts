import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { thirdPartyPlayerFor, thirdPartyTrack } from "./thirdPartyMusic";
beforeEach(() => vi.stubGlobal("location", { href: "http://127.0.0.1:3210/" }));

afterEach(() => {
  thirdPartyPlayerFor("netease").clear();
  thirdPartyPlayerFor("qq").clear();
  vi.unstubAllGlobals();
});

test("NetEase and QQ preserve separate track identities and natural queues", () => {
  const netease = thirdPartyPlayerFor("netease");
  const qq = thirdPartyPlayerFor("qq");
  netease.add([thirdPartyTrack("netease", { id: "1", title: "NetEase song" })]);
  netease.setQueue(["netease:1"]);
  qq.add([thirdPartyTrack("qq", { id: "1", title: "QQ song" })]);
  expect(netease.getSnapshot().queue).toEqual(["netease:1"]);
  expect(qq.getSnapshot().queue).toEqual(["qq:1"]);
  expect(netease.getSnapshot().tracks[0].url).toBe("reipod-music://netease/1");
  qq.clear();
  expect(netease.getSnapshot().tracks).toHaveLength(1);
});

test("online lyrics cache by provider and track, including empty responses", async () => {
  const { loadThirdPartyLyrics } = await import("./thirdPartyMusic");
  const fetcher = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async (_url, options) => {
      const id = JSON.parse(String(options?.body)).id;
      return Response.json({
        lyric: id === "1" ? "[00:01.00]第一句\n[00:03.00]第二句" : "",
      });
    });
  try {
    const player = thirdPartyPlayerFor("netease");
    const first = thirdPartyTrack("netease", { id: "1", title: "First" });
    const empty = thirdPartyTrack("netease", { id: "2", title: "Empty" });
    player.add([first, empty]);
    await Promise.all([
      loadThirdPartyLyrics(first),
      loadThirdPartyLyrics(first),
    ]);
    await loadThirdPartyLyrics(first);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(player.getSnapshot().tracks[0]).toMatchObject({
      lyricsStatus: "ready",
      lyrics: [
        { time: 1, text: "第一句" },
        { time: 3, text: "第二句" },
      ],
    });
    await loadThirdPartyLyrics(empty);
    await loadThirdPartyLyrics(empty);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(player.getSnapshot().tracks[1].lyricsStatus).toBe("empty");
  } finally {
    fetcher.mockRestore();
  }
});

test("an old lyric response cannot populate a new login's same song after logout", async () => {
  const { loadThirdPartyLyrics, signOutThirdParty } = await import(
    "./thirdPartyMusic"
  );
  let respond!: (value: Response) => void;
  const fetcher = vi
    .spyOn(globalThis, "fetch")
    .mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          respond = resolve;
        }),
    )
    .mockResolvedValue(Response.json({ lyric: "[00:00]新会话歌词" }));
  try {
    const player = thirdPartyPlayerFor("qq");
    const song = thirdPartyTrack("qq", { id: "1", title: "Song" });
    player.add([song]);
    const old = loadThirdPartyLyrics(song);
    await signOutThirdParty("qq");
    player.add([song]);
    await loadThirdPartyLyrics(song);
    respond(Response.json({ lyric: "[00:00]旧会话歌词" }));
    await old;
    expect(player.getSnapshot().tracks[0].lyrics?.[0].text).toBe("新会话歌词");
  } finally {
    fetcher.mockRestore();
  }
});

test("catalog normalization clears an old VIP label when a refreshed song is free", () => {
  const player = thirdPartyPlayerFor("netease");
  const vip = thirdPartyTrack("netease", {
    id: "1",
    title: "Song",
    access: "vip",
  });
  player.add([vip]);
  player.updateTrack(
    vip.id,
    thirdPartyTrack("netease", { id: "1", title: "Song" }),
  );
  expect(player.getSnapshot().tracks[0].access).toBeUndefined();
});

test("word lyrics survive the provider/session cache boundary", async () => {
  const { loadThirdPartyLyrics } = await import("./thirdPartyMusic");
  const fetcher = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(
      Response.json({
        lyric: "[00:01]回退",
        yrc: "[1000,2000](1000,1000,0)逐(2000,1000,0)字",
      }),
    );
  try {
    const song = thirdPartyTrack("netease", { id: "42", title: "Word lyric" });
    const player = thirdPartyPlayerFor("netease");
    player.add([song]);
    await loadThirdPartyLyrics(song);
    await loadThirdPartyLyrics(song);
    expect(player.getSnapshot().tracks[0].lyrics?.[0].words).toHaveLength(2);
    expect(fetcher).toHaveBeenCalledTimes(1);
  } finally {
    fetcher.mockRestore();
  }
});
