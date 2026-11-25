import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { choose, home, key, live } from "./dial";
import { taggedAudio } from "./taggedAudio";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("reipod-appearance", JSON.stringify({ clickSound: false, backlight: 0 }));
  });
});
async function games(page: Page, index = 0) {
  await home(page); await choose(page, "附加功能"); await choose(page, "游戏");
  await expect(live(page).locator(".game-library-row")).toHaveCount(3);
  for (let i = 0; i < index; i++) await key(page, "ArrowDown");
  await key(page, "Enter");
  await expect(live(page).locator(".classic-game-host")).toBeVisible();
}
async function gameMenu(page: Page, label: string) {
  const rows = live(page).locator(".game-menu-rows > div");
  await expect(rows.filter({ hasText: label })).toHaveCount(1);
  const entries = await rows.evaluateAll(items => items.map(item => ({ text: item.textContent,
    selected: item.getAttribute("aria-current") === "true" })));
  const target = entries.findIndex(item => item.text === label), from = entries.findIndex(item => item.selected);
  expect(target).toBeGreaterThanOrEqual(0);
  for (let i = 0; i < Math.abs(target - from); i++) await key(page, target > from ? "ArrowDown" : "ArrowUp");
  await key(page, "Enter");
}

test("iQuiz pauses its timer and game buttons leave the real music session running", async ({ page }) => {
  await page.addInitScript(() => {
    const probe = { audio: null as HTMLAudioElement | null, pauses: 0, loads: 0 };
    (window as any).__gameProbe = probe;
    window.Audio = new Proxy(window.Audio, { construct(target, args) {
      const audio = Reflect.construct(target, args) as HTMLAudioElement;
      audio.addEventListener("playing", () => { probe.audio = audio; });
      audio.addEventListener("pause", () => { if (probe.audio === audio) probe.pauses++; });
      audio.addEventListener("loadstart", () => { if (probe.audio === audio) probe.loads++; });
      return audio;
    } });
  });
  await page.goto("/"); await key(page, "Space");
  await expect.poll(() => page.evaluate(() => (window as any).__gameProbe.audio?.currentTime ?? 0)).toBeGreaterThan(0.1);
  const before = await page.evaluate(() => ({ time: (window as any).__gameProbe.audio.currentTime,
    session: JSON.parse(localStorage.getItem("reipod-session") ?? "{}") }));
  await games(page);
  await gameMenu(page, "新游戏");
  await expect(live(page).locator(".iquiz-game")).toHaveAttribute("data-phase", "categories");
  await key(page, "ArrowDown"); await key(page, "Enter"); // Independently authored music trivia.
  await expect(live(page).locator(".iquiz-game")).toHaveAttribute("data-phase", "question");
  await key(page, "Escape");
  await expect(live(page).locator(".classic-game-host")).toHaveAttribute("data-game-mode", "pause");
  const remaining = await page.evaluate(() => JSON.parse(localStorage.getItem("reipod-game-v1:iquiz")!).data.state.remaining);
  await page.waitForTimeout(1100);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("reipod-game-v1:iquiz")!).data.state.remaining)).toBe(remaining);
  await gameMenu(page, "继续游戏");
  await expect.poll(() => live(page).getByRole("meter").getAttribute("aria-valuenow")).not.toBe(String(Math.ceil(remaining)));
  await key(page, "Space"); // Game pause, never audio pause.
  await gameMenu(page, "新游戏");
  await gameMenu(page, "取消");
  await gameMenu(page, "继续游戏");
  await key(page, "Enter");
  await expect(live(page).locator(".iquiz-game")).toHaveAttribute("data-phase", "answer");
  await home(page); await choose(page, "正在播放");
  const after = await page.evaluate(() => {
    const probe = (window as any).__gameProbe;
    return { time: probe.audio.currentTime, paused: probe.audio.paused, pauses: probe.pauses, loads: probe.loads,
      session: JSON.parse(localStorage.getItem("reipod-session") ?? "{}") };
  });
  expect(after.time).toBeGreaterThan(before.time);
  expect(after.paused).toBe(false); expect(after.pauses).toBe(0); expect(after.loads).toBe(0);
  expect(after.session.currentId).toBe(before.session.currentId);
  expect(after.session.queue).toEqual(before.session.queue);
});

