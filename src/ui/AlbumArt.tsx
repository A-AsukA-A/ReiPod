import { ClassicGlyph } from "./ClassicGlyph";
import { useState } from "react";

export function AlbumArt({
  src,
  fallback,
  title = "ReiPod",
  artist = "",
  className = "",
}: {
  src?: string;
  fallback?: "photos";
  title?: string;
  artist?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState<string>();
  return (
    <div className={`album-art ${className}`}>
      {src && failed !== src ? (
        <img
          src={src}
          alt={fallback === "photos" ? title : `${title} 封面`}
          draggable={false}
          onError={() => setFailed(src)}
        />
      ) : (
        <div
          className="generated-cover"
          role="img"
          aria-label={fallback === "photos" ? `${title} 照片暂不可用` : `${title}${artist ? `，${artist}` : ""} 无内嵌封面`}
        >
          {fallback === "photos" ? <ClassicGlyph name="albums" /> : <svg viewBox="0 0 64 64" aria-hidden="true">
            <path d="M24 15v28c-2-1-5-1-8 0-5 1-8 5-7 9s5 6 10 4 8-5 8-9V25l23-6v17c-2-1-5-1-8 0-5 1-8 5-7 9s5 6 10 4 8-5 8-9V7Z" />
          </svg>}
        </div>
      )}
    </div>
  );
}
