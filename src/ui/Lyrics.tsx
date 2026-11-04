import { useEffect, useMemo, useRef, useState } from "react";
import type { Track, LyricLine } from "../player/Player";
import { AlbumArt } from "./AlbumArt";
import { MarqueeText } from "./MarqueeText";
import { PlayerIcon } from "./PlayerIcon";
import { activeLyric, wordProgress } from "./lyricTimeline";
import { lyricMotion } from "./motion";
import { lyricGlyphs, lyricGlyphPose } from "./lyricEffects";
import { useLyricLayout } from "./useLyricLayout";

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
  const lines = track.lyrics ?? emptyLyrics;
  const synced = lines.some((line) => line.time >= 0);
  const [active, setActive] = useState(() => activeLyric(lines, position));
  const paintedActive = useRef(active);
  const glyphs = useMemo(() => lines.map(line => line.words?.map(word => lyricGlyphs(word.text))), [lines]);
  useLyricLayout(list, track.id, active, wheelStep, synced, lines);
  useEffect(() => {
    if (!synced) {
      paintedActive.current = -1;
      setActive(-1);
      return;
    }
    const started = performance.now();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0, measuredIndex = -2, disposed = false;
    let measured: { word: NonNullable<LyricLine["words"]>[number]; element: HTMLElement; width: number; font: number; glyphs: { element: HTMLElement; left: number }[] }[] = [];
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
      if (measuredIndex !== index) {
        measuredIndex = index;
        const row = list.current?.querySelector(`[data-line-index="${index}"]`);
        measured = [...row?.querySelectorAll<HTMLElement>(".lyric-word") ?? []].map((element, i) => {
          let width = 0;
          const glyphs = [...element.querySelectorAll<HTMLElement>(".lyric-glyph")].map(glyph => {
            const left = width; width += glyph.offsetWidth;
            return { element: glyph, left };
          });
          return { word: lines[index].words![i], element, width, glyphs, font: parseFloat(getComputedStyle(element).fontSize) };
        });
      }
      measured.forEach(({ word, element, width, font, glyphs }, wi) => {
        const progress = wordProgress(word, time);
        element.style.setProperty("--word-progress", `${progress * 100}%`);
        glyphs.forEach(({ element: glyph, left }, gi) => {
          glyph.style.setProperty("--glyph-edge", `${width * (time - word.time) / word.duration - left}px`);
          glyph.style.setProperty("--glyph-feather", `${font * lyricMotion.feather}px`);
          const pose = lyricGlyphPose(word, time, gi, glyphs.length, wi === measured.length - 1);
          glyph.style.transform = reduced.matches ? "none" : `translate(${pose.x}em, ${pose.y}em) scale(${pose.scale})`;
          glyph.style.textShadow = reduced.matches || pose.glow < 0.001 ? "none" : `0 0 ${pose.radius}em rgb(23 23 23 / ${pose.glow * .35})`;
        });
      });
      if (playing && !document.hidden) frame = requestAnimationFrame(draw);
    };
    draw();
    const resume = () => {
      cancelAnimationFrame(frame);
      draw();
    };
    const resize = new ResizeObserver(() => { measuredIndex = -2; resume(); });
    if (list.current) resize.observe(list.current);
    reduced.addEventListener("change", resume);
    document.addEventListener("visibilitychange", resume);
    if (document.fonts.status === "loading") void document.fonts.ready.then(() => {
      if (!disposed) { measuredIndex = -2; resume(); }
    });
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      reduced.removeEventListener("change", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [lines, position, playing, synced, track.id]);
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
                      {glyphs[index]?.[i].map((glyph, gi) => (
                        <span className="lyric-glyph" key={gi}>
                          <span>{glyph}</span>
                          <span className="lyric-word-fill">{glyph}</span>
                        </span>
                      ))}
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
