import { expect, test } from "vitest";
import {
  buildSlideshowOrder,
  defaultSlideshowSettings,
  nextSlideshowStep,
  parseSlideshowSettings,
  slideshowDurationLabel,
  slideshowMusicLabel,
  slideshowTransitionLabel,
} from "./slideshowSettings";

test("parseSlideshowSettings restores defaults and filters invalid inputs", () => {
  expect(parseSlideshowSettings(null)).toEqual(defaultSlideshowSettings);
  expect(
    parseSlideshowSettings({
      timePerSlide: 10,
      music: { playlistId: " pl-1 ", playlistName: " 晨间歌单 " },
      repeat: false,
      shuffle: true,
      transition: "wipe",
    }),
  ).toEqual({
    timePerSlide: 10,
    music: { playlistId: "pl-1", playlistName: "晨间歌单" },
    repeat: false,
    shuffle: true,
    transition: "wipe",
  });
  expect(
    parseSlideshowSettings({
      timePerSlide: 99,
      music: { playlistId: "  ", playlistName: "无效" },
      repeat: "no",
      shuffle: 1,
      transition: "zoom",
    }),
  ).toEqual(defaultSlideshowSettings);
  expect(slideshowDurationLabel(0)).toBe("手动");
  expect(slideshowDurationLabel(5)).toBe("5 秒");
  expect(slideshowMusicLabel("keep")).toBe("保持当前");
  expect(slideshowMusicLabel("off")).toBe("关闭");
  expect(
    slideshowMusicLabel(
      { playlistId: "pl-1", playlistName: "旧名" },
      [{ id: "pl-1", name: "新名" }],
    ),
  ).toBe("新名");
  expect(slideshowTransitionLabel("off")).toBe("关闭");
  expect(slideshowTransitionLabel("fade")).toBe("淡入淡出");
  expect(slideshowTransitionLabel("wipe")).toBe("划像");
});

test("buildSlideshowOrder wraps sequentially or shuffles remaining items starting at startIndex", () => {
  expect(buildSlideshowOrder(0, 0, false)).toEqual([]);
  expect(buildSlideshowOrder(4, 2, false)).toEqual([2, 3, 0, 1]);

  let seed = 1;
  const rng = () => {
    seed = (seed * 48271) % 2147483647;
    return seed / 2147483647;
  };
  const shuffled = buildSlideshowOrder(5, 3, true, rng);
  expect(shuffled[0]).toBe(3);
  expect(shuffled).toHaveLength(5);
  expect([...shuffled].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
});

test("nextSlideshowStep advances, wraps on repeat, and stops when repeat is off", () => {
  const order = [2, 0, 1];
  expect(nextSlideshowStep([], 0, true)).toBeNull();
  expect(nextSlideshowStep([0], 0, true)).toBeNull();
  expect(nextSlideshowStep(order, 0, false)).toEqual({ nextStep: 1, nextIndex: 0 });
  expect(nextSlideshowStep(order, 1, false)).toEqual({ nextStep: 2, nextIndex: 1 });
  expect(nextSlideshowStep(order, 2, false)).toBeNull();
  expect(nextSlideshowStep(order, 2, true)).toEqual({ nextStep: 0, nextIndex: 2 });
});
