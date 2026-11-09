import { useLayoutEffect, useRef, useState, memo } from "react";
import type { PhotoItem } from "../media/photos";
export const PhotoScreen = memo(function PhotoScreen({
  photos,
  index,
  full,
  offset = 0,
  slideshow,
  loading = false,
  total = photos.length,
  positions,
  positionKey,
}: {
  photos: PhotoItem[];
  index: number;
  full: boolean;
  offset?: number;
  slideshow: boolean;
  loading?: boolean;
  total?: number;
  positions: Map<string, { key: string; offset: number }>;
  positionKey: string;
}) {
  const selected = useRef<HTMLDivElement>(null);
  const restored = useRef<string | null>(null);
  const localIndex = index - offset;
  const start = photos.length > 100 ? Math.max(0, Math.floor(localIndex / 5) - 3) * 5 : 0;
  const end = Math.min(photos.length, start + 100);
  const date = photos[localIndex]?.takenAt ?? photos[localIndex]?.file?.lastModified ?? 0;
  useLayoutEffect(() => {
    const element = selected.current,
      parent = element?.parentElement;
    if (element && parent) {
      const key = photos[localIndex]?.id;
      if (!key) return;
      const stride = element.offsetHeight + (parseFloat(getComputedStyle(parent).rowGap) || 0);
      const saved = positions.get(positionKey);
      if (restored.current !== positionKey && saved) {
        const anchor = [...parent.children].find(child =>
          (child as HTMLElement).dataset.photoId === saved.key) as HTMLElement | undefined;
        if (anchor) parent.scrollTop = anchor.offsetTop - saved.offset * stride;
      }
      restored.current = positionKey;
      if (element.offsetTop < parent.scrollTop)
        parent.scrollTop = element.offsetTop;
      else if (
        element.offsetTop + element.offsetHeight >
        parent.scrollTop + parent.clientHeight
      )
        parent.scrollTop =
          element.offsetTop + element.offsetHeight - parent.clientHeight;
      positions.delete(positionKey);
      positions.set(positionKey, { key, offset: (element.offsetTop - parent.scrollTop) / stride });
      if (positions.size > 128) positions.delete(positions.keys().next().value!);
    } else {
      restored.current = null;
    }
  }, [index, offset, photos, full, positions, positionKey, localIndex]);
  if (full && (photos.length || loading || total > 0))
    return <FullPhoto photo={photos[localIndex]} index={index} total={total} slideshow={slideshow} loading={loading} />;
  if (!photos.length)
    return (
      <div className="screen-empty">
        <strong>{loading ? "正在读取照片…" : "暂无照片"}</strong>
        <small>按 MENU 返回相册</small>
      </div>
    );
  return (
    <>
      <div className="photo-grid-header">
        <span>{total.toLocaleString()} 张照片</span>
        <span title={photos[localIndex]?.system ? "所选照片的拍摄日期" : "所选照片的文件修改日期"}>
          {date > 0 &&
            new Date(date).toLocaleDateString(
              "zh-CN",
              { year: "numeric", month: "long", day: "numeric" },
            )}
        </span>
      </div>
      <div className="photo-contact-sheet" role="list" aria-label="照片缩略图">
        {start + offset > 0 && <div aria-hidden="true" style={{ gridColumn: "1 / -1", gridRow: `1 / span ${(start + offset) / 5}`, background: "none" }} />}
        {photos.slice(start, end).map((photo, visibleIndex) => (
          <div
            role="listitem"
            ref={visibleIndex + start === localIndex ? selected : undefined}
            className={visibleIndex + start === localIndex ? "current-photo" : ""}
            key={photo.id}
            data-photo-id={photo.id}
          >
            <img
              src={photo.thumbnail ?? photo.url}
              alt={photo.name}
              loading="lazy"
              decoding="async"
            />
          </div>
        ))}
        {end + offset < total && <div aria-hidden="true" style={{ gridColumn: "1 / -1",
          gridRow: `${Math.ceil((end + offset) / 5) + 1} / span ${Math.ceil((total - end - offset) / 5)}`, background: "none" }} />}
      </div>
    </>
  );
});


/** Keep the decoded DOM image until the latest selection is ready. Never blank it to preload. */
function FullPhoto({ photo, index, total, slideshow, loading }: {
  photo?: PhotoItem; index: number; total: number; slideshow: boolean; loading: boolean;
}) {
  const [visible, setVisible] = useState<PhotoItem>();
  const [failed, setFailed] = useState<string>();
  const latest = useRef(photo?.url);
  latest.current = photo?.url;
  const shown = visible ?? (photo && { ...photo, url: photo.thumbnail ?? photo.url });
  const waiting = !!photo && shown?.url !== photo.url;
  const layers = [shown, ...(waiting ? [photo] : [])].filter((item): item is PhotoItem => !!item);
  return <div className="photo-full" aria-label={`第 ${index + 1} 张，共 ${total} 张照片`}
    aria-busy={loading || waiting && failed !== photo?.url}>
    {layers.map(item => {
      const ready = item.url === shown?.url;
      return <img key={item.url} src={item.url} alt={item.name}
        data-visible={ready ? "true" : undefined} aria-hidden={ready ? undefined : true}
        onLoad={async event => {
          const image = event.currentTarget;
          try { await image.decode(); } catch { return; }
          if (image.naturalWidth === 0) return;
          if (ready) setVisible(current => current ?? item);
          else if (latest.current === item.url) { setVisible(item); setFailed(undefined); }
        }}
        onError={() => { if (latest.current === item.url) setFailed(item.url); }} />;
    })}
    {failed && failed === photo?.url && <span role="status">照片载入失败 · MENU 返回</span>}
    {slideshow && <span aria-label="幻灯片播放中">▷</span>}
  </div>;
}
