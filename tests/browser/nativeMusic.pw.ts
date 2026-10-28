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
  await text(page, "First");
  await expect(live(page).locator(".row-title")).toContainText(["Phone First"]);
  await home(page);
  await choose(page, "音乐");
  await choose(page, "本地音乐");
  await expect(live(page).locator(".row-title")).not.toContainText([
    "Phone First",
  ]);
  await choose(page, "Carefree");
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
  await choose(page, "本地音乐");
  await choose(page, "Carefree");
  await expect(live(page).locator(".np-info strong")).toHaveText("Carefree");
});
