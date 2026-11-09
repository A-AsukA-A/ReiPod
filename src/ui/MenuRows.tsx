import { useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { Page } from "./navigation";
import type { Track } from "../player/Player";
import { AlbumArt } from "./AlbumArt";
import { MarqueeText } from "./MarqueeText";
import { PlayerIcon } from "./PlayerIcon";
import { ClassicLcdIcon } from "./ClassicLcdIcon";
import { SearchResultIcon } from "./SearchResultIcon";
import { ClassicGlyph } from "./ClassicGlyph";
export type MenuScrollPositions = Map<string, { key: string; offset: number }>;

export type MenuItem = {
  key: string;
  label: string;
  detail?: string;
  value?: string;
  artwork?: string;
  aggregate?: boolean;
  disabled?: boolean;
  destructive?: boolean;
  leaf?: boolean;
  searchKind?: "search" | "song" | "artist" | "album" | "playlist" | "podcast";
  action: () => void;
  /** Play/Pause can play a collection while Center continues browsing. */
  play?: () => void;
  hold?: () => void;
};
export function MenuRows({
  rows,
  focusedKey,
  page,
  currentId,
  active,
  trackIds,
  tracks,
  playlistIds,
  selectedRow,
  positionKey,
  positions,
}: {
  rows: MenuItem[];
  focusedKey?: string;
  page: Page;
  currentId: string | null;
  active: boolean;
  trackIds: Set<string>;
  tracks: ReadonlyMap<string, Track>;
  playlistIds: Set<string>;
  selectedRow: RefObject<HTMLDivElement | null>;
  positionKey: string;
  positions: MenuScrollPositions;
}) {
  const focusedIndex = Math.max(0, rows.findIndex(row => row.key === focusedKey));
  const start = rows.length > 60 ? Math.max(0, Math.floor(focusedIndex / 10) * 10 - 10) : 0;
  const end = rows.length > 60 ? Math.min(rows.length, start + 40) : rows.length;
  const [rowHeight, setRowHeight] = useState(0);
  const restored = useRef<string | null>(null);
  useLayoutEffect(() => {
    const row = selectedRow.current;
    if (!row) return;
    // Read the final cascade rather than duplicating the firmware's row geometry.
    const measure = () => setRowHeight(row.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => observer.disconnect();
  }, [page, start, rows.length, selectedRow]);
  useLayoutEffect(() => {
    const row = selectedRow.current, container = row?.parentElement;
    if (!row || !container || !focusedKey) return;
    const height = row.getBoundingClientRect().height;
    // Virtual spacers must use the measured height before restoring the window.
    if (!height || (rows.length > 60 && Math.abs(rowHeight - height) > 0.1)) return;
    const top = row.getBoundingClientRect().top - container.getBoundingClientRect().top
      + container.scrollTop - container.clientTop;
    if (restored.current !== positionKey) {
      const saved = positions.get(positionKey);
      if (saved?.key === focusedKey) container.scrollTop = top - saved.offset * height;
      restored.current = positionKey;
    }
    if (top < container.scrollTop) container.scrollTop = top;
    else if (top + row.offsetHeight > container.scrollTop + container.clientHeight)
      container.scrollTop = top + row.offsetHeight - container.clientHeight;
    // Store row-relative position so returning at another shell size is stable.
    positions.delete(positionKey);
    positions.set(positionKey, { key: focusedKey, offset: (top - container.scrollTop) / height });
    if (positions.size > 128) positions.delete(positions.keys().next().value!);
  }, [page, positionKey, focusedKey, rowHeight, start, rows.length, selectedRow, positions]);
  return <>
    {start > 0 && <div aria-hidden="true" style={{ height: start * rowHeight, flexShrink: 0 }} />}
    {rows.slice(start, end).map((row, index) => (
    <div
      key={row.key}
      data-row-key={row.key}
      ref={row.key === focusedKey ? selectedRow : undefined}
      aria-disabled={row.disabled || undefined}
      aria-current={row.key === focusedKey ? "true" : undefined}
      data-member={
        page === "playlist-add-tracks" ? playlistIds.has(row.key) : undefined
      }
      className={`screen-row ${row.key === focusedKey ? "selected" : ""} ${row.disabled ? "is-disabled" : ""} ${row.key === "confirm" || row.destructive ? "destructive" : ""} ${page === "albums" || page === "podcasts" ? "album-row" : ""} ${page === "genres" ? "category-row" : ""} ${trackIds.has(row.key) ? "track-row" : ""}`}
    >
      {row.searchKind && (
        <span className="search-result-icon" data-kind={row.searchKind}>
          {row.artwork
            ? <AlbumArt src={row.artwork} title={row.label} artist={row.detail} />
            : <SearchResultIcon kind={row.searchKind} />}
        </span>
      )}
      {page === "photos" && (
        <span className="photo-album-thumb">
          {row.artwork ? (
            <img src={row.artwork} alt="" decoding="async" />
          ) : (
            <ClassicGlyph
              name={row.key === "all-photos" ? "albums" : "import"}
            />
          )}
        </span>
      )}
      {(page === "albums" || page === "podcasts") &&
        (row.aggregate ? (
          <span className="album-all-art" aria-hidden="true">
            ♫
          </span>
        ) : (
          <AlbumArt src={row.artwork} title={row.label} artist={row.detail} />
        ))}
      {page === "coverflow-album" && <span className="cf-track-number">
        {String(tracks.get(row.key)?.trackNumber ?? start + index + 1).padStart(2, "0")}
      </span>}
      <span className="row-label">
        <span className="row-name">
          <span className="row-title">
            {trackIds.has(row.key) && currentId === row.key && (
              <span className="track-playing-marker">
                <ClassicLcdIcon name={active ? "play" : "pause"} tone="current" />
              </span>
            )}
            <MarqueeText text={row.label} active={row.key === focusedKey} />
          </span>
          {trackIds.has(row.key) && tracks.get(row.key)?.access && (
            <span
              className="track-access-badge"
              aria-label={
                tracks.get(row.key)?.access === "vip" ? "VIP 歌曲" : "付费歌曲"
              }
            >
              {tracks.get(row.key)?.access === "vip" ? "VIP" : "付费"}
            </span>
          )}
        </span>
        {(page === "albums" || page === "podcasts" || page === "genres" || page === "search" || page === "photos" ||
          ((page === "playlists" || page === "playlist-tracks") && row.detail)) && (
          <small className="row-detail">{page === "albums" || page === "genres" || page === "search" || page === "photos" || page === "playlist-tracks"
            ? <MarqueeText text={row.detail ?? ""} active={row.key === focusedKey} />
            : row.detail}</small>
        )}
      </span>
      {row.value && (
        <span className="row-value">
          {row.value === "✓" ? (
            <svg className="row-check" viewBox="0 0 20 20" aria-label="已选择">
              <path d="m3 10 5 5 9-11" />
            </svg>
          ) : (
            row.value
          )}
        </span>
      )}
      {page === "coverflow-album" && <span className="cf-track-duration">
        {formatTrackDuration(tracks.get(row.key)?.duration)}
      </span>}
      {!row.leaf && page !== "coverflow-album" && !(page === "playlist-tracks" && trackIds.has(row.key)) && (
        <span className="row-chevron">
          <PlayerIcon name="chevron" />
        </span>
      )}
    </div>
  ))}
    {end < rows.length && <div aria-hidden="true" style={{ height: (rows.length - end) * rowHeight, flexShrink: 0 }} />}
  </>;
}

function formatTrackDuration(seconds: number | undefined) {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return "";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}
