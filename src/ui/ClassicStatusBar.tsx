import { BatteryIndicator } from "./BatteryIndicator";
import { PlayerIcon } from "./PlayerIcon";
import { repeatText } from "./primaryMenus";

type Props = {
  title: string;
  shuffle: boolean;
  repeat: "off" | "all" | "one";
  held: boolean;
  hasCurrent: boolean;
  active: boolean;
  busy: boolean;
  transportHint: "seek-forward" | "seek-backward" | null;
};

export function ClassicStatusBar({
  title, shuffle, repeat, held, hasCurrent, active, busy, transportHint,
}: Props) {
  return (
    <div className="screen-status">
      <strong>{title}</strong>
      <span className="play-modes">
        {shuffle && (
          <span title="随机播放" aria-label="随机播放">
            <PlayerIcon name="shuffle" />
          </span>
        )}
        {repeat !== "off" && (
          <span
            title={`重复${repeatText[repeat]}`}
            aria-label={`重复${repeatText[repeat]}`}
          >
            <PlayerIcon name="repeat" />
            {repeat === "one" && <small>1</small>}
          </span>
        )}
      </span>
      {held && (
        <svg
          className="hold-icon"
          viewBox="0 0 12 14"
          aria-label="已锁定"
          role="img"
        >
          <path d="M3 6V4a3 3 0 0 1 6 0v2M2 6h8v7H2Z" />
        </svg>
      )}
      {hasCurrent ? (
        <span
          className="screen-playing-link"
          aria-label={active ? "正在播放" : "已暂停"}
        >
          <span aria-hidden="true">
            {transportHint ? (
              <PlayerIcon name={transportHint} filled />
            ) : busy ? (
              <i className="lcd-loading" />
            ) : (
              <PlayerIcon
                name={active ? "play" : "pause"}
                filled={active}
              />
            )}
          </span>
        </span>
      ) : (
        <span className="screen-header-spacer" />
      )}
      <BatteryIndicator />
    </div>
  );
}
