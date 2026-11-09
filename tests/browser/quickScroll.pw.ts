import { test, expect, type Page } from "@playwright/test";
import { choose, home, key, live } from "./dial";
import { taggedAudio } from "./taggedAudio";

async function prepare(page: Page, count = 130, backlight: 0 | 5 = 0) {
  await page.addInitScript((backlight) => {
    localStorage.setItem("reipod-demos", "hidden");
    localStorage.setItem("reipod-appearance", JSON.stringify({ backlight, backlightVersion: 1, clickSound: false }));
  }, backlight);
  await page.emulateMedia({ reducedMotion: "reduce" }); await page.goto("/");
  await choose(page, "音乐"); await choose(page, "歌曲");
  const chooser = page.waitForEvent("filechooser"); await choose(page, "导入音乐");
  await (await chooser).setFiles(Array.from({ length: count }, (_, i) => {
    const letter = String.fromCharCode(65 + Math.floor(i / 5)), n = String(i % 5 + 1);
    return taggedAudio(`${letter} Song ${n}`, `${letter} Artist ${n}`, `${letter} Album ${n}`);
  }));
  await expect(live(page).locator(".screen-footer")).toHaveText(`1 / ${count}`);
  await home(page); await choose(page, "音乐"); await choose(page, "艺人");
  // The importer publishes all files before their metadata has finished reading.
  await expect(live(page).locator(".screen-footer")).toHaveText(`${count} 位艺人`);
  await expect(live(page).locator(".screen-menu")).not.toContainText("未知艺人");
  await key(page, "Escape"); await choose(page, "歌曲");
  await page.evaluate(() => document.fonts.ready);
}
async function circle(page: Page, { turns = 1.5, direction = 1, release = true } = {}) {
  const box = (await page.locator(".click-wheel").boundingBox())!;
  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 }, radius = box.width * .38;
  const point = (angle: number) => ({ x: center.x + Math.cos(angle * Math.PI / 180) * radius,
    y: center.y + Math.sin(angle * Math.PI / 180) * radius });
  const start = point(-90); await page.mouse.move(start.x, start.y); await page.mouse.down();
  for (let i = 1; i <= Math.ceil(turns * 12); i++) {
    const p = point(-90 + i * 30 * direction); await page.mouse.move(p.x, p.y);
  }
  if (release) await page.mouse.up();
}
const letter = (page: Page) => page.locator(".classic-quick-scroll");

test("fast wheel browsing reaches actual letters in Songs, Artists and Albums, then releases for precise selection", async ({ page }) => {
  await prepare(page);
  for (const target of ["歌曲", "艺人", "专辑"]) {
    await home(page); await choose(page, "音乐"); await choose(page, target);
    await circle(page, { release: false });
    await expect(letter(page)).toBeVisible();
    const initial = await letter(page).textContent();
    expect(initial).toMatch(/^[A-Z]$/);
    const focused = live(page).locator(".screen-row.selected");
    await expect(focused.locator(".row-title")).toHaveText(new RegExp(`^${initial}`));
    // Releasing is enough to finish quick scrolling, without a confirm gesture.
    await page.mouse.up(); await expect(letter(page)).toHaveCount(0);
    const before = await focused.getAttribute("data-row-key");
    await key(page, "ArrowDown");
    expect(await focused.getAttribute("data-row-key")).not.toBe(before);
    await expect(letter(page)).toHaveCount(0);
    await expect(page.locator(".screen-playing-link")).toHaveCount(0);
  }
  // The album reached by quick scrolling must play through the same scoped route
  // and return to the very same selected album and visible list position.
  const albumRow = live(page).locator(".screen-row.selected");
  const albumKey = await albumRow.getAttribute("data-row-key");
  const position = await albumRow.evaluate(row => row.getBoundingClientRect().top - row.parentElement!.getBoundingClientRect().top);
  await key(page, "Enter");
  const song = await live(page).locator(".screen-row.selected .row-title").textContent();
  await key(page, "Enter");
  await expect(page.locator('.screen-playing-link[aria-label="正在播放"]')).toBeVisible();
  await expect(live(page).locator(".np-sequence")).toHaveText("1 / 1");
  await expect(live(page).locator(".np-info > strong")).toHaveText(song!);
  await key(page, "Space"); await key(page, "Escape");
  await expect(live(page).locator(".screen-row.selected .row-title")).toHaveText(song!);
  await key(page, "Escape");
  await expect(albumRow).toHaveAttribute("data-row-key", albumKey!);
  expect(await albumRow.evaluate(row => row.getBoundingClientRect().top - row.parentElement!.getBoundingClientRect().top)).toBe(position);
  await expect(letter(page)).toHaveCount(0);
});

