import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { choose, home, key, live, text, holdCenter } from "./dial";

async function fixture(page: Page, source: "netease" | "qq", mode = "lyrics") {
  const counts = { lyrics: 0, playback: 0 };
  const tracks = [
    {
      id: "1",
      title: "First",
      artist: "Artist",
      album: "Album",
      access: "vip",
    },
    {
      id: "2",
      title: "Second",
      artist: "Artist",
      album: "Album",
      access: "purchase",
    },
    { id: "3", title: "Unrestricted", artist: "Artist", album: "Album" },
  ];
  const audio = await readFile("public/music/carefree.mp3");
  await page.route("https://audio.reipod.test/**", (route) => {
    const range = route
      .request()
      .headers()
      .range?.match(/^bytes=(\d+)-(\d*)$/);
    const start = Number(range?.[1] ?? 0);
    const end = Math.min(
      audio.length - 1,
      range?.[2] ? Number(range[2]) : audio.length - 1,
    );
    return route.fulfill({
      status: range ? 206 : 200,
      contentType: "audio/mpeg",
      headers: {
        "Accept-Ranges": "bytes",
        ...(range
          ? { "Content-Range": `bytes ${start}-${end}/${audio.length}` }
          : {}),
      },
      body: audio.subarray(start, end + 1),
    });
  });
  await page.addInitScript((source) => {
    localStorage.setItem("reipod-music-service", source);
    localStorage.setItem(`reipod-${source}-session`, "fixture");
  }, source);
  await page.route("**/api/music/**", async (route) => {
    const action = new URL(route.request().url()).pathname.split("/").at(-1);
    const body = route.request().postDataJSON();
    if (action === "lyrics") {
      counts.lyrics++;
      if (mode === "lyric-error" && counts.lyrics === 1) {
        await route.fulfill({ status: 502, json: { error: "Unavailable" } });
        return;
      }
      await route.fulfill({
        json: {
          ...(mode === "word-lyrics"
            ? {
                yrc: Array.from({ length: 12 }, (_, i) => {
                  const start = i * 6000;
                  return `[${start},4000](${start},2000,0)${body.id === "1" ? "逐字" : "换曲"} (${start + 2000},2000,0)${i === 1 ? "LongEnglishWordAnd中文🌙" : "跟随旋律"}`;
                }).join("\n"),
              }
            : {}),
          lyric:
            mode === "empty"
              ? ""
              : `[00:00.00]${body.id === "1" ? "第一首歌词" : "第二首歌词"}\n[00:00.30]随播放同步的下一行`,
        },
      });
      return;
    }
    if (action === "playback") {
      counts.playback++;
      if (mode === "vip" && body.id === "1") {
        await route.fulfill({
          status: 422,
          json: {
            kind: "vip",
            error:
              "这首 VIP 歌曲当前未获完整播放权限，请在音乐 App 中确认会员权益后重试。",
          },
        });
        return;
      }
    }
    await route.fulfill({
      json:
        action === "status"
          ? { authorized: true }
          : action === "library" || action === "playlist" || action === "search"
            ? {
                tracks:
                  action === "search"
                    ? [
                        {
                          ...tracks[0],
                          id: "4",
                          title:
                            "A 很长很长的 VIP 歌曲名称，用来确认标记不会被滚动的歌名挤出屏幕",
                        },
                        tracks[2],
                      ]
                    : tracks,
              }
            : action === "playlists"
              ? { playlists: [{ id: "1", name: "Playlist" }] }
              : action === "playback"
                ? { url: `https://audio.reipod.test/${body.id}.mp3` }
                : {},
    });
  });
  await page.goto("/");
  await choose(page, "设置");
  await choose(page, "音乐服务");
  await choose(page, source === "netease" ? "网易云音乐" : "QQ 音乐");
  await expect(live(page).getByRole("status")).toContainText("已连接");
  await home(page);
  await choose(page, "音乐");
  await choose(page, "歌曲");
  await choose(page, "First");
  return counts;
}
async function lyrics(page: Page) {
  await holdCenter(page);
  await expect(
    live(page).locator('.screen-row[aria-current="true"] .row-title'),
  ).toHaveText("歌词");
  await key(page, "Enter");
  await expect(live(page).locator(".view-lyrics")).toHaveCount(1);
}

