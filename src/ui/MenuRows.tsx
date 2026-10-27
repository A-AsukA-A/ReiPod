import type { RefObject } from "react";
import type { Page } from "./navigation";
import { AlbumArt } from "./AlbumArt";
import { MarqueeText } from "./MarqueeText";
import { PlayerIcon } from "./PlayerIcon";
export type MenuItem = {
  key: string;
  label: string;
  detail?: string;
  value?: string;
  artwork?: string;
  disabled?: boolean;
  leaf?: boolean;
  action: () => void;
};
export function MenuRows({
  rows,
  focusedKey,
  page,
  currentId,
  active,
  trackIds,
  playlistIds,
  selectedRow,
}: {
  rows: MenuItem[];
  focusedKey?: string;
  page: Page;
  currentId: string | null;
  active: boolean;
  trackIds: Set<string>;
  playlistIds: Set<string>;
  selectedRow: RefObject<HTMLDivElement | null>;
}) {
  return rows.map((row) => (
    <div
      key={row.key}
      ref={row.key === focusedKey ? selectedRow : undefined}
      aria-disabled={row.disabled || undefined}
      aria-current={row.key === focusedKey ? "true" : undefined}
      data-member={
        page === "playlist-add-tracks" ? playlistIds.has(row.key) : undefined
      }
      className={`screen-row ${row.key === focusedKey ? "selected" : ""} ${row.disabled ? "is-disabled" : ""} ${row.key === "confirm" ? "destructive" : ""} ${page === "albums" ? "album-row" : ""} ${trackIds.has(row.key) ? "track-row" : ""}`}
    >
      {page === "albums" && (
        <AlbumArt src={row.artwork} title={row.label} artist={row.detail} />
      )}
      <span className="row-label">
        <span className="row-title">
          {trackIds.has(row.key) && currentId === row.key && (
            <span className="track-playing-marker">
              <PlayerIcon name={active ? "play" : "pause"} filled={active} />
            </span>
          )}
          <MarqueeText text={row.label} active={row.key === focusedKey} />
        </span>
        {(page === "albums" || page === "search") && (
          <small>{row.detail}</small>
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
      {!row.leaf && (
        <span className="row-chevron">
          <PlayerIcon name="chevron" />
        </span>
      )}
    </div>
  ));
}
