import { test, expect } from "@playwright/test";
import { key, live } from "./dial";

test("status silhouettes and battery fill stay legible and aligned as the LCD scales", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem("reipod-appearance", JSON.stringify({ backlight: 0, clickSound: false }));
    Object.defineProperty(navigator, "getBattery", {
      value: async () => Object.assign(new EventTarget(), { level: 0.5, charging: false }),
    });
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await key(page, "Space");
  await expect(live(page).locator(".screen-playing-link .icon-play")).toBeVisible();
  // Pause the bundled track before collecting deterministic geometry.
  await key(page, "Space");
  await expect(live(page).locator(".screen-playing-link .icon-pause")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const fillHeights: number[] = [];
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const geometry = await live(page).locator(".screen-status").evaluate((header) => {
      const lcd = document.querySelector(".lcd-screen")!.getBoundingClientRect();
      const unit = lcd.width / 320;
      const rect = (selector: string) => header.querySelector(selector)!.getBoundingClientRect();
      const bar = header.getBoundingClientRect();
      const title = rect("strong"), battery = rect(".classic-battery"), fill = rect(".classic-battery > i");
      const icon = header.querySelector<SVGPathElement>(".status-transport > path")!.getBoundingClientRect();
      return {
        titleInside: title.top >= bar.top - 0.5 && title.bottom <= bar.bottom + 0.5,
        iconInside: icon.top >= bar.top && icon.bottom <= bar.bottom,
        separate: title.right <= icon.left && icon.right <= battery.left,
        batteryInside: battery.top >= bar.top && battery.bottom <= bar.bottom && battery.right + 2 * unit <= bar.right,
        centered: Math.abs((battery.top + battery.bottom - icon.top - icon.bottom) / unit) < 1,
        glyphWidth: icon.width / unit,
        glyphHeight: icon.height / unit,
        fillHeight: fill.height / unit,
        insetX: (fill.left - battery.left) / unit,
        insetY: (fill.top - battery.top) / unit,
        fillRatio: fill.width / (battery.width - 2 * (fill.left - battery.left)),
      };
    });
    expect(geometry.titleInside).toBe(true);
    expect(geometry.iconInside).toBe(true);
    expect(geometry.separate).toBe(true);
    expect(geometry.batteryInside).toBe(true);
    expect(geometry.centered).toBe(true);
    // Broad footprint bounds catch the former 24×24 viewBox shrinking and fixed-pixel inset loss.
    expect(geometry.glyphWidth).toBeGreaterThan(7);
    expect(geometry.glyphHeight).toBeGreaterThan(9);
    expect(geometry.glyphHeight).toBeLessThan(15);
    expect(geometry.fillRatio).toBeCloseTo(0.5, 1);
    // Only the metal border separates the charge from the outside; no white inset.
    expect(geometry.insetX).toBeLessThan(1.5);
    expect(geometry.insetY).toBeLessThan(1.5);
    fillHeights.push(geometry.fillHeight);
    await testInfo.attach(`status-${width}.json`, { body: JSON.stringify(geometry), contentType: "application/json" });
    await testInfo.attach(`status-${width}.png`, { body: await live(page).locator(".screen-status").screenshot(), contentType: "image/png" });
  }
  expect(Math.max(...fillHeights) - Math.min(...fillHeights)).toBeLessThan(1);
  await page.getByRole("switch", { name: "HOLD 锁定" }).click();
  await expect(live(page).getByRole("img", { name: "已锁定" })).toBeVisible();
  await expect(live(page).locator(".classic-battery")).toBeVisible();
  await key(page, "Space");
  await expect(live(page).locator(".icon-pause")).toBeVisible();
});

test("filled Classic shuffle and repeat indicators fit above the artwork without a number badge", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem("reipod-appearance", JSON.stringify({ backlight: 0, clickSound: false }));
    localStorage.setItem("reipod-playback", JSON.stringify({ shuffle: true, repeat: "one" }));
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await key(page, "Space");
  await expect(live(page).locator(".np-indicators .classic-lcd-icon")).toHaveCount(2);
  await key(page, "Space");
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const result = await live(page).locator(".np-indicators").evaluate(element => {
      const cover = element.parentElement!.querySelector(".np-cover")!.getBoundingClientRect();
      const icons = [...element.querySelectorAll("svg")];
      const lcd = document.querySelector(".lcd-screen")!.getBoundingClientRect();
      const first = icons[0].getBoundingClientRect(), last = icons[1].getBoundingClientRect();
      const repeat = element.querySelector(".icon-repeat")!.getBoundingClientRect();
      const one = element.querySelector("small")!;
      const number = one.getBoundingClientRect();
      return {
        filled: icons.every(icon => {
          const style = getComputedStyle(icon.querySelector("path")!);
          return style.fill !== "none" && style.stroke === "none";
        }),
        aboveArt: icons.every(icon => icon.getBoundingClientRect().bottom <= cover.top + 0.5),
        groupedRight: first.left > lcd.left + lcd.width / 2 && (last.right - first.left) / (lcd.width / 320) < 50,
        numberInside: number.left >= repeat.left && number.right <= repeat.right && number.top >= repeat.top && number.bottom <= repeat.bottom,
        badgeBackground: getComputedStyle(one).backgroundColor,
      };
    });
    expect(result).toEqual({ filled: true, aboveArt: true, groupedRight: true, numberInside: true, badgeBackground: "rgba(0, 0, 0, 0)" });
    await testInfo.attach(`modes-${width}.png`, { body: await live(page).locator(".screen-status").screenshot(), contentType: "image/png" });
    await testInfo.attach(`playback-modes-${width}.png`, { body: await page.locator(".lcd-screen").screenshot(), contentType: "image/png" });
  }
});

