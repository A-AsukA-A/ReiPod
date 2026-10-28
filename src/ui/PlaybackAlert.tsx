import type { PlaybackErrorKind } from "../player/Player";
import { PlayerIcon } from "./PlayerIcon";

/** Read-only LCD panel: the physical wheel remains the only control surface. */
export function PlaybackAlert({
  message,
  kind,
}: {
  message: string;
  kind?: PlaybackErrorKind;
}) {
  const title =
    kind === "vip"
      ? "需要 VIP 播放权限"
      : kind === "purchase"
        ? "需要购买权限"
        : kind === "preview"
          ? "仅提供试听"
          : "暂时无法播放";
  return (
    <div className="playback-alert-backdrop">
      <div className="playback-alert" role="alert" aria-label={title}>
        <div className="playback-alert-heading">
          <span className="playback-alert-symbol" aria-hidden="true">
            {kind === "vip" ? "VIP" : "!"}
          </span>
          <strong>{title}</strong>
        </div>
        <p>{message}</p>
        <div className="playback-alert-actions">
          <span>
            <i />
            中心键重试
          </span>
          <span>
            <PlayerIcon name="seek-forward" />
            下一首跳过
          </span>
        </div>
      </div>
    </div>
  );
}
