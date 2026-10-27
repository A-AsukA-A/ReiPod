import type { Track, PlayerState } from "../player/Player";
import { AlbumArt } from "./AlbumArt";
import { MarqueeText } from "./MarqueeText";
import { Lyrics } from "./Lyrics";
import { PlayerIcon } from "./PlayerIcon";
import { SeekSlider } from "./SeekSlider";
export type PlayView = "art" | "seek" | "shuffle" | "rating" | "lyrics";
const names: Record<PlayView, string> = {
  art: "封面",
  seek: "进度",
  shuffle: "随机播放",
  rating: "歌曲评分",
  lyrics: "歌词",
};
export function NowPlayingScreen({
  state,
  current,
  view,
  lyricWheel,
  rating,
  volumeOverlay,
}: {
  state: PlayerState;
  current: Track;
  view: PlayView;
  lyricWheel: number;
  rating: number;
  volumeOverlay: boolean;
}) {
  return (
    <div
      className={`now-playing-screen view-${view}`}
      data-volume={volumeOverlay && view === "art"}
    >
      {view === "lyrics" ? (
        <Lyrics
          track={current}
          position={state.position}
          wheelStep={lyricWheel}
        />
      ) : (
        <div className="now-playing-top">
          <div className="np-cover">
            <AlbumArt
              src={current.artwork}
              title={current.album ?? current.title}
              artist={current.artist}
            />
            <div className="np-cover-reflection" aria-hidden="true">
              <AlbumArt
                src={current.artwork}
                title={current.album ?? current.title}
                artist={current.artist}
              />
            </div>
          </div>
          <div className="np-info">
            <div className="np-index">
              {state.queue.indexOf(current.id) + 1} / {state.queue.length}
            </div>
            <strong>
              <MarqueeText text={current.title} active />
            </strong>
            <span>
              <MarqueeText text={current.artist || "未知艺人"} active />
            </span>
            <span>
              <MarqueeText text={current.album || "未知专辑"} active />
            </span>
            {view === "shuffle" && (
              <div className="np-firmware-control">
                <small>随机播放</small>
                <div className="np-shuffle-options">
                  <span className={!state.shuffle ? "chosen" : ""}>关闭</span>
                  <span className={state.shuffle ? "chosen" : ""}>歌曲</span>
                </div>
              </div>
            )}
            {view === "rating" && (
              <div className="np-firmware-control">
                <small>歌曲评分</small>
                <div
                  className="classic-rating"
                  aria-label={`评分 ${rating} 星`}
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <span
                      key={value}
                      className={rating >= value ? "chosen" : ""}
                    >
                      <PlayerIcon name="star" filled={rating >= value} />
                    </span>
                  ))}
                </div>
              </div>
            )}
            {state.status !== "playing" && (
              <small>
                {
                  (
                    {
                      idle: "未播放",
                      loading: "正在载入",
                      paused: "已暂停",
                      buffering: "正在缓冲",
                      ended: "播放完毕",
                      error: "无法播放",
                    } as Partial<Record<string, string>>
                  )[state.status]
                }
              </small>
            )}
          </div>
        </div>
      )}
      <SeekSlider state={state} seeking={view === "seek"} />
      {volumeOverlay && view === "art" && (
        <div
          className="classic-volume"
          role="status"
          aria-label={`音量 ${Math.round(state.volume * 100)}%`}
        >
          <PlayerIcon name="volume" />
          <div className="classic-volume-track">
            <i style={{ width: `${state.volume * 100}%` }} />
          </div>
          <PlayerIcon name="volume" />
        </div>
      )}
      {view !== "lyrics" && (
        <div className="firmware-view-label">
          <span>{view === "art" ? "" : names[view]}</span>
          <span className="play-view-dots">
            {[
              "art",
              "seek",
              "shuffle",
              "rating",
              ...(current.lyrics?.length ? ["lyrics"] : []),
            ].map((mode) => (
              <i className={mode === view ? "active" : ""} key={mode} />
            ))}
          </span>
        </div>
      )}
      {state.error && (
        <div className="screen-error" role="alert">
          {state.error}
          <small>中心键重试 · 下一首跳过</small>
        </div>
      )}
    </div>
  );
}
