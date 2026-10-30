import type { ComponentProps, RefObject, ReactNode } from "react";
import type { Page } from "./navigation";
import type { PlayerState, Track } from "../player/Player";
import type { Album } from "../player/library";
import { CoverFlow } from "./CoverFlow";
import { MenuPreview } from "./MenuPreview";
import { ClassicClock } from "./ClassicClock";
import { ClassicGlyph } from "./ClassicGlyph";
import { MenuRows } from "./MenuRows";
import type { MenuItem } from "./MenuRows";
import { NowPlayingScreen } from "./NowPlayingScreen";
import { PhotoScreen } from "./PhotoScreen";
import { WheelTextEntry } from "./WheelTextEntry";
import { TextReader } from "./TextReader";
import type { TextReaderHandle } from "./TextReader";
import { classicPreviewModel } from "./classicScreenModel";

type Props = {
  page: Page; groupKey?: string; title: string;
  menu: { rows: MenuItem[]; focusedRow?: MenuItem; selectedIndex: number;
    isTrackList: boolean; visibleIds: Set<string>; visibleTracks: Track[];
    trackById: ReadonlyMap<string, Track>; playlistTrackIds: Set<string>;
    selectedRow: RefObject<HTMLDivElement | null>; hasManagedRows: boolean; splitMenu: boolean };
  library: { albums: Album[]; flowAlbums: Album[]; artistCount: number;
    browseAlbumCount: number; playlistTitle?: string; optionTrack?: Track };
  playback: { state: PlayerState; current?: Track; active: boolean;
    playView: ComponentProps<typeof NowPlayingScreen>["view"];
    lyricWheel: number; rating: number; volumeOverlay: boolean };
  text: { textEntry: Pick<ComponentProps<typeof WheelTextEntry>, "characters" | "index"> & { editing: boolean };
    query: string; playlistName: string; textDocument?: ComponentProps<typeof TextReader>["source"];
    reader: RefObject<TextReaderHandle | null> };
  photos: { activePhotos: ComponentProps<typeof PhotoScreen>["photos"];
    photoIndex: number; slideshow: boolean };
  prefs: { brightness: number; volumeLimit: number };
  preview: Parameters<typeof classicPreviewModel>[0];
  accountHeader: ReactNode; qrImage?: string; serviceName: string;
};

/** Classic page presentation only; sessions, service capabilities and commands are injected. */
export function ClassicScreenContent({ page, groupKey, title, menu, library, playback,
  text, photos, prefs, preview, accountHeader, qrImage, serviceName }: Props) {
  const { rows, focusedRow, selectedIndex, isTrackList, visibleIds, visibleTracks,
    trackById, playlistTrackIds, selectedRow, hasManagedRows, splitMenu } = menu;
  const { albums, flowAlbums, artistCount, browseAlbumCount, playlistTitle, optionTrack } = library;
  const { state, current, active, playView, lyricWheel, rating, volumeOverlay } = playback;
  const { textEntry, query, playlistName, textDocument, reader } = text;
  const { activePhotos, photoIndex, slideshow } = photos;
  const renderPreview = () => <MenuPreview {...classicPreviewModel(preview)} />;
  const renderRows = () => (
    <MenuRows
      rows={rows}
      focusedKey={focusedRow?.key}
      page={page}
      currentId={state.currentId}
      active={active}
      trackIds={isTrackList ? visibleIds : new Set<string>()}
      tracks={trackById}
      playlistIds={playlistTrackIds}
      selectedRow={selectedRow}
    />
  );
  return (<>
      {(page === "search" || page === "playlist-name") &&
        (textEntry.editing ? (
          <WheelTextEntry
            text={page === "search" ? query : playlistName}
            title={page === "search" ? "搜索音乐" : "歌单名称"}
            characters={textEntry.characters}
            index={textEntry.index}
          />
        ) : (
          <div className="lcd-text-display">
            {page === "search" ? query || "全部歌曲" : playlistName}
          </div>
        ))}
      {(page === "playlist-tracks" ||
        page === "playlist-add-tracks") && (
        <div className="lcd-toolbar">
          <span>{playlistTitle ?? "歌单"}</span>
        </div>
      )}
      {page === "about" && (
        <div className="classic-about">
          <strong>ReiPod</strong>
          <span>Classic 音乐播放器</span>
          <dl>
            <dt>歌曲</dt>
            <dd>{state.tracks.length}</dd>
            <dt>专辑</dt>
            <dd>{albums.length}</dd>
            <dt>艺人</dt>
            <dd>{artistCount}</dd>
            <dt>版本</dt>
            <dd>0.1.0</dd>
          </dl>
          <nav>{renderRows()}</nav>
        </div>
      )}
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
          <strong>
            {Math.round(
              (page === "brightness"
                ? prefs.brightness
                : prefs.volumeLimit) * 100,
            )}
            %
          </strong>
          <small>
            {page === "volume-limit" && !state.volumeControl
              ? "此设备使用侧键调节音量"
              : "转动转轮调整，中心键完成"}
          </small>
          <nav>{renderRows()}</nav>
        </div>
      )}
      {page === "clock" && (
        <div className="clock-screen">
          <ClassicClock />
          <nav>{renderRows()}</nav>
        </div>
      )}
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
            "photo-grid",
            "photo-full",
          ].includes(page) &&
          !(page === "playlist-name" && textEntry.editing))) && (
        <div
          className={`settings-screen ${splitMenu ? "split-settings-screen" : ""} ${page === "photos" ? "photo-album-list" : ""} ${page === "music-account" ? "music-account-screen" : ""} ${page === "music-account" && qrImage ? "has-login-qr" : ""}`}
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
      {((isTrackList &&
        page !== "coverflow-album" &&
        !(page === "search" && textEntry.editing)) ||
        (page === "playing" && !current)) &&
        (isTrackList && visibleTracks.length ? (
          <div className="song-screen">
            <div
              className="screen-song-list"
              role="group"
              aria-label={`${title}列表`}
            >
              {renderRows()}
            </div>
            <div className="screen-footer">
              <span>
                {visibleIds.has(focusedRow?.key ?? "")
                  ? `${visibleTracks.findIndex((track) => track.id === focusedRow?.key) + 1} / ${visibleTracks.length}`
                  : `共 ${visibleTracks.length} 首歌曲`}
              </span>
            </div>
          </div>
        ) : (
          <div className="screen-empty">
            <span className="music-note" aria-hidden="true">
              ♫
            </span>
            <strong>
              {page === "favorites"
                ? "还没有收藏的歌曲"
                : page === "search"
                  ? "没有匹配的歌曲"
                  : "暂无歌曲"}
            </strong>
            {page === "search" ? (
              <nav className="empty-actions">{renderRows()}</nav>
            ) : page === "playlist-tracks" ? (
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
  </>);
}
