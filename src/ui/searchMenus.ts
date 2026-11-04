import type { LibrarySearchResult } from "../player/librarySearch";
import type { MenuItem } from "./MenuRows";
import type { Page } from "./navigation";

type Context = {
  results: readonly LibrarySearchResult[];
  query: string;
  begin: () => void;
  open: (page: Page, key?: string, group?: string, artist?: string) => void;
  play: (id: string, queue?: string[]) => void;
};
/** Type-specific navigation never starts playback for an artist/album/playlist result. */
export function createSearchMenu({ results, query, begin, open, play }: Context): MenuItem[] {
  const queue = results.flatMap(result => result.track ? [result.track.id] : []);
  return [
    { key: "edit-search", label: "搜索", detail: query ? `搜索：${query}` : "输入搜索文字",
      searchKind: "search", leaf: true, action: begin },
    ...results.map((result): MenuItem => ({
      key: result.key, label: result.title, detail: result.detail,
      artwork: result.artwork, searchKind: result.kind, leaf: true,
      action: () => {
        if (result.track) play(result.track.id, queue);
        else if (result.kind === "artist") open("albums", undefined, undefined, result.target);
        else if (result.kind === "album") open("album-tracks", undefined, result.target);
        else if (result.kind === "playlist") open("playlist-tracks", undefined, result.target);
      },
    })),
  ];
}
