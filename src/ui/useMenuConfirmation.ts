import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { classicMotion } from "./motion";

/** Short acknowledgement using the existing feedback token; not a measured firmware blink. */
export function useMenuConfirmation(content: RefObject<HTMLElement | null>) {
  const animation = useRef<Animation | undefined>(undefined);
  const frame = useRef<number | undefined>(undefined);
  useEffect(() => () => {
    if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    animation.current?.cancel();
  }, []);
  return (key: string) => {
    if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    animation.current?.cancel();
    frame.current = requestAnimationFrame(() => {
      frame.current = undefined;
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const row = [...(content.current?.querySelectorAll<HTMLElement>(".screen-row") ?? [])]
        .find(row => row.dataset.rowKey === key);
      const title = row?.querySelector(".row-title");
      if (title) animation.current = title.animate([{ opacity: 1 }, { opacity: 0 }, { opacity: 1 }], {
        duration: classicMotion.volume * 2, easing: "steps(2, end)",
      });
    });
  };
}
