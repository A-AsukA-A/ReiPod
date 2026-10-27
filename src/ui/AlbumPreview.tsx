import { useEffect, useRef, useState } from "react";
import type { Album } from "../player/library";
import { AlbumArt } from "./AlbumArt";

const INTERVAL = 4500;
const CROSSFADE = 360;

/** The classic menu's right pane runs independently of the wheel selection. */
export function AlbumPreview({
  albums,
  initialAlbumId,
  onChoose,
}: {
  albums: Album[];
  initialAlbumId?: string;
  onChoose: (album: Album) => void;
}) {
  const [id, setId] = useState(initialAlbumId ?? albums[0]?.id);
  const [previous, setPrevious] = useState<Album | null>(null);
  const [visible, setVisible] = useState(
    document.visibilityState === "visible",
  );
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const catalog = useRef(albums);
  catalog.current = albums;
  const album = albums.find((entry) => entry.id === id) ?? albums[0];
  const albumId = album?.id;
  const albumIds = JSON.stringify(albums.map((entry) => entry.id));

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReduced(media.matches);
    const updateVisibility = () =>
      setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", updateVisibility);
    media.addEventListener("change", updateMotion);
    return () => {
      document.removeEventListener("visibilitychange", updateVisibility);
      media.removeEventListener("change", updateMotion);
    };
  }, []);
  useEffect(() => {
    if (initialAlbumId) setId(initialAlbumId);
  }, [initialAlbumId]);
  useEffect(() => {
    if (!visible || reduced || albums.length < 2) return;
    const timer = setTimeout(() => {
      const latest = catalog.current;
      const index = latest.findIndex((entry) => entry.id === albumId);
      const next = latest[(index + 1) % latest.length];
      if (!next) return;
      setPrevious(latest[index] ?? null);
      setId(next.id);
    }, INTERVAL);
    return () => clearTimeout(timer);
  }, [albumIds, albumId, visible, reduced, albums.length]);
  useEffect(() => {
    if (!previous) return;
    const timer = setTimeout(() => setPrevious(null), CROSSFADE);
    return () => clearTimeout(timer);
  }, [previous]);

  // Keep only valid covers: deleting an album can revoke its image URL.
  const outgoing =
    previous &&
    previous.id !== albumId &&
    albums.some((entry) => entry.id === previous.id)
      ? previous
      : null;
  return (
    <aside
      className="screen-preview album-preview"
      aria-label="专辑封面轮播"
      data-album-id={albumId}
      data-paused={!visible || reduced}
    >
      {album ? (
        <>
          <div className="album-preview-stage">
            {outgoing && (
              <div
                className="preview-cover preview-cover-outgoing"
                key={outgoing.id}
                aria-hidden="true"
              >
                <AlbumArt
                  src={outgoing.artwork}
                  title={outgoing.title}
                  artist={outgoing.artist}
                />
              </div>
            )}
            <div className="preview-cover preview-cover-current" key={album.id}>
              <AlbumArt
                src={album.artwork}
                title={album.title}
                artist={album.artist}
              />
              <button
                className="preview-cover-link"
                aria-label={`打开专辑 ${album.title}`}
                onClick={() => onChoose(album)}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="album-preview-empty">
          <span aria-hidden="true">♫</span>
          <strong>专辑封面</strong>
          <small>导入音乐后在这里自动展示</small>
        </div>
      )}
    </aside>
  );
}
