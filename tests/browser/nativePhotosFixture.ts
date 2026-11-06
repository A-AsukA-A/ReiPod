import type { Page } from "@playwright/test";

export async function nativePhotosFixture(page: Page, options: { count?: number; authorization?: string; holdTail?: boolean } = {}) {
  await page.addInitScript(({ count, authorization, holdTail }) => {
    let permission = authorization ?? "authorized";
    const images = Array.from({ length: count ?? 18 }, (_, index) => ({
      id: `asset-${index}`, name: `系统照片 ${index + 1}`, album: "all-photos", system: true,
      url: `./artwork/${index % 2 ? "qilixiang" : "qingtian"}.jpg?full=${index}`,
      thumbnail: `./artwork/${index % 2 ? "qilixiang" : "qingtian"}.jpg?thumb=${index}`,
      takenAt: Date.UTC(2026, 10, 6) - index * 86400000,
    }));
    let release!: () => void;
    const tail = holdTail ? new Promise<void>(resolve => { release = resolve; }) : Promise.resolve();
    const log = { calls: [] as { action: string; album?: string; offset?: number }[],
      release() { release?.(); },
      resize(count: number) { images.splice(count); window.dispatchEvent(new Event("reipod-native-photos")); },
      permission(value: string) { permission = value; window.dispatchEvent(new Event("reipod-native-photos")); } };
    const request = async (message: { action: string; album?: string; offset?: number; limit?: number }) => {
      log.calls.push(message);
      if (message.action === "authorize") permission = "authorized";
      const authorization = permission;
      if (message.action === "preview") return { authorization, photos: images.slice(message.offset ?? 0, (message.offset ?? 0) + 8), total: images.length,
        ...((message.offset ?? 0) + 8 < images.length ? { nextOffset: (message.offset ?? 0) + 8 } : {}) };
      if (message.action === "albums") return { authorization, total: images.length, albums: [
        { id: "all-photos", title: "所有照片", count: images.length, thumbnail: images[0]?.thumbnail },
        { id: "favorites", title: "个人收藏", count: 2, thumbnail: images[1]?.thumbnail },
      ] };
      if (message.action === "photos") {
        if (message.offset && holdTail) await tail;
        const entries = message.album === "favorites" ? images.slice(0, 2) : images;
        const offset = message.offset ?? 0, end = Math.min(entries.length, offset + (message.limit ?? 100));
        return { authorization, photos: entries.slice(offset, end), total: entries.length,
          ...(end < entries.length ? { nextOffset: end } : {}) };
      }
      return { authorization };
    };
    Object.defineProperty(window, "__REIPOD_NATIVE_PHOTOS_VERSION__", { value: 1 });
    Object.defineProperty(window, "webkit", { value: { messageHandlers: { reipodPhotos: { postMessage: request } } } });
    (window as any).__photosTest = log;
  }, options);
}
