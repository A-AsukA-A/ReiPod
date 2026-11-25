import { test, expect } from "@playwright/test";
import { live, choose, home, key, text } from "./dial";
import { nativeMusicFixture } from "./nativeMusicFixture";

test("the iPhone bridge uses system permission and full queues without developer tokens", async ({
  page,
}) => {
  await nativeMusicFixture(page);
  const cloudRequests: string[] = [];
  page.on("request", (request) => {
    if (
      /api\.music\.apple|musickit\.js|music-services\.json/.test(request.url())
    )
      cloudRequests.push(request.url());
  });
  await page.goto("/");
  await expect(page.locator("main")).toHaveAttribute(
    "data-music-service",
    "apple-music",
  );
  await choose(page, "音乐");
  await choose(page, "连接系统音乐");
  await choose(page, "允许访问音乐资料库");
  await expect(live(page).getByRole("status")).toContainText("已连接系统音乐");
  await expect(live(page).getByRole("status")).toContainText(
    "2 首歌曲 · 1 个歌单",
  );
  await home(page);
  await choose(page, "音乐");
  await choose(page, "播放列表");
  await choose(page, "系统歌单");
  await expect(live(page).locator(".row-title")).toHaveText([
    "Phone First",
    "Phone Second",
  ]);
  await choose(page, "Phone First");
  await expect(live(page).locator(".np-info strong")).toHaveText("Phone First");
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __nativeTest: { queue: string[] } })
          .__nativeTest.queue,
    ),
  ).toEqual(["9007199254740993", "18446744073709551614"]);
  await page.evaluate(() =>
    (
      window as unknown as {
        __nativeTest: { update(patch: Record<string, unknown>): void };
      }
    ).__nativeTest.update({
      currentId: "18446744073709551614",
      position: 42.5,
      status: "playing",
    }),
  );
  await expect(live(page).locator(".np-info strong")).toHaveText(
    "Phone Second",
  );
  expect(
    await page.evaluate(() =>
      (
        window as unknown as { __nativeTest: { calls: string[] } }
      ).__nativeTest.calls.filter((action) => action === "setQueue"),
    ),
  ).toHaveLength(1);
  await key(page, "Space");
  await page.reload();
  await expect(page.locator("main")).toHaveAttribute(
    "data-playback-source",
    "apple-music",
  );
  await choose(page, "正在播放");
  await expect(live(page).locator(".np-info strong")).toHaveText(
    "Phone Second",
  );
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __nativeTest: { calls: string[] } })
          .__nativeTest.calls,
    ),
  ).not.toContain("setQueue");
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __nativeTest: { calls: string[] } })
          .__nativeTest.calls,
    ),
  ).not.toContain("authorize");
  await home(page);
  await choose(page, "音乐");
  await choose(page, "搜索资料库");
  await expect(live(page).locator('.classic-search-screen[data-editing="true"]')).toBeVisible();
  await text(page, "First");
  await expect(live(page).locator(".row-title")).toContainText(["Phone First"]);
  await home(page);
  await choose(page, "音乐");
  await choose(page, "本地音乐");
  await expect(live(page).locator(".row-title")).not.toContainText([
    "Phone First",
  ]);
  await choose(page, "晴天");
  await expect(page.locator("main")).toHaveAttribute(
    "data-playback-source",
    "local",
  );
  expect(cloudRequests).toEqual([]);
});

test("denied iPhone music access offers system settings and retains local playback", async ({
  page,
}) => {
  await nativeMusicFixture(page, true);
  await page.goto("/");
  await expect(page.locator("main")).toHaveAttribute(
    "data-music-service",
    "apple-music",
  );
  await choose(page, "音乐");
  await choose(page, "连接系统音乐");
  await choose(page, "允许访问音乐资料库");
  await expect(live(page).getByRole("status")).toContainText("系统设置中允许");
  await choose(page, "打开系统设置");
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __nativeTest: { settings: number } })
          .__nativeTest.settings,
    ),
  ).toBe(1);
  await page.evaluate(() =>
    (
      window as unknown as {
        __nativeTest: { setPermission(value: string): void };
      }
    ).__nativeTest.setPermission("authorized"),
  );
  await expect(live(page).getByRole("status")).toContainText("已连接系统音乐");
  await expect(live(page).getByRole("status")).toContainText(
    "2 首歌曲 · 1 个歌单",
  );
  await choose(page, "断开系统音乐");
  await choose(page, "本地音乐");
  await choose(page, "晴天");
  await expect(live(page).locator(".np-info strong")).toHaveText("晴天");
});

test("native classic volume uses the wheel on the ordinary screen and Center retains scrubbing", async ({ page }) => {
  await nativeMusicFixture(page, false, true, { authorized: true, volumeControl: true,
    playback: { currentId: "9007199254740995", status: "playing", position: 125 } });
  await page.goto("/");
  await choose(page, "正在播放");
  const playing = live(page).locator(".now-playing-screen");
  await expect(playing).toHaveClass(/view-art/);
  await key(page, "ArrowDown");
  await expect(live(page).getByLabel("音量 63%")).toBeVisible();
  const read = () => page.evaluate(() => {
    const log = (window as any).__nativeTest;
    return { volumes: [...log.volumes], calls: [...log.calls], queue: [...log.queue] };
  });
  await expect.poll(async () => (await read()).volumes.at(-1)).toBeCloseTo(0.625);
  // The physical Center button changes mode; it never changes volume itself.
  await page.getByRole("button", { name: "中心键确认", exact: true }).click();
  await expect(playing).toHaveClass(/view-seek/);
  await key(page, "ArrowDown");
  await expect.poll(async () => (await read()).calls.includes("seek")).toBe(true);
  expect((await read()).volumes).toHaveLength(1);
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "中心键确认", exact: true }).click();
  await expect(playing).toHaveClass(/view-art/);
  await page.evaluate(() => (window as any).__nativeTest.setOutputVolume(0.2));
  await key(page, "ArrowDown");
  await expect(live(page).getByLabel("音量 23%")).toBeVisible();
  await expect.poll(async () => (await read()).volumes.at(-1)).toBeCloseTo(0.225);
  for (let i = 0; i < 12; i++) await key(page, "ArrowUp");
  await expect(live(page).getByLabel("音量 0%")).toBeVisible();
  await key(page, "ArrowDown");
  await expect(live(page).getByLabel("音量 3%")).toBeVisible();
  await expect.poll(async () => (await read()).volumes.at(-1)).toBeCloseTo(0.025);
  const actions = (await read()).calls;
  expect(actions).not.toContain("setQueue");
  expect(actions).not.toContain("pause");
  expect(actions).not.toContain("play");
  await expect(live(page).locator('.screen-playing-link[aria-label="正在播放"]')).toBeVisible();
  await expect(live(page).locator(".np-info strong")).toHaveText("系统单集一");
  await expect(live(page).locator(".playback-alert")).toHaveCount(0);
});

test("old iPhone shells keep the honest side-button fallback", async ({ page }) => {
  await nativeMusicFixture(page, false, false, { authorized: true,
    playback: { currentId: "9007199254740993", status: "playing", position: 42 } });
  await page.goto("/");
  await choose(page, "正在播放");
  await key(page, "ArrowDown");
  await expect(page.getByText("侧键调音量 · 中心键调进度", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__nativeTest.calls)).not.toContain("volume");
});
