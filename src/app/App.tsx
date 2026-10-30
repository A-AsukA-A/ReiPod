import { useLocalPlayer } from "./useLocalPlayer";
import { createSettingsMenus } from "../ui/settingsMenus";
import { createTextMenus } from "../ui/textMenus";
import { createClassicMenuModel } from "../ui/classicMenuModel";
import { createTrackMenuOverrides } from "../ui/trackMenuOverrides";
import { ClassicScreenContent } from "../ui/ClassicScreenContent";
import { classicScreenTitle } from "../ui/classicScreenModel";
import { createClassicInputController } from "../ui/classicInputController";
import { ClassicShell } from "../ui/ClassicShell";
import { ClassicStatusBar } from "../ui/ClassicStatusBar";
import { backgroundColors } from "../ui/appearance";
import { useClassicPlaybackController } from "../ui/useClassicPlaybackController";
import { createMusicServiceActions } from "./musicServiceActions";
import { createMusicServiceMenus } from "../ui/musicServiceMenus";
import { usesExternalMusicLogin } from "../services/musicLogin";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { Track } from "../player/Player";
import { feedback } from "../input/feedback";
import {
  addDemos,
  clearLibrary,
  importFiles,
  removeTrack,
  initializeLibrary,
  onLibraryNotice,
  player as localPlayer,
} from "../player/store";
import {
  albumsFor,
  artistsFor,
  tracksForArtist,
  songsByTitle,
  coverFlowOrder,
} from "../player/library";
import {
  initialNavigation,
  navigationReducer,
  splitPages,
} from "../ui/navigation";
import type { Page } from "../ui/navigation";
import { useBacklight } from "../ui/useBacklight";
import { setPreferences, usePreferences } from "../ui/preferences";
import { useLcdMotion } from "../ui/useLcdMotion";
import { searchTracks } from "../player/search";
import { useRatings, setRating } from "../player/ratings";
import {
  usePlaylists,
  createPlaylist,
  renamePlaylist,
  deletePlaylist, togglePlaylistTrack, removePlaylistTrack, addToOnTheGo,
} from "../player/playlists";

import type { MenuItem } from "../ui/MenuRows";
import { createPrimaryMenus } from "../ui/primaryMenus";

import { MusicAccountHeader } from "../ui/MusicAccountHeader";
import { canShowLyrics } from "../ui/nowPlaying";
import { createMediaMenus } from "../ui/mediaMenus";
import { createLibraryMenus } from "../ui/libraryMenus";
import { FileImports } from "../ui/FileImports";
import { deletePhoto, restorePhotos, usePhotos } from "../media/photos";
import { usePodcastIds, playPodcast } from "../media/podcasts";
import { useWheelTextEntry } from "../ui/WheelTextEntry";
import {
  builtinDocuments,
  deleteText,
  importTexts,
  restoreTexts,
  saveReadingPosition,
  useTexts,
} from "../media/textDocuments";
import type { TextReaderHandle } from "../ui/TextReader";
import { applePlayer } from "../services/applePlayer";
import {
  authorizeSelectedMusicService,
  getMusicServices,
  initializeMusicServices,
  loadMusicPlaylist,
  playbackFrom,
  prepareSelectedMusicService,
  refreshSelectedMusicLibrary,
  searchSelectedMusicService,
  selectMusicService,
  signOutSelectedMusicService,
  useRemotePlayer,
  useMusicServices,
  openNativeMusicSettings,
  playerFor,
} from "../services/musicServices";
import {
  isThirdParty,
  thirdPartyNames,
  loadThirdPartyLyrics,
  reopenThirdPartyLogin,
} from "../services/thirdPartyMusic";
import type { MusicService } from "../services/musicServices";

const trackService = (track?: Track): MusicService =>
  track?.kind === "apple-music" ||
  track?.kind === "netease" ||
  track?.kind === "qq"
    ? track.kind
    : "local";

