import { useState } from "react";
import type { CSSProperties } from "react";

export function AlbumArt({
  src,
  title = "ReiPod",
  artist = "",
  className = "",
}: {
  src?: string;
  title?: string;
  artist?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState<string>();
  const hue =
    [...title].reduce((sum, char) => sum + char.codePointAt(0)!, 0) % 360;
  return (
    <div
      className={`album-art ${className}`}
      style={{ "--cover-hue": hue } as CSSProperties}
    >
      {src && failed !== src ? (
        <img
          src={src}
          alt={`${title} 封面`}
          draggable={false}
          onError={() => setFailed(src)}
        />
      ) : (
        <div className="generated-cover" aria-label={`${title} 无内嵌封面`}>
          <span className="cover-orbit" />
          <strong>{title}</strong>
          <small>{artist || "REIPOD"}</small>
        </div>
      )}
    </div>
  );
}
