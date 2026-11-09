import { useClassicExtras } from "./useClassicExtras";
import { createExtrasMenus } from "../ui/extrasMenus";
import { useAboutStorage } from "./useAboutStorage";
import { aboutPage } from "../ui/ClassicAboutScreen";
import { useClassicQuickScroll } from "../ui/useClassicQuickScroll";
import { useLocalPlayer } from "./useLocalPlayer";
import { createSettingsMenus } from "../ui/settingsMenus";
import { createTextMenus } from "../ui/textMenus";
import { createClassicMenuModel } from "../ui/classicMenuModel";
import { createClassicCategoryMenus } from "../ui/classicCategoryMenus";
import { createOnTheGoMenus } from "../ui/onTheGoMenus";
import { useMenuConfirmation } from "../ui/useMenuConfirmation";
import { usePhotoPreview } from "./usePhotoPreview";
import { nativePhotoKey, useNativePhotos } from "./useNativePhotos";
import { nativePhotoAlbumRows, nativePhotoSettingsRows } from "../ui/nativePhotoMenus";
import { createTrackMenuOverrides } from "../ui/trackMenuOverrides";
import { ClassicScreenContent } from "../ui/ClassicScreenContent";
import { classicScreenTitle } from "../ui/classicScreenModel";
import { createClassicInputController } from "../ui/classicInputController";
import { ClassicShell } from "../ui/ClassicShell";
import { ClassicStatusBar } from "../ui/ClassicStatusBar";
import { syncNativeAppearance } from "../services/nativeExperience";
import { backgroundColors } from "../ui/appearance";
import { useClassicPlaybackController } from "../ui/useClassicPlaybackController";
import { createMusicServiceActions } from "./musicServiceActions";
import { createMusicServiceMenus } from "../ui/musicServiceMenus";
import { usesExternalMusicLogin } from "../services/musicLogin";
import {
  useEffect,
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
  tracksForCategory,
  songsByTitle,
  coverFlowOrder,
} from "../player/library";
import type { MusicCategory } from "../player/library";
import {
  initialNavigation,
  navigationReducer,
  navigationScreenKey,
  splitPages,
} from "../ui/navigation";
import type { Page } from "../ui/navigation";
import { useBacklight } from "../ui/useBacklight";
import { setPreferences, usePreferences } from "../ui/preferences";
import { useLcdMotion } from "../ui/useLcdMotion";
import { searchLibrary } from "../player/librarySearch";
import type { LibrarySearchResult } from "../player/librarySearch";
import { createSearchMenu } from "../ui/searchMenus";
import { useRatings, setRating } from "../player/ratings";
import {
  usePlaylists,
  createPlaylist,
  renamePlaylist,
  deletePlaylist, togglePlaylistTrack, removePlaylistTrack, addToOnTheGo, saveOnTheGo, clearOnTheGo, withOnTheGo,
} from "../player/playlists";

import type { MenuItem } from "../ui/MenuRows";
import { createPrimaryMenus } from "../ui/primaryMenus";

