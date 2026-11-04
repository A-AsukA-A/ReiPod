import { test, expect, type Page } from "@playwright/test";
import { choose, home, key, live, text } from "./dial";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("reipod-appearance", JSON.stringify({ backlight: 0, clickSound: false }));
    localStorage.setItem("reipod-playlists", JSON.stringify([{ id: "morning", name: "Care Walk", trackIds: ["demo:USUAN1400037"] }]));
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
});

const search = async (page: Page) => { await home(page); await choose(page, "音乐"); await choose(page, "搜索"); };
async function chooseKind(page: Page, kind: string) {
  const rows = live(page).locator(".screen-row");
  const state = await rows.evaluateAll(es => es.map(e => ({ kind: e.querySelector(".search-result-icon")?.getAttribute("data-kind"), current: e.getAttribute("aria-current") === "true" })));
  const target = state.findIndex(r => r.kind === kind), from = Math.max(0, state.findIndex(r => r.current));
  expect(target).toBeGreaterThanOrEqual(0);
  for (let i = 0; i < Math.abs(target - from); i++) await key(page, target > from ? "ArrowDown" : "ArrowUp");
  await key(page, "Enter");
}

test("live search uses the horizontal alphabet and captures space/backspace without changing the active queue", async ({ page }, testInfo) => {
  await page.goto("/");
  await key(page, "Space");
  await expect(live(page).locator(".np-info strong")).toHaveText("Carefree");
  const session = () => page.evaluate(() => JSON.parse(localStorage.getItem("reipod-session") ?? "{}"));
  await expect.poll(async () => (await session()).currentId).toBe("demo:USUAN1400037");
  const before = await session();
  await search(page);
  const editor = live(page).locator(".classic-search-screen");
  await expect(editor).toHaveAttribute("data-editing", "true");
  await expect(editor.locator(".wheel-character-grid")).toHaveCount(0);
  await key(page, "Enter"); // A, inserted as a lower-case query character.
  await expect(editor.locator(".classic-search-value")).toHaveText("a");
  await expect(editor.locator('.search-result-icon[data-kind="song"]')).not.toHaveCount(0);
  await expect(editor.locator('.screen-row[aria-current="true"]')).toHaveCount(0);
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const geometry = await editor.evaluate(el => {
      const list = el.getBoundingClientRect(), bay = el.querySelector(".classic-search-keyboard")!.getBoundingClientRect(), letter = el.querySelector('.classic-search-letters [aria-current="true"]')!.getBoundingClientRect();
      const first = el.querySelector(".row-title")!;
      return { contained: bay.left >= list.left && bay.right <= list.right && bay.bottom <= list.bottom && letter.right <= bay.right, font: getComputedStyle(first).fontWeight, row: el.querySelector(".screen-row")!.getBoundingClientRect().height / (document.querySelector(".lcd-screen")!.getBoundingClientRect().width / 320) };
    });
    expect(geometry.contained).toBe(true);
    expect(Number(geometry.font)).toBeGreaterThanOrEqual(600);
    expect(geometry.row).toBeCloseTo(54, 0); // Engineering stability, not a hardware acceptance value.
    await testInfo.attach(`search-${width}.png`, { body: await page.locator(".lcd-screen").screenshot(), contentType: "image/png" });
  }
  await key(page, "ArrowRight");
  await expect(editor.locator(".classic-search-value")).toHaveText("a ");
  await key(page, "ArrowLeft");
  await expect(editor.locator(".classic-search-value")).toHaveText("a");
  await key(page, "ArrowLeft");
  await expect(editor.locator(".search-result-icon:not([data-kind=search])")).toHaveCount(0);
  await expect(editor.locator(".classic-search-message")).toHaveText("转动转轮输入文字");
  const after = await session();
  expect(after.currentId).toBe(before.currentId);
  expect(after.queue).toEqual(before.queue);
  await key(page, "Escape");
  await expect(editor).toHaveAttribute("data-editing", "false");
  await choose(page, "搜索");
  await expect(editor).toHaveAttribute("data-editing", "true");
  await text(page, "ZZZ");
  await expect(editor.locator(".classic-search-message")).toHaveText("没有匹配的项目");
  await key(page, "Escape");
  await expect(page.locator(".lcd-screen")).toHaveAttribute("data-page", "music");
});