test("Klondike draws, selects cards, cancels a restart, undoes and resumes after reload", async ({ page }) => {
  await page.goto("/"); await games(page, 1); await gameMenu(page, "新游戏");
  const board = live(page).locator(".klondike-game");
  await expect(board).toHaveAttribute("data-moves", "0");
  await key(page, "Enter"); await expect(board).toHaveAttribute("data-moves", "1");
  await key(page, "ArrowDown"); await key(page, "Enter");
  await expect(board).toHaveAttribute("data-picked", "1");
  await key(page, "Escape"); await gameMenu(page, "新游戏"); await gameMenu(page, "取消");
  await gameMenu(page, "继续游戏"); await expect(board).toHaveAttribute("data-moves", "1");
  await page.locator(".click-wheel").focus(); await page.keyboard.down("Enter");
  await expect(board).toHaveAttribute("data-moves", "0"); await page.keyboard.up("Enter");
  await key(page, "ArrowUp"); await key(page, "Enter"); await expect(board).toHaveAttribute("data-moves", "1");
  await page.reload(); await games(page, 1); await gameMenu(page, "继续游戏");
  await expect(board).toHaveAttribute("data-moves", "1");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("reipod-game-v1:klondike")!).data.waste.length)).toBe(1);
});

test("Vortex plays, HOLD pauses, saved control position survives and navigation freezes canvas pixels", async ({ page }) => {
  await page.goto("/"); await games(page, 2); await gameMenu(page, "新游戏");
  const board = live(page).locator(".vortex-game");
  await expect(board).toHaveAttribute("data-phase", "ready");
  await key(page, "Enter"); await expect(board).toHaveAttribute("data-phase", "playing");
  await expect.poll(async () => {
    const label = await board.getByRole("img").getAttribute("aria-label");
    return Number(label?.match(/，(\d+)分/)?.[1] ?? 0);
  }).toBeGreaterThan(0);
  await page.getByRole("switch", { name: "HOLD 锁定" }).click();
  await expect(live(page).locator(".classic-game-host")).toHaveAttribute("data-game-mode", "pause");
  const read = () => page.evaluate(() => JSON.parse(localStorage.getItem("reipod-game-v1:vortex")!).data);
  const held = await read(); await page.waitForTimeout(200); expect((await read()).time).toBe(held.time);
  await page.getByRole("switch", { name: "HOLD 锁定" }).click();
  await gameMenu(page, "继续游戏"); await key(page, "ArrowDown"); await key(page, "Space");
  expect((await read()).paddle).not.toBe(held.paddle);
  await gameMenu(page, "继续游戏");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await key(page, "Home");
  const pixels = await page.locator(".screen-outgoing canvas").evaluateAll(canvases => canvases.map(canvas => {
    const element = canvas as HTMLCanvasElement;
    return [...element.getContext("2d")!.getImageData(320, 240, 1, 1).data];
  }));
  expect(pixels.length).toBeGreaterThan(0);
  expect(pixels.some(pixel => pixel[3] > 0)).toBe(true);
  await expect(page.locator(".screen-outgoing")).toHaveCount(0);
});

test("mixed Chinese and accented titles keep all glyph ink inside the header across shell sizes", async ({ page }, testInfo) => {
  await page.addInitScript(() => localStorage.setItem("reipod-demos", "hidden"));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/"); await choose(page, "音乐"); await choose(page, "歌曲");
  const chooser = page.waitForEvent("filechooser"); await choose(page, "导入音乐");
  await (await chooser).setFiles(taggedAudio("混排 Song 0123", "Björk 中文", "Été 中文 Ångström"));
  await home(page); await choose(page, "音乐"); await choose(page, "专辑"); await choose(page, "Été 中文 Ångström");
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(() => document.fonts.ready);
    const measure = await live(page).locator(".screen-status > strong").evaluate(title => {
      const style = getComputedStyle(title), canvas = document.createElement("canvas"), ctx = canvas.getContext("2d")!;
      ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const metrics = ctx.measureText(title.textContent!);
      const line = parseFloat(style.lineHeight), baseline = (line - metrics.fontBoundingBoxAscent - metrics.fontBoundingBoxDescent) / 2 + metrics.fontBoundingBoxAscent;
      return { top: baseline - metrics.actualBoundingBoxAscent, bottom: baseline + metrics.actualBoundingBoxDescent,
        line, size: parseFloat(style.fontSize), scale: document.querySelector(".lcd-screen")!.getBoundingClientRect().width / 320 };
    });
    expect(measure.top).toBeGreaterThanOrEqual(-0.05);
    expect(measure.bottom).toBeLessThanOrEqual(measure.line + 0.05);
    expect(measure.size / measure.scale).toBeCloseTo(14, 1);
    await testInfo.attach(`header-${width}`, { body: await live(page).locator(".screen-status").screenshot(), contentType: "image/png" });
  }
});

