import { expect, it } from "vitest";
import { menuPreview } from "./menuPreview";
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
});
