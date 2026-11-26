import { nativeExperienceAvailable } from "../services/nativeExperience";
import type { PlayerState } from "../player/Player";
import type { Page } from "./navigation";
import type { MenuItem } from "./MenuRows";
import type { Preferences } from "./classicSettings";
import { backlightTimes, optionalMainItems, optionalMusicItems, mainMenuOrder, parsePreferences } from "./classicSettings";
import { classic2007 } from "../models/classic";
import { classicEqPresets } from "../models/classicEq";
import { settingChoices } from "./settingChoices";

type Context = {
  prefs: Preferences; state: PlayerState; originalSettingsItems: MenuItem[];
  cloud: boolean; serviceName: string; selectedService: string; localMusicCount: number;
  localTools?: MenuItem[];
  open: (page: Page, key?: string) => void; back: () => void; clear: () => void;
  setPreferences: (patch: Partial<Preferences>) => void;
  shuffle: (value: boolean | "albums") => void; repeat: (value: PlayerState["repeat"]) => void;
};
export function createSettingsMenus({ prefs, state, originalSettingsItems, cloud,
  serviceName, selectedService, localMusicCount, open, back, clear,
  setPreferences, shuffle, repeat, localTools = [] }: Context) {
  const stockKeys: readonly string[] = classic2007.menus.settingsOrder;
  const settingsItems: MenuItem[] = [
    ...originalSettingsItems.filter(item => stockKeys.includes(item.key))
      .sort((a,b) => stockKeys.indexOf(a.key) - stockKeys.indexOf(b.key)),
    { key: "reipod-settings", label: "ReiPod 设置", detail: "音乐服务、导入、歌词与外观", action: () => open("reipod-settings", "music-services") },
    { key: "reset-settings", label: "还原设置", action: () => open("reset-settings", "cancel") },
  ];
  const extensionItems: MenuItem[] = [
    {
      key: "music-services",
      label: "音乐服务",
      value: cloud ? serviceName : "本地音乐",
      action: () => open("music-services", selectedService),
    },
    ...localTools,
    { key: "alarm-settings", label: "闹钟与计时", action: () => open("alarm-settings") },
    { key: "organizer", label: "日历与通讯录", action: () => open("organizer-settings") },
    ...(nativeExperienceAvailable() ? [{ key: "haptics", label: "触觉反馈", value: prefs.haptics ? "开启" : "关闭",
      leaf: true, action: () => setPreferences({ haptics: !prefs.haptics }) }] : []),
    { key: "photo-settings", label: "照片设置", action: () => open("photo-settings") },
    { key: "podcast-settings", label: "播客设置", action: () => open("podcast-settings") },
    ...originalSettingsItems.filter(item => !stockKeys.includes(item.key)).map((item) =>
      item.key === "clear"
        ? {
            ...item,
            label: "清空本地音乐资料库",
            disabled: !localMusicCount,
          }
        : item,
    ),
  ];
  const confirmItems: MenuItem[] = [
    { key: "cancel", label: "取消", action: () => back() },
    {
      key: "confirm",
      label: "清空资料库",
      action: () => {
        clear();
      },
    },
  ];
  const choices = settingChoices(
    prefs,
    state,
    setPreferences,
    shuffle,
    repeat,
  );
  const managedRows: Partial<Record<Page, MenuItem[]>> = {
    "reipod-settings": extensionItems,
    "reset-settings": [
      { key: "cancel", label: "取消", leaf: true, action: back },
      { key: "reset", label: "还原", leaf: true, action: () => {
        const defaults = parsePreferences(null);
        // A physical finish, service account and ReiPod extensions are not firmware settings.
        setPreferences({ clickSound: defaults.clickSound, brightness: defaults.brightness,
          backlight: defaults.backlight, volumeLimit: defaults.volumeLimit,
          mainMenu: defaults.mainMenu, musicMenu: defaults.musicMenu,
          eq: defaults.eq, soundCheck: defaults.soundCheck, playbackSpeed: defaults.playbackSpeed,
          timeInTitle: defaults.timeInTitle, timeFormat: defaults.timeFormat, slideshow: defaults.slideshow });
        shuffle(false); repeat("off"); back();
      } },
    ],
    ...Object.fromEntries(
      Object.entries(choices).map(([name, items]) => [
        name,
        items.map((item) => ({
          key: item.key,
          label: item.label,
          value: item.selected ? "✓" : undefined,
          leaf: true,
          action: () => {
            item.apply();
            back();
          },
        })),
      ]),
    ),
    about: [],
    "main-menu": [
      {
        key: "music",
        label: "音乐",
        value: "固定",
        disabled: true,
        action: () => {},
      },
      {
        key: "settings",
        label: "设置",
        value: "固定",
        disabled: true,
        action: () => {},
      },
      ...optionalMainItems.map((item) => ({
        key: item.key,
        label: item.label,
        value: prefs.mainMenu.includes(item.key) ? "✓" : "—",
        leaf: true,
        action: () =>
          setPreferences({
            mainMenu: prefs.mainMenu.includes(item.key)
              ? prefs.mainMenu.filter((key) => key !== item.key)
              : [...prefs.mainMenu, item.key],
          }),
      })),
    ].sort(
      (a, b) => mainMenuOrder.indexOf(a.key) - mainMenuOrder.indexOf(b.key),
    ),
    "music-menu": optionalMusicItems.map((item) => ({
      ...item,
      value: prefs.musicMenu.includes(item.key) ? "✓" : "—",
      leaf: true,
      action: () =>
        setPreferences({
          musicMenu: prefs.musicMenu.includes(item.key)
            ? prefs.musicMenu.filter((key) => key !== item.key)
            : [...prefs.musicMenu, item.key],
        }),
    })),
    backlight: backlightTimes.map((seconds) => ({
      key: `backlight-${seconds}`,
      label: seconds ? `${seconds} 秒` : "始终开启",
      value: prefs.backlight === seconds ? "✓" : undefined,
      leaf: true,
      action: () => {
        setPreferences({ backlight: seconds });
        back();
      },
    })),
    brightness: [{ key: "done", label: "完成", action: () => back() }],
    "volume-limit": [{ key: "done", label: "完成", action: () => back() }],
    eq: classicEqPresets.map((preset) => ({
      key: preset.id,
      label: preset.label,
      value: prefs.eq === preset.id ? "✓" : undefined,
      leaf: true,
      action: () => {
        setPreferences({ eq: preset.id });
        back();
      },
    })),
    "date-time": [
      {
        key: "time-in-title",
        label: "标题栏显示时间",
        value: prefs.timeInTitle ? "开启" : "关闭",
        leaf: true,
        action: () => setPreferences({ timeInTitle: !prefs.timeInTitle }),
      },
      {
        key: "time-format",
        label: "时间格式",
        value: prefs.timeFormat === "12h" ? "12 小时制" : "24 小时制",
        leaf: true,
        action: () => setPreferences({ timeFormat: prefs.timeFormat === "12h" ? "24h" : "12h" }),
      },
      {
        key: "clock",
        label: "世界时钟",
        action: () => open("clock"),
      },
    ],
  };
  return { settingsItems, confirmItems, managedRows };
}