test("saved bonus rounds offer both modes, pause in place and a new category screen replaces the old quiz", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("reipod-demos", "hidden"));
  await page.goto("/");
  await page.getByLabel("选择本地音频或歌词文件", { exact: true }).setInputFiles([
    taggedAudio("First", "Artist A", "Album A"), taggedAudio("Second", "Artist B", "Album B"),
    taggedAudio("Third", "Artist C", "Album C"),
  ]);
  await games(page); await gameMenu(page, "新游戏"); await key(page, "Enter");
  await expect(live(page).locator(".iquiz-game")).toHaveAttribute("data-phase", "question");
  await key(page, "Escape"); await home(page);
  // Valid persisted boundary fixture, not a claim that eight answers were played here.
  await page.evaluate(() => {
    const key = "reipod-game-v1:iquiz", saved = JSON.parse(localStorage.getItem(key)!);
    Object.assign(saved.data.state, { phase: "bonus", score: 80, index: 7 });
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await games(page); await gameMenu(page, "继续游戏");
  await expect(live(page).locator(".quiz-bonus-modes > div")).toHaveCount(2);
  await key(page, "ArrowDown"); await key(page, "Enter");
  await expect(live(page).locator(".iquiz-game")).toHaveAttribute("data-phase", "wager");
  await key(page, "ArrowDown"); await key(page, "Enter");
  await expect(live(page).locator(".iquiz-game")).toHaveClass(/iquiz-match/);
  await expect(live(page).locator(".quiz-answers > div")).toHaveCount(2);
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 }); await page.evaluate(() => document.fonts.ready);
    const board = live(page).locator(".iquiz-game");
    expect(await board.evaluate(el => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
    await testInfo.attach(`matching-${width}`, { body: await board.screenshot(), contentType: "image/png" });
  }
  await key(page, "Escape");
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("reipod-game-v1:iquiz")!).data.state);
  expect(saved).toMatchObject({ bonus: true, bonusKind: "match", wager: 25 });
  await gameMenu(page, "继续游戏"); await key(page, "Enter");
  await expect(live(page).locator(".iquiz-game")).toHaveAttribute("data-phase", "answer");
  await key(page, "Escape"); await gameMenu(page, "新游戏"); await gameMenu(page, "新游戏");
  await expect(live(page).locator(".iquiz-game")).toHaveAttribute("data-phase", "categories");
  await home(page); await page.reload(); await games(page); await gameMenu(page, "继续游戏");
  await expect(live(page).locator(".iquiz-game")).toHaveAttribute("data-phase", "categories");
});

