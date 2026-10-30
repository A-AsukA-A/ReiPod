import { test, expect } from "@playwright/test";
import { choose, holdCenter, home, live } from "./dial";

for (const ratingsFail of [false, true]) {
  test(`song deletion removes playlist membership and preserves persistence feedback (ratingsFail=${ratingsFail})`, async ({ page }) => {
    await page.addInitScript(({ ratingsFail }) => {
      localStorage.setItem("reipod-appearance", JSON.stringify({ clickSound: false }));
      localStorage.setItem("reipod-ratings", JSON.stringify({ "demo:USUAN1400037": 5 }));
      localStorage.setItem("reipod-playlists", JSON.stringify([{ id: "test", name: "Test", trackIds: ["demo:USUAN1400037"] }]));
      if (ratingsFail) {
        const set = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
          if (key === "reipod-ratings") throw new DOMException("Unavailable", "QuotaExceededError");
          return set.call(this, key, value);
        };
      }
    }, { ratingsFail });
    await page.goto("/");
    await choose(page, "音乐"); await choose(page, "歌曲");
    await expect(live(page).locator('.screen-row[aria-current="true"] .row-title')).toHaveText("Carefree");
    await holdCenter(page); await choose(page, "从曲库删除…"); await choose(page, "删除歌曲");
    await expect(page.locator(".screen-notice")).toHaveText(ratingsFail
      ? "歌曲已删除，但评级或歌单更改未能保存，本次仍生效" : "歌曲已从曲库删除");
    expect(await page.evaluate(() => ({
      rating: JSON.parse(localStorage.getItem("reipod-ratings")!)["demo:USUAN1400037"] ?? 0,
      playlist: JSON.parse(localStorage.getItem("reipod-playlists")!)[0].trackIds,
      hidden: JSON.parse(localStorage.getItem("reipod-removed-demos")!),
    }))).toEqual({ rating: ratingsFail ? 5 : 0, playlist: [], hidden: ["demo:USUAN1400037"] });
    await home(page); await choose(page, "音乐"); await choose(page, "歌曲");
    expect(await live(page).locator(".row-title").allTextContents()).not.toContain("Carefree");
  });
}

test("clear reports a related-data write failure after the immediate UI success message", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("reipod-appearance", JSON.stringify({ clickSound: false }));
    localStorage.setItem("reipod-ratings", JSON.stringify({ "demo:USUAN1400037": 5 }));
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "reipod-ratings") throw new DOMException("Unavailable", "QuotaExceededError");
      return set.call(this, key, value);
    };
  });
  await page.goto("/");
  await choose(page, "设置"); await choose(page, "清空本地音乐资料库"); await choose(page, "清空资料库");
  await expect(page.locator(".screen-notice")).toHaveText("部分评级、歌单或试听偏好未能保存，本次清空仍生效");
  await expect(page.locator(".lcd-screen")).toHaveAttribute("data-page", "home");
  expect(await page.evaluate(() => ({ demos: localStorage.getItem("reipod-demos"), playlists: localStorage.getItem("reipod-playlists") })))
    .toEqual({ demos: "hidden", playlists: "[]" });
});
