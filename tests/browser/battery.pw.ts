import { test, expect } from "@playwright/test";

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