test("Lightning uses Center for true and waiting for false without adding a strike", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/"); await games(page); await gameMenu(page, "新游戏");
  await key(page, "Enter"); await expect(live(page).locator(".iquiz-game")).toHaveAttribute("data-phase", "question");
  await key(page, "Escape"); await home(page);
  await page.evaluate(() => {
    const key = "reipod-game-v1:iquiz", saved = JSON.parse(localStorage.getItem(key)!);
    Object.assign(saved.data.state, { bonus: true, bonusKind: "lightning", index: 0, remaining: 0.4, phase: "question", score: 100, strikes: 0, wager: 25,
      questions: [{ prompt: "Fixture false statement", answers: ["正确", "错误"], correct: 1 },
        { prompt: "Fixture true statement", answers: ["正确", "错误"], correct: 0 }] });
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await games(page); await gameMenu(page, "继续游戏");
  await expect(live(page).locator(".quiz-feedback")).toHaveText("SKIPPED");
  await expect(live(page).locator(".quiz-game-header span")).toHaveText("$100");
  await key(page, "Enter"); await key(page, "Enter");
  await expect(live(page).locator(".quiz-feedback")).toHaveText("CORRECT");
  await expect(live(page).locator(".quiz-game-header span")).toHaveText("$125");
  await expect(live(page).getByLabel("0次错误")).toHaveText("");
});

test("Vortex resumes a sticky catch, releases it and keeps help reachable at 320px", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/"); await games(page, 2); await gameMenu(page, "新游戏");
  await key(page, "Escape"); await home(page);
  await page.evaluate(() => {
    const key = "reipod-game-v1:vortex", saved = JSON.parse(localStorage.getItem(key)!);
    Object.assign(saved.data, { phase: "playing", stickyUntil: 100, tripleUntil: 100, time: 0,
      balls: [{ x: 0, y: 110, vx: 0, vy: -100, caught: 0 }] });
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await games(page, 2); await gameMenu(page, "继续游戏");
  await key(page, "ArrowDown"); await key(page, "Escape");
  const caught = await page.evaluate(() => JSON.parse(localStorage.getItem("reipod-game-v1:vortex")!).data);
  expect(caught.balls[0].caught).toBe(0); expect(caught.balls[0].x).not.toBe(0);
  await gameMenu(page, "继续游戏"); await key(page, "Enter"); await key(page, "Escape");
  const released = await page.evaluate(() => JSON.parse(localStorage.getItem("reipod-game-v1:vortex")!).data);
  expect(released.balls[0].caught).toBeUndefined(); expect(released.lives).toBe(3);
  await gameMenu(page, "帮助"); await page.setViewportSize({ width: 320, height: 844 });
  const panel = live(page).locator(".game-menu-panel");
  const fits = await panel.evaluate(el => { const box = el.getBoundingClientRect(), last = el.querySelector(".game-menu-rows")!.getBoundingClientRect();
    return last.bottom <= box.bottom + 1 && el.scrollHeight <= el.clientHeight + 1; });
  expect(fits).toBe(true);
  await testInfo.attach("vortex-help-320", { body: await panel.screenshot(), contentType: "image/png" });
  await key(page, "Enter"); await gameMenu(page, "继续游戏");
  await expect(live(page).locator(".classic-game-host")).toHaveAttribute("data-game-mode", "play");
});

test("Vortex remembers real finger-position controls, keeps difficulty changes for new games and scrolls help", async ({ page }, info) => {
  await page.clock.install();
  await page.addInitScript(() => localStorage.setItem("reipod-classic-alarms-v1", JSON.stringify({ alarms: [], sleepAt: null, alerts: [],
    timer: { id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", duration: 300, remaining: 300000, deadline: Date.now()+300000 } })));
  await page.emulateMedia({ reducedMotion: "reduce" }); await page.goto("/"); await games(page, 2);
  await gameMenu(page, "选项"); await gameMenu(page, "控制：轮盘旋转");
  await gameMenu(page, "新游戏难度：Newbie"); await gameMenu(page, "Expert");
  await info.attach("vortex-options", { body: await live(page).screenshot(), contentType: "image/png" });
  await gameMenu(page, "返回"); await gameMenu(page, "新游戏");
  const board = () => live(page).locator(".vortex-game");
  await expect(board()).toHaveAttribute("data-level", "9"); await expect(board()).toHaveAttribute("data-control", "position");
  const ring = await page.locator(".click-wheel").boundingBox(); expect(ring).not.toBeNull();
  const cx = ring!.x + ring!.width / 2, cy = ring!.y + ring!.height / 2, radius = ring!.width * .37;
  await page.mouse.move(cx, cy-radius); await page.mouse.down(); await page.mouse.up();
  await expect(live(page).locator(".classic-game-host")).toHaveAttribute("data-game-mode", "play");
  await key(page, "Escape");
  const save = () => page.evaluate(() => JSON.parse(localStorage.getItem("reipod-game-v1:vortex")!).data);
  await expect.poll(async () => (await save()).paddle).toBeCloseTo(Math.PI * 1.5, 2);
  await page.reload(); await games(page, 2); await gameMenu(page, "继续游戏");
  await expect(board()).toHaveAttribute("data-level", "9"); await expect(board()).toHaveAttribute("data-control", "position");
  await key(page, "Escape"); await gameMenu(page, "选项"); await gameMenu(page, "控制：手指位置");
  await gameMenu(page, "新游戏难度：Expert"); await gameMenu(page, "Newbie"); await gameMenu(page, "返回"); await gameMenu(page, "继续游戏");
  await expect(board()).toHaveAttribute("data-level", "9"); await expect(board()).toHaveAttribute("data-control", "rotation");
  await page.mouse.move(cx+radius,cy); await page.mouse.down();
  for (const angle of [.2,.4,.6]) await page.mouse.move(cx+Math.cos(angle)*radius,cy+Math.sin(angle)*radius);
  await page.mouse.up(); await key(page, "Escape");
  const paddle = (await save()).paddle; expect(paddle).toBeGreaterThan(Math.PI*1.5); expect(paddle).toBeLessThan(Math.PI*1.5+1);
  await gameMenu(page, "帮助"); for (let i=0;i<8;i++) await key(page,"ArrowDown");
  expect(await live(page).locator(".game-help").evaluate(e=>e.scrollTop)).toBeGreaterThan(0);
  const bounds = await live(page).locator(".game-menu-rows").boundingBox(), lcd = await live(page).boundingBox();
  expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(lcd!.y+lcd!.height+1);
  await gameMenu(page,"返回"); await gameMenu(page,"新游戏"); await gameMenu(page,"取消"); await expect(board()).toHaveAttribute("data-level","9");
  await gameMenu(page,"新游戏"); await gameMenu(page,"新游戏"); await expect(board()).toHaveAttribute("data-level","1");
  await key(page, "Enter"); await expect(board()).toHaveAttribute("data-phase", "playing");
  await page.clock.fastForward(300000); await expect(live(page).getByRole("alert", { name: "倒计时结束" })).toBeVisible();
  await expect(live(page).locator(".classic-game-host")).toHaveAttribute("data-game-mode", "pause");
  await key(page, "Enter"); await expect(live(page).getByRole("alert")).toHaveCount(0);
  await expect(live(page).locator(".classic-game-host")).toHaveAttribute("data-game-mode", "pause");
});
