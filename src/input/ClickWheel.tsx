import { useEffect, useRef, useState } from "react";
import { getCircularBoundingInfo } from "./geometry";
import { WheelGesture } from "./WheelGesture";
import { MouseWheel } from "./MouseWheel";

export type WheelCommand =
  | "menu"
  | "home"
  | "favorite"
  | "options"
  | "previous"
  | "next"
  | "play"
  | "select"
  | "seek-forward"
  | "seek-backward"
  | "sleep";
type Props = {
  timing: { readonly seek: number; readonly options: number; readonly sleep: number; readonly repeat: number };
  onRotate: (steps: number, source?: "pointer" | "wheel" | "keyboard") => void;
  onCommand: (command: WheelCommand) => void;
  playLabel?: string;
  disabled?: boolean;
  onFeedback?: (kind: "press" | "release") => void;
};

/** One pointer or key owns a press. A hold never emits the short command on release. */
export function ClickWheel({
  timing,
  onRotate,
  onCommand,
  playLabel = "播放或暂停",
  disabled = false,
  onFeedback,
}: Props) {
  const root = useRef<HTMLDivElement>(null);
  const gesture = useRef<{
    id: number;
    input: WheelGesture;
    command: WheelCommand;
  } | null>(null);
  const keyPress = useRef<{ key: string; command: WheelCommand } | null>(null);
  const [pressed, setPressed] = useState<WheelCommand | null>(null);
  const callbacks = useRef({ onRotate, onCommand, onFeedback, disabled });
  callbacks.current = { onRotate, onCommand, onFeedback, disabled };
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const longPressFired = useRef(false);
  const cancelHold = () => {
    if (holdTimer.current !== null) clearTimeout(holdTimer.current);
    if (seekTimer.current !== null) clearInterval(seekTimer.current);
    holdTimer.current = null;
    seekTimer.current = null;
  };
  const resetGesture = () => {
    cancelHold();
    gesture.current = null;
    keyPress.current = null;
    longPressFired.current = false;
    setPressed(null);
  };
  const startHold = (command: WheelCommand) => {
    cancelHold();
    longPressFired.current = false;
    const held: Partial<Record<WheelCommand, WheelCommand>> = {
      menu: "home",
      select: "options",
      play: "sleep",
      next: "seek-forward",
      previous: "seek-backward",
    };
    const action = held[command];
    if (!action) return;
    const seeking = action === "seek-forward" || action === "seek-backward";
    holdTimer.current = setTimeout(
      () => {
        if (callbacks.current.disabled) return;
        longPressFired.current = true;
        setPressed(null);
        callbacks.current.onCommand(action);
        if (seeking)
          seekTimer.current = setInterval(() => {
            if (!callbacks.current.disabled)
              callbacks.current.onCommand(action);
          }, timing.repeat);
      },
      seeking ? timing.seek : action === "sleep" ? timing.sleep : timing.options,
    );
  };
  const release = (command: WheelCommand, eligible = true) => {
    const short =
      !longPressFired.current && eligible && !callbacks.current.disabled;
    resetGesture();
    if (short) {
      callbacks.current.onFeedback?.("release");
      callbacks.current.onCommand(command);
    }
  };
  const keyDown = (key: string, command: WheelCommand, repeat: boolean) => {
    if (repeat || keyPress.current || gesture.current || disabled) return;
    keyPress.current = { key, command };
    setPressed(command);
    callbacks.current.onFeedback?.("press");
    startHold(command);
  };
  const keyUp = (key: string) => {
    if (keyPress.current?.key === key) release(keyPress.current.command);
  };
  const commandAt = (x: number, y: number): WheelCommand => {
    const { centerPoint: center, radius } = getCircularBoundingInfo(
      root.current!.getBoundingClientRect(),
    );
    const dx = x - center.x,
      dy = y - center.y;
    if (Math.hypot(dx, dy) < radius * 0.42) return "select";
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "next" : "previous";
    return dy > 0 ? "play" : "menu";
  };
  useEffect(() => {
    if (disabled) resetGesture();
  }, [disabled]);
  useEffect(() => {
    const wheel = root.current!;
    const scroll = new MouseWheel();
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (callbacks.current.disabled) {
        return;
      }
      const step = scroll.move(event.deltaY, event.deltaMode, event.timeStamp);
      if (step) callbacks.current.onRotate(step, "wheel");
    };
    const cancel = () => resetGesture();
    const visibility = () => {
      if (document.hidden) resetGesture();
    };
    wheel.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      wheel.removeEventListener("wheel", handleWheel);
      window.removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", visibility);
      cancelHold();
    };
  }, []);
  const control = (
    command: WheelCommand,
    label: string,
    content: React.ReactNode,
  ) => (
    <button
      type="button"
      disabled={disabled}
      className={`wheel-button wheel-${command} ${pressed === command ? "is-pressed" : ""}`}
      aria-label={label}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopPropagation();
        keyDown(event.key, command, event.repeat);
      }}
      onKeyUp={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopPropagation();
        keyUp(event.key);
      }}
      onClick={(event) => {
        if (event.detail === 0 && !disabled) {
          onFeedback?.("release");
          onCommand(command);
        }
      }}
    >
      {content}
    </button>
  );
  return (
    <div
      className="click-wheel"
      ref={root}
      tabIndex={0}
      role="group"
      aria-disabled={disabled}
      aria-label="Classic 转轮：绕圈或滚轮选择，上下方向键选择，Enter 确认，Escape 返回，Home 回主页，空格播放暂停；长按中心键打开选项，左右键快进快退，播放键休眠"
      onContextMenu={(event) => event.preventDefault()}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          resetGesture();
      }}
      onPointerDown={(event) => {
        if (
          disabled ||
          !event.isPrimary ||
          event.button !== 0 ||
          gesture.current ||
          keyPress.current
        )
          return;
        const node = root.current!;
        node.focus({ preventScroll: true });
        const { centerPoint, radius } = getCircularBoundingInfo(
          node.getBoundingClientRect(),
        );
        if (
          Math.hypot(
            event.clientX - centerPoint.x,
            event.clientY - centerPoint.y,
          ) > radius
        )
          return;
        const command = commandAt(event.clientX, event.clientY);
        gesture.current = {
          id: event.pointerId,
          command,
          input: new WheelGesture(
            { x: event.clientX, y: event.clientY },
            centerPoint,
            radius,
            event.timeStamp,
          ),
        };
        node.setPointerCapture(event.pointerId);
        onFeedback?.("press");
        setPressed(command);
        startHold(command);
      }}
      onPointerMove={(event) => {
        const active = gesture.current;
        if (
          !active ||
          active.id !== event.pointerId ||
          longPressFired.current ||
          disabled
        )
          return;
        const point = { x: event.clientX, y: event.clientY };
        const steps = active.input.move(point, event.timeStamp);
        if (steps) {
          setPressed(null);
          onRotate(
            event.pointerType === "mouse" ? Math.sign(steps) : steps,
            "pointer",
          );
        }
        if (!active.input.canClick(point)) {
          cancelHold();
          setPressed(null);
        }
      }}
      onPointerUp={(event) => {
        const active = gesture.current;
        if (!active || active.id !== event.pointerId) return;
        release(
          active.command,
          active.input.canClick({ x: event.clientX, y: event.clientY }) &&
            commandAt(event.clientX, event.clientY) === active.command,
        );
      }}
      onPointerCancel={(event) => {
        if (gesture.current?.id === event.pointerId) resetGesture();
      }}
      onLostPointerCapture={(event) => {
        if (gesture.current?.id === event.pointerId) resetGesture();
      }}
      onKeyDown={(event) => {
        if (disabled || event.altKey || event.ctrlKey || event.metaKey) return;
        if (
          event.target instanceof HTMLButtonElement &&
          (event.key === "Enter" || event.key === " ")
        )
          return;
        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          event.preventDefault();
          onRotate(event.key === "ArrowUp" ? -1 : 1, "keyboard");
          return;
        }
        const commands: Record<string, WheelCommand> = {
          Escape: "menu",
          Home: "home",
          f: "favorite",
          F: "favorite",
          o: "options",
          O: "options",
          Backspace: "menu",
          ArrowLeft: "previous",
          ArrowRight: "next",
          Enter: "select",
          " ": "play",
        };
        if (!commands[event.key]) return;
        event.preventDefault();
        keyDown(event.key, commands[event.key], event.repeat);
      }}
      onKeyUp={(event) => {
        if (keyPress.current?.key === event.key) {
          event.preventDefault();
          keyUp(event.key);
        }
      }}
    >
      {control("menu", "Menu 返回", <span>MENU</span>)}
      {control(
        "previous",
        "上一首",
        <svg viewBox="0 0 28 18" aria-hidden="true">
          <path d="M3 2h3v14H3zM16 2v14L6 9zm10 0v14L16 9z" />
        </svg>,
      )}
      {control(
        "next",
        "下一首",
        <svg viewBox="0 0 28 18" aria-hidden="true">
          <path d="M22 2h3v14h-3zM12 2v14l10-7zM2 2v14l10-7z" />
        </svg>,
      )}
      {control(
        "play",
        playLabel,
        <svg viewBox="0 0 28 18" aria-hidden="true">
          <path d="M4 2v14l10-7zM18 2h3v14h-3zm6 0h3v14h-3z" />
        </svg>,
      )}
      {control("select", "中心键确认", <span className="sr-only">确认</span>)}
    </div>
  );
}
