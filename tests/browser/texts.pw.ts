import { test, expect } from "@playwright/test";
import { live, key, choose } from "./dial";

test("all settings notices stay in the LCD and a failed document can be retried", async ({
  page,
  context,
}) => {
  let attempts = 0;
  await page.route("**/third-party-licenses.txt", async (route) => {
    attempts++;
    if (attempts === 1)
      await route.fulfill({ status: 503, body: "Unavailable" });
    else await route.continue();
  });
  await page.goto("/");
  await choose(page, "设置");
  await choose(page, "开源许可");
  await expect(live(page).getByRole("status")).toContainText("文本未能载入");
  await key(page, "Enter");
  await expect(live(page).locator(".text-reader pre")).toContainText(
    "MIT License",
  );
  await key(page, "ArrowDown");
  await expect
    .poll(() =>
      live(page)
        .locator(".text-reader-viewport")
        .evaluate((el) => el.scrollTop),
    )
    .toBeGreaterThan(0);
  await key(page, "Escape");
  await expect(live(page).locator(".screen-row.selected")).toContainText(
    "开源许可",
  );
  for (const [label, content] of [
    ["试听曲目版权", "Kevin MacLeod"],
    ["音频解析器许可", "MIT"],
    ["字体许可", "SIL OPEN FONT LICENSE"],
  ]) {
    await choose(page, label);
    await expect(live(page).locator(".text-reader pre")).toContainText(content);
    await expect(live(page).locator("a")).toHaveCount(0);
    await expect(live(page).locator(".screen-status > strong")).toHaveText(
      label,
    );
    await key(page, "Escape");
    await expect(live(page).locator(".screen-row.selected")).toContainText(
      label,
    );
  }
  expect(context.pages()).toHaveLength(1);
  expect(new URL(page.url()).pathname).toBe("/");
});

test("local text reading supports Chinese, wheel paging, HOLD, saved position and confirmed deletion", async ({
  page,
}) => {
  await page.goto("/");
  await choose(page, "附加功能");
  await choose(page, "文本阅读");
  const choosing = page.waitForEvent("filechooser");
  await choose(page, "导入文本");
  await (
    await choosing
  ).setFiles([
    {
      name: "阅读测试.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(
        "中文阅读\n<img src=x onerror=alert(1)>\n" +
          "https://example.com/" +
          "x".repeat(250) +
          "\n" +
          Array.from(
            { length: 150 },
            (_, i) => `第 ${i + 1} 行：转动转轮阅读。`,
          ).join("\n"),
      ),
    },
    {
      name: "旧编码.txt",
      mimeType: "text/plain",
      buffer: Buffer.from([0xd6, 0xd0, 0xce, 0xc4]),
    },
    { name: "空白.md", mimeType: "text/markdown", buffer: Buffer.alloc(0) },
    {
      name: "binary.txt",
      mimeType: "text/plain",
      buffer: Buffer.from([0, 1, 2, 3]),
    },
    {
      name: "太大.txt",
      mimeType: "text/plain",
      buffer: Buffer.alloc(2 * 1024 ** 2 + 1, 65),
    },
  ]);
  await expect(live(page).locator(".row-title")).toHaveText([
    "阅读测试.txt",
    "旧编码.txt",
    "空白.md",
    "阅读说明",
    "导入文本",
  ]);
  await choose(page, "旧编码.txt");
  await expect(live(page).locator(".text-reader pre")).toHaveText("中文");
  await key(page, "Escape");
  await choose(page, "空白.md");
  await expect(live(page).locator(".text-reader pre")).toHaveText("（空文本）");
  await key(page, "Escape");
  await choose(page, "阅读测试.txt");
  const viewport = live(page).locator(".text-reader-viewport");
  await expect(viewport).toContainText("<img src=x onerror=alert(1)>");
  await expect(viewport.locator("img,a,script")).toHaveCount(0);
  expect(
    await viewport.evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await key(page, "ArrowDown");
  const line = await viewport.evaluate((el) => el.scrollTop);
  expect(line).toBeGreaterThan(0);
  await key(page, "ArrowRight");
  const position = await viewport.evaluate((el) => el.scrollTop);
  expect(position).toBeGreaterThan(line * 2);
  await key(page, "ArrowLeft");
  expect(await viewport.evaluate((el) => el.scrollTop)).toBeCloseTo(line, 0);
  await key(page, "ArrowRight");
  await page.getByRole("switch", { name: "HOLD 锁定" }).click();
  await key(page, "ArrowDown");
  expect(await viewport.evaluate((el) => el.scrollTop)).toBe(position);
  await page.getByRole("switch").click();
  await expect(page.locator(".screen-outgoing")).toHaveCount(0);
  await page
    .locator(".screen-glass")
    .screenshot({ path: ".local/screenshots/text-reader.png" });
  await key(page, "Escape");
  await expect(live(page).locator(".screen-row.selected")).toContainText(
    "阅读测试.txt",
  );
  await choose(page, "阅读测试.txt");
  await expect
    .poll(() => viewport.evaluate((el) => el.scrollTop))
    .toBeCloseTo(position, 0);
  await page.reload();
  await choose(page, "附加功能");
  await choose(page, "文本阅读");
  await choose(page, "阅读测试.txt");
  await expect
    .poll(() => viewport.evaluate((el) => el.scrollTop))
    .toBeCloseTo(position, 0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(viewport).toBeVisible();
  await expect
    .poll(() => viewport.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0);
  expect(
    await viewport.evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await key(page, "Enter");
  await choose(page, "回到开头");
  await expect.poll(() => viewport.evaluate((el) => el.scrollTop)).toBe(0);
  await key(page, "Enter");
  await choose(page, "删除文本…");
  await expect(live(page).locator(".screen-row.selected")).toContainText(
    "取消",
  );
  await choose(page, "取消");
  await choose(page, "继续阅读");
  await expect(viewport).toBeVisible();
  await key(page, "Enter");
  await choose(page, "删除文本…");
  await choose(page, "删除文本");
  await expect(page.locator(".lcd-screen")).toHaveAttribute(
    "data-page",
    "notes",
  );
  await expect(live(page).locator(".row-title")).toHaveText([
    "旧编码.txt",
    "空白.md",
    "阅读说明",
    "导入文本",
  ]);
  await page.reload();
  await choose(page, "附加功能");
  await choose(page, "文本阅读");
  await expect(live(page).locator(".row-title")).toHaveText([
    "旧编码.txt",
    "空白.md",
    "阅读说明",
    "导入文本",
  ]);
});

test("a text imported without storage can still be read and removed in this session", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const open = indexedDB.open.bind(indexedDB);
    indexedDB.open = (name, version) => {
      if (name === "reipod-texts")
        throw new DOMException("Storage unavailable", "SecurityError");
      return open(name, version);
    };
  });
  await page.goto("/");
  await choose(page, "附加功能");
  await choose(page, "文本阅读");
  const choosing = page.waitForEvent("filechooser");
  await choose(page, "导入文本");
  await (
    await choosing
  ).setFiles([
    {
      name: "临时.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("仍可阅读"),
    },
  ]);
  await choose(page, "临时.txt");
  await expect(live(page).locator(".text-reader pre")).toHaveText("仍可阅读");
  await key(page, "Enter");
  await choose(page, "删除文本…");
  await choose(page, "删除文本");
  await expect(live(page).locator(".row-title")).toHaveText([
    "阅读说明",
    "导入文本",
  ]);
});
