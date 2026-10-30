import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Track } from "../player/Player";
import { canShowLyrics, playingViews, restingPlayView } from "./nowPlaying";
import type { PlayView } from "./nowPlaying";
import type { Page } from "./navigation";

type TransportHint = "seek-forward" | "seek-backward";
type Context = {
  page: Page;
  current?: Track;
  lyricsEnabled: boolean;
  volume: number;
  replace: () => void;
  loadLyrics: (track: Track) => unknown;
};

/** Classic view state only. Playback, authorization and queues stay with their owners. */
export function useClassicPlaybackController({
  page, current, lyricsEnabled, volume, replace, loadLyrics,
}: Context) {
  const [playView, setPlayView] = useState<PlayView>("art");
  const [lyricWheel, setLyricWheel] = useState(0);
  const [volumeOverlay, setVolumeOverlay] = useState(false);
  const [transportHint, setTransportHint] = useState<TransportHint | null>(null);
  const transportTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousPage = useRef({ page, trackId: current?.id });

  const changePlayView = (view: PlayView) => {
    if ((view === "lyrics") !== (playView === "lyrics")) replace();
    setPlayView(view);
    setVolumeOverlay(false);
  };
  const cyclePlayView = () => {
    const views = playingViews(current, lyricsEnabled);
    changePlayView(views[(views.indexOf(playView) + 1) % views.length]);
  };

  useLayoutEffect(() => {
    const previous = previousPage.current;
    previousPage.current = { page, trackId: current?.id };
    if ((previous.page === "playing" && page !== "playing") ||
        previous.trackId !== current?.id) {
      setPlayView(view => canShowLyrics(current, lyricsEnabled) ? restingPlayView(view) : "art");
      setVolumeOverlay(false);
      setLyricWheel(0);
    }
  }, [page, current?.id]);
  useEffect(() => {
    if (!lyricsEnabled && playView === "lyrics") changePlayView("art");
  }, [lyricsEnabled, playView]);
  useEffect(() => {
    if (lyricsEnabled && page === "playing" && playView === "lyrics" && current)
      void loadLyrics(current);
    // Intentionally keyed by song/view, not clock ticks or lyric metadata updates.
  }, [lyricsEnabled, page, playView, current?.id]);
  useEffect(() => {
    if (!volumeOverlay) return;
    const timer = setTimeout(() => setVolumeOverlay(false), 1300);
    return () => clearTimeout(timer);
  }, [volumeOverlay, volume]);
  useEffect(() => () => {
    if (transportTimer.current) clearTimeout(transportTimer.current);
  }, []);

  return {
    playView, lyricWheel, volumeOverlay, transportHint,
    changePlayView, cyclePlayView,
    resetPlayView: () => setPlayView("art"),
    openLyrics: () => { setPlayView("lyrics"); setVolumeOverlay(false); },
    scrollLyrics: (steps: number) => setLyricWheel(value => value + steps),
    showVolume: () => setVolumeOverlay(true),
    showTransportHint: (hint: TransportHint) => {
      setTransportHint(hint);
      if (transportTimer.current) clearTimeout(transportTimer.current);
      transportTimer.current = setTimeout(() => setTransportHint(null), 180);
    },
  };
}
