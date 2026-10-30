import type { WheelCommand } from "../input/ClickWheel";
import type { Player, PlayerState, Track } from "../player/Player";
import { songsByTitle, tracksForArtist } from "../player/library";
import type { MenuItem } from "./MenuRows";
import type { Page, NavigationAction } from "./navigation";
import { splitPages } from "./navigation";
import type { PlayView } from "./nowPlaying";
import type { TextReaderHandle } from "./TextReader";
import type { useWheelTextEntry } from "./WheelTextEntry";
import type { useLcdMotion } from "./useLcdMotion";

type Adjustment = { brightness: number; volumeLimit: number };
type TransportHint = "seek-forward" | "seek-backward";
type Context = {
  device: {
    held: boolean;
    sleeping: boolean;
    activate: () => void;
    setSleeping: (sleeping: boolean) => void;
  };
  navigation: {
    page: Page;
    groupKey?: string;
    selectedKey: string | null;
    dispatch: (action: NavigationAction) => void;
    open: (page: Page, selectedKey?: string, groupKey?: string) => void;
    back: () => void;
    capture: ReturnType<typeof useLcdMotion>;
    setNotice: (notice: string) => void;
  };
  menu: {
    rows: MenuItem[];
    focusedRow?: MenuItem;
    isTrackList: boolean;
    visibleIds: ReadonlySet<string>;
    visibleTracks: Track[];
    accountAuthorized: boolean;
    feedback: (kind: "step") => void;
  };
  playback: {
    player: Pick<Player, "getSnapshot" | "seek" | "setShuffle" | "setVolume" |
      "pause" | "play" | "toggle" | "next" | "previous">;
    state: Pick<PlayerState, "tracks" | "volumeControl" | "status" | "error">;
    current?: Track;
    playView: PlayView;
    ratings: Readonly<Record<string, number>>;
    setRating: (id: string, value: number) => boolean;
    toggleFavorite: (id?: string) => void;
    cyclePlayView: () => void;
    scrollLyrics: (steps: number) => void;
    showVolume: () => void;
    showTransportHint: (hint: TransportHint) => void;
    trackOptions: (id: string) => void;
  };
  library: {
    trackById: ReadonlyMap<string, Track>;
    musicTracks: Track[];
    browseTracks: Track[];
    albums: readonly { id: string }[];
    playTrack: (id: string, queue?: string[]) => void;
    playAlbum: (id: string) => void;
    playDefault: () => void;
  };
  photos: {
    activePhotos: readonly { id: string }[];
    photoIndex: number;
    slideshow: boolean;
    setSlideshow: (enabled: boolean) => void;
  };
  text: {
    textEntry: Pick<ReturnType<typeof useWheelTextEntry>, "editing" | "rotate" | "pick" | "setEditing">;
    query: string;
    playlistName: string;
    setQuery: (value: string) => void;
    setPlaylistName: (value: string) => void;
    saveName: () => void;
    reader: { readonly current: TextReaderHandle | null };
  };
  settings: {
    prefs: Adjustment;
    setPreferences: (patch: Partial<Adjustment>) => void;
  };
};

/** Classic's input priority only; the composition root supplies all live sessions and effects.
 * Recreate from the current render so page, authorization and playback snapshots stay current.
 */
