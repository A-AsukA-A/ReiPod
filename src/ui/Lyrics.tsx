import { useEffect, useRef } from "react";
import type { Track } from "../player/Player";
import { AlbumArt } from "./AlbumArt";

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
  const lines = track.lyrics ?? [];
  const synced = lines.some((line) => line.time >= 0);
  let active = -1;
  if (synced)
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].time <= position) active = i;
      else break;
    }
  useEffect(() => {
    const row = list.current?.querySelector<HTMLElement>(".active-lyric");
    if (row && list.current)
      list.current.scrollTop =
        row.offsetTop - list.current.clientHeight / 2 + row.clientHeight / 2;
  }, [active, track.id]);
  useEffect(() => {
    if (list.current)
      list.current.scrollTop += (wheelStep - previousWheel.current) * 28;
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
          <strong>{track.title}</strong>
          <span>{track.artist || "未知艺人"}</span>
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
