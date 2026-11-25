import { test, expect } from "@playwright/test";
import { choose, home, key, live } from "./dial";
import { taggedAudio } from "./taggedAudio";
const titles = (page: import("@playwright/test").Page) => live(page).locator(".row-title");
const files = [
  taggedAudio("合辑第二首", "一日客串", "城市选集", { compilation: true, trackNumber: 2, sortArtist: "Guest", sortAlbum: "City", sortTitle: "C Second" }),
  taggedAudio("合辑第一首", "常驻歌手", "城市选集", { compilation: true, trackNumber: 1, sortArtist: "Resident", sortAlbum: "City", sortTitle: "C First" }),
  taggedAudio("合辑尾声", "多辑艺人", "城市选集", { compilation: true, trackNumber: 3, sortArtist: "Returning", sortAlbum: "City", sortTitle: "C Third" }),
  taggedAudio("另辑客串", "多辑艺人", "另一选集", { compilation: true, trackNumber: 1, sortArtist: "Returning", sortAlbum: "Other", sortTitle: "O Other" }),
  taggedAudio("甲开场", "常驻歌手", "个人专辑", { trackNumber: 2, sortArtist: "Resident", sortAlbum: "Z Solo", sortTitle: "Zeta", composer: "周作曲", sortComposer: "Zulu" }),
  taggedAudio("乙终章", "常驻歌手", "个人专辑", { trackNumber: 1, sortArtist: "Resident", sortAlbum: "Z Solo", sortTitle: "Alpha", composer: "陈作曲", sortComposer: "Alpha" }),
];

test("real compilation and sort tags survive import/reload, menu grouping is reversible and scoped playback keeps its queue", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    localStorage.setItem("reipod-demos", "hidden");
    if (!localStorage.getItem("reipod-appearance")) localStorage.setItem("reipod-appearance", JSON.stringify({ clickSound: false, backlight: 0 }));
  });
  await page.goto("/"); await choose(page, "音乐"); await choose(page, "歌曲");
  const chooser = page.waitForEvent("filechooser"); await choose(page, "导入音乐"); await (await chooser).setFiles(files);
  await home(page); await choose(page, "音乐"); await choose(page, "专辑");
  await expect(titles(page)).toHaveText(["全部歌曲", "城市选集", "另一选集", "个人专辑"]);
  await home(page); await choose(page, "音乐"); await choose(page, "艺人");
  await expect(titles(page)).toHaveText(["全部专辑", "一日客串", "常驻歌手", "多辑艺人"]);
  await home(page); await choose(page, "设置"); await choose(page, "音乐菜单"); await choose(page, "合辑");
  await expect(live(page).locator('.screen-row[aria-current="true"] .row-check[aria-label="已选择"]')).toBeVisible();
  await home(page); await choose(page, "音乐"); await choose(page, "合辑");
  await expect(live(page).locator(".screen-status > strong")).toHaveText("合辑");
  await expect(titles(page)).toHaveText(["全部歌曲", "城市选集", "另一选集"]);
  await info.attach("compilation-albums", { body: await live(page).screenshot(), contentType: "image/png" });
  await choose(page, "城市选集"); await expect(titles(page)).toHaveText(["合辑第一首", "合辑第二首", "合辑尾声"]);
  await choose(page, "合辑第二首"); await expect(live(page).locator(".now-playing-top")).toHaveAttribute("aria-label", "播放队列第 2 首，共 3 首");
  await key(page, "Space"); await key(page, "Escape"); await key(page, "Escape");
  await expect(live(page).locator('.screen-row[aria-current="true"] .row-title')).toHaveText("城市选集");
  const queue = await page.evaluate(() => JSON.parse(localStorage.getItem("reipod-session") ?? "{}").queue);
  await choose(page, "全部歌曲"); await expect(page.locator(".lcd-screen")).toHaveAttribute("data-page", "compilation-tracks");
  await expect(titles(page)).toHaveText(["合辑第一首", "合辑第二首", "合辑尾声", "另辑客串"]);
  await home(page); await choose(page, "音乐"); await choose(page, "艺人");
  await expect(titles(page)).toHaveText(["全部专辑", "常驻歌手", "多辑艺人"]);
  await choose(page, "常驻歌手"); await choose(page, "城市选集"); await expect(titles(page)).toHaveText(["合辑第一首"]);
  await home(page); await choose(page, "音乐"); await choose(page, "歌曲");
  const names = await titles(page).allTextContents(); expect(names.indexOf("乙终章")).toBeLessThan(names.indexOf("甲开场"));
  await home(page); await choose(page, "音乐"); await choose(page, "作曲者");
  await expect(titles(page)).toHaveText(["全部专辑", "陈作曲", "周作曲", "未知作曲者"]);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("reipod-session") ?? "{}").queue)).toEqual(queue);
  // The home shortcut alone must not group/hide Artists.
  await home(page); await choose(page, "设置"); await choose(page, "主菜单"); await choose(page, "合辑");
  await key(page, "Escape"); await choose(page, "音乐菜单"); await choose(page, "合辑");
  await home(page); await choose(page, "音乐"); await choose(page, "艺人");
  await expect(titles(page)).toHaveText(["全部专辑", "一日客串", "常驻歌手", "多辑艺人"]);
  await page.reload(); await choose(page, "合辑"); await expect(titles(page)).toHaveText(["全部歌曲", "城市选集", "另一选集"]);
});