for (const source of ["netease", "qq"] as const) {
  test(`${source} displays VIP feedback and allows retry and skip on the wheel`, async ({
    page,
  }, testInfo) => {
    const counts = await fixture(page, source, "vip");
    const alert = live(page).getByRole("alert", { name: "需要 VIP 播放权限" });
    await expect(alert).toContainText("确认会员权益");
    await expect(alert).toContainText("中心键重试");
    const panel = await alert.boundingBox(),
      lcd = await page.locator(".lcd-screen").boundingBox();
    expect(panel!.x).toBeGreaterThan(lcd!.x);
    expect(panel!.y).toBeGreaterThan(lcd!.y);
    expect(panel!.y + panel!.height).toBeLessThan(lcd!.y + lcd!.height);
    await page
      .locator(".classic-device")
      .screenshot({ path: testInfo.outputPath("vip.png") });
    await key(page, "Enter");
    await expect.poll(() => counts.playback).toBe(2);
    await expect(alert).toBeVisible();
    await key(page, "ArrowRight");
    await expect(live(page).locator(".np-info strong")).toHaveText("Second");
    await expect(live(page).getByRole("alert")).toHaveCount(0);
  });

  test(`${source} loads synchronized lyrics, switches songs and persists the lyrics switch`, async ({
    page,
  }, testInfo) => {
    const counts = await fixture(page, source);
    expect(counts.lyrics).toBe(0);
    await lyrics(page);
    await expect(live(page).locator(".lyrics-lines")).toContainText(
      "第一首歌词",
    );
    await expect(live(page).locator(".active-lyric")).toContainText(
      "随播放同步",
    );
    await page
      .locator(".classic-device")
      .screenshot({ path: testInfo.outputPath("lyrics.png") });
    await key(page, "ArrowRight");
    await expect(live(page).locator(".lyrics-header strong")).toHaveText(
      "Second",
    );
    await expect(live(page).locator(".lyrics-lines")).toContainText(
      "第二首歌词",
    );
    await expect(live(page).locator(".lyrics-lines")).not.toContainText(
      "第一首歌词",
    );
    await key(page, "Enter");
    await lyrics(page);
    expect(counts.lyrics).toBe(2);
    await home(page);
    await choose(page, "设置");
    await choose(page, "歌词显示");
    await choose(page, "关闭");
    await page.reload();
    await choose(page, "设置");
    await choose(page, "歌词显示");
    await expect(
      live(page).locator('.screen-row[aria-current="true"]'),
    ).toContainText("关闭");
    await home(page);
    await choose(page, "音乐");
    await choose(page, "歌曲");
    await choose(page, "Second");
    for (let i = 0; i < 4; i++) await key(page, "Enter");
    await expect(live(page).locator(".view-art")).toHaveCount(1);
    await holdCenter(page);
    await expect(live(page).locator(".row-title")).not.toContainText(["歌词"]);
    await key(page, "Escape");
    await home(page);
    await choose(page, "设置");
    await choose(page, "歌词显示");
    await choose(page, "开启");
    await home(page);
    await choose(page, "正在播放");
    await lyrics(page);
    await expect(live(page).locator(".lyrics-lines")).toContainText(
      "第二首歌词",
    );
  });
}

test("missing lyrics and retryable lyric failures leave audio controls usable", async ({
  page,
}) => {
  await fixture(page, "netease", "lyric-error");
  await lyrics(page);
  await expect(live(page).locator(".lyrics-empty")).toContainText(
    "歌词暂不可用",
  );
  await key(page, "Enter");
  await lyrics(page);
  await expect(live(page).locator(".lyrics-lines")).toContainText("第一首歌词");
});

test("empty online lyrics show a platform message and the wheel still returns to artwork", async ({
  page,
}) => {
  await fixture(page, "qq", "empty");
  await lyrics(page);
  await expect(live(page).locator(".lyrics-empty")).toContainText(
    "平台暂未提供",
  );
  await expect(live(page).locator(".lyrics-empty")).not.toContainText("导入");
  await key(page, "Enter");
  await expect(live(page).locator(".view-art")).toHaveCount(1);
});

test("a browser gesture warning can be retried with Center while the player is paused", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLMediaElement.prototype.play;
    let first = true;
    HTMLMediaElement.prototype.play = function () {
      if (first) {
        first = false;
        return Promise.reject(
          new DOMException("Gesture required", "NotAllowedError"),
        );
      }
      return original.call(this);
    };
  });
  await fixture(page, "netease");
  await expect(live(page).getByRole("alert")).toContainText(
    "浏览器需要一次手动播放",
  );
  await key(page, "Enter");
  await expect(live(page).getByRole("alert")).toHaveCount(0);
  await expect(live(page).locator(".view-art")).toHaveCount(1);
  await expect(live(page).locator(".screen-playing-link")).toHaveAttribute(
    "aria-label",
    "正在播放",
  );
});

