import { useEffect, useRef, useState } from "react";
import type { Track, LyricLine } from "../player/Player";
import { AlbumArt } from "./AlbumArt";
import { MarqueeText } from "./MarqueeText";
import { PlayerIcon } from "./PlayerIcon";
import { activeLyric, wordEmphasis, wordProgress } from "./lyricTimeline";
import { lyricMotion } from "./motion";

const emptyLyrics: LyricLine[] = [];

export function Lyrics({
  track,
  position,
  wheelStep = 0,
  playing = false,
}: {
  track: Track;
  position: number;
  wheelStep?: number;
  playing?: boolean;
}) {
  const list = useRef<HTMLDivElement>(null);
  const previousWheel = useRef(wheelStep);
  const previousTrack = useRef<string | null>(null);
  const manualUntil = useRef(0);
  const lines = track.lyrics ?? emptyLyrics;
  const synced = lines.some((line) => line.time >= 0);
  const [active, setActive] = useState(() => activeLyric(lines, position));
  const paintedActive = useRef(active);
  useEffect(() => {
    if (!synced) {
      paintedActive.current = -1;
      setActive(-1);
      return;
    }
    const started = performance.now();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const draw = () => {
      // Bridge/audio positions remain authoritative. Interpolate only between updates;
      // cap extrapolation so a stalled transport cannot sing ahead indefinitely.
      const time =
        position +
        (playing
          ? Math.min(
              lyricMotion.interpolationLimit,
              (performance.now() - started) / 1000,
            )
          : 0);
      const index = activeLyric(lines, time);
      if (paintedActive.current !== index) {
        paintedActive.current = index;
        setActive(index);
      }
      const row = list.current?.querySelector(`[data-line-index="${index}"]`);
      row
        ?.querySelectorAll<HTMLElement>(".lyric-word")
        .forEach((element, i) => {
          const word = lines[index]?.words?.[i];
          if (!word) return;
          const progress = wordProgress(word, time);
          element.style.setProperty("--word-progress", `${progress * 100}%`);
          const emphasis = reduced.matches ? 0 : wordEmphasis(word, time);
          element.style.transform = emphasis
            ? `translateY(${-emphasis * lyricMotion.wordLift}em) scale(${1 + emphasis * lyricMotion.wordScale})`
            : "none";
        });
      if (playing && !document.hidden) frame = requestAnimationFrame(draw);
    };
    draw();
    const resume = () => {
      cancelAnimationFrame(frame);
      draw();
    };
    document.addEventListener("visibilitychange", resume);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [lines, position, playing, synced, track.id]);
  useEffect(() => {
    const element = list.current;
    if (!element) return;
    const first = previousTrack.current !== track.id;
    previousTrack.current = track.id;
    if (first) {
      element.scrollTop = 0;
      manualUntil.current = 0;
      previousWheel.current = wheelStep;
    }
    if (wheelStep !== previousWheel.current) {
      manualUntil.current = performance.now() + lyricMotion.manualHold;
      element.scrollTop += (wheelStep - previousWheel.current) * 28;
      previousWheel.current = wheelStep;
    }
    const center = () => {
      const focus = element.clientHeight * lyricMotion.focus;
      element.style.setProperty(
        "--lyric-inset",
        `${Math.max(0, focus - 15)}px`,
      );
      element.style.setProperty(
        "--lyric-outset",
        `${Math.max(0, element.clientHeight - focus - 15)}px`,
      );
      const row = element.querySelector<HTMLElement>(".active-lyric");
      if (row && performance.now() >= manualUntil.current)
        element.scrollTo({
          top: row.offsetTop - focus + row.clientHeight / 2,
          behavior:
            first || matchMedia("(prefers-reduced-motion: reduce)").matches
              ? "instant"
              : "smooth",
        });
    };
    center();
    const timer = setTimeout(
      center,
      Math.max(0, manualUntil.current - performance.now()) + 1,
    );
    const observer = new ResizeObserver(center);
    observer.observe(element);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [active, track.id, wheelStep, lines]);
  return (
    <div className="lyrics-screen">
      <div className="lyrics-header">
        <AlbumArt
          src={track.artwork}
          title={track.album ?? track.title}
          artist={track.artist}
        />
        <div>
          <strong>
            <MarqueeText text={track.title} active />
          </strong>
          <span>
            <MarqueeText text={track.artist || "未知艺人"} active />
          </span>
        </div>
        <div className="lyrics-actions">
          <span aria-hidden="true">
            <PlayerIcon name="queue" />
          </span>
          <span className="is-current" aria-hidden="true">
            <PlayerIcon name="lyrics" filled />
          </span>
        </div>
      </div>
      {lines.length ? (
        <div
          className={`lyrics-lines ${synced ? "synchronized" : ""}`}
          ref={list}
        >
          {lines.map((line, index) => (
            <p
              key={`${index}:${line.time}`}
              className={index === active ? "active-lyric" : ""}
              data-line-index={index}
              aria-current={index === active ? "true" : undefined}
              aria-label={line.words?.length ? line.text : undefined}
              data-distance={
                synced ? Math.min(3, Math.abs(index - active)) : undefined
              }
            >
              {line.words?.length
                ? line.words.map((word, i) => (
                    <span
                      className="lyric-word"
                      key={`${i}:${word.time}`}
                      aria-hidden="true"
                    >
                      <span>{word.text}</span>
                      <span className="lyric-word-fill">{word.text}</span>
                    </span>
                  ))
                : line.text}
            </p>
          ))}
        </div>
      ) : (
        <div className="lyrics-empty">
          <span>♫</span>
          <strong>
            {track.lyricsStatus === "loading"
              ? "正在读取歌词…"
              : track.lyricsStatus === "error"
                ? "歌词暂不可用"
                : track.kind === "demo"
                  ? "纯音乐，请欣赏"
                  : "暂无歌词"}
          </strong>
          {track.lyricsStatus === "error" ? (
            <small>中心键返回，再切入可重试</small>
          ) : track.kind === "local" || !track.kind ? (
            <small>可导入同名 LRC / YRC 文件</small>
          ) : track.kind === "apple-music" ? (
            <small>系统音乐暂不提供歌词</small>
          ) : track.kind !== "demo" && track.lyricsStatus !== "loading" ? (
            <small>平台暂未提供这首歌的歌词</small>
          ) : null}
        </div>
      )}
    </div>
  );
}
