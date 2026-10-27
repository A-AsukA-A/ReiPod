import { useRef, useState } from "react";
import type { Album } from "../player/library";
import { AlbumArt } from "./AlbumArt";
import { MarqueeText } from "./MarqueeText";
import { coverPose } from "./coverMotion";
import { useCoverMotion } from "./useCoverMotion";

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
    origin: number;
    spacing: number;
    moved: boolean;
  } | null>(null);
  const [dragPosition, setDragPosition] = useState<number | null>(null);
  const position = useCoverMotion(dragPosition ?? index, dragPosition !== null, animate);
  const album = albums[index];
  const draggedPosition = (x: number) => {
    const active = gesture.current!;
    return Math.max(0, Math.min(albums.length - 1,
      active.origin + (active.start - x) / active.spacing));
  };
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
            origin: position,
            spacing: event.currentTarget.clientWidth * 0.31,
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
          if (active.moved) setDragPosition(draggedPosition(event.clientX));
        }}
        onPointerUp={(event) => {
          const active = gesture.current;
          if (!active || active.id !== event.pointerId) return;
          const destination = Math.round(draggedPosition(event.clientX));
          gesture.current = null;
          setDragPosition(null);
          if (active.moved) {
            onMove(destination - index);
          } else {
            const rect = event.currentTarget.getBoundingClientRect();
            const offset = event.clientX - rect.left - rect.width / 2;
            if (Math.abs(offset) < rect.width * 0.21) onChoose();
            else onMove(Math.sign(offset));
          }
        }}
        onPointerCancel={() => {
          gesture.current = null;
          setDragPosition(null);
        }}
        onLostPointerCapture={() => {
          gesture.current = null;
          setDragPosition(null);
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
          const offset = i - position;
          if (Math.abs(offset) > 5 && i !== index) return null;
          const pose = coverPose(offset);
          return (
            <button
              type="button"
              className="cf-card"
              key={entry.id}
              aria-label={`${entry.title}，${entry.artist}`}
              aria-current={i === index ? "true" : undefined}
              tabIndex={i === index ? 0 : -1}
              style={{
                transform: `translateX(${pose.x - 50}%) translateZ(${pose.z}px) rotateY(${pose.angle}deg)`,
                zIndex: pose.depth,
                opacity: pose.opacity,
              }}
              onClick={(event) => {
                if (event.detail === 0) {
                  if (i !== index) onMove(i - index, "keyboard");
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
