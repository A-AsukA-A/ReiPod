import { useEffect, useRef, useState } from "react";
import type { Album } from "../player/library";
import { ClassicGlyph } from "./ClassicGlyph";
import { AlbumArt } from "./AlbumArt";
import { classicMotion } from "./motion";

const INTERVAL = classicMotion.previewInterval;
const CROSSFADE = classicMotion.previewFade;

/** The classic menu's right pane runs independently of the wheel selection. */
export function AlbumPreview({
  albums,
  initialAlbumId,
  pinnedAlbum,
  enabled = true,
  suspended = false,
  source = "music",
}: {
  enabled?: boolean;
  suspended?: boolean;
  albums: Album[];
  initialAlbumId?: string;
  pinnedAlbum?: Album;
  source?: "music" | "podcasts" | "photos";
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
  const album =
    pinnedAlbum ?? albums.find((entry) => entry.id === id) ?? albums[0];
  const albumId = album?.id;
  const seen = useRef(new Set<string>());
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
  useEffect(() => { seen.current.clear(); }, [source, albumIds]);
  useEffect(() => {
    if (source !== "photos" || !enabled || suspended || !visible) return;
    const images = albums.slice(0, 8).flatMap(album => {
      if (!album.artwork) return [];
      const image = new Image(); image.src = album.artwork; return [image];
    });
    return () => { for (const image of images) image.src = ""; };
  }, [source, albumIds, enabled, suspended, visible]);
  useEffect(() => {
    if (
      pinnedAlbum ||
      !enabled ||
      suspended ||
      !visible ||
      reduced ||
      albums.length < 2
    )
      return;
    const timer = setTimeout(() => {
      const latest = catalog.current;
      const index = latest.findIndex((entry) => entry.id === albumId);
      if (source === "photos" && albumId) seen.current.add(albumId);
      let others = source !== "music" ? latest.filter(entry => entry.id !== albumId) : latest;
      if (source === "photos") {
        let unseen = others.filter(entry => !seen.current.has(entry.id));
        if (!unseen.length) { seen.current.clear(); if (albumId) seen.current.add(albumId); unseen = others; }
        others = unseen;
      }
      const next = source !== "music" ? others[Math.floor(Math.random() * others.length)]
        : latest[(index + 1) % latest.length];
      if (!next) return;
      setPrevious(latest[index] ?? null);
      setId(next.id);
    }, INTERVAL);
    return () => clearTimeout(timer);
  }, [
    albumIds,
    albumId,
    visible,
    reduced,
    albums.length,
    enabled,
    suspended,
    pinnedAlbum,
    source,
  ]);
  useEffect(() => {
    if (!previous) return;
    const timer = setTimeout(() => setPrevious(null), CROSSFADE);
    return () => clearTimeout(timer);
  }, [previous]);

  // Keep only valid covers: deleting an album can revoke its image URL.
  const outgoing =
    !pinnedAlbum &&
    previous &&
    previous.id !== albumId &&
    albums.some((entry) => entry.id === previous.id)
      ? previous
      : null;
  return (
    <aside
      className="screen-preview album-preview"
      aria-label={pinnedAlbum ? "正在播放封面" : source === "photos" ? "照片轮播" : source === "podcasts" ? "播客封面轮播" : "专辑封面轮播"}
      data-album-id={albumId}
      data-paused={!enabled || suspended || !visible || reduced}
      aria-hidden={!enabled}
      inert={!enabled}
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
                  fallback={source === "photos" ? "photos" : undefined}
                  src={outgoing.artwork}
                  title={outgoing.title}
                  artist={outgoing.artist}
                />
              </div>
            )}
            <div className="preview-cover preview-cover-current" key={album.id}>
              <AlbumArt
                fallback={source === "photos" ? "photos" : undefined}
                src={album.artwork}
                title={album.title}
                artist={album.artist}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="album-preview-empty">
          <span aria-hidden="true">{source === "photos" ? <ClassicGlyph name="albums" /> : "♫"}</span>
          <strong>{source === "photos" ? "照片" : source === "podcasts" ? "播客封面" : "专辑封面"}</strong>
          <small>{source === "photos" ? "有可用照片后在这里自动展示" : source === "podcasts" ? "有可用播客后在这里自动展示" : "导入音乐后在这里自动展示"}</small>
        </div>
      )}
    </aside>
  );
}