for (const source of ["netease", "qq"] as const) {
  test(`${source} shows catalog badges beside titles across songs, Cover Flow, playlists, queue and search`, async ({
    page,
  }, testInfo) => {
    await fixture(page, source);
    const check = async () => {
      await expect(page.locator(".screen-outgoing")).toHaveCount(0);
      const first = live(page)
        .locator(".track-row")
        .filter({ has: page.locator(".row-title", { hasText: /^First$/ }) });
      const second = live(page)
        .locator(".track-row")
        .filter({ has: page.locator(".row-title", { hasText: /^Second$/ }) });
      const free = live(page)
        .locator(".track-row")
        .filter({
          has: page.locator(".row-title", { hasText: /^Unrestricted$/ }),
        });
      await expect(first.getByLabel("VIP 歌曲", { exact: true })).toHaveText(
        "VIP",
      );
      await expect(second.getByLabel("付费歌曲", { exact: true })).toHaveText(
        "付费",
      );
      await expect(free.locator(".track-access-badge")).toHaveCount(0);
      await expect
        .poll(async () =>
          live(page)
            .locator(".track-access-badge")
            .evaluateAll((items) =>
              items.every((item) => {
                const badge = item.getBoundingClientRect(),
                  row = item.closest(".screen-row")!.getBoundingClientRect();
                return (
                  badge.width > 0 &&
                  badge.left >= row.left - 0.5 &&
                  badge.right <= row.right + 0.5 &&
                  badge.top >= row.top - 0.5 &&
                  badge.bottom <= row.bottom + 0.5
                );
              }),
            ),
        )
        .toBe(true);
    };
    await home(page);
    await choose(page, "音乐");
    await choose(page, "歌曲");
    await check();
    await page
      .locator(".classic-device")
      .screenshot({ path: testInfo.outputPath("song-badges.png") });
    await key(page, "Escape");
    await choose(page, "Cover Flow");
    await key(page, "Enter");
    await expect(page.locator(".lcd-screen")).toHaveAttribute(
      "data-page",
      "coverflow-album",
    );
    await check();
    await page
      .locator(".classic-device")
      .screenshot({ path: testInfo.outputPath("coverflow-badges.png") });
    await home(page);
    await choose(page, "音乐");
    await choose(page, "播放列表");
    await choose(page, "Playlist");
    await check();
    await choose(page, "First");
    await holdCenter(page);
    await choose(page, "播放队列");
    await check();
    await home(page);
    await choose(page, "音乐");
    await choose(
      page,
      `搜索 ${source === "netease" ? "网易云音乐" : "QQ 音乐"}`,
    );
    await text(page, "A");
    await expect(
      live(page).getByLabel("VIP 歌曲", { exact: true }),
    ).toHaveCount(1);
    await page.setViewportSize({ width: 320, height: 700 });
    await expect(page.locator(".screen-outgoing")).toHaveCount(0);
    const row = live(page).locator(".track-row").first();
    const title = await row.locator(".row-title").boundingBox(),
      badge = await row.locator(".track-access-badge").boundingBox();
    expect(title!.width).toBeGreaterThan(40);
    expect(title!.x + title!.width).toBeLessThanOrEqual(badge!.x);
    await expect(row.locator(".marquee-window")).toHaveClass(/has-overflow/);
    await page
      .locator(".classic-device")
      .screenshot({ path: testInfo.outputPath("long-title-badge.png") });
    await home(page);
    await choose(page, "音乐");
    await choose(page, "本地音乐");
    await expect(live(page).locator(".track-access-badge")).toHaveCount(0);
  });
}

test("classic Center order, repeat in Settings and granular playback return state", async ({
  page,
}) => {
  const counts = await fixture(page, "netease");
  for (const view of ["seek", "shuffle", "rating", "lyrics", "art"]) {
    await key(page, "Enter");
    await expect(live(page).locator(`.view-${view}`)).toHaveCount(1);
  }
  // Leaving a temporary adjustment clears its UI, without restarting the song.
  for (const count of [1, 2, 3]) {
    for (let i = 0; i < count; i++) await key(page, "Enter");
    await home(page);
    await choose(page, "正在播放");
    await expect(live(page).locator(".view-art")).toHaveCount(1);
    expect(counts.playback).toBe(1);
  }
  await key(page, "ArrowDown");
  await expect(live(page).locator(".classic-volume")).toBeVisible();
  await home(page);
  await choose(page, "正在播放");
  await expect(live(page).locator(".classic-volume")).toHaveCount(0);
  await lyrics(page);
  await home(page);
  await choose(page, "正在播放");
  await expect(live(page).locator(".view-lyrics")).toHaveCount(1);
  await expect(live(page).locator(".active-lyric")).toContainText("随播放同步");
  await key(page, "Space");
  await key(page, "Space");
  await expect(live(page).locator(".view-lyrics")).toHaveCount(1);
  expect(counts.playback).toBe(1);
  await key(page, "ArrowRight");
  await expect(live(page).locator(".lyrics-header strong")).toHaveText(
    "Second",
  );
  await expect(live(page).locator(".lyrics-lines")).toContainText("第二首歌词");
  await home(page);
  await choose(page, "音乐");
  await choose(page, "歌曲");
  await choose(page, "First");
  await expect(live(page).locator(".view-art")).toHaveCount(1);
  await key(page, "Enter");
  await key(page, "ArrowRight");
  await expect(live(page).locator(".view-art")).toHaveCount(1);
  await home(page);
  await choose(page, "设置");
  await choose(page, "重复播放");
  await choose(page, "单曲");
  await home(page);
  await choose(page, "正在播放");
  await expect(live(page).locator(".np-indicators .icon-repeat")).toHaveCount(
    1,
  );
  await expect(live(page).locator(".np-indicators small")).toHaveText("1");
  await key(page, "Enter");
  await key(page, "Enter");
  await expect(live(page).locator(".view-shuffle")).toHaveCount(1);
});

