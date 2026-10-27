import type { Album } from "../player/library";
import { AlbumArt } from "./AlbumArt";
import { MarqueeText } from "./MarqueeText";
import { coverPose } from "./coverMotion";
import { useCoverMotion } from "./useCoverMotion";

export function CoverFlow({
  albums,
  index,
  animate,
}: {
  albums: Album[];
  index: number;
  animate: boolean;
}) {
  const position = useCoverMotion(index, false, animate);
  const album = albums[index];
  return (
    <div className={`coverflow-screen ${animate ? "with-motion" : ""}`}>
      <div
        className="coverflow-scene"
        role="group"
        aria-label="Cover Flow 专辑浏览"
      >
        {albums.map((entry, i) => {
          const offset = i - position;
          if (Math.abs(offset) > 5 && i !== index) return null;
          const pose = coverPose(offset);
          return (
            <div
              className="cf-card"
              key={entry.id}
              aria-label={`${entry.title}，${entry.artist}`}
              aria-current={i === index ? "true" : undefined}
              style={{
                transform: `translateX(${pose.x - 50}%) translateZ(${pose.z}px) rotateY(${pose.angle}deg)`,
                zIndex: pose.depth,
                opacity: pose.opacity,
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
            </div>
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
