import { useEffect, useRef } from "react";
import type { Track } from "../player/Player";
import { AlbumArt } from "./AlbumArt";
import { MarqueeText } from "./MarqueeText";
import { PlayerIcon } from "./PlayerIcon";

export function Lyrics({
  track,
  position,
  wheelStep = 0,
}: {
  track: Track;
  position: number;
  wheelStep?: number;
}) {
  const list = useRef<HTMLDivElement>(null);
  const previousWheel = useRef(wheelStep);
  const previousTrack = useRef<string | null>(null);
  const manualUntil = useRef(0);
  const lines = track.lyrics ?? [];
  const synced = lines.some((line) => line.time >= 0);
  let active = -1;
  if (synced)
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].time <= position) active = i;
      else break;
    }
  useEffect(() => {
    const element = list.current;
    if (!element) return;
    const first = previousTrack.current !== track.id;
    previousTrack.current = track.id;
    const center = () => {
      element.style.setProperty(
        "--lyric-inset",
        `${Math.max(0, element.clientHeight / 2 - 15)}px`,
      );
      const row = element.querySelector<HTMLElement>(".active-lyric");
      if (row && (first || performance.now() > manualUntil.current))
        element.scrollTo({
          top: row.offsetTop - element.clientHeight / 2 + row.clientHeight / 2,
          behavior:
            first || matchMedia("(prefers-reduced-motion: reduce)").matches
              ? "instant"
              : "smooth",
        });
    };
    center();
    const observer = new ResizeObserver(center);
    observer.observe(element);
    return () => observer.disconnect();
  }, [active, track.id]);
  useEffect(() => {
    if (list.current && wheelStep !== previousWheel.current) {
      manualUntil.current = performance.now() + 2500;
      list.current.scrollTop += (wheelStep - previousWheel.current) * 28;
    }
    previousWheel.current = wheelStep;
  }, [wheelStep]);
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
          onPointerDown={() => {
            manualUntil.current = performance.now() + 2500;
          }}
          onWheel={() => {
            manualUntil.current = performance.now() + 2500;
          }}
        >
          {lines.map((line, index) => (
            <p
              key={`${index}:${line.time}`}
              className={index === active ? "active-lyric" : ""}
              data-distance={
                synced ? Math.min(3, Math.abs(index - active)) : undefined
              }
            >
              {line.text}
            </p>
          ))}
        </div>
      ) : (
        <div className="lyrics-empty">
          <span>♫</span>
          <strong>
            {track.kind === "demo" ? "纯音乐，请欣赏" : "暂无歌词"}
          </strong>
          {track.kind !== "demo" && <small>可导入同名 LRC 文件</small>}
        </div>
      )}
    </div>
  );
}
