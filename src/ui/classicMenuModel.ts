import type { Album } from "../player/library";
import type { Track } from "../player/Player";
import type { MenuItem } from "./MenuRows";
import type { Page } from "./navigation";

type Context = {
  page: Page;
  selectedKey: string | null;
  browseArtist?: string;
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
  open: (page: Page, key?: string, group?: string, artist?: string) => void;
  playTrack: (id: string) => void;
  beginText: () => void;
};

/** Classic browse rows and focus only; commands and scoped collections come from App. */
export function createClassicMenuModel({ page, selectedKey, browseArtist, managedRows,
  primaryRows, browseAlbums, flowAlbums, browseTracks, artists, visibleTracks,
  isTrackList, current, accountSyncing, emptyItems, open, playTrack, beginText }: Context) {
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
    action: () =>
      open(
        page === "coverflow" ? "coverflow-album" : "album-tracks",
        album.tracks[0]?.id,
        album.id,
        page === "albums" ? browseArtist : undefined,
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
                          action: () =>
                            browseArtist !== undefined
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
                          action: () => open("albums"),
                        },
                        ...artists.map((artist) => ({
                          key: artist,
                          label: artist,
                          action: () =>
                            open("albums", undefined, undefined, artist),
                        })),
                      ]
                    : emptyItems
                  : isTrackList && visibleTracks.length
                    ? [
                        ...visibleTracks.map((track) => ({
                          key: track.id,
                          label: track.title,
                          detail: track.artist || track.album || track.filename,
                          action: () => playTrack(track.id),
                        })),
                        ...(page === "search"
                          ? [
                              {
                                key: "edit-search",
                                label: "修改搜索…",
                                action: beginText,
                              },
                            ]
                          : []),
                      ]
                    : page === "favorites" ||
                        page === "search" ||
                        page === "playlist-tracks" ||
                        page === "playlist-add-tracks"
                      ? page === "search"
                        ? [
                            {
                              key: "edit-search",
                              label: "修改搜索…",
                              action: beginText,
                            },
                          ]
                        : []
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
