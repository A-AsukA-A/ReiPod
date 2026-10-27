import type { PlayerState } from "../player/Player";
const time = (value: number) =>
  `${Math.floor(value / 60)}:${Math.floor(value % 60)
    .toString()
    .padStart(2, "0")}`;
/** The iPod scrubber is a display; only the wheel changes its position. */
export function SeekSlider({
  state,
  seeking = false,
}: {
  state: PlayerState;
  seeking?: boolean;
}) {
  const fraction = state.duration
    ? Math.min(100, (state.position / state.duration) * 100)
    : 0;
  return (
    <div className="screen-progress">
      <span className="progress-elapsed">{time(state.position)}</span>
      <div
        className="firmware-progress"
        data-seeking={seeking}
        role="progressbar"
        aria-label="播放进度"
        aria-valuemin={0}
        aria-valuemax={state.duration || 1}
        aria-valuenow={state.position}
      >
        <i style={{ width: `${fraction}%` }} />
        {seeking && <b style={{ left: `${fraction}%` }} />}
      </div>
      <span className="progress-remaining">
        −{time(Math.max(0, state.duration - state.position))}
      </span>
    </div>
  );
}
