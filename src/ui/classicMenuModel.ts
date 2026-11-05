import type { Album, MusicCategory } from "../player/library";
import { tracksForArtist } from "../player/library";
import type { Track } from "../player/Player";
import type { MenuItem } from "./MenuRows";
import type { Page } from "./navigation";

type Context = {
  page: Page;
  selectedKey: string | null;
  browseArtist?: string;
  category?: MusicCategory;
  managedRows: Partial<Record<Page, MenuItem[]>>;
  primaryRows: Record<"home" | "music" | "playlists" | "settings" | "confirm-clear", MenuItem[]>;
  browseAlbums: Album[];
  flowAlbums: Album[];
  browseTracks: Track[];
  artists: string[];
  visibleTracks: Track[];
  isTrackList: boolean;
  current?: Track;
  accountSyncing: boolean;
  emptyItems: MenuItem[];
  open: (page: Page, key?: string, group?: string, artist?: string, category?: MusicCategory) => void;
  playTrack: (id: string) => void;
  addToOnTheGo?: (ids: string[], key: string) => void;
};

/** Classic browse rows and focus only; commands and scoped collections come from App. */
export function createClassicMenuModel({ page, selectedKey, browseArtist, category, managedRows,
  primaryRows, browseAlbums, flowAlbums, browseTracks, artists, visibleTracks,
  isTrackList, current, accountSyncing, emptyItems, open, playTrack, addToOnTheGo }: Context) {
  const { home: homeItems, music: musicItems, playlists: playlistItems,
    settings: settingsItems, "confirm-clear": confirmItems } = primaryRows;
  const albumRows: MenuItem[] = (
    page === "coverflow" ? flowAlbums : page === "albums" ? browseAlbums : []
  ).map((album) => ({
    key: album.id,
    label: album.title,
    detail:
      browseArtist !== undefined
        ? `${album.tracks.length} 首歌曲`
        : album.artist,
    artwork: album.artwork,
    hold: page === "albums" && addToOnTheGo ? () => addToOnTheGo(album.tracks.map(track => track.id), album.id) : undefined,
    action: () =>
      open(
        page === "coverflow" ? "coverflow-album" : "album-tracks",
        page === "coverflow" ? album.tracks[0]?.id : undefined,
        album.id,
        page === "albums" ? browseArtist : undefined,
        page === "albums" ? category : undefined,
      ),
  }));
  const rows: MenuItem[] =
    managedRows[page] ??
    (page === "home"
      ? homeItems
      : page === "music"
        ? musicItems
        : page === "playlists"
          ? playlistItems
          : page === "settings"
            ? settingsItems
            : page === "confirm-clear"
              ? confirmItems
              : page === "coverflow" || page === "albums"
                ? (page === "albums" ? browseAlbums : flowAlbums).length
                  ? page === "albums"
                    ? [
                        {
                          key: "all-songs",
                          label: "全部歌曲",
                          detail: `${browseTracks.length} 首歌曲`,
                          aggregate: true,
                          hold: addToOnTheGo ? () => addToOnTheGo(browseTracks.map(track => track.id), "all-songs") : undefined,
                          action: () =>
                            category
                              ? open(category.kind === "genre" ? "genre-tracks" : "composer-tracks", undefined,
                                  category.value, browseArtist, category)
                              : browseArtist !== undefined
                              ? open("artist-tracks", undefined, browseArtist)
                              : open("songs"),
                        },
                        ...albumRows,
                      ]
                    : albumRows
                  : emptyItems
                : page === "artists"
                  ? artists.length
                    ? [
                        {
                          key: "all-albums",
                          label: "全部专辑",
                          hold: addToOnTheGo ? () => addToOnTheGo(browseTracks.map(track => track.id), "all-albums") : undefined,
                          action: () => category ? open("albums", undefined, undefined, undefined, category) : open("albums"),
                        },
                        ...artists.map((artist) => ({
                          key: artist,
                          label: artist,
                          hold: addToOnTheGo ? () => addToOnTheGo(tracksForArtist(browseTracks, artist).map(track => track.id), artist) : undefined,
                          action: () =>
                            open("albums", undefined, undefined, artist, category),
                        })),
                      ]
                    : emptyItems
                  : isTrackList && visibleTracks.length
                    ? visibleTracks.map((track) => ({
                        key: track.id,
                        label: track.title,
                        detail: track.artist || track.album || track.filename,
                        action: () => playTrack(track.id),
                      }))
                    : page === "favorites" || page === "search" ||
                        page === "playlist-tracks" || page === "playlist-add-tracks"
                      ? []
                      : !current || isTrackList
                        ? emptyItems
                        : []);
  const selectedIndex = Math.max(
    0,
    rows.findIndex(
      (row) =>
        row.key === selectedKey &&
        (!row.disabled || (page === "music-account" && accountSyncing)),
    ),
  );
  const focusedRow =
    rows[selectedIndex]?.disabled &&
    !(page === "music-account" && accountSyncing)
      ? rows.find((row) => !row.disabled)
      : rows[selectedIndex];
  return { rows, selectedIndex, focusedRow };
}
