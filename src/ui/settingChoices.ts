import type { Preferences } from "./preferences";
import type { PlayerState } from "../player/Player";
import { shuffleModeOf } from "../player/ordering";
export type SettingChoice = {
  key: string;
  label: string;
  selected: boolean;
  apply: () => void;
};
export function settingChoices(
  prefs: Preferences,
  state: PlayerState,
  save: (patch: Partial<Preferences>) => void,
  shuffle: (value: boolean | "albums") => void,
  repeat: (value: PlayerState["repeat"]) => void,
): Record<string, SettingChoice[]> {
  return {
    "lyrics-display": [false, true].map((value) => ({
      key: String(value),
      label: value ? "开启" : "关闭",
      selected: prefs.lyricsEnabled === value,
      apply: () => save({ lyricsEnabled: value }),
    })),
    finish: (
      [
        ["silver", "银色"],
        ["black", "黑色"],
      ] as const
    ).map(([key, label]) => ({
      key,
      label,
      selected: prefs.finish === key,
      apply: () => save({ finish: key }),
    })),
    background: (
      [
        ["transparent", "透明"],
        ["warm", "浅色"],
        ["dark", "深色"],
      ] as const
    ).map(([key, label]) => ({
      key,
      label,
      selected: prefs.background === key,
      apply: () => save({ background: key }),
    })),
    "click-sound": [false, true].map((value) => ({
      key: String(value),
      label: value ? "开启" : "关闭",
      selected: prefs.clickSound === value,
      apply: () => save({ clickSound: value }),
    })),
    "shuffle-mode": ([false, true, "albums"] as const).map((value) => ({
      key: String(value),
      label: value === "albums" ? "专辑" : value ? "歌曲" : "关闭",
      selected: shuffleModeOf(state) === (value === "albums" ? "albums" : value ? "songs" : "off"),
      apply: () => shuffle(value),
    })),
    "repeat-mode": (["off", "all", "one"] as const).map((value) => ({
      key: value,
      label: { off: "关闭", all: "全部", one: "单曲" }[value],
      selected: state.repeat === value,
      apply: () => repeat(value),
    })),
  };
}
