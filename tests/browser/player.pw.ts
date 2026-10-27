import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

const live = (page: Page) => page.locator(".screen-viewport > .screen-content");
const row = (page: Page, name: string) =>
  live(page).getByRole("button", { name, exact: true });
async function home(page: Page) {
  await page.locator(".click-wheel").focus();
  await page.keyboard.press("Home");
}
async function back(page: Page) {
  await page.locator(".click-wheel").focus();
  await page.keyboard.press("Escape");
}
async function playlists(page: Page) {
  await home(page);
  await row(page, "音乐").click();
  await row(page, "播放列表").click();
}

// The production minifier and native browser layout are part of these checks.
test("Cover Flow follows a partial drag and rapid navigation retains flat visible fragments", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.locator(".click-wheel").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".screen-outgoing")).toHaveCount(0);
  const card = live(page).locator(".cf-card").first();
  const before = await card.evaluate(
    (element) => (element as HTMLElement).style.transform,
  );
  await page.keyboard.press("ArrowDown");
  await expect
    .poll(() =>
      card.evaluate((element) => (element as HTMLElement).style.transform),
    )
    .not.toBe(before);
  await expect(
    live(page).locator('.cf-card[aria-current="true"]'),
  ).toHaveAttribute("aria-label", /Monkeys/);
  const scene = await live(page).locator(".coverflow-scene").boundingBox();
  if (!scene) throw new Error("Cover Flow has no layout box");
  await page.mouse.move(scene.x + scene.width / 2, scene.y + scene.height / 2);
  await page.mouse.down();
  const start = await card.evaluate(
    (element) => (element as HTMLElement).style.transform,
  );
  await page.mouse.move(
    scene.x + scene.width / 2 - 25,
    scene.y + scene.height / 2,
    { steps: 5 },
  );
  await expect
    .poll(() =>
      card.evaluate((element) => (element as HTMLElement).style.transform),
    )
    .not.toBe(start);
  await page.mouse.up();
  await back(page);
  // Poll for actual progress into the slide instead of relying on a sleep.
  await expect
    .poll(() =>
      live(page).evaluate((element) => {
        const transform = getComputedStyle(element).transform;
        const x =
          transform === "none"
            ? 0
            : Math.abs(new DOMMatrixReadOnly(transform).m41);
        return x > 1 && x < element.clientWidth - 1 ? 1 : 0;
      }),
    )
    .toBe(1);
  await page.keyboard.press("Enter");
  await expect(page.locator(".screen-outgoing .screen-outgoing")).toHaveCount(
    0,
  );
  expect(
    await page.locator(".screen-outgoing > .screen-content").count(),
  ).toBeGreaterThan(1);
  await expect(page.locator(".screen-outgoing")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await back(page);
  await expect(page.locator(".screen-outgoing")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("search matches across metadata and can be browsed with the wheel keyboard", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await row(page, "音乐").click();
  await row(page, "搜索").click();
  const input = page.getByRole("searchbox", { name: "搜索音乐" });
  await input.fill("KEVIN Carefree");
  await expect(live(page).locator(".track-row")).toHaveCount(1);
  await expect(live(page).locator(".track-row")).toContainText("Carefree");
  await input.fill("does not exist");
  await expect(live(page).locator(".track-row")).toHaveCount(0);
  await expect(live(page)).toContainText("没有匹配的歌曲");
  await input.fill("Sneaky");
  await input.press("Enter");
  await page.keyboard.press("Enter");
  await expect(page.locator(".lcd-screen")).toHaveAttribute(
    "data-page",
    "playing",
  );
  await expect(live(page).locator(".np-info")).toContainText("Sneaky Snitch");
});

test("custom playlists can be created, populated, played, renamed and removed without deleting songs", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await playlists(page);
  await row(page, "新建歌单…").click();
  await row(page, "创建歌单").click();
  await expect(page.locator(".lcd-screen")).toHaveAttribute(
    "data-page",
    "playlist-name",
  );
  await page.getByLabel("歌单名称", { exact: true }).fill("通勤路上");
  await page.getByLabel("歌单名称", { exact: true }).press("Enter");
  await row(page, "通勤路上 0").click();
  // An empty playlist is operable with the center button, without tapping Add.
  await page.locator(".click-wheel").focus();
  await page.keyboard.press("Enter");
  await row(page, "Carefree +").click();
  await row(page, "Sneaky Snitch +").click();
  await row(page, "完成选择").click();
  await expect(live(page).locator(".track-row")).toHaveCount(2);
  await row(page, "Carefree").click();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("reipod-session")!),
  );
  expect(saved.queue).toHaveLength(2);
  await page.reload();
  await page.getByRole("button", { name: "返回正在播放", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("reipod-session")!).queue,
      ),
    )
    .toEqual(saved.queue);
  await playlists(page);
  await row(page, "通勤路上 2").click();
  await row(page, "管理歌单…").click();
  await row(page, "重命名").click();
  await page.getByLabel("歌单名称", { exact: true }).fill("夜航");
  await page.getByLabel("歌单名称", { exact: true }).press("Enter");
  await row(page, "删除歌单…").click();
  await expect(row(page, "取消")).toHaveAttribute("aria-current", "true");
  await row(page, "取消").click();
  await row(page, "删除歌单…").click();
  await row(page, "删除歌单").click();
  await expect(page.locator(".lcd-screen")).toHaveAttribute(
    "data-page",
    "playlists",
  );
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("reipod-playlists")!),
    ),
  ).toEqual([]);
  await home(page);
  await row(page, "音乐").click();
  await row(page, "歌曲 3").click();
  await expect(live(page).locator(".track-row")).toHaveCount(3);
});

