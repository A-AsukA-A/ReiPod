import { albumsFor, artistsFor, categoriesFor, songsByTitle } from "../player/library";
import type { MusicCategory } from "../player/library";
import type { Track } from "../player/Player";
import type { MenuItem } from "./MenuRows";
import type { Page } from "./navigation";

/** Classic category drill-in; no provider, storage or playback-session ownership. */
export function createClassicCategoryMenus({ tracks, open, playTrack, addToOnTheGo }: {
  tracks: Track[];
  open: (page: Page, key?: string, group?: string, artist?: string, category?: MusicCategory) => void;
  playTrack: (id: string, queue?: string[]) => void;
  addToOnTheGo?: (ids: string[], key: string) => void;
}): Partial<Record<Page, MenuItem[]>> {
  const play = (collection: Track[]) => () => {
    const ordered = songsByTitle(collection);
    if (ordered[0]) playTrack(ordered[0].id, ordered.map(track => track.id));
  };
  const detail = (collection: Track[]) => `${artistsFor(collection).length} 位艺人，${albumsFor(collection).length} 张专辑`;
  return {
    genres: tracks.length ? [
      { key: "all-artists", label: "全部艺人", detail: detail(tracks),
        hold: addToOnTheGo ? () => addToOnTheGo(tracks.map(track => track.id), "all-artists") : undefined,
        action: () => open("artists"), play: play(tracks) },
      ...categoriesFor(tracks, "genre").map(({ name: value, tracks: collection }) => {
        const category: MusicCategory = { kind: "genre", value };
        return { key: JSON.stringify(["genre", value]), label: value, detail: detail(collection),
          hold: addToOnTheGo ? () => addToOnTheGo(collection.map(track => track.id), JSON.stringify(["genre", value])) : undefined,
          action: () => open("artists", undefined, undefined, undefined, category), play: play(collection) };
      }),
    ] : [],
    composers: tracks.length ? [
      { key: "all-albums", label: "全部专辑", action: () => open("albums"), play: play(tracks),
        hold: addToOnTheGo ? () => addToOnTheGo(tracks.map(track => track.id), "all-albums") : undefined },
      ...categoriesFor(tracks, "composer").map(({ name: value, tracks: collection }) => {
        const category: MusicCategory = { kind: "composer", value };
        return { key: JSON.stringify(["composer", value]), label: value,
          hold: addToOnTheGo ? () => addToOnTheGo(collection.map(track => track.id), JSON.stringify(["composer", value])) : undefined,
          action: () => open("albums", undefined, undefined, undefined, category),
          play: play(collection) };
      }),
    ] : [],
  };
}
