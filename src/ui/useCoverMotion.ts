import { useLayoutEffect, useRef, useState } from "react";
import { advanceCover } from "./coverMotion";

export function useCoverMotion(target: number, direct: boolean, animate: boolean) {
  const [position, setPosition] = useState(target);
  const motion = useRef({ position: target, velocity: 0 });
  useLayoutEffect(() => {
    if (direct || !animate || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      motion.current = { position: target, velocity: 0 };
      setPosition(target);
      return;
    }
    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      motion.current = advanceCover(
        motion.current.position,
        motion.current.velocity,
        target,
        Math.min((now - previous) / 1000, 0.064),
      );
      previous = now;
      const settled = Math.abs(motion.current.position - target) < 0.001 &&
        Math.abs(motion.current.velocity) < 0.01;
      if (settled) motion.current = { position: target, velocity: 0 };
      setPosition(motion.current.position);
      if (!settled) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, direct, animate]);
  return position;
}