test("the battery follows device drain, charging and resume even when an event was missed", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const battery = Object.assign(new EventTarget(), {
      level: 0.73,
      charging: false,
    });
    (window as unknown as { testBattery: typeof battery }).testBattery =
      battery;
    Object.defineProperty(navigator, "getBattery", {
      configurable: true,
      value: () => Promise.resolve(battery),
    });
  });
  await page.goto("/");
  const icon = page.locator(
    ".screen-content > .screen-status .classic-battery",
  );
  await expect(icon).toHaveAttribute("aria-label", "设备电量 73%，电池供电");
  await expect(icon).toHaveAttribute("data-source", "device");
  await expect(icon.locator("i")).toHaveAttribute("style", "width: 73%;");
  await page.evaluate(() => {
    const battery = (
      window as unknown as {
        testBattery: EventTarget & { level: number; charging: boolean };
      }
    ).testBattery;
    battery.level = 0.12;
    battery.dispatchEvent(new Event("levelchange"));
  });
  await expect(icon).toHaveAttribute("aria-label", "设备电量 12%，电池供电");
  await expect(icon).toHaveClass(/is-low/);
  await page.evaluate(() => {
    const battery = (
      window as unknown as { testBattery: EventTarget & { charging: boolean } }
    ).testBattery;
    battery.charging = true;
    battery.dispatchEvent(new Event("chargingchange"));
  });
  await expect(icon).toHaveAttribute("aria-label", "设备电量 12%，正在充电");
  await expect(icon.locator("svg")).toHaveCount(1);
  await expect(icon).not.toHaveClass(/is-low/);
  await page.evaluate(() => {
    const battery = (
      window as unknown as {
        testBattery: EventTarget & { level: number; charging: boolean };
      }
    ).testBattery;
    battery.level = 0.44;
    battery.charging = false; // No BatteryManager event was delivered while suspended.
    window.dispatchEvent(new Event("pageshow"));
  });
  await expect(icon).toHaveAttribute("aria-label", "设备电量 44%，电池供电");
  await expect(icon.locator("svg")).toHaveCount(0);
  await page.evaluate(() => {
    const battery = (
      window as unknown as { testBattery: EventTarget & { level: number } }
    ).testBattery;
    battery.level = 0;
    battery.dispatchEvent(new Event("levelchange"));
  });
  await expect(icon.locator("i")).toHaveAttribute("style", "width: 0%;");
  await expect(icon).toHaveAttribute("data-source", "device");
});

for (const mode of ["missing", "reject", "throw", "invalid"] as const) {
  test(`unavailable battery (${mode}) displays a full icon without a false charging indication`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript((scenario) => {
      Object.defineProperty(navigator, "getBattery", {
        configurable: true,
        value:
          scenario === "missing"
            ? undefined
            : () => {
                if (scenario === "throw") throw new Error("Not available");
                if (scenario === "reject")
                  return Promise.reject(
                    new DOMException("Blocked", "NotAllowedError"),
                  );
                return Promise.resolve(
                  Object.assign(new EventTarget(), {
                    level: NaN,
                    charging: false,
                  }),
                );
              },
      });
    }, mode);
    await page.goto("/");
    const icon = page.locator(
      ".screen-content > .screen-status .classic-battery",
    );
    await expect(icon).toHaveAttribute("data-source", "fallback");
    await expect(icon.locator("i")).toHaveAttribute("style", "width: 100%;");
    await expect(icon).toHaveAttribute(
      "aria-label",
      "设备未提供电量，默认显示满格",
    );
    await expect(icon.locator("svg")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test("a failed battery connection retries when the page regains focus", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const battery = Object.assign(new EventTarget(), {
      level: 0.62,
      charging: true,
    });
    let allowed = false;
    (window as unknown as { allowTestBattery: () => void }).allowTestBattery =
      () => {
        allowed = true;
      };
    Object.defineProperty(navigator, "getBattery", {
      configurable: true,
      value: () =>
        allowed
          ? Promise.resolve(battery)
          : Promise.reject(new Error("Temporary failure")),
    });
  });
  await page.goto("/");
  const icon = page.locator(
    ".screen-content > .screen-status .classic-battery",
  );
  await expect(icon).toHaveAttribute("data-source", "fallback");
  await page.evaluate(() => {
    (window as unknown as { allowTestBattery: () => void }).allowTestBattery();
    window.dispatchEvent(new Event("focus"));
  });
  await expect(icon).toHaveAttribute("aria-label", "设备电量 62%，正在充电");
});
