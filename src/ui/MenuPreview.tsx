import { useEffect, useState } from "react";
import type { Album } from "../player/library";
import type { Track } from "../player/Player";
import type { MenuPreviewSpec } from "./menuPreview";
import { AlbumPreview } from "./AlbumPreview";
import { ClassicGlyph } from "./ClassicGlyph";
import { AlbumArt } from "./AlbumArt";

export function MenuPreview({
  spec,
  albums,
  current,
  initialAlbumId,
  onChoose,
  count,
  bytes,
}: {
  spec: MenuPreviewSpec;
  albums: Album[];
  current?: Track;
  initialAlbumId?: string;
  onChoose: (album: Album) => void;
  count: number;
  bytes: number;
}) {
  const covers = spec.kind === "covers";
  const [storage, setStorage] = useState<{
    quota: number;
    usage: number;
  } | null>(null);
  useEffect(() => {
    let cancelled = false;
    void navigator.storage
      ?.estimate?.()
      .then((estimate) => {
        if (!cancelled && estimate.quota && Number.isFinite(estimate.quota))
          setStorage({ quota: estimate.quota, usage: estimate.usage ?? 0 });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [bytes, count]);
  const size =
    bytes >= 1024 ** 3
      ? `${(bytes / 1024 ** 3).toFixed(1)} GB`
      : `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return (
    <aside
      className="screen-preview menu-preview"
      aria-label="菜单预览"
      data-preview={spec.icon}
    >
      <AlbumPreview
        albums={albums}
        initialAlbumId={initialAlbumId}
        enabled={covers}
        onChoose={onChoose}
      />
      {!covers && (
        <div
          className={`menu-preview-card ${spec.kind === "playing" ? "is-playing-preview" : ""}`}
          key={`${spec.kind}:${spec.icon}:${spec.title}`}
        >
          {spec.kind === "playing" && current ? (
            <>
              <div className="preview-now-art">
                <AlbumArt
                  src={current.artwork}
                  title={current.album ?? current.title}
                  artist={current.artist}
                />
              </div>
              <strong>{current.title}</strong>
              <span>{current.artist || "未知艺人"}</span>
            </>
          ) : (
            <>
              <ClassicGlyph name={spec.icon} />
              <strong>{spec.title}</strong>
              {spec.icon === "shuffle" && (
                <span>{spec.detail ?? `${count} 首歌曲`}</span>
              )}
              {spec.icon === "settings" ? (
                <>
                  <div className="preview-storage">
                    <i />
                  </div>
                  <span>{size} 音乐</span>
                </>
              ) : (
                spec.detail && <span>{spec.detail}</span>
              )}
            </>
          )}
        </div>
      )}
    </aside>
  );
}
