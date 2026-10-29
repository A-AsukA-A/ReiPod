import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { classicMotion } from "./motion";

type Snapshot = {
  mode: string;
  content: ReactNode;
  from: string;
  incomingFrom: string;
  opacity: number;
  incomingOpacity: number;
  reverse: boolean;
  volume: boolean;
};

/** Display-only snapshots; live controls and transport state never wait for motion. */
export function PlaybackControlBay({ mode, children }: { mode: string; children: ReactNode }) {
  const live = useRef<HTMLDivElement>(null);
  const old = useRef<HTMLDivElement>(null);
  const previous = useRef({ mode, content: children });
  const animations = useRef<Animation[]>([]);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  useLayoutEffect(() => {
    const last = previous.current;
    previous.current = { mode, content: children };
    if (last.mode === mode) return;
    const liveStyle = live.current ? getComputedStyle(live.current) : null;
    const from = liveStyle?.transform ?? "none";
    const opacity = Number(liveStyle?.opacity ?? 1);
    const reversing = snapshot?.mode === mode;
    const oldStyle = reversing && old.current ? getComputedStyle(old.current) : null;
    const volume = mode === "volume" || last.mode === "volume";
    // Capture both properties before cancel(): a new control can interrupt a fade or slide.
    const incomingFrom = oldStyle?.transform ?? (volume ? "none" : "translateX(100%)");
    const incomingOpacity = oldStyle ? Number(oldStyle.opacity) : volume ? 0 : 1;
    animations.current.forEach(animation => animation.cancel());
    setSnapshot({
      mode: last.mode, content: last.content, from, incomingFrom, opacity, incomingOpacity,
      reverse: reversing, volume,
    });
  }, [mode, children, snapshot]);

  useLayoutEffect(() => {
    if (!snapshot || !live.current || !old.current) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSnapshot(null);
      return;
    }
    const options: KeyframeAnimationOptions = {
      duration: snapshot.volume ? classicMotion.volume : classicMotion.control,
      easing: classicMotion.easing,
      fill: "both",
    };
    const incoming = [
      { transform: snapshot.incomingFrom, opacity: snapshot.incomingOpacity },
      { transform: "translateX(0)", opacity: 1 },
    ];
    const outgoing = [
      { transform: snapshot.from, opacity: snapshot.opacity },
      {
        transform: snapshot.volume ? snapshot.from : `translateX(${snapshot.reverse ? "100%" : "-100%"})`,
        opacity: snapshot.volume ? 0 : snapshot.opacity,
      },
    ];
    const running = [live.current.animate(incoming, options), old.current.animate(outgoing, options)];
    animations.current = running;
    Promise.all(running.map(animation => animation.finished)).then(() => {
      if (animations.current === running) {
        // Keep fill:"both" until React detaches the old panel. Canceling here
        // resets its transform while still connected and can flash it at x=0.
        setSnapshot(null);
      }
    }).catch(() => { /* Interrupted by a newer control state. */ });
    return () => running.forEach(animation => animation.cancel());
  }, [snapshot]);

  return (
    <div className="np-control-bay" data-control={mode}>
      {snapshot && (
        <div key="outgoing" ref={old} className="np-control-outgoing" aria-hidden="true" inert>
          {snapshot.content}
        </div>
      )}
      <div key="live" ref={live} className="np-control-surface">{children}</div>
    </div>
  );
}
