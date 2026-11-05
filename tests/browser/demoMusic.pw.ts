import { test, expect } from "@playwright/test";
import { choose, key, live, holdCenter } from "./dial";

for (const song of [
  { title: "晴天", album: "叶惠美", file: "qingtian", time: 30, duration: 269.504, words: 493, lines: 62 },
  { title: "七里香", album: "七里香", file: "qilixiang", time: 28.5, duration: 297.247, words: 0, lines: 38 },
  { title: "兰亭序", album: "魔杰座", file: "lantingxu", time: 27, duration: 253.936, words: 377, lines: 37 },
]) {
  test(`${song.title} plays its real distributed file and exposes artwork and genuine synchronized lyrics`, async ({ page }, testInfo) => {
    await page.addInitScript(() => {
      localStorage.setItem("reipod-appearance", JSON.stringify({ clickSound: false, backlight: 0 }));
      window.Audio = new Proxy(window.Audio, { construct(target, args) {
        const audio = Reflect.construct(target, args) as HTMLAudioElement;
        (window as any).__demoAudio = audio;
        return audio;
      } });
    });
    await page.goto("/");
    await choose(page, "音乐"); await choose(page, "歌曲"); await choose(page, song.title);
    await expect(live(page).locator('.np-info strong')).toHaveText(song.title);
    await expect(live(page).locator('.np-cover img').first()).toHaveAttribute('src', new RegExp(`/artwork/${song.file}\\.jpg$`));
    await expect.poll(() => page.evaluate(() => {
      const audio = (window as any).__demoAudio as HTMLAudioElement | undefined;
      return !!audio && !audio.paused && audio.currentTime > .1 && !audio.error;
    })).toBe(true);
    const media = await page.evaluate(() => {
      const audio = (window as any).__demoAudio as HTMLAudioElement;
      return { src: audio.currentSrc, duration: audio.duration };
    });
    expect(media.src).toContain(`/music/${song.file}.m4a`);
    expect(media.duration).toBeCloseTo(song.duration, 0);
    await key(page, 'Space');
    await page.evaluate(time => {
      const audio = (window as any).__demoAudio as HTMLAudioElement;
      audio.currentTime = time; audio.dispatchEvent(new Event('timeupdate'));
    }, song.time);
    await holdCenter(page); await key(page, 'Enter');
    const list = live(page).locator('.lyrics-lines');
    await expect(list.locator('p')).toHaveCount(song.lines);
    await expect(list.locator('.lyric-word')).toHaveCount(song.words);
    await expect(list.locator('.active-lyric')).toHaveCount(1);
    await expect(live(page).locator('.lyrics-header strong')).toHaveText(song.title);
    await expect(live(page).locator('.lyrics-header .album-art img')).toHaveAttribute('alt', `${song.album} 封面`);
    await expect.poll(() => list.getAttribute('data-moving')).not.toBe('true');
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.classic-device').screenshot({ path: testInfo.outputPath(`${song.file}-lyrics.png`) });
  });
}
