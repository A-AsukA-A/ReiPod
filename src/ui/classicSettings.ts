import { classic2007 } from "../models/classic";
import { parseAppearance } from "./appearance";
import type { Appearance } from "./appearance";
export const optionalMainItems = [
  { key: "songs", label: "歌曲" },
  { key: "coverflow", label: "Cover Flow" },
  { key: "photos", label: "照片" },
  { key: "podcasts", label: "播客" },
  { key: "extras", label: "附加功能" },
  { key: "shuffle-all", label: "随机播放歌曲" },
  { key: "playing", label: "正在播放" },
];
// 2007 iPod classic order, with unsupported Videos omitted. Cover Flow is an opt-in shortcut.
export const mainMenuOrder: readonly string[] = classic2007.menus.homeOrder;
export const optionalMusicItems = [
  { key: "coverflow", label: "Cover Flow" },
  { key: "playlists", label: "播放列表" },
  { key: "artists", label: "艺人" },
  { key: "albums", label: "专辑" },
  { key: "songs", label: "歌曲" },
  { key: "genres", label: "风格" },
  { key: "composers", label: "作曲者" },
  { key: "search", label: "搜索" },
];
export const backlightTimes = [0, 5, 10, 20, 30, 60] as const;
export type BacklightTime = (typeof backlightTimes)[number];
export type Preferences = Appearance & {
  menuVersion: 3;
  backlightVersion: 1;
  clickSound: boolean;
  haptics: boolean;
  lyricsEnabled: boolean;
  brightness: number;
  backlight: BacklightTime;
  volumeLimit: number;
  mainMenu: string[];
  musicMenu: string[];
};
export function parsePreferences(value: unknown): Preferences {
  const saved =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const number = (input: unknown, fallback: number, min: number) =>
    typeof input === "number" && Number.isFinite(input)
      ? Math.max(min, Math.min(1, input))
      : fallback;
  return {
    menuVersion: 3,
    backlightVersion: 1,
    ...parseAppearance(saved),
    clickSound: saved.clickSound !== false,
    haptics: saved.haptics !== false,
    lyricsEnabled: saved.lyricsEnabled !== false,
    brightness: number(saved.brightness, 1, 0.25),
    volumeLimit: number(saved.volumeLimit, 1, 0.1),
    backlight: saved.backlight === 10 && saved.backlightVersion !== 1 ? 0
      : backlightTimes.includes(saved.backlight as BacklightTime)
      ? (saved.backlight as BacklightTime)
      : 0,
    mainMenu: Array.isArray(saved.mainMenu)
      ? optionalMainItems
          .filter(
            (item) =>
              ((saved.mainMenu as unknown[]).includes(item.key) &&
                (item.key !== "coverflow" || saved.menuVersion === 3)) ||
              (saved.menuVersion !== 2 &&
                saved.menuVersion !== 3 &&
                ["photos", "podcasts"].includes(item.key)),
          )
          .map((item) => item.key)
      : optionalMainItems
          .filter((item) => !["coverflow", "songs"].includes(item.key))
          .map((item) => item.key),
    musicMenu: optionalMusicItems
      .filter(
        (item) =>
          !Array.isArray(saved.musicMenu) || saved.musicMenu.includes(item.key),
      )
      .map((item) => item.key),
  };
}
