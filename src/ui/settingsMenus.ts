import type { PlayerState } from "../player/Player";
import type { Page } from "./navigation";
import type { MenuItem } from "./MenuRows";
import type { Preferences } from "./classicSettings";
import { backlightTimes, optionalMainItems, optionalMusicItems, mainMenuOrder } from "./classicSettings";
import { settingChoices } from "./settingChoices";

type Context = {
  prefs: Preferences; state: PlayerState; originalSettingsItems: MenuItem[];
  cloud: boolean; serviceName: string; selectedService: string; localMusicCount: number;
  open: (page: Page, key?: string) => void; back: () => void; clear: () => void;
  setPreferences: (patch: Partial<Preferences>) => void;
  shuffle: (value: boolean) => void; repeat: (value: PlayerState["repeat"]) => void;
};
export function createSettingsMenus({ prefs, state, originalSettingsItems, cloud,
  serviceName, selectedService, localMusicCount, open, back, clear,
  setPreferences, shuffle, repeat }: Context) {
  const settingsItems: MenuItem[] = [
    originalSettingsItems[0],
    {
      key: "music-services",
      label: "音乐服务",
      value: cloud ? serviceName : "本地音乐",
      action: () => open("music-services", selectedService),
    },
    ...originalSettingsItems.slice(1).map((item) =>
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
    about: [{ key: "done", label: "返回", action: () => back() }],
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
  };
  return { settingsItems, confirmItems, managedRows };
}
