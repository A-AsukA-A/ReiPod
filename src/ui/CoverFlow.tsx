import { useRef } from "react";
import type { Album } from "../player/library";
import { AlbumArt } from "./AlbumArt";
import { MarqueeText } from "./MarqueeText";

export function CoverFlow({
  albums,
  index,
  onMove,
  onChoose,
  animate,
}: {
  albums: Album[];
  index: number;
  onMove: (steps: number, source?: "pointer" | "keyboard") => void;
  onChoose: () => void;
  animate: boolean;
}) {
  const gesture = useRef<{
    id: number;
    start: number;
    last: number;
    moved: boolean;
  } | null>(null);
  const album = albums[index];
  return (
    <div className={`coverflow-screen ${animate ? "with-motion" : ""}`}>
      <div
        className="coverflow-scene"
        role="group"
        aria-label="Cover Flow 专辑浏览"
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0 || gesture.current) return;
          gesture.current = {
            id: event.pointerId,
            start: event.clientX,
            last: event.clientX,
            moved: false,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const active = gesture.current;
          if (!active || active.id !== event.pointerId) return;
          if (Math.abs(event.clientX - active.start) > 7) {
            active.moved = true;
          }
          const delta = event.clientX - active.last;
          if (Math.abs(delta) >= 45) {
            onMove(
              -Math.sign(delta) * Math.min(3, Math.floor(Math.abs(delta) / 45)),
            );
            active.last = event.clientX;
          }
        }}
        onPointerUp={(event) => {
          const active = gesture.current;
          if (!active || active.id !== event.pointerId) return;
          const delta = event.clientX - active.last;
          gesture.current = null;
          if (active.moved) {
            if (Math.abs(delta) > 18) onMove(-Math.sign(delta));
          } else {
            const rect = event.currentTarget.getBoundingClientRect();
            const offset = event.clientX - rect.left - rect.width / 2;
            if (Math.abs(offset) < rect.width * 0.21) onChoose();
            else onMove(Math.sign(offset));
          }
        }}
        onPointerCancel={() => {
          gesture.current = null;
        }}
        onLostPointerCapture={() => {
          gesture.current = null;
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            onMove(event.key === "ArrowLeft" ? -1 : 1, "keyboard");
          }
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onChoose();
          }
        }}
      >
        {albums.map((entry, i) => {
          const offset = i - index;
          if (Math.abs(offset) > 4) return null;
          return (
            <button
              type="button"
              className="cf-card"
              key={entry.id}
              aria-label={`${entry.title}，${entry.artist}`}
              aria-current={i === index ? "true" : undefined}
              tabIndex={i === index ? 0 : -1}
              style={{
                transform: `translateX(${offset === 0 ? -50 : -50 + Math.sign(offset) * (75 + (Math.abs(offset) - 1) * 37)}%) translateZ(${offset === 0 ? 0 : -35}px) rotateY(${offset === 0 ? 0 : offset > 0 ? -62 : 62}deg)`,
                zIndex: 10 - Math.abs(offset),
              }}
              onClick={(event) => {
                if (event.detail === 0) {
                  if (offset) onMove(offset);
                  else onChoose();
                }
              }}
            >
              <AlbumArt
                src={entry.artwork}
                title={entry.title}
                artist={entry.artist}
              />
              <div className="cf-reflection" aria-hidden="true">
                <AlbumArt
                  src={entry.artwork}
                  title={entry.title}
                  artist={entry.artist}
                />
              </div>
            </button>
          );
        })}
      </div>
      <div className="cf-caption" aria-live="polite">
        <strong>
          <MarqueeText text={album?.title ?? "暂无专辑"} active />
        </strong>
        <span>
          <MarqueeText text={album?.artist ?? "导入音乐后在这里浏览"} active />
        </span>
      </div>
    </div>
  );
}