export function App() {
  const localState = useLocalPlayer();
  const remoteState = useRemotePlayer();
  const services = useMusicServices();
  const cloud = services.selected !== "local";
  const externalMusic = isThirdParty(services.selected);
  const serviceName = externalMusic
    ? thirdPartyNames[services.selected as "netease" | "qq"]
    : "Apple Music";
  const nativeMusic = services.transport === "ios";
  const player = playerFor(services.playback);
  const state = services.playback !== "local" ? remoteState : localState;
  const prefs = usePreferences();
  const localPlaylists = usePlaylists();
  const playlists = cloud ? services.playlists : localPlaylists;
  const ratings = useRatings();
  const photos = usePhotos();
  const texts = useTexts();
  const podcastIds = usePodcastIds();
  const localMusicTracks = useMemo(
    () => localState.tracks.filter((track) => !podcastIds.includes(track.id)),
    [localState.tracks, podcastIds],
  );
  const musicTracks = cloud ? services.libraryTracks : localMusicTracks;
  const podcastTracks = useMemo(
    () => localState.tracks.filter((track) => podcastIds.includes(track.id)),
    [localState.tracks, podcastIds],
  );
  const podcastShows = useMemo(() => albumsFor(podcastTracks), [podcastTracks]);
  const trackById = useMemo(
    () =>
      new Map(
        [...localState.tracks, ...remoteState.tracks].map((track) => [
          track.id,
          track,
        ]),
      ),
    [localState.tracks, remoteState.tracks],
  );
  const current = state.currentId ? trackById.get(state.currentId) : undefined;
  const albums = useMemo(() => albumsFor(musicTracks), [musicTracks]);
  const flowAlbums = useMemo(() => coverFlowOrder(albums), [albums]);
  const artists = useMemo(() => artistsFor(musicTracks), [musicTracks]);
  const [navigation, dispatch] = useReducer(
    navigationReducer,
    initialNavigation,
  );
  const navigationRef = useRef(navigation);
  navigationRef.current = navigation;
  const { page, groupKey, artist: browseArtist } = navigation.screen;
  const textDocument =
    texts.find((doc) => doc.id === groupKey) ??
    builtinDocuments[groupKey ?? ""];
  const isLocalText = texts.some((doc) => doc.id === groupKey);
  const reader = useRef<TextReaderHandle>(null);
  const [importingTexts, setImportingTexts] = useState(false);
  const browseTracks = useMemo(
    () =>
      browseArtist !== undefined
        ? tracksForArtist(musicTracks, browseArtist)
        : musicTracks,
    [musicTracks, browseArtist],
  );
  const browseAlbums = useMemo(
    () => (browseArtist !== undefined ? albumsFor(browseTracks) : albums),
    [albums, browseTracks, browseArtist],
  );
  const [notice, setNotice] = useState("");
  const [held, setHeld] = useState(false);
  const [sleeping, setSleeping] = useState(false);
  const { dimmed, activate } = useBacklight(prefs.backlight, sleeping);
  const [query, setQuery] = useState("");
  const [playlistName, setPlaylistName] = useState("");
  const [contextPlaylist, setContextPlaylist] = useState<string | null>(null);
  const optionQueue = useRef<string[] | undefined>(undefined);
  const [deleting, setDeleting] = useState(false);
  const {
    playView, lyricWheel, volumeOverlay, transportHint,
    cyclePlayView, resetPlayView, openLyrics, scrollLyrics, showVolume,
    showTransportHint,
  } = useClassicPlaybackController({
    page, current, lyricsEnabled: prefs.lyricsEnabled, volume: state.volume,
    // Invoked by effects/events after capture is initialized below.
    replace: () => capture("replace"),
    loadLyrics: loadThirdPartyLyrics,
  });
  const [slideshow, setSlideshow] = useState(false);
  const textEntry = useWheelTextEntry(
    state.tracks
      .map((track) => `${track.title}${track.artist ?? ""}${track.album ?? ""}`)
      .join(""),
  );
  const input = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const podcastInput = useRef<HTMLInputElement>(null);
  const textInput = useRef<HTMLInputElement>(null);
  const selectedRow = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const capture = useLcdMotion(
    content,
    `${page}:${groupKey ?? ""}:${browseArtist ?? ""}:${page === "playing" && playView === "lyrics" ? "lyrics" : page === "photo-full" ? navigation.screen.selectedKey : "page"}`,
  );
  const active = state.status === "playing";
  const busy = state.status === "loading" || state.status === "buffering";
  const selectedAlbum = browseAlbums.find((album) => album.id === groupKey);
  const selectedPlaylist = playlists.find((item) => item.id === groupKey);
  const activePhotos = useMemo(
    () =>
      groupKey && !["photo-options", "photo-delete"].includes(page)
        ? photos.filter((photo) => photo.album === groupKey)
        : photos,
    [photos, groupKey, page],
  );
  const optionTrack = groupKey ? trackById.get(groupKey) : undefined;
  const playlistTrackIds = useMemo(
    () => new Set(selectedPlaylist?.trackIds ?? []),
    [selectedPlaylist],
  );
  const trackPages: Page[] = [
    "songs",
    "local-songs",
    "demos",
    "album-tracks",
    "artist-tracks",
    "favorites",
    "recent",
    "queue",
    "playlist-tracks",
    "playlist-add-tracks",
    "search",
    "coverflow-album",
    "podcast-episodes",
    "genre-tracks",
    "composer-tracks",
  ];
  const isTrackList = trackPages.includes(page);
  const visibleTracks = useMemo(() => {
    if (page === "genre-tracks" || page === "composer-tracks")
      return musicTracks.filter((track) => {
        const values = page === "genre-tracks" ? track.genres : track.composers;
        return (
          values?.length
            ? values
            : [page === "genre-tracks" ? "未知风格" : "未知作曲者"]
        ).includes(groupKey ?? "");
      });
    if (page === "podcast-episodes")
      return (
        podcastShows
          .find((show) => show.id === groupKey)
          ?.tracks.slice()
          .sort((a, b) => (b.importedAt ?? 0) - (a.importedAt ?? 0)) ?? []
      );
    if (page === "local-songs") return songsByTitle(localMusicTracks);
    if (page === "search")
      return cloud
        ? services.searchResults
        : searchTracks(localMusicTracks, query);
    if (page === "playlist-tracks") {
      return (selectedPlaylist?.trackIds ?? []).flatMap(
        (id) => trackById.get(id) ?? [],
      );
    }
    if (page === "queue")
      return state.queue.flatMap((id) => trackById.get(id) ?? []);
    if (page === "demos")
      return localState.tracks.filter((track) => track.kind === "demo");
    if (page === "album-tracks") return selectedAlbum?.tracks ?? [];
    if (page === "coverflow-album")
      return albums.find((album) => album.id === groupKey)?.tracks ?? [];
    if (page === "artist-tracks")
      return songsByTitle(tracksForArtist(musicTracks, groupKey ?? ""));
    if (page === "songs") return songsByTitle(musicTracks);
    if (page === "favorites")
      return state.tracks.filter((track) => state.favorites.includes(track.id));
    if (page === "recent")
      return [...state.tracks].sort(
        (a, b) => (b.importedAt ?? 0) - (a.importedAt ?? 0),
      );
    return musicTracks;
  }, [
    page,
    groupKey,
    state.tracks,
    state.favorites,
    state.queue,
    albums,
    selectedAlbum,
    query,
    selectedPlaylist,
    trackById,
    musicTracks,
    podcastShows,
    localState.tracks,
    localMusicTracks,
    services.searchResults,
    cloud,
  ]);
  const visibleIds = useMemo(
    () => new Set(visibleTracks.map((track) => track.id)),
    [visibleTracks],
  );

  const open = (
    target: Page,
    selectedKey?: string,
    group?: string,
    artist?: string,
  ) => {
    const latest = player.getSnapshot();
    const defaultKey =
      target === "home"
        ? "music"
        : target === "settings"
          ? "about"
          : target === "confirm-clear"
            ? "cancel"
            : target === "music"
              ? "coverflow"
              : target === "coverflow"
                ? (flowAlbums.find((album) =>
                    album.tracks.some((track) => track.id === latest.currentId),
                  )?.id ?? flowAlbums[0]?.id)
                : target === "albums"
                  ? "all-songs"
                  : target === "artists"
                    ? "all-albums"
                    : target === "playlists"
                      ? "all"
                      : (latest.currentId ?? latest.tracks[0]?.id ?? "import");
    if (target !== page || group !== groupKey || artist !== browseArtist)
      capture(
        page === "coverflow" && target === "coverflow-album"
          ? "album-open"
          : target === "coverflow" && splitPages.has(page)
            ? "flow-open"
            : "forward",
        splitPages.has(page) && splitPages.has(target),
      );
    dispatch({
      type: "open",
      page: target,
      selectedKey,
      defaultKey,
      groupKey: group,
      artist,
    });
    setNotice("");
  };
  const back = (levels = 1) => {
    if (page === "photo-full") setSlideshow(false);
    if (navigation.history.length)
      capture(
        page === "coverflow-album" &&
          navigation.history.at(-levels)?.page === "coverflow"
          ? "album-close"
          : page === "coverflow" &&
              splitPages.has(navigation.history.at(-levels)?.page ?? "home")
            ? "flow-close"
            : "back",
        splitPages.has(page) &&
          splitPages.has(navigation.history.at(-levels)?.page ?? "home"),
      );
    dispatch({ type: "back", levels });
    setNotice("");
  };
  const openFiles = () => input.current?.click();
  const addFiles = (files: File[]) => {
    if (!files.length) return;
    const before = new Set(
      localPlayer.getSnapshot().tracks.map((track) => track.id),
    );
    const { added, rejected, lyrics } = importFiles(files);
    if (added) {
      open(
        cloud ? "local-songs" : "songs",
        localPlayer.getSnapshot().tracks.find((track) => !before.has(track.id))
          ?.id,
      );
      if (rejected) setNotice(`${rejected} 个文件未加入`);
    } else
      setNotice(
        lyrics
          ? "歌词已导入"
          : rejected
            ? "请选择音频或 LRC 文件"
            : "歌曲已在曲库中",
      );
  };
  const loadDemos = () => {
    addDemos();
    open("demos");
  };
  const playTrack = (
    id: string,
    queue = visibleTracks.map((track) => track.id),
  ) => {
    if (podcastIds.includes(id)) {
      playbackFrom("local");
      playPodcast(id, queue);
      resetPlayView();
      open("playing");
      return;
    }
    const source = trackService(trackById.get(id));
    const remote = source !== "local";
    if (remote && services.auth !== "authorized") {
      open("music-account", "login");
      return;
    }
    const target = playerFor(source);
    playbackFrom(source);
    target.activate(
      id,
      page === "queue" ? undefined : queue.length ? queue : undefined,
    );
    resetPlayView();
    open("playing");
  };
  const playAlbum = (albumId: string) => {
    const album = (page === "albums" ? browseAlbums : flowAlbums).find(
      (item) => item.id === albumId,
    );
    if (album?.tracks[0])
      playTrack(
        album.tracks[0].id,
        album.tracks.map((track) => track.id),
      );
  };
  const openDocument = (path: string) => {
    open("text-reader", undefined, path);
  };
  const addTextFiles = async (files: File[]) => {
    if (!files.length || importingTexts) return;
    setImportingTexts(true);
    try {
      const result = await importTexts(files);
      // Imports may finish after the user leaves the list; keep that navigation.
      if (result.firstId && navigationRef.current.screen.page === "notes")
        dispatch({ type: "select", key: result.firstId });
      setNotice(
        !result.persisted
          ? "文本未能保存，本次仍可阅读"
          : result.rejected
            ? `已导入 ${result.added} 篇；${result.rejected} 个文件不支持或超过 2 MB`
            : result.added
              ? `已导入 ${result.added} 篇文本`
              : "文本已在阅读列表中",
      );
    } finally {
      setImportingTexts(false);
    }
  };
  const shuffleAll = () => {
    const tracks = musicTracks;
    if (!tracks.length) {
      if (cloud) open("music-account", "login");
      else openFiles();
      return;
    }
    const first = tracks[Math.floor(Math.random() * tracks.length)];
    const target = playerFor(services.selected);
    playbackFrom(services.selected);
    target.setShuffle(true);
    target.setQueue(
      tracks.map((track) => track.id),
      first.id,
    );
    target.activate(first.id);
    resetPlayView();
    open("playing");
  };
  const toggleFavorite = (id?: string) => {
    if (!id || !trackById.has(id)) return;
    if (trackService(trackById.get(id)) !== "local") {
      setNotice("在线歌曲不加入本地收藏");
      return;
    }
    localPlayer.toggleFavorite(id);
    setNotice(
      localPlayer.getSnapshot().favorites.includes(id)
        ? "已加入我的收藏"
        : "已从收藏移除",
    );
  };
  const editName = (id?: string) => {
    textEntry.begin();
    setPlaylistName(playlists.find((item) => item.id === id)?.name ?? "");
    open("playlist-name", "save", id);
  };
  const saveName = () => {
    if (!playlistName.trim()) {
      setNotice("请输入歌单名称");
      return;
    }
    if (groupKey) {
      const persisted = renamePlaylist(groupKey, playlistName);
      back();
      if (!persisted) setNotice("歌单名称未能保存，本次仍生效");
    } else {
      const result = createPlaylist(playlistName);
      if (!result) return;
      back();
      if (!result.persisted) setNotice("歌单未能保存，本次仍可使用");
      else setNotice("歌单已创建，打开歌单可添加歌曲");
    }
  };
  const trackOptions = (id: string) => {
    setContextPlaylist(page === "playlist-tracks" ? (groupKey ?? null) : null);
    optionQueue.current = isTrackList
      ? visibleTracks.map((track) => track.id)
      : undefined;
    open(
      "track-options",
      canShowLyrics(trackById.get(id), prefs.lyricsEnabled)
        ? "lyrics"
        : "favorite",
      id,
    );
  };
  const {
    homeItems,
    musicItems: localMusicItems,
    playlistItems: localPlaylistItems,
    settingsItems: originalSettingsItems,
  } = createPrimaryMenus({
    state: cloud
      ? { ...remoteState, tracks: services.libraryTracks }
      : localState,
    prefs,
    albums,
    photoCount: photos.length,
    podcastShows,
    musicCount: musicTracks.length,
    current,
    playlists,
    trackById,
    open,
    shuffleAll,
    openFiles,
    loadDemos,
    editName,
    openDocument,
    beginText: textEntry.begin,
  });
  const { settingsItems, confirmItems, managedRows: settingsRows } = createSettingsMenus({
    prefs, state, originalSettingsItems, cloud, serviceName, selectedService: services.selected,
    localMusicCount: localMusicTracks.length, open, back, setPreferences,
    shuffle: value => player.setShuffle(value), repeat: value => player.setRepeat(value),
    clear: () => { capture("back"); clearLibrary(); dispatch({ type: "reset" }); setNotice("资料库已清空"); },
  });
  const serviceActions = createMusicServiceActions({
    getServices: getMusicServices,
    getNavigation: () => navigationRef.current,
    open,
    back,
    setNotice,
    ports: {
      select: selectMusicService,
      authorize: authorizeSelectedMusicService,
      prepare: prepareSelectedMusicService,
      refresh: refreshSelectedMusicLibrary,
      signOut: signOutSelectedMusicService,
      reopenLogin: reopenThirdPartyLogin,
      openSettings: openNativeMusicSettings,
      loadPlaylist: loadMusicPlaylist,
    },
  });
  const { account, musicItems, playlistItems, emptyItems, managedRows: serviceRows } = createMusicServiceMenus({
    services,
    serviceName,
    externalLogin: usesExternalMusicLogin(),
    localFirstId: localMusicTracks[0]?.id,
    page,
    localMusicItems,
    localPlaylistItems,
    open,
    beginText: textEntry.begin,
    clearQuery: () => setQuery(""),
    openFiles,
    loadDemos,
    actions: serviceActions,
  });
  const splitMenu = splitPages.has(page) && page !== "home" && page !== "music";
  const photoIndex = Math.max(
    0,
    activePhotos.findIndex(
      (photo) => photo.id === navigation.screen.selectedKey,
    ),
  );
  const managedRows: Partial<Record<Page, MenuItem[]>> = {
    ...serviceRows,
    "local-songs": [
      ...songsByTitle(localMusicTracks).map((track) => ({
        key: track.id,
        label: track.title,
        detail: track.artist || track.filename,
        action: () =>
          playTrack(
            track.id,
            songsByTitle(localMusicTracks).map((item) => item.id),
          ),
      })),
      { key: "import", label: "导入音乐", action: openFiles },
    ],
    genres: [
      ...new Set(
        musicTracks.flatMap((track) =>
          track.genres?.length ? track.genres : ["未知风格"],
        ),
      ),
    ]
      .sort()
      .map((name) => ({
        key: name,
        label: name,
        action: () => open("genre-tracks", undefined, name),
      })),
    composers: [
      ...new Set(
        musicTracks.flatMap((track) =>
          track.composers?.length ? track.composers : ["未知作曲者"],
        ),
      ),
    ]
      .sort()
      .map((name) => ({
        key: name,
        label: name,
        action: () => open("composer-tracks", undefined, name),
      })),
    ...createMediaMenus({
      photos,
      activePhotos,
      podcastShows,
      openPhotos: folder => {
        if (folder) photoInput.current?.setAttribute("webkitdirectory", "");
        else photoInput.current?.removeAttribute("webkitdirectory");
        photoInput.current?.click();
      },
      openPodcasts: () => podcastInput.current?.click(),
      deletePhoto,
      groupKey,
      open,
      back,
      setNotice,
      setSlideshow,
      getNavigation: () => navigationRef.current,
    }),
    ...settingsRows,
    ...createTextMenus({ texts, groupKey, isLocalText, importingTexts, deleting, open, back,
      openImport: () => textInput.current?.click(), setDeleting, setNotice,
      getNavigation: () => navigationRef.current, saveReadingPosition, deleteText }),
    ...createLibraryMenus({
      operations: { deletePlaylist, togglePlaylistTrack, removePlaylistTrack, addToOnTheGo, removeTrack,
        playNext: id => localPlayer.playNext(id) },
      page,
      groupKey,
      playlists: localPlaylists,
      state,
      musicTracks,
      visibleTracks,
      playlistTrackIds,
      optionTrack,
      contextPlaylist,
      deleting,
      editName,
      saveName,
      beginText: textEntry.begin,
      setDeleting,
      setNotice,
      open,
      back,
      navigationRef,
      playTrack,
      toggleFavorite,
    }),
  };
  Object.assign(managedRows, createTrackMenuOverrides({
    cloud, optionTrack, localTrack: trackService(optionTrack) === "local",
    localFavorites: localState.favorites, visibleTracks,
    baseOptions: managedRows["track-options"] ?? [],
    showLyrics: !!optionTrack && canShowLyrics(optionTrack, prefs.lyricsEnabled),
    open, back, playTrack, toggleFavorite,
    playNext: id => playerFor(trackService(optionTrack)).playNext(id),
    onLyrics: track => {
      const source = trackService(track);
      if (source !== "local" && services.auth !== "authorized") {
        open("music-account", "login");
        return;
      }
      if (current?.id !== track.id)
        playTrack(track.id, optionQueue.current);
      else if (navigation.history.at(-1)?.page === "playing") back();
      else open("playing");
      openLyrics();
    },
  }));
  const { rows, selectedIndex, focusedRow } = createClassicMenuModel({
    page, selectedKey: navigation.screen.selectedKey, browseArtist, managedRows,
    primaryRows: { home: homeItems, music: musicItems, playlists: playlistItems,
      settings: settingsItems, "confirm-clear": confirmItems },
    browseAlbums, flowAlbums, browseTracks, artists, visibleTracks, isTrackList,
    current, accountSyncing: services.syncing, emptyItems, open, playTrack,
    beginText: textEntry.begin,
  });
  const { rotate, command } = createClassicInputController({
    device: { held, sleeping, activate, setSleeping },
    navigation: { page, groupKey, selectedKey: navigation.screen.selectedKey,
      dispatch, open, back, capture, setNotice },
    menu: { rows, focusedRow, isTrackList, visibleIds, visibleTracks,
      accountAuthorized: services.auth === "authorized", feedback },
    playback: { player, state, current, playView, ratings, setRating, toggleFavorite,
      cyclePlayView, scrollLyrics, showVolume, showTransportHint, trackOptions },
    library: { trackById, musicTracks, browseTracks, albums, playTrack, playAlbum,
      playDefault: () => {
        const local = page === "local-songs" || !cloud;
        if (local && !localPlayer.getSnapshot().tracks.length) addDemos();
        const tracks = local
          ? localPlayer.getSnapshot().tracks
          : services.libraryTracks;
        const first = tracks[0];
        if (first)
          playTrack(
            first.id,
            tracks.map((track) => track.id),
          );
        else if (!local) account();
      },
    },
    photos: { activePhotos, photoIndex, slideshow, setSlideshow },
    text: { textEntry, query, playlistName, setQuery, setPlaylistName, saveName, reader },
    settings: { prefs, setPreferences },
  });

  useEffect(() => {
    localPlayer.setVolumeLimit(prefs.volumeLimit);
    applePlayer.setVolumeLimit(prefs.volumeLimit);
    playerFor("qq").setVolumeLimit(prefs.volumeLimit);
    playerFor("netease").setVolumeLimit(prefs.volumeLimit);
  }, [prefs.volumeLimit]);
  useEffect(() => {
    if (page === "search" && cloud && !textEntry.editing)
      void searchSelectedMusicService(query);
  }, [page, cloud, services.selected, textEntry.editing, query]);
  useEffect(() => {
    void restorePhotos();
    void restoreTexts();
    void initializeLibrary();
    void initializeMusicServices();
    return onLibraryNotice(setNotice);
  }, []);
  useEffect(() => {
    if (
      !slideshow ||
      page !== "photo-full" ||
      held ||
      sleeping ||
      activePhotos.length < 2
    )
      return;
    const timer = setTimeout(() => {
      capture("replace");
      dispatch({
        type: "select",
        key: activePhotos[(photoIndex + 1) % activePhotos.length].id,
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, [slideshow, page, photoIndex, activePhotos, held, sleeping]);
  useEffect(() => {
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute(
        "content",
        backgroundColors[prefs.background],
      );
  }, [prefs.background]);
  useLayoutEffect(() => {
    const row = selectedRow.current,
      container = row?.parentElement;
    if (!row || !container) return;
    const top =
      row.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop -
      container.clientTop;
    if (top < container.scrollTop) container.scrollTop = top;
    else if (
      top + row.offsetHeight >
      container.scrollTop + container.clientHeight
    )
      container.scrollTop = top + row.offsetHeight - container.clientHeight;
  }, [navigation.screen, focusedRow?.key]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 2200);
    return () => clearTimeout(timer);
  }, [notice]);
  const title = classicScreenTitle({ page, groupKey, browseArtist, playView,
    albumTitle: selectedAlbum?.title,
    podcastTitle: podcastShows.find(show => show.id === groupKey)?.title,
    documentTitle: textDocument?.title, playlistTitle: selectedPlaylist?.name, serviceName });
  return (
    <ClassicShell
      appearance={prefs}
      selectedService={services.selected}
      playbackSource={services.playback}
      page={page}
      view={page === "playing" ? playView : undefined}
      split={splitMenu || page === "home" || page === "music"}
      held={held}
      sleeping={sleeping}
      dimmed={dimmed}
      brightness={prefs.brightness}
      notice={notice}
      contentRef={content}
      onActivity={activate}
      onToggleHold={() => { activate(); setHeld(!held); }}
      wheel={{ onRotate: rotate, onCommand: command, onFeedback: feedback,
        playLabel: busy ? "取消载入" : active ? "暂停" : "播放" }}
      header={<ClassicStatusBar title={title} shuffle={state.shuffle} repeat={state.repeat}
        held={held} hasCurrent={!!current} active={active} busy={busy} transportHint={transportHint} />}
      imports={
      <FileImports
        audio={input}
        photos={photoInput}
        podcasts={podcastInput}
        texts={textInput}
        locked={held || sleeping}
        onAudio={addFiles}
        onTexts={(files) => {
          void addTextFiles(files);
        }}
        onPhotos={(result) => {
          const latest = navigationRef.current.screen;
          if (
            latest.page === "photos" &&
            ["photo-import", "photo-folder"].includes(latest.selectedKey ?? "")
          )
            dispatch({
              type: "select",
              key: result.added ? "all-photos" : "photo-import",
            });
          setNotice(
            result.persisted
              ? `已导入 ${result.added} 张照片`
              : "照片未能保存，本次仍可浏览",
          );
        }}
        onPodcasts={(persisted) => {
          open("podcasts");
          if (!persisted) setNotice("播客分类未能保存，本次仍可播放");
        }}
      />
      }
    >
      <ClassicScreenContent
        page={page} groupKey={groupKey} title={title}
        menu={{ rows, focusedRow, selectedIndex, isTrackList, visibleIds, visibleTracks,
          trackById, playlistTrackIds, selectedRow, hasManagedRows: managedRows[page] !== undefined, splitMenu }}
        library={{ albums, flowAlbums, artistCount: artists.length,
          browseAlbumCount: browseAlbums.length, playlistTitle: selectedPlaylist?.name, optionTrack }}
        playback={{ state, current, active, playView, lyricWheel,
          rating: current ? ratings[current.id] ?? 0 : 0, volumeOverlay }}
        text={{ textEntry, query, playlistName, textDocument, reader }}
        photos={{ activePhotos, photoIndex, slideshow }} prefs={prefs}
        preview={{ page, focusedRow, albums, current, sleeping, tracks: state.tracks }}
        qrImage={services.qrImage} serviceName={serviceName}
        accountHeader={page === "music-account" ? (
          <MusicAccountHeader
            profile={externalMusic ? services.profile : undefined}
            serviceName={
              nativeMusic ? "iPhone 系统音乐" : serviceName
            }
            authorized={services.auth === "authorized"}
            syncing={services.syncing}
            qr={!!services.qrImage}
            status={
              nativeMusic
                  ? services.auth === "authorized"
                    ? "已连接系统音乐"
                    : "访问 iPhone 音乐资料库"
                  : services.auth === "unconfigured"
                    ? externalMusic
                      ? "音乐服务尚未连接"
                      : "网站尚未配置 Apple Music"
                    : services.auth === "authorized"
                      ? `已连接 ${serviceName}`
                      : services.auth === "loading"
                        ? services.loginMessage ||
                          `正在连接 ${serviceName}…`
                        : `连接你的 ${serviceName}`
            }
            detail={
              services.auth === "unconfigured"
                ? "配置完成后即可登录并同步资料库。"
                : services.syncing
                  ? "正在同步资料库…"
                  : services.auth === "authorized"
                    ? `${services.libraryTracks.length} 首歌曲 · ${services.playlists.length} 个歌单`
                    : nativeMusic
                      ? "允许访问后显示系统歌单，本地音乐独立保留。"
                      : externalMusic && usesExternalMusicLogin()
                        ? services.loginMessage || "在音乐 App 确认授权，返回后自动连接资料库。"
                        : "扫码登录后同步歌单，本地音乐独立保留。"
            }
            error={services.error}
          />
        ) : null}
      />
    </ClassicShell>
  );
}
