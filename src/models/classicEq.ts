/** 22 Apple iPod classic EQ presets + Off; 3-band shelf/peaking gains are ReiPod Web Audio approximations. */
export const classicEqPresets = [
  { id: "off", label: "关闭", gains: [0, 0, 0] },
  { id: "acoustic", label: "原声", gains: [3, 1, 3] },
  { id: "bass-booster", label: "重低音增强", gains: [6, 0, 0] },
  { id: "bass-reducer", label: "低音减弱", gains: [-6, 0, 0] },
  { id: "classical", label: "古典", gains: [4, -1, 3] },
  { id: "dance", label: "舞曲", gains: [5, 1, 4] },
  { id: "deep", label: "深沉", gains: [5, 1, -3] },
  { id: "electronic", label: "电子", gains: [4, -1, 4] },
  { id: "flat", label: "平滑", gains: [0, 0, 0] },
  { id: "hip-hop", label: "嘻哈", gains: [5, -1, 2] },
  { id: "jazz", label: "爵士", gains: [3, -1, 3] },
  { id: "latin", label: "拉丁", gains: [4, -1, 4] },
  { id: "loudness", label: "响度", gains: [5, -2, 5] },
  { id: "lounge", label: "沙发音乐", gains: [-2, 3, -1] },
  { id: "piano", label: "钢琴", gains: [2, 1, 3] },
  { id: "pop", label: "流行", gains: [-1, 3, 2] },
  { id: "r-and-b", label: "节奏布鲁斯", gains: [5, 2, -1] },
  { id: "rock", label: "摇滚", gains: [4, -1, 4] },
  { id: "small-speakers", label: "小型扬声器", gains: [5, 1, -2] },
  { id: "spoken-word", label: "朗诵", gains: [-3, 5, -2] },
  { id: "treble-booster", label: "高音增强", gains: [0, 0, 6] },
  { id: "treble-reducer", label: "高音减弱", gains: [0, 0, -6] },
  { id: "vocal-booster", label: "人声增强", gains: [-2, 5, 1] },
] as const;

export type EqPresetId = (typeof classicEqPresets)[number]["id"];

export function parseEqPreset(value: unknown): EqPresetId {
  return classicEqPresets.some((item) => item.id === value)
    ? (value as EqPresetId)
    : "off";
}

export function eqPresetLabel(id: EqPresetId): string {
  return classicEqPresets.find((item) => item.id === id)?.label ?? "关闭";
}

export function eqPresetGains(id: EqPresetId): readonly [number, number, number] {
  return classicEqPresets.find((item) => item.id === id)?.gains ?? [0, 0, 0];
}
