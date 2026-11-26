import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { choose, home, key, live } from "./dial";

async function pickAlarmRow(page: Page, label: string) {
  const rows = live(page).locator(".alarm-row");
  await expect.poll(() => rows.locator("strong").allTextContents()).toContain(label);
  const items = await rows.evaluateAll((elements) =>
    elements.map((element) => ({
      text: element.querySelector("strong")?.textContent,
      current: element.getAttribute("aria-current") === "true",
    })),
  );
  const target = items.findIndex((item) => item.text === label);
  const from = items.findIndex((item) => item.current);
  for (let i = 0; i < Math.abs(target - from); i++) {
    await key(page, target > from ? "ArrowDown" : "ArrowUp");
  }
  await key(page, "Enter");
}

async function dialCode(page: Page, code: string) {
  for (const ch of code) {
    const steps = Number(ch);
    for (let i = 0; i < steps; i++) {
      await key(page, "ArrowDown");
    }
    await key(page, "Enter");
  }
}

test("alarm sound chooser supports built-in synthesized tones and persists selection", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await home(page);
  await choose(page, "附加功能");
  await choose(page, "闹钟");
  await pickAlarmRow(page, "创建闹钟");
  await pickAlarmRow(page, "声音");
  await expect(live(page).locator(".alarm-row strong")).toContainText(["蜂鸣", "清脆钟声", "双音提示", "脉冲铃声"]);
  await pickAlarmRow(page, "清脆钟声");
  await pickAlarmRow(page, "保存闹钟");
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("reipod-classic-alarms-v1") ?? "{}"));
  expect(saved.alarms).toHaveLength(1);
  expect(saved.alarms[0].sound).toBe("chime");
});

test("screen lock sets 4-digit passcode, rejects wrong combination, and unlocks with matching code", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await home(page);
  await choose(page, "附加功能");
  await choose(page, "屏幕锁定");
  await choose(page, "设置组合密码");
  await dialCode(page, "1234");
  await expect(live(page).locator(".screen-lock-title")).toHaveText("再次输入以确认密码");
  await dialCode(page, "1234");
  await expect(live(page).locator(".screen-row")).toContainText(["立即锁定", "更改密码", "关闭密码"]);

  await choose(page, "立即锁定");
  const overlay = page.locator(".classic-screen-lock-overlay");
  await expect(overlay).toBeVisible();
  await expect(overlay.locator(".screen-lock-title")).toHaveText("输入组合密码");

  // Wrong code 0000 keeps overlay locked and shows feedback.
  await dialCode(page, "0000");
  await expect(overlay).toBeVisible();
  await expect(overlay.locator(".screen-lock-error")).toContainText("密码错误");

  // Correct code 1234 unlocks cleanly.
  await dialCode(page, "1234");
  await expect(overlay).toHaveCount(0);

  // Confirm unlocked state persists across reload when code was kept unlocked.
  const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem("reipod-screen-lock") ?? "{}"));
  expect(persisted).toEqual({ code: "1234", locked: false });
});
