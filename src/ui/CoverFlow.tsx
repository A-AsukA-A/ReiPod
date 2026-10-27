import type { Album } from "../player/library";
import type { ReactNode } from "react";
import { AlbumArt } from "./AlbumArt";
import { MarqueeText } from "./MarqueeText";
import { coverPose } from "./coverMotion";
import { useCoverMotion } from "./useCoverMotion";

export function CoverFlow({
  albums,
  index,
  animate,
  albumOpen = false,
  children,
}: {
  albums: Album[];
  index: number;
  animate: boolean;
  albumOpen?: boolean;
  children?: ReactNode;
}) {
  const position = useCoverMotion(index, false, animate);
  const album = albums[index];
  return (
    <div
      className={`coverflow-screen ${animate ? "with-motion" : ""}`}
      data-album-open={albumOpen}
    >
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
                transform: `translateX(${pose.x - 50}%) translateZ(calc(var(--lcd-unit) * ${pose.z})) rotateY(${pose.angle}deg)`,
                zIndex: pose.depth,
                opacity: albumOpen && i === index ? 0 : pose.opacity,
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
      <div className="cf-caption" aria-live="polite" hidden={albumOpen}>
        <strong>
          <MarqueeText text={album?.title ?? "暂无专辑"} active />
        </strong>
        <span>
          <MarqueeText text={album?.artist ?? "导入音乐后在这里浏览"} active />
        </span>
      </div>
      {albumOpen && album && (
        <section className="cf-album-panel" aria-label={`${album.title}曲目`}>
          <header className="coverflow-album-heading">
            <strong>
              <MarqueeText text={album.title} active />
            </strong>
            <span>
              <MarqueeText text={album.artist} active />
            </span>
          </header>
          {children}
        </section>
      )}
    </div>
  );
}
