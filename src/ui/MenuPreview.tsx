import { useEffect, useState } from "react";
import type { Album } from "../player/library";
import type { Track } from "../player/Player";
import type { MenuPreviewSpec } from "./menuPreviewModel";
import { AlbumPreview } from "./AlbumPreview";
import { ClassicGlyph } from "./ClassicGlyph";
import { AlbumArt } from "./AlbumArt";

export function MenuPreview({
  spec,
  albums,
  current,
  initialAlbumId,
  count,
  bytes,
  suspended = false,
}: {
  suspended?: boolean;
  spec: MenuPreviewSpec;
  albums: Album[];
  current?: Track;
  initialAlbumId?: string;
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
        suspended={suspended}
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
                  {storage && (
                    <div className="preview-storage" title="浏览器存储用量">
                      <i
                        style={{
                          width: `${Math.min(100, (storage.usage / storage.quota) * 100)}%`,
                        }}
                      />
                    </div>
                  )}
                  <span>
                    {storage
                      ? `${Math.max(0, (storage.quota - storage.usage) / 1024 ** 3).toFixed(1)} GB 可用`
                      : `${size} 本地音乐`}
                  </span>
                </>
              ) : (
                spec.icon !== "shuffle" &&
                spec.detail && <span>{spec.detail}</span>
              )}
            </>
          )}
        </div>
      )}
    </aside>
  );
}
