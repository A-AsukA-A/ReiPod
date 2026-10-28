import { expect, type Page } from "@playwright/test";
export const live = (page: Page) =>
  page.locator(".screen-viewport > .screen-content");
export async function key(page: Page, value: string) {
  await page.locator(".click-wheel").focus();
  await page.keyboard.press(value);
}
export async function home(page: Page) {
  await key(page, "Home");
  await expect(page.locator(".lcd-screen")).toHaveAttribute(
    "data-page",
    "home",
  );
}
export async function choose(page: Page, label: string) {
  const busyAccountFocus = await live(page)
    .locator(
      '.music-account-screen .screen-row[aria-current="true"][aria-disabled="true"]',
    )
    .count();
  const rows = live(page).locator(
    busyAccountFocus
      ? ".screen-row:visible"
      : '.screen-row:not([aria-disabled="true"])',
  );
  await expect
    .poll(() =>
      rows.evaluateAll(
        (items, targetLabel) =>
          items.some(
            (item) =>
              item.querySelector(".row-title")?.textContent?.trim() ===
              targetLabel,
          ),
        label,
      ),
    )
    .toBe(true);
  const state = await rows.evaluateAll((items) =>
    items.map((item) => ({
      label: item.querySelector(".row-title")?.textContent?.trim(),
      selected: item.getAttribute("aria-current") === "true",
    })),
  );
  const target = state.findIndex((item) => item.label === label),
    current = Math.max(
      0,
      state.findIndex((item) => item.selected),
    );
  await page.locator(".click-wheel").focus();
  for (let i = 0; i < Math.abs(target - current); i++)
    await page.keyboard.press(target > current ? "ArrowDown" : "ArrowUp");
  await page.keyboard.press("Enter");
}
export async function holdCenter(page: Page) {
  await page.locator(".click-wheel").focus();
  await page.keyboard.down("Enter");
  await expect(page.locator(".lcd-screen")).toHaveAttribute(
    "data-page",
    /track-options|photo-options/,
  );
  await page.keyboard.up("Enter");
}
export async function text(page: Page, value: string) {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789我的歌单";
  for (const character of value) {
    const current = await page
      .locator('.wheel-character-grid [aria-current="true"]')
      .textContent();
    const from = alphabet.indexOf(current!),
      to = alphabet.indexOf(character);
    if (from < 0 || to < 0) throw new Error("Unsupported test character");
    for (let i = 0; i < Math.abs(to - from); i++)
      await key(page, to > from ? "ArrowDown" : "ArrowUp");
    await key(page, "Enter");
  }
  await key(page, "Escape");
}
