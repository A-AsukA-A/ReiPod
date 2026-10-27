import { useState } from "react";
import "./hold-switch.css";

export function HoldSwitch({
  held,
  onToggle,
}: {
  held: boolean;
  onToggle: () => void;
}) {
  const [keyboard, setKeyboard] = useState(false);
  return (
    <button
      type="button"
      className="top-hold"
      role="switch"
      aria-label="HOLD 锁定"
      aria-checked={held}
      title={held ? "HOLD · 已锁定，点击解锁" : "HOLD · 锁定转轮，音乐继续播放"}
      data-held={held}
      data-keyboard={keyboard || undefined}
      onPointerDown={() => setKeyboard(false)}
      onKeyDown={() => setKeyboard(true)}
      onClick={onToggle}
    >
      <span className="hold-track" aria-hidden="true">
        <i />
      </span>
    </button>
  );
}