import { MusicAccountHeader } from "../ui/MusicAccountHeader";
import { canShowLyrics } from "../ui/nowPlaying";
import { createMediaMenus, podcastShowRows } from "../ui/mediaMenus";
import { createLibraryMenus } from "../ui/libraryMenus";
import { FileImports } from "../ui/FileImports";
import { deletePhoto, restorePhotos, usePhotos } from "../media/photos";
import { usePodcastIds, playPodcast } from "../media/podcasts";
import { nativePodcastShows } from "../services/nativeMusic";
import { createNativePodcastRows, createNativePodcastStatusRows } from "../ui/nativePodcastMenus";
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
  prepareNativePodcasts,
  refreshNativePodcasts,
  openNativePodcastsApp,
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
  const nativePodcastsAvailable = !!services.nativePodcasts;
  const cloud = services.selected !== "local";
  const externalMusic = isThirdParty(services.selected);
  const serviceName = externalMusic
    ? thirdPartyNames[services.selected as "netease" | "qq"]
    : "Apple Music";
  const nativeMusic = services.transport === "ios";
  const player = playerFor(services.playback);
  const state = services.playback !== "local" ? remoteState : localState;
  const prefs = usePreferences();
  const [held, setHeld] = useState(false);
  const [sleeping, setSleeping] = useState(false);
  const localPlaylists = usePlaylists();
  const localPlaylistRows = useMemo(() => withOnTheGo(localPlaylists), [localPlaylists]);
  const playlists = cloud ? services.playlists : localPlaylistRows;
  const ratings = useRatings();
  const localPhotos = usePhotos();
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
  const systemPodcasts = services.nativePodcasts?.tracks;
  const localPodcastShows = useMemo(() => albumsFor(podcastTracks), [podcastTracks]);
  const systemPodcastShows = useMemo(() => nativePodcastShows(systemPodcasts ?? []), [systemPodcasts]);
  const podcastShows = useMemo(() => [...systemPodcastShows, ...localPodcastShows], [systemPodcastShows, localPodcastShows]);
  const browsePodcastShows = nativePodcastsAvailable ? systemPodcastShows : localPodcastShows;
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
  const [navigation, dispatch] = useReducer(
    navigationReducer,
    initialNavigation,
  );
  const navigationRef = useRef(navigation);
  navigationRef.current = navigation;
  const { page, groupKey, artist: browseArtist, category } = navigation.screen;
  const aboutStorage = useAboutStorage(page === "about");
  const systemPhotoScope = groupKey?.startsWith("ios-photo") ?? false;
  const photoAlbumScope = [navigation.screen, ...navigation.history.slice().reverse()]
    .find(screen => ["photo-grid", "photo-full"].includes(screen.page) && screen.groupKey?.startsWith("ios-photo-album:"))
    ?.groupKey?.slice("ios-photo-album:".length);
  const nativePhotos = useNativePhotos(page === "photos" || page === "photo-settings" || systemPhotoScope,
    systemPhotoScope ? photoAlbumScope : undefined,
    [navigation.screen, ...navigation.history.slice().reverse()].find(screen => ["photo-grid", "photo-full"].includes(screen.page))?.selectedKey ?? undefined);
  const photoPreview = usePhotoPreview(page === "home" && navigation.screen.selectedKey === "photos" && !sleeping, localPhotos);
  const photos = systemPhotoScope ? nativePhotos.photos : localPhotos;
  const textDocument =
    texts.find((doc) => doc.id === groupKey) ??
    builtinDocuments[groupKey ?? ""];
  const isLocalText = texts.some((doc) => doc.id === groupKey);
  const reader = useRef<TextReaderHandle>(null);
  const [importingTexts, setImportingTexts] = useState(false);
  const categoryTracks = useMemo(() => tracksForCategory(musicTracks, category), [musicTracks, category]);
  const artists = useMemo(() => artistsFor(categoryTracks), [categoryTracks]);
  const browseTracks = useMemo(
    () =>
      browseArtist !== undefined
        ? tracksForArtist(categoryTracks, browseArtist)
        : categoryTracks,
    [categoryTracks, browseArtist],
  );
  const browseAlbums = useMemo(
    () => (browseArtist !== undefined || category ? albumsFor(browseTracks) : albums),
    [albums, browseTracks, browseArtist, category],
  );
  const [notice, setNotice] = useState("");
  const extras = useClassicExtras(setNotice);
  useEffect(() => {
    if (page === "podcasts" && nativePodcastsAvailable)
      void prepareNativePodcasts().catch(error => setNotice(String(error)));
  }, [page, nativePodcastsAvailable]);
  const { dimmed, activate } = useBacklight(prefs.backlight, sleeping);
  const [query, setQuery] = useState("");
  const [finishedSearch, setFinishedSearch] = useState("");
  const searchKey = JSON.stringify([services.selected, services.auth, query]);
  const searchResults = useMemo<LibrarySearchResult[]>(() => cloud
    ? services.auth === "authorized" && finishedSearch === searchKey
      ? services.searchResults.map(track => ({ kind: "song", key: track.id, title: track.title,
          detail: track.artist || track.album, track }))
      : []
    : searchLibrary(localMusicTracks, localPlaylists, podcastTracks, query),
  [cloud, services.auth, services.searchResults, finishedSearch, searchKey, localMusicTracks, localPlaylists, podcastTracks, query]);
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
      .join("") + localPlaylists.map(playlist => playlist.name).join(""),
    page === "search" ? "search" : "name",
  );
  const input = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const podcastInput = useRef<HTMLInputElement>(null);
  const textInput = useRef<HTMLInputElement>(null);
  const selectedRow = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const confirmMenu = useMenuConfirmation(content);
  const capture = useLcdMotion(
    content,
    JSON.stringify([page, groupKey, browseArtist, category?.kind, category?.value,
      page === "playing" && playView === "lyrics" ? "lyrics" : page === "photo-full" ? navigation.screen.selectedKey : "page"]),
  );
  const active = state.status === "playing";
  const busy = state.status === "loading" || state.status === "buffering";
  const selectedAlbum = browseAlbums.find((album) => album.id === groupKey);
  const selectedPlaylist = playlists.find((item) => item.id === groupKey);
  const activePhotos = useMemo(
    () =>
      systemPhotoScope ? nativePhotos.photos : groupKey && !["photo-options", "photo-delete"].includes(page)
        ? photos.filter((photo) => photo.album === groupKey)
        : photos,
    [photos, groupKey, page, systemPhotoScope, nativePhotos.photos],
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
      return songsByTitle(browseTracks);
    if (page === "podcast-episodes")
      return (
        podcastShows
          .find((show) => show.id === groupKey)
          ?.tracks.slice()
          .sort((a, b) => (b.importedAt ?? 0) - (a.importedAt ?? 0)) ?? []
      );
    if (page === "local-songs") return songsByTitle(localMusicTracks);
    if (page === "search")
      return searchResults.flatMap(result => result.track ? [result.track] : []);
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
    browseTracks,
    podcastShows,
    localState.tracks,
    localMusicTracks,
    services.searchResults,
    cloud,
    searchResults,
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
    category?: MusicCategory,
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
                  : target === "album-tracks"
                    ? browseAlbums.find(album => album.id === group)?.tracks[0]?.id
                  : target === "artists"
                    ? "all-albums"
                    : target === "playlists"
                      ? "all"
                      : (latest.currentId ?? latest.tracks[0]?.id ?? "import");
    if (target !== page || group !== groupKey || artist !== browseArtist ||
        category?.kind !== navigation.screen.category?.kind || category?.value !== navigation.screen.category?.value)
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
      category,
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
    const authorization = source === "apple-music" && services.nativePodcasts
      ? services.nativePodcasts.auth : services.auth;
    if (remote && authorization !== "authorized") {
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
  const appendOnTheGo = (ids: string[], key: string) => {
    const localIds = new Set(localMusicTracks.map(track => track.id));
    const result = addToOnTheGo(ids.filter(id => localIds.has(id)));
    if (result.added) confirmMenu(key);
    setNotice(!result.persisted ? "本次已添加，On-The-Go 未能保存" : result.added ? "已加入 On-The-Go" : "歌曲已在 On-The-Go 中");
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
    localTools,
  } = createPrimaryMenus({
    state: cloud
      ? { ...remoteState, tracks: services.libraryTracks }
      : localState,
    prefs,
    albums,
    photoCount: nativePhotos.available ? (nativePhotos.albums.find(album => album.id === "all-photos")?.count ?? 0) : localPhotos.length,
    podcastShows: browsePodcastShows,
    podcastFirstKey: !browsePodcastShows.length ? "podcast-status" : undefined,
    musicCount: musicTracks.length,
    current,
    playlists,
    trackById,
    open,
    shuffleAll,
    addToOnTheGo: !cloud ? appendOnTheGo : undefined,
    openFiles,
    loadDemos,
    editName,
    openDocument,
    beginText: textEntry.begin,
  });
  const { settingsItems, confirmItems, managedRows: settingsRows } = createSettingsMenus({
    prefs, state, originalSettingsItems, localTools, cloud, serviceName, selectedService: services.selected,
    localMusicCount: localMusicTracks.length, open, back, setPreferences,
    shuffle: value => {
      player.setShuffle(value);
      const error = player.getSnapshot().error;
      if (error) setNotice(error);
    }, repeat: value => player.setRepeat(value),
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
  const photoIndex = systemPhotoScope ? nativePhotos.index : Math.max(
    0,
    activePhotos.findIndex(
      (photo) => photo.id === navigation.screen.selectedKey,
    ),
  );
  const managedRows: Partial<Record<Page, MenuItem[]>> = {
    ...serviceRows,
    "podcast-settings": [...createNativePodcastRows(services.nativePodcasts, {
      retry: () => { void prepareNativePodcasts().catch(error => setNotice(String(error))); },
      refresh: () => { void refreshNativePodcasts(); },
      settings: () => { void openNativeMusicSettings().catch(error => setNotice(String(error))); },
      openApp: () => { void openNativePodcastsApp().catch(error => setNotice(String(error))); },
    }),
      { key: "podcast-import", label: "导入播客…", action: () => podcastInput.current?.click() },
      ...podcastShowRows(localPodcastShows, open, true),
    ],
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
    ...createClassicCategoryMenus({ tracks: musicTracks, open, playTrack,
      addToOnTheGo: !cloud ? appendOnTheGo : undefined }),
    ...createMediaMenus({
      photos,
      activePhotos,
      podcastShows: browsePodcastShows,
      podcastSystemRows: createNativePodcastStatusRows(services.nativePodcasts, browsePodcastShows.length > 0,
        () => open("podcast-settings")),
      openPhotos: folder => {
        if (folder) photoInput.current?.setAttribute("webkitdirectory", "");
        else photoInput.current?.removeAttribute("webkitdirectory");
        photoInput.current?.click();
      },
      deletePhoto,
      groupKey,
      open,
      back,
      setNotice,
      setSlideshow,
      getNavigation: () => navigationRef.current,
      systemPhotos: systemPhotoScope,
      photoSettingsRows: [
        ...(nativePhotos.available ? nativePhotoSettingsRows(nativePhotos, { open, refresh: nativePhotos.refresh,
          manage: action => { void nativePhotos.manage(action).catch(error => setNotice(String(error))); } }) : []),
        ...(nativePhotos.available && localPhotos.length ? [{ key: "local-photos", label: "本地 · 已导入照片",
          detail: `${localPhotos.length} 张照片`, action: () => open("photo-grid", localPhotos[0]?.id) }] : []),
      ],
    }),
    ...(nativePhotos.available ? {
      photos: nativePhotoAlbumRows(nativePhotos, { open, refresh: nativePhotos.refresh,
        manage: action => { void nativePhotos.manage(action).catch(error => setNotice(String(error))); } }),
    } : {}),
    ...settingsRows,
    ...createTextMenus({ texts, groupKey, isLocalText, importingTexts, deleting, open, back,
      openImport: () => textInput.current?.click(), setDeleting, setNotice,
      getNavigation: () => navigationRef.current, saveReadingPosition, deleteText }),
    ...createLibraryMenus({
      operations: { deletePlaylist, togglePlaylistTrack, removePlaylistTrack, addToOnTheGo, removeTrack,
        playNext: id => localPlayer.playNext(id) },
      page,
      groupKey,
      playlists: localPlaylistRows,
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
      confirm: confirmMenu,
      open,
      back,
      navigationRef,
      playTrack,
      toggleFavorite,
    }),
  };
  Object.assign(managedRows, createExtrasMenus({ state: extras.state, groupKey,
    history: navigation.history.map(screen => screen.page), dispatch: extras.dispatch, open, back,
    select: key => dispatch({ type: "select", key }) }));
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
  if (!cloud) Object.assign(managedRows, createOnTheGoMenus({
    page, groupKey, playlist: selectedPlaylist, tracks: visibleTracks,
    open, back, notice: setNotice, save: saveOnTheGo, clear: clearOnTheGo, play: id => playTrack(id),
  }));
  if (page === "search") managedRows.search = createSearchMenu({
    results: searchResults, query, begin: textEntry.begin, open, play: playTrack,
  });
  const { rows, selectedIndex, focusedRow } = createClassicMenuModel({
    page, selectedKey: systemPhotoScope && photoAlbumScope && ["photo-grid", "photo-full"].includes(page)
      ? nativePhotoKey(photoAlbumScope, photoIndex) : navigation.screen.selectedKey, browseArtist, category, managedRows,
    primaryRows: { home: homeItems, music: musicItems, playlists: playlistItems,
      settings: settingsItems, "confirm-clear": confirmItems },
    browseAlbums, flowAlbums, browseTracks, artists, visibleTracks, isTrackList,
    current, accountSyncing: services.syncing, emptyItems, open, playTrack,
    addToOnTheGo: !cloud ? appendOnTheGo : undefined,
  });
  const browsePositionKey = JSON.stringify([services.selected, services.profile?.id ?? services.auth,
    navigationScreenKey(navigation.screen), page === "search" ? query : null]);
  const quickScroll = useClassicQuickScroll({ page, scope: browsePositionKey, rows,
    focusedKey: focusedRow?.key, held, sleeping, dispatch, feedback });
  const { rotate, command } = createClassicInputController({
    device: { held, sleeping, activate, setSleeping },
    navigation: { page, groupKey, selectedKey: navigation.screen.selectedKey,
      dispatch, open, back, capture, setNotice },
    menu: { rows, focusedRow, isTrackList, visibleIds, visibleTracks,
      accountAuthorized: services.auth === "authorized", feedback },
    playback: { player, state, current, playView, ratings, setRating, toggleFavorite,
      cyclePlayView, scrollLyrics, showVolume, showTransportHint, trackOptions },
    library: { trackById, musicTracks, browseTracks, albums: browseAlbums, playTrack, playAlbum,
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
    photos: { activePhotos, photoIndex, slideshow, setSlideshow,
      ...(systemPhotoScope && photoAlbumScope ? { offset: nativePhotos.offset ?? 0, total: nativePhotos.total,
        keyAt: (index: number) => nativePhotoKey(photoAlbumScope, index) } : {}) },
    text: { textEntry, query, playlistName, setQuery, setPlaylistName, saveName, reader },
    settings: { prefs, setPreferences },
    extras: { toggleStopwatch: extras.toggle, pauseStopwatch: extras.pause },
  });

  useEffect(() => {
    localPlayer.setVolumeLimit(prefs.volumeLimit);
    applePlayer.setVolumeLimit(prefs.volumeLimit);
    playerFor("qq").setVolumeLimit(prefs.volumeLimit);
    playerFor("netease").setVolumeLimit(prefs.volumeLimit);
  }, [prefs.volumeLimit]);
  useEffect(() => {
    if (page !== "search" || !cloud || services.auth !== "authorized") return;
    let cancelled = false;
    // Network search is a ReiPod adapter: debounce wheel entry and hide stale-query results.
    const timer = setTimeout(() => {
      void searchSelectedMusicService(query).then(() => {
        if (!cancelled) setFinishedSearch(searchKey);
      });
    }, query.trim() ? 300 : 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [page, cloud, services.selected, services.auth, query, searchKey]);
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
      (systemPhotoScope ? nativePhotos.total : activePhotos.length) < 2
    )
      return;
    const timer = setTimeout(() => {
      capture("replace");
      dispatch({
        type: "select",
        key: systemPhotoScope && photoAlbumScope
          ? nativePhotoKey(photoAlbumScope, (photoIndex + 1) % nativePhotos.total)
          : activePhotos[(photoIndex + 1) % activePhotos.length].id,
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, [slideshow, page, photoIndex, activePhotos, held, sleeping, systemPhotoScope, photoAlbumScope, nativePhotos.total]);
  useEffect(() => {
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute(
        "content",
        backgroundColors[prefs.background],
      );
    syncNativeAppearance(prefs.background, prefs.backlight === 0 && !sleeping);
  }, [prefs.background, prefs.backlight, sleeping]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 2200);
    return () => clearTimeout(timer);
  }, [notice]);
  const title = page === "search" && query.trim() ? `搜索结果：${searchResults.length}` : classicScreenTitle({ page, groupKey, browseArtist, category, playView,
    albumTitle: selectedAlbum?.title,
    podcastTitle: podcastShows.find(show => show.id === groupKey)?.title,
    photoTitle: systemPhotoScope ? nativePhotos.albums.find(album => album.id === photoAlbumScope)?.title : groupKey,
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
      wheel={{ onRotate: (steps, source, rotation) => {
        if (quickScroll.rotate(steps, source, rotation)) activate();
        else rotate(steps, source);
      }, onRotateEnd: quickScroll.end,
      onCommand: value => { quickScroll.end(); command(value); }, onFeedback: feedback,
        playLabel: page === "stopwatch-timer" ? extras.state.current.started !== null ? "停止计时" : "开始计时" : busy ? "取消载入" : active ? "暂停" : "播放" }}
      quickScrollLetter={quickScroll.letter}
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
          if (result.added && !nativePhotos.available) open("photos", "all-photos");
          setNotice(
            result.persisted
              ? `已导入 ${result.added} 张照片`
              : "照片未能保存，本次仍可浏览",
          );
        }}
        onPodcasts={(persisted) => {
          open(nativePodcastsAvailable ? "podcast-settings" : "podcasts");
          if (!persisted) setNotice("播客分类未能保存，本次仍可播放");
        }}
      />
      }
    >
      <ClassicScreenContent
        page={page} groupKey={groupKey} title={title}
        extras={extras.state}
        about={{ index: aboutPage(navigation.screen.selectedKey), information: {
          storage: aboutStorage, songs: musicTracks.length, albums: albums.length, artists: artists.length,
          photos: localPhotos.length, podcasts: podcastTracks.length, texts: texts.length,
          source: cloud ? nativeMusic ? "iPhone 系统音乐" : serviceName : "本地音乐",
        } }}
        menu={{ rows, focusedRow, selectedIndex, isTrackList, visibleIds, visibleTracks,
          positionKey: browsePositionKey,
          trackById, playlistTrackIds, selectedRow, hasManagedRows: managedRows[page] !== undefined, splitMenu }}
        library={{ albums, flowAlbums, artistCount: artists.length,
          browseAlbumCount: browseAlbums.length, playlistTitle: selectedPlaylist?.name, optionTrack }}
        playback={{ state, current, active, playView, lyricWheel,
          rating: current ? ratings[current.id] ?? 0 : 0, volumeOverlay }}
        text={{ textEntry, query, playlistName, textDocument, reader,
          searchCount: searchResults.length,
          searchPending: cloud && services.auth === "authorized" && !!query.trim() && finishedSearch !== searchKey,
          searchError: cloud ? services.auth === "authorized" ? services.error : "请先登录音乐服务" : undefined }}
        photos={{ activePhotos, photoIndex, slideshow, offset: systemPhotoScope ? nativePhotos.offset : 0,
          loading: systemPhotoScope && nativePhotos.loading,
          total: systemPhotoScope ? nativePhotos.total : activePhotos.length }} prefs={prefs}
        preview={{ page, focusedRow, albums, photos: photoPreview, podcastShows: browsePodcastShows, current, sleeping, tracks: state.tracks }}
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
                        ? services.error || services.loginMessage ||
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