test("quick scrolling cancels on idle, pointer loss, HOLD and navigation without changing playback", async ({ page }) => {
  await prepare(page);
  await circle(page, { release: false }); await expect(letter(page)).toBeVisible();
  await expect(letter(page)).toHaveCount(0, { timeout: 1800 });
  await page.mouse.up();
  await circle(page, { release: false }); await expect(letter(page)).toBeVisible();
  await page.locator(".click-wheel").dispatchEvent("pointercancel", { pointerId: 1 });
  await expect(letter(page)).toHaveCount(0); await page.mouse.up();
  await circle(page, { release: false }); await expect(letter(page)).toBeVisible();
  await page.getByRole("switch", { name: "HOLD 锁定" }).focus(); await page.keyboard.press("Space");
  await expect(letter(page)).toHaveCount(0); await page.mouse.up();
  await page.keyboard.press("Space");
  await circle(page, { release: false }); await expect(letter(page)).toBeVisible();
  // A command from the accessible wheel button can dismiss an active gesture.
  await page.getByRole("button", { name: "Menu 返回" }).dispatchEvent("click", { detail: 0 });
  await expect(letter(page)).toHaveCount(0); await page.mouse.up();
  await expect(page.locator(".lcd-screen")).toHaveAttribute("data-page", "music");
  await expect(page.locator(".screen-playing-link")).toHaveCount(0);
});

test("mouse notches and short lists keep ordinary row selection", async ({ page }) => {
  await prepare(page, 20);
  await circle(page, { turns: 2, release: false }); await expect(letter(page)).toHaveCount(0);
  await page.mouse.up();
  await page.locator(".click-wheel").hover(); await page.mouse.wheel(0, 80);
  await expect(letter(page)).toHaveCount(0);
  await expect(page.locator(".screen-playing-link")).toHaveCount(0);
});


test("a long list still browses row by row during deliberate slow rotation", async ({ page }) => {
  await prepare(page);
  const box = (await page.locator(".click-wheel").boundingBox())!;
  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 }, radius = box.width * .38;
  await page.mouse.move(center.x, center.y - radius); await page.mouse.down();
  for (let i = 1; i <= 26; i++) {
    await page.waitForTimeout(60);
    const angle = (-90 + i * 15) * Math.PI / 180;
    await page.mouse.move(center.x + Math.cos(angle) * radius, center.y + Math.sin(angle) * radius);
  }
  await expect(letter(page)).toHaveCount(0); await page.mouse.up();
  await expect(live(page).locator(".screen-footer")).not.toHaveText("1 / 130");
});


test("continued letter scrolling keeps a timed backlight awake, then releases it normally", async ({ page }) => {
  await page.clock.install(); await prepare(page, 130, 5);
  await circle(page, { release: false }); await expect(letter(page)).toBeVisible();
  const box = (await page.locator(".click-wheel").boundingBox())!;
  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 }, radius = box.width * .38;
  for (let i = 1; i <= 10; i++) {
    await page.clock.runFor(600);
    const angle = (450 + i * 30) * Math.PI / 180;
    await page.mouse.move(center.x + Math.cos(angle) * radius, center.y + Math.sin(angle) * radius);
    await expect(letter(page)).toBeVisible();
    await expect(page.locator(".lcd-backlight-dim")).toHaveCount(0);
  }
  await page.mouse.up(); await page.clock.runFor(5001);
  await expect(page.locator(".lcd-backlight-dim")).toHaveCount(1);
});