function silentWav() {
  const length = 22050 * 12 * 2;
  const data = Buffer.alloc(44 + length);
  data.write("RIFF");
  data.writeUInt32LE(36 + length, 4);
  data.write("WAVEfmt ", 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(22050, 24);
  data.writeUInt32LE(44100, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write("data", 36);
  data.writeUInt32LE(length, 40);
  return data;
}

test("imported files resume at their saved time while paused, and single-track deletion persists", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const NativeAudio = window.Audio;
    const observed = window as unknown as { testAudio: HTMLAudioElement[] };
    observed.testAudio = [];
    window.Audio = function (...args: ConstructorParameters<typeof Audio>) {
      const audio = new NativeAudio(...args);
      observed.testAudio.push(audio);
      return audio;
    } as typeof Audio;
  });
  await page.goto("/");
  await page.locator("#audio-files").setInputFiles({
    name: "Resume test.wav",
    mimeType: "audio/wav",
    buffer: silentWav(),
  });
  await row(page, "Resume test").click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { testAudio: HTMLAudioElement[] }).testAudio.at(
            -1,
          )?.duration,
      ),
    )
    .toBe(12);
  await page.locator(".wheel-play").click();
  await page.evaluate(() => {
    const audio = (
      window as unknown as { testAudio: HTMLAudioElement[] }
    ).testAudio.at(-1)!;
    audio.currentTime = 5.5;
    audio.dispatchEvent(new Event("timeupdate"));
  });
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("reipod-session")!).position,
      ),
    )
    .toBe(5);
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { testAudio: HTMLAudioElement[] }).testAudio.at(
            -1,
          )?.currentTime,
      ),
    )
    .toBe(5);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { testAudio: HTMLAudioElement[] }).testAudio.at(
          -1,
        )?.paused,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "返回正在播放", exact: true }).click();
  await row(page, "歌曲选项").click();
  await row(page, "从曲库删除…").click();
  await expect(row(page, "取消")).toHaveAttribute("aria-current", "true");
  await row(page, "删除歌曲").click();
  await expect(page.locator(".lcd-screen")).toHaveAttribute(
    "data-page",
    "playing",
  );
  await page.reload();
  await home(page);
  await row(page, "音乐").click();
  await row(page, "搜索").click();
  await page.getByRole("searchbox", { name: "搜索音乐" }).fill("Resume test");
  await expect(live(page).locator(".track-row")).toHaveCount(0);
});
