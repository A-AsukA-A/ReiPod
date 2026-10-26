import { useRef, useState } from "react";
import type { PlayerState } from "../player/Player";
import { player } from "../player/store";
import { committedSeek } from "./seek";
import type { SeekDraft } from "./seek";

const time = (value: number) =>
  `${Math.floor(value / 60)}:${Math.floor(value % 60)
    .toString()
    .padStart(2, "0")}`;

export function SeekSlider({ state }: { state: PlayerState }) {
  const session = useRef<{ pointerId: number; draft: SeekDraft | null } | null>(
    null,
  );
  const [preview, setPreview] = useState<SeekDraft | null>(null);
  const position =
    preview?.trackId === state.currentId ? preview.position : state.position;
  const cancel = () => {
    session.current = null;
    setPreview(null);
  };
  const commit = (pointerId: number) => {
    if (session.current?.pointerId !== pointerId) return;
    const latest = player.getSnapshot();
    const target = committedSeek(
      session.current.draft,
      latest.currentId,
      latest.duration,
    );
    cancel();
    if (target !== null) player.seek(target);
  };
  return (
    <div
      className={`screen-progress ${preview?.trackId === state.currentId ? "is-seeking" : ""}`}
    >
      <input
        type="range"
        min={0}
        max={state.duration || 1}
        step="0.1"
        value={position}
        disabled={!state.duration}
        aria-label="调整播放进度"
        aria-valuetext={`${time(position)} / ${time(state.duration)}`}
        onPointerDown={(event) => {
          if (
            !event.isPrimary ||
            event.button !== 0 ||
            session.current ||
            !state.currentId
          )
            return;
          const draft = { trackId: state.currentId, position: state.position };
          session.current = { pointerId: event.pointerId, draft };
          setPreview(draft);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onChange={(event) => {
          const value = Number(event.target.value);
          if (session.current?.draft) {
            session.current.draft = {
              ...session.current.draft,
              position: value,
            };
            setPreview(session.current.draft);
          } else if (!session.current) player.seek(value);
        }}
        onPointerUp={(event) => commit(event.pointerId)}
        onPointerCancel={(event) => {
          if (session.current?.pointerId === event.pointerId) cancel();
        }}
        onLostPointerCapture={(event) => {
          if (session.current?.pointerId === event.pointerId) cancel();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && session.current) {
            event.preventDefault();
            session.current.draft = null;
            setPreview(null);
          }
        }}
      />
      <div>
        <span>{time(position)}</span>
        <span>
          {preview?.trackId === state.currentId
            ? "松开定位"
            : `−${time(Math.max(0, state.duration - position))}`}
        </span>
      </div>
    </div>
  );
}
