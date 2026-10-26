import { useEffect, useRef, useState } from "react";
import { getCircularBoundingInfo } from "./geometry";
import { WheelGesture } from "./WheelGesture";

export type WheelCommand = "menu" | "previous" | "next" | "play" | "select";
type Props = {
  onRotate: (steps: number) => void;
  onCommand: (command: WheelCommand) => void;
};

export function ClickWheel({ onRotate, onCommand }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const gesture = useRef<{
    id: number;
    input: WheelGesture;
    command: WheelCommand;
  } | null>(null);
  const [pressed, setPressed] = useState<WheelCommand | null>(null);
  const callbacks = useRef({ onRotate, onCommand });
  callbacks.current = { onRotate, onCommand };

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
    const wheel = root.current!;
    let remainder = 0;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta =
        event.deltaY *
        (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 120 : 1);
      if (Math.sign(delta) !== Math.sign(remainder)) remainder = 0;
      remainder += delta;
      if (Math.abs(remainder) >= 32) {
        callbacks.current.onRotate(
          Math.sign(remainder) *
            Math.min(3, Math.trunc(Math.abs(remainder) / 32)),
        );
        remainder %= 32;
      }
    };
    wheel.addEventListener("wheel", handleWheel, { passive: false });
    return () => wheel.removeEventListener("wheel", handleWheel);
  }, []);

  const control = (
    command: WheelCommand,
    label: string,
    content: React.ReactNode,
  ) => (
    <button
      type="button"
      className={`wheel-button wheel-${command} ${pressed === command ? "is-pressed" : ""}`}
      aria-label={label}
      onClick={(event) => {
        if (event.detail === 0) onCommand(command);
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
      aria-label="Classic 转轮：绕圈或滚轮选择，上下方向键选择，Enter 确认，Escape 返回，空格播放暂停"
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        if (!event.isPrimary || event.button !== 0 || gesture.current) return;
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
        setPressed(command);
      }}
      onPointerMove={(event) => {
        const active = gesture.current;
        if (!active || active.id !== event.pointerId) return;
        const steps = active.input.move(
          { x: event.clientX, y: event.clientY },
          event.timeStamp,
        );
        if (steps) {
          setPressed(null);
          onRotate(steps);
        }
        if (!active.input.canClick({ x: event.clientX, y: event.clientY }))
          setPressed(null);
      }}
      onPointerUp={(event) => {
        const active = gesture.current;
        if (!active || active.id !== event.pointerId) return;
        gesture.current = null;
        setPressed(null);
        if (
          active.input.canClick({ x: event.clientX, y: event.clientY }) &&
          commandAt(event.clientX, event.clientY) === active.command
        )
          onCommand(active.command);
      }}
      onPointerCancel={() => {
        gesture.current = null;
        setPressed(null);
      }}
      onLostPointerCapture={() => {
        gesture.current = null;
        setPressed(null);
      }}
      onKeyDown={(event) => {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        const isButton = event.target instanceof HTMLButtonElement;
        const commands: Record<string, WheelCommand> = {
          Escape: "menu",
          Backspace: "menu",
          ArrowLeft: "previous",
          ArrowRight: "next",
          Enter: "select",
          " ": "play",
        };
        if (isButton && (event.key === "Enter" || event.key === " ")) return;
        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          event.preventDefault();
          onRotate(event.key === "ArrowUp" ? -1 : 1);
        } else if (commands[event.key]) {
          event.preventDefault();
          if (!event.repeat) onCommand(commands[event.key]);
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
        "播放或暂停",
        <svg viewBox="0 0 28 18" aria-hidden="true">
          <path d="M4 2v14l10-7zM18 2h3v14h-3zm6 0h3v14h-3z" />
        </svg>,
      )}
      {control("select", "中心键确认", <span className="sr-only">确认</span>)}
    </div>
  );
}
