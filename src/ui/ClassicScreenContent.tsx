import { lazy, Suspense, useRef } from "react";
import type { ComponentProps, RefObject, ReactNode } from "react";
import type { Page } from "./navigation";
import type { PlayerState, Track } from "../player/Player";
import type { Album } from "../player/library";

import { MenuPreview } from "./MenuPreview";

import type { ExtrasState } from "../models/classicExtras";
import { ClassicGlyph } from "./ClassicGlyph";
import { ClassicAboutScreen } from "./ClassicAboutScreen";
import type { ClassicAboutInformation } from "./ClassicAboutScreen";
import { MenuRows } from "./MenuRows";
import type { MenuScrollPositions, MenuItem } from "./MenuRows";
import { NowPlayingScreen } from "./NowPlayingScreen";
import { WheelTextEntry } from "./WheelTextEntry";



import type { TextReaderHandle } from "./TextReader";
import { classicPreviewModel } from "./classicScreenModel";

// Secondary displays load only when opened; all files remain bundled for native/offline use.
const CoverFlow = lazy(() => import("./CoverFlow").then(module => ({ default: module.CoverFlow })));
const ClassicClocksScreen = lazy(() => import("./ClassicExtrasScreens").then(module => ({ default: module.ClassicClocksScreen })));
const ClassicStopwatchScreen = lazy(() => import("./ClassicExtrasScreens").then(module => ({ default: module.ClassicStopwatchScreen })));

const ClassicSearchScreen = lazy(() => import("./ClassicSearchScreen").then(module => ({ default: module.ClassicSearchScreen })));
const TextReader = lazy(() => import("./TextReader").then(module => ({ default: module.TextReader })));

const PhotoScreen = lazy(() => import("./PhotoScreen").then(module => ({ default: module.PhotoScreen })));

type Props = {
  page: Page; groupKey?: string; title: string;
  menu: { rows: MenuItem[]; focusedRow?: MenuItem; selectedIndex: number;
    isTrackList: boolean; visibleIds: Set<string>; visibleTracks: Track[];
    trackById: ReadonlyMap<string, Track>; playlistTrackIds: Set<string>;
    positionKey: string;
    selectedRow: RefObject<HTMLDivElement | null>; hasManagedRows: boolean; splitMenu: boolean };
  library: { albums: Album[]; flowAlbums: Album[]; artistCount: number;
    browseAlbumCount: number; playlistTitle?: string; optionTrack?: Track };
  playback: { state: PlayerState; current?: Track; active: boolean;
    playView: ComponentProps<typeof NowPlayingScreen>["view"];
    lyricWheel: number; rating: number; volumeOverlay: boolean };
  text: { textEntry: Pick<ComponentProps<typeof WheelTextEntry>, "characters" | "index"> & { editing: boolean };
    query: string; playlistName: string; textDocument?: ComponentProps<typeof TextReader>["source"];
    reader: RefObject<TextReaderHandle | null>; searchCount: number; searchPending: boolean; searchError?: string };
  photos: { activePhotos: ComponentProps<typeof PhotoScreen>["photos"];
    photoIndex: number; slideshow: boolean; loading?: boolean; total?: number; offset?: number };
  prefs: { brightness: number; volumeLimit: number };
  about: { index: number; information: ClassicAboutInformation };
  extras: ExtrasState;
  preview: Parameters<typeof classicPreviewModel>[0];
  accountHeader: ReactNode; qrImage?: string; serviceName: string;
};

