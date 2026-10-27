export const optionalMainItems = [
  { key: "photos", label: "照片" },
  { key: "podcasts", label: "播客" },
  { key: "coverflow", label: "Cover Flow" },
  { key: "shuffle-all", label: "随机播放歌曲" },
  { key: "import", label: "导入音乐" },
  { key: "demo", label: "试听音乐" },
  { key: "playing", label: "正在播放" },
  { key: "extras", label: "附加功能" },
];
export const backlightTimes = [0, 5, 10, 20, 30, 60] as const;
export type BacklightTime = (typeof backlightTimes)[number];
export type Preferences = {
  menuVersion: 2;
  finish: "silver" | "black";
  background: "warm" | "dark";
  clickSound: boolean;
  brightness: number;
  backlight: BacklightTime;
  volumeLimit: number;
  mainMenu: string[];
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
    menuVersion: 2,
    finish: saved.finish === "black" ? "black" : "silver",
    background: saved.background === "dark" ? "dark" : "warm",
    clickSound: saved.clickSound !== false,
    brightness: number(saved.brightness, 1, 0.25),
    volumeLimit: number(saved.volumeLimit, 1, 0.1),
    backlight: backlightTimes.includes(saved.backlight as BacklightTime)
      ? (saved.backlight as BacklightTime)
      : 10,
    mainMenu: Array.isArray(saved.mainMenu)
      ? optionalMainItems
          .filter(
            (item) =>
              (saved.mainMenu as unknown[]).includes(item.key) ||
              (saved.menuVersion !== 2 &&
                ["photos", "podcasts"].includes(item.key)),
          )
          .map((item) => item.key)
      : optionalMainItems
          .filter((item) => !["coverflow", "import", "demo"].includes(item.key))
          .map((item) => item.key),
  };
}
