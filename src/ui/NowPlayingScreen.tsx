import type { Track, PlayerState } from "../player/Player";
import { AlbumArt } from "./AlbumArt";
import { MarqueeText } from "./MarqueeText";
import { Lyrics } from "./Lyrics";
import { PlayerIcon } from "./PlayerIcon";
import { SeekSlider } from "./SeekSlider";
import { PlaybackAlert } from "./PlaybackAlert";
import type { PlayView } from "./nowPlaying";

function Choices({
  label,
  choices,
  selected,
}: {
  label: string;
  choices: string[];
  selected: number;
}) {
  return (
    <div className="np-mode-panel" role="group" aria-label={label}>
      {choices.map((choice, index) => (
        <span
          key={choice}
          aria-current={selected === index ? "true" : undefined}
          className={selected === index ? "chosen" : ""}
        >
          {choice}
        </span>
      ))}
    </div>
  );
}

/** The cover stays anchored while Center changes only the bottom control bay. */
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
  const volume = volumeOverlay && view === "art";
  const progress = view === "art" || view === "seek" || view === "lyrics";
  return (
    <div className={`now-playing-screen view-${view}`} data-volume={volume}>
      {view === "lyrics" ? (
        <Lyrics
          track={current}
          position={state.position}
          wheelStep={lyricWheel}
        />
      ) : (
        <>
          <div className="np-indicators" aria-hidden="true">
            <span
              className={
                state.shuffle || view === "shuffle" ? "is-current" : ""
              }
            >
              <PlayerIcon name="shuffle" />
            </span>
            {state.repeat !== "off" ? (
              <span>
                <PlayerIcon name="repeat" />
                {state.repeat === "one" && <small>1</small>}
              </span>
            ) : (
              <PlayerIcon name="queue" />
            )}
            {!!current.lyrics?.length && <PlayerIcon name="lyrics" filled />}
          </div>
          <div
            className="now-playing-top"
            aria-label={`播放队列第 ${state.queue.indexOf(current.id) + 1} 首，共 ${state.queue.length} 首`}
          >
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
              <strong>
                <MarqueeText text={current.title} active />
              </strong>
              <span>
                <MarqueeText text={current.artist || "未知艺人"} active />
              </span>
              <span>
                <MarqueeText text={current.album || "未知专辑"} active />
              </span>
              {state.status !== "playing" && state.status !== "paused" && (
                <small>
                  {
                    (
                      {
                        idle: "未播放",
                        loading: "正在载入",
                        buffering: "正在缓冲",
                        ended: "播放完毕",
                        error: "无法播放",
                      } as Record<string, string>
                    )[state.status]
                  }
                </small>
              )}
            </div>
          </div>
        </>
      )}
      <div className="np-control-bay" data-control={volume ? "volume" : view}>
        <div className="np-progress-slot" aria-hidden={!progress || volume}>
          <SeekSlider state={state} seeking={view === "seek"} />
        </div>
        {volume && (
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
        {view === "shuffle" && (
          <div className="np-shuffle-options">
            <Choices
              label="随机播放"
              choices={["关闭", "歌曲"]}
              selected={Number(state.shuffle)}
            />
          </div>
        )}
        {view === "rating" && (
          <div
            className="classic-rating"
            role="group"
            aria-label={`评分 ${rating} 星`}
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <span key={value} className={rating >= value ? "chosen" : ""}>
                <PlayerIcon name="star" filled={rating >= value} />
              </span>
            ))}
          </div>
        )}
      </div>
      {state.error && (
        <PlaybackAlert message={state.error} kind={state.errorKind} />
      )}
    </div>
  );
}