/** Classic page presentation only; sessions, service capabilities and commands are injected. */
export function ClassicScreenContent({ page, groupKey, title, menu, library, playback,
  text, photos, prefs, about, extras, preview, accountHeader, qrImage, serviceName }: Props) {
  const { rows, focusedRow, selectedIndex, isTrackList, visibleIds, visibleTracks,
    trackById, playlistTrackIds, selectedRow, hasManagedRows, splitMenu, positionKey } = menu;
  const positions = useRef<MenuScrollPositions>(new Map());
  const { albums, flowAlbums, artistCount, browseAlbumCount, playlistTitle, optionTrack } = library;
  const { state, current, active, playView, lyricWheel, rating, volumeOverlay } = playback;
  const { textEntry, query, playlistName, textDocument, reader } = text;
  const { activePhotos, photoIndex, slideshow } = photos;
  const renderPreview = () => <MenuPreview {...classicPreviewModel(preview)} />;
  const renderRows = (showFocus = true) => (
    <MenuRows
      rows={rows}
      focusedKey={showFocus ? focusedRow?.key : undefined}
      page={page}
      currentId={state.currentId}
      active={active}
      trackIds={isTrackList ? visibleIds : new Set<string>()}
      tracks={trackById}
      playlistIds={playlistTrackIds}
      selectedRow={selectedRow}
      positionKey={positionKey}
      positions={positions.current}
    />
  );
  return (<Suspense fallback={null}>
      {page === "search" && (
        <ClassicSearchScreen query={query} editing={textEntry.editing}
          characters={textEntry.characters} index={textEntry.index}
          count={text.searchCount} pending={text.searchPending} error={text.searchError}>
          {renderRows(!textEntry.editing)}
        </ClassicSearchScreen>
      )}
      {page === "playlist-name" &&
        (textEntry.editing ? (
          <WheelTextEntry
            text={playlistName}
            title="歌单名称"
            characters={textEntry.characters}
            index={textEntry.index}
          />
        ) : (
          <div className="lcd-text-display">
            {playlistName}
          </div>
        ))}
      {page === "playlist-add-tracks" && (
        <div className="lcd-toolbar">
          <span>{playlistTitle ?? "歌单"}</span>
        </div>
      )}
      {page === "about" && <ClassicAboutScreen {...about} />}
      {(page === "brightness" || page === "volume-limit") && (
        <div className="classic-adjustment">
          <ClassicGlyph
            name={page === "brightness" ? "background" : "speaker"}
          />
          <progress
            className="adjustment-meter"
            max={1}
            value={
              page === "brightness"
                ? prefs.brightness
                : prefs.volumeLimit
            }
            aria-label={
              page === "brightness" ? "屏幕亮度" : "最高音量"
            }
          />
          {page === "volume-limit" && !state.volumeControl &&
            <small>此设备使用侧键调节音量</small>}
          <nav>{renderRows()}</nav>
        </div>
      )}
      {page === "clock" && (extras.clocks.length
        ? <ClassicClocksScreen clocks={extras.clocks} selected={focusedRow?.key} />
        : <nav className="settings-screen">{renderRows()}</nav>)}
      {page === "stopwatch-timer" && <ClassicStopwatchScreen session={extras.current}>{renderRows()}</ClassicStopwatchScreen>}
      {page === "stopwatch-log" && (() => {
        const log = extras.logs.find(item => item.id === groupKey);
        return log ? <ClassicStopwatchScreen session={log} log>{renderRows()}</ClassicStopwatchScreen>
          : <div className="screen-empty"><strong>记录已不在列表中</strong></div>;
      })()}
      {page === "text-reader" && textDocument && (
        <TextReader
          source={textDocument}
          ref={reader}
          key={textDocument.id}
        />
      )}
      {(page === "home" || page === "music") && (
        <div className="home-screen">
          <nav
            className="screen-menu"
            aria-label={page === "home" ? "主菜单" : "音乐菜单"}
          >
            {renderRows()}
          </nav>
          {renderPreview()}
        </div>
      )}
      {(page === "photo-grid" || page === "photo-full") && (
        <PhotoScreen
          photos={activePhotos}
          index={photoIndex}
          full={page === "photo-full"}
          slideshow={slideshow}
          loading={photos.loading}
          total={photos.total}
          offset={photos.offset}
          positions={positions.current}
          positionKey={`photo:${groupKey ?? "local-all"}`}
        />
      )}
      {(page === "coverflow" || page === "coverflow-album") &&
        (albums.length ? (
          <CoverFlow
            albums={flowAlbums}
            index={
              page === "coverflow-album"
                ? Math.max(
                    0,
                    flowAlbums.findIndex(
                      (album) => album.id === groupKey,
                    ),
                  )
                : selectedIndex
            }
            animate
            albumOpen={page === "coverflow-album"}
          >
            {page === "coverflow-album" && (
              <div
                className="screen-song-list"
                role="group"
                aria-label="专辑曲目"
              >
                {renderRows()}
              </div>
            )}
          </CoverFlow>
        ) : (
          <div className="screen-empty">
            <strong>暂无专辑</strong>
            <nav className="empty-actions" aria-label="添加音乐">
              {renderRows()}
            </nav>
          </div>
        ))}
      {(page === "settings" ||
        page === "music-services" ||
        page === "music-account" ||
        page === "notes" ||
        page === "text-options" ||
        page === "confirm-delete-text" ||
        page === "confirm-clear" ||
        page === "artists" ||
        page === "albums" ||
        page === "playlists" ||
        (hasManagedRows &&
          !isTrackList &&
          ![
            "about",
            "brightness",
            "volume-limit",
            "clock",
            "stopwatch-timer",
            "stopwatch-log",
            "photo-grid",
            "photo-full",
          ].includes(page) &&
          !(page === "playlist-name" && textEntry.editing))) && (
        <div
          className={`settings-screen ${splitMenu ? "split-settings-screen" : ""} ${page === "photos" ? "photo-album-list" : ""} ${page === "playlists" ? "playlist-menu" : ""} ${page === "music-account" ? "music-account-screen" : ""} ${page === "music-account" && qrImage ? "has-login-qr" : ""}`}
        >
          {page === "music-account" && accountHeader}
          {page === "music-account" && qrImage && (
            <div className="music-login-qr">
              <img
                src={qrImage}
                alt={`${serviceName}登录二维码`}
              />
            </div>
          )}
          {page === "confirm-delete-text" && (
            <p className="clear-question">
              删除「{textDocument?.title ?? "此文本"}」？
              <span>不会删除设备上的原始文件</span>
            </p>
          )}
          {(page === "confirm-delete-track" ||
            page === "confirm-delete-playlist") && (
            <p className="clear-question">
              {page === "confirm-delete-track"
                ? `删除「${optionTrack?.title ?? "此歌曲"}」？`
                : `删除「${playlistTitle ?? "此歌单"}」？`}
              <span>
                {page === "confirm-delete-track"
                  ? "不会删除设备上的原始文件"
                  : "歌曲仍保留在曲库中"}
              </span>
            </p>
          )}
          {page === "track-options" && optionTrack && (
            <p className="options-title">{optionTrack.title}</p>
          )}
          {page === "confirm-clear" && (
            <p className="clear-question">
              清空本地资料库及已保存的音频？
              <span>不会删除设备上的原始文件</span>
            </p>
          )}
          {page === "reset-settings" && (
            <p className="clear-question">还原所有原机设置？<span>不会删除音乐和照片</span></p>
          )}
          <nav
            className="screen-menu"
            aria-label={
              page === "settings"
                ? "设置菜单"
                : page === "confirm-clear"
                  ? "清空确认"
                  : `${title}列表`
            }
          >
            {renderRows()}
          </nav>
          {splitMenu && renderPreview()}
          {(page === "albums" || page === "artists") && (
            <div className="screen-footer">
              {page === "albums"
                ? browseAlbumCount
                : artistCount}{" "}
              {page === "albums" ? "张专辑" : "位艺人"}
            </div>
          )}
        </div>
      )}
      {((isTrackList && page !== "search" &&
        page !== "coverflow-album") ||
        (page === "playing" && !current)) &&
        (isTrackList && visibleTracks.length ? (
          <div className={`song-screen ${page === "playlist-tracks" ? "playlist-song-screen" : ""}`}>
            <div
              className="screen-song-list"
              role="group"
              aria-label={`${title}列表`}
            >
              {renderRows()}
            </div>
            {page !== "playlist-tracks" && <div className="screen-footer">
              <span>
                {visibleIds.has(focusedRow?.key ?? "")
                  ? `${visibleTracks.findIndex((track) => track.id === focusedRow?.key) + 1} / ${visibleTracks.length}`
                  : `共 ${visibleTracks.length} ${page === "podcast-episodes" ? "集" : "首歌曲"}`}
              </span>
            </div>}
          </div>
        ) : (
          <div className="screen-empty">
            <span className="music-note" aria-hidden="true">
              ♫
            </span>
            <strong>
              {page === "favorites"
                ? "还没有收藏的歌曲"
                : page === "podcast-episodes"
                  ? "此节目暂无单集"
                : page === "playlist-tracks"
                  ? "播放列表为空"
                : "暂无歌曲"}
            </strong>
            {page === "playlist-tracks" ? (
              <nav className="empty-actions" aria-label="管理空歌单">
                {renderRows()}
              </nav>
            ) : page === "favorites" ? (
              <small>长按中心键，在歌曲选项中收藏</small>
            ) : (
              <nav className="empty-actions" aria-label="添加音乐">
                {renderRows()}
              </nav>
            )}
          </div>
        ))}
      {page === "playing" && current && (
        <NowPlayingScreen
          state={state}
          current={current}
          view={playView}
          lyricWheel={lyricWheel}
          rating={rating}
          volumeOverlay={volumeOverlay}
        />
      )}
  </Suspense>);
}