export function createClassicInputController(context: Context) {
  const { held, sleeping, activate, setSleeping } = context.device;
  const { page, groupKey, selectedKey, dispatch, open, back, capture, setNotice } = context.navigation;
  const { rows, focusedRow, isTrackList, visibleIds, visibleTracks, accountAuthorized, feedback } = context.menu;
  const { player, state, current, playView, ratings, setRating, toggleFavorite,
    cyclePlayView, scrollLyrics, showVolume, showTransportHint, trackOptions } = context.playback;
  const { trackById, musicTracks, browseTracks, albums, playTrack, playAlbum, playDefault } = context.library;
  const { activePhotos, photoIndex, slideshow, setSlideshow } = context.photos;
  const { textEntry, query, playlistName, setQuery, setPlaylistName, saveName, reader } = context.text;
  const { prefs, setPreferences } = context.settings;
  const rotate = (
    steps: number,
    _source: "pointer" | "wheel" | "keyboard" = "pointer",
  ) => {
    if (held) return;
    activate();
    if (sleeping) {
      setSleeping(false);
      return;
    }
    if (textEntry.editing && (page === "search" || page === "playlist-name")) {
      textEntry.rotate(steps);
      return;
    }
    if (page === "text-reader") {
      reader.current?.scroll(steps);
      return;
    }
    if (page === "photo-grid" || page === "photo-full") {
      const destination = Math.max(
        0,
        Math.min(activePhotos.length - 1, photoIndex + steps),
      );
      setSlideshow(false);
      if (destination === photoIndex || !activePhotos[destination]) return;
      if (page === "photo-full") capture("replace");
      dispatch({ type: "select", key: activePhotos[destination].id });
      return;
    }
    if (page === "brightness") {
      setPreferences({ brightness: prefs.brightness + steps * 0.05 });
      return;
    }
    if (page === "volume-limit") {
      setPreferences({ volumeLimit: prefs.volumeLimit + steps * 0.05 });
      return;
    }
    if (page === "playing" && current) {
      if (playView === "seek")
        player.seek(player.getSnapshot().position + steps * 2);
      else if (playView === "shuffle") player.setShuffle(steps > 0);
      else if (playView === "rating") {
        if (!setRating(current.id, (ratings[current.id] ?? 0) + steps))
          setNotice("评分未能保存，本次仍生效");
      } else if (playView === "lyrics") scrollLyrics(steps);
      else if (state.volumeControl) {
        player.setVolume(player.getSnapshot().volume + steps * 0.025);
        showVolume();
      } else setNotice("侧键调音量 · 中心键调进度");
      return;
    }
    const keys = rows
      .filter(
        (row) =>
          !row.disabled ||
          (page === "music-account" && accountAuthorized),
      )
      .map((row) => row.key);
    const index = Math.max(0, keys.indexOf(focusedRow?.key ?? ""));
    if (
      keys[Math.max(0, Math.min(keys.length - 1, index + steps))] !==
      keys[index]
    )
      feedback("step");
    dispatch({ type: "move", keys, steps });
  };
  const chooseRow = (row: MenuItem) => {
    if (!row.disabled) {
      dispatch({ type: "select", key: row.key });
      row.action();
    }
  };
  const command = (value: WheelCommand) => {
    if (held) return;
    activate();
    if (sleeping) {
      setSleeping(false);
      return;
    }
    if (textEntry.editing && (page === "search" || page === "playlist-name")) {
      if (value === "select") {
        const next = textEntry.pick(page === "search" ? query : playlistName);
        if (next === null) {
          textEntry.setEditing(false);
          if (page === "playlist-name") saveName();
          else
            dispatch({
              type: "select",
              key: visibleTracks[0]?.id ?? "edit-search",
            });
        } else if (page === "search") setQuery(next);
        else setPlaylistName(next);
        return;
      }
      if (value === "menu") {
        textEntry.setEditing(false);
        return;
      }
    }
    if (page === "photo-grid" || page === "photo-full") {
      if (value === "next" || value === "previous") {
        rotate(value === "next" ? 1 : -1);
        return;
      }
      if (value === "seek-forward" || value === "seek-backward") {
        const destination = activePhotos.at(
          value === "seek-forward" ? -1 : 0,
        )?.id;
        if (!destination || destination === selectedKey)
          return;
        capture("replace");
        dispatch({
          type: "select",
          key: activePhotos.at(value === "seek-forward" ? -1 : 0)?.id ?? "",
        });
        return;
      }
      if (value === "options" && activePhotos[photoIndex]) {
        setSlideshow(false);
        open("photo-options", "slideshow", activePhotos[photoIndex].id);
        return;
      }
      if (value === "play") {
        if (page === "photo-grid")
          open("photo-full", activePhotos[photoIndex]?.id, groupKey);
        setSlideshow(!slideshow);
        return;
      }
      if (value === "select" && page === "photo-full") {
        setSlideshow(!slideshow);
        return;
      }
    }
    if (value === "sleep") {
      player.pause();
      setSleeping(true);
      return;
    }
    if (page === "text-reader") {
      if (value === "next" || value === "previous") {
        reader.current?.scroll(value === "next" ? 1 : -1, true);
        return;
      }
      if (value === "seek-forward" || value === "seek-backward") {
        reader.current?.edge(value === "seek-forward");
        return;
      }
      if (value === "select" || value === "options") {
        if (!reader.current?.retry()) open("text-options", "resume", groupKey);
        return;
      }
    }
    if (value === "seek-forward" || value === "seek-backward") {
      showTransportHint(value);
      player.seek(
        player.getSnapshot().position + (value === "seek-forward" ? 2 : -2),
      );
      return;
    }
    if (value === "options") {
      const id =
        page === "playing"
          ? current?.id
          : isTrackList && visibleIds.has(focusedRow?.key ?? "")
            ? focusedRow?.key
            : undefined;
      if (id) trackOptions(id);
      return;
    }
    if (value === "home") {
      textEntry.setEditing(false);
      setSlideshow(false);
      if (page !== "home")
        capture(
          page === "coverflow" ? "flow-close" : "back",
          splitPages.has(page),
        );
      dispatch({ type: "home" });
      setNotice("");
    }
    if (value === "menu") back();
    if (value === "favorite")
      toggleFavorite(
        page === "playing"
          ? current?.id
          : isTrackList
            ? focusedRow?.key
            : undefined,
      );
    if (value === "select") {
      if (page === "playing" && current) {
        if (state.error || state.status === "error") player.play();
        else cyclePlayView();
      } else if (focusedRow) chooseRow(focusedRow);
    }
    if (value === "play") {
      if (
        page === "playlist-add-tracks" &&
        focusedRow &&
        trackById.has(focusedRow.key)
      ) {
        playTrack(
          focusedRow.key,
          state.tracks.map((track) => track.id),
        );
      } else if (page === "coverflow" || page === "albums") {
        if (page === "albums" && focusedRow?.key === "all-songs") {
          const tracks = songsByTitle(browseTracks);
          if (tracks[0])
            playTrack(
              tracks[0].id,
              tracks.map((track) => track.id),
            );
        } else if (albums.length && focusedRow) playAlbum(focusedRow.key);
        else if (focusedRow) chooseRow(focusedRow);
      } else if (page === "artists" && focusedRow) {
        const tracks = songsByTitle(
          focusedRow.key === "all-albums"
            ? musicTracks
            : tracksForArtist(musicTracks, focusedRow.key),
        );
        if (tracks[0])
          playTrack(
            tracks[0].id,
            tracks.map((track) => track.id),
          );
      } else if (isTrackList && visibleIds.has(focusedRow?.key ?? "")) {
        if (focusedRow!.key === player.getSnapshot().currentId) player.toggle();
        else chooseRow(focusedRow!);
      } else if (player.getSnapshot().currentId) player.toggle();
      else playDefault();
    }
    if (value === "next" || value === "previous") {
      if (page === "coverflow") {
        rotate(value === "next" ? 1 : -1);
        return;
      }
      if (!state.tracks.length) {
        setNotice("先选择一首歌曲");
        return;
      }
      if (value === "next") player.next();
      else player.previous();
      if (!current) open("playing");
    }
  };

  return { rotate, command };
}