test("typed search results drill into the matching artist, album or playlist and return to the remembered result", async ({ page }) => {
  await page.goto("/");
  await search(page);
  await text(page, "Kevin");
  await chooseKind(page, "artist");
  await expect(page.locator(".lcd-screen")).toHaveAttribute("data-page", "albums");
  await expect(live(page).locator(".screen-status > strong")).toHaveText("Kevin MacLeod");
  await expect(live(page).locator(".row-title")).toHaveText(["全部歌曲", "Carefree", "Monkeys Spinning Monkeys", "Sneaky Snitch"]);
  await key(page, "Escape");
  await expect(live(page).locator('.screen-row[aria-current="true"] .search-result-icon')).toHaveAttribute("data-kind", "artist");
  await choose(page, "搜索");
  for (let i = 0; i < 5; i++) await key(page, "ArrowLeft");
  await text(page, "Care");
  await expect(live(page).locator(".row-title")).toHaveText(["搜索", "Care Walk", "Carefree", "Carefree"]);
  await chooseKind(page, "album");
  await expect(page.locator(".lcd-screen")).toHaveAttribute("data-page", "album-tracks");
  await expect(live(page).locator(".row-title")).toHaveText(["Carefree"]);
  await key(page, "Escape");
  await chooseKind(page, "playlist");
  await expect(live(page).locator(".lcd-toolbar")).toContainText("Care Walk");
  await expect(live(page).locator(".track-row .row-title")).toHaveText(["Carefree"]);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("reipod-session") ?? "{}").currentId)).toBeNull();
});

test("reset confirmation restores firmware choices, preserves the music session and leaves ReiPod choices intact", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("reipod-appearance", JSON.stringify({ finish: "black", background: "dark", lyricsEnabled: false, brightness: .35, volumeLimit: .3, backlight: 0, clickSound: false })));
  await page.goto("/");
  await key(page, "Space");
  await expect(live(page).locator(".np-info strong")).toHaveText("Carefree");
  await home(page); await choose(page, "设置");
  await choose(page, "随机播放"); await choose(page, "歌曲");
  await choose(page, "重复播放"); await choose(page, "单曲");
  const read = () => page.evaluate(() => ({ prefs: JSON.parse(localStorage.getItem("reipod-appearance")!), session: JSON.parse(localStorage.getItem("reipod-session")!), modes: JSON.parse(localStorage.getItem("reipod-playback")!), playlists: localStorage.getItem("reipod-playlists") }));
  await expect.poll(async () => (await read()).modes.repeat).toBe("one");
  const before = await read();
  await choose(page, "还原设置");
  await expect(live(page).locator('.screen-row[aria-current="true"] .row-title')).toHaveText("取消");
  await choose(page, "取消");
  expect((await read()).prefs).toEqual(before.prefs);
  await choose(page, "还原设置"); await choose(page, "还原");
  await expect(page.locator(".lcd-screen")).toHaveAttribute("data-page", "settings");
  await expect.poll(async () => (await read()).prefs.brightness).toBe(1);
  const after = await read();
  expect(after.prefs).toMatchObject({ finish: "black", background: "dark", lyricsEnabled: false, volumeLimit: 1, backlight: 10, clickSound: true });
  expect(after.session.currentId).toBe(before.session.currentId);
  expect(after.modes).toMatchObject({ repeat: "off", shuffle: false });
  expect([...after.session.queue].sort()).toEqual([...before.session.queue].sort());
  expect(after.playlists).toBe(before.playlists);
  await choose(page, "ReiPod 设置");
  await expect(live(page).locator(".row-title")).toContainText(["音乐服务", "导入音乐", "试听音乐", "歌词显示", "机身颜色", "背景"]);
});