test("opening another playlist song's lyrics retains that playlist's playback order", async ({
  page,
}) => {
  await fixture(page, "netease");
  await page.route("**/api/music/netease/playlist", (route) =>
    route.fulfill({
      json: {
        tracks: [
          { id: "2", title: "Second", artist: "Artist" },
          { id: "1", title: "First", artist: "Artist" },
        ],
      },
    }),
  );
  await home(page);
  await choose(page, "音乐");
  await choose(page, "播放列表");
  await choose(page, "Playlist");
  await expect(live(page).locator(".row-title")).toHaveText([
    "Second",
    "First",
  ]);
  await key(page, "ArrowUp");
  await lyrics(page);
  await expect(live(page).locator(".lyrics-header strong")).toHaveText(
    "Second",
  );
  await holdCenter(page);
  await choose(page, "播放队列");
  await expect(live(page).locator(".row-title")).toHaveText([
    "Second",
    "First",
  ]);
});

for (const width of [320, 390, 960]) {
  test(`word lyric masks, gaps, seek, wheel follow and reduced motion at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript(() => {
      const original = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        (
          window as unknown as { lyricTestAudio: HTMLMediaElement }
        ).lyricTestAudio = this;
        return original.call(this);
      };
    });
    await fixture(page, "netease", "word-lyrics");
    const seek = (time: number) =>
      page.evaluate((time) => {
        const audio = (
          window as unknown as { lyricTestAudio: HTMLMediaElement }
        ).lyricTestAudio;
        audio.pause();
        audio.currentTime = time;
        audio.dispatchEvent(new Event("timeupdate"));
      }, time);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as unknown as { lyricTestAudio: HTMLMediaElement })
              .lyricTestAudio?.readyState ?? 0,
        ),
      )
      .toBeGreaterThanOrEqual(2);
    await seek(1);
    await lyrics(page);
    const list = live(page).locator(".lyrics-lines");
    const first = list.locator(".lyric-word").first();
    await expect(list.locator(".lyric-word")).toHaveCount(24);
    await expect(list.locator(".active-lyric")).toHaveAttribute(
      "data-line-index",
      "0",
    );
    await expect
      .poll(() =>
        first.evaluate((el) =>
          parseFloat(
            (el as HTMLElement).style.getPropertyValue("--word-progress"),
          ),
        ),
      )
      .toBeCloseTo(50, 0);
    const frozen = await first.getAttribute("style");
    // Wait across several animation frames: a paused mask must stay at the audio position.
    await page.waitForTimeout(150);
    expect(await first.getAttribute("style")).toBe(frozen);
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        document
          .getAnimations()
          .filter(
            (animation) =>
              animation.effect?.getComputedTiming().iterations !== Infinity,
          )
          .map((animation) => animation.finished.catch(() => {})),
      );
    });
    await page
      .locator(".classic-device")
      .screenshot({ path: testInfo.outputPath("word-lyrics.png") });
    await seek(4.5);
    await expect(list.locator(".active-lyric")).toHaveCount(0);
    await seek(7);
    await expect(list.locator(".active-lyric")).toHaveAttribute(
      "data-line-index",
      "1",
    );
    await seek(1);
    await expect(list.locator(".active-lyric")).toHaveAttribute(
      "data-line-index",
      "0",
    );
    await expect
      .poll(() => list.evaluate((el) => el.scrollTop))
      .toBeLessThan(20);
    for (let i = 0; i < 4; i++) await key(page, "ArrowDown");
    await expect
      .poll(() => list.evaluate((el) => el.scrollTop))
      .toBeGreaterThan(60);
    await expect
      .poll(() => list.evaluate((el) => el.scrollTop), { timeout: 5000 })
      .toBeLessThan(20);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await seek(1.1);
    await expect(first).toHaveCSS("transform", "none");
    await expect(list.locator('p[data-distance="1"]').first()).toHaveCSS(
      "filter",
      "none",
    );
    await key(page, "ArrowRight");
    await expect(live(page).locator(".lyrics-header strong")).toHaveText(
      "Second",
    );
    await expect(list).toContainText("换曲");
    await expect(list).not.toContainText("逐字");
  });
}
