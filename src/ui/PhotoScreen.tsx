import { useEffect, useRef } from "react";
import type { Photo } from "../media/photos";
export function PhotoScreen({
  photos,
  index,
  full,
  slideshow,
}: {
  photos: Photo[];
  index: number;
  full: boolean;
  slideshow: boolean;
}) {
  const selected = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = selected.current,
      parent = element?.parentElement;
    if (element && parent) {
      if (element.offsetTop < parent.scrollTop)
        parent.scrollTop = element.offsetTop;
      else if (
        element.offsetTop + element.offsetHeight >
        parent.scrollTop + parent.clientHeight
      )
        parent.scrollTop =
          element.offsetTop + element.offsetHeight - parent.clientHeight;
    }
  }, [index]);
  if (!photos.length)
    return (
      <div className="screen-empty">
        <strong>暂无照片</strong>
        <small>按 MENU 返回后导入照片</small>
      </div>
    );
  if (full)
    return (
      <div
        className="photo-full"
        aria-label={`第 ${index + 1} 张，共 ${photos.length} 张照片`}
      >
        <img
          key={photos[index]?.id}
          src={photos[index]?.url}
          alt={photos[index]?.name}
        />
        {slideshow && <span aria-label="幻灯片播放中">▷</span>}
      </div>
    );
  return (
    <>
      <div className="photo-grid-header">
        <span>{photos.length.toLocaleString()} 张照片</span>
        <span title="所选照片的文件修改日期">
          {photos[index]?.file.lastModified > 0 &&
            new Date(photos[index].file.lastModified).toLocaleDateString(
              "zh-CN",
              { year: "numeric", month: "long", day: "numeric" },
            )}
        </span>
      </div>
      <div className="photo-contact-sheet" role="list" aria-label="照片缩略图">
        {photos.map((photo, i) => (
          <div
            role="listitem"
            ref={i === index ? selected : undefined}
            className={i === index ? "current-photo" : ""}
            key={photo.id}
          >
            <img
              src={photo.url}
              alt={photo.name}
              loading="lazy"
              decoding="async"
            />
          </div>
        ))}
      </div>
    </>
  );
}
