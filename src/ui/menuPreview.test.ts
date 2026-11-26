import { expect, it } from "vitest";
import { menuPreview } from "./menuPreviewModel";
it("selects a contextual card without confusing a setting with a music category", () => {
  expect(menuPreview("home", "music", "音乐").kind).toBe("covers");
  expect(menuPreview("home", "shuffle-all", "随机播放歌曲")).toMatchObject({
    kind: "card",
    icon: "shuffle",
  });
  expect(menuPreview("home", "settings", "设置").icon).toBe("settings");
  expect(menuPreview("home", "playing", "正在播放").kind).toBe("playing");
  expect(menuPreview("settings", "shuffle", "随机播放", "关闭")).toEqual({
    kind: "card",
    icon: "shuffle",
    title: "随机播放",
    detail: "关闭",
  });
  expect(menuPreview("music", "search", "搜索").icon).toBe("search");
  expect(menuPreview("music", "compilations", "合辑").kind).toBe("covers");
  expect(menuPreview("settings", "eq", "均衡器", "关闭")).toEqual({
    kind: "card",
    icon: "eq",
    title: "均衡器",
    detail: "关闭",
  });
  expect(menuPreview("eq", "bass-booster", "重低音增强", "✓")).toEqual({
    kind: "card",
    icon: "eq",
    title: "重低音增强",
    detail: undefined,
  });
  expect(menuPreview("settings", "sound-check", "音量平衡", "关闭")).toEqual({
    kind: "card",
    icon: "speaker",
    title: "音量平衡",
    detail: "关闭",
  });
  expect(menuPreview("sound-check", "true", "开启", "✓")).toEqual({
    kind: "card",
    icon: "speaker",
    title: "开启",
    detail: undefined,
  });
  expect(menuPreview("settings", "date-time", "日期与时间").icon).toBe("clock");
  expect(menuPreview("reipod-settings", "photo-settings", "照片设置").icon).toBe("photos");
  expect(menuPreview("reipod-settings", "alarm-settings", "闹钟与计时").icon).toBe("clock");
  expect(menuPreview("reipod-settings", "organizer", "日历与通讯录").icon).toBe("playlists");
  expect(menuPreview("reipod-settings", "metadata-license", "音频解析器许可").icon).toBe("info");
  expect(menuPreview("reipod-settings", "font-license", "字体许可").icon).toBe("info");
});
