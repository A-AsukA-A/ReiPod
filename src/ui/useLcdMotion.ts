import { useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";
import { durationInMilliseconds } from "./motion";

type Direction = "forward" | "back" | "replace";

/** Freeze the pixels currently on the LCD, including an interrupted slide. */
function snapshot(element: HTMLElement) {
  const copy = element.cloneNode(true) as HTMLElement;
  const originals = [element, ...element.querySelectorAll<HTMLElement>("*")];
  const copies = [copy, ...copy.querySelectorAll<HTMLElement>("*")];
  // Apply scroll after insertion: detached nodes cannot retain a scroll offset.
  const restore = () => originals.forEach((original, index) => {
    copies[index].scrollTop = original.scrollTop;
    copies[index].scrollLeft = original.scrollLeft;
  });
  // CSS animations must freeze as well (marquees and independently moving covers).
  originals.forEach((original, index) => {
    if (original.getAnimations().length) {
      const style = getComputedStyle(original);
      copies[index].style.transform = style.transform;
      copies[index].style.opacity = style.opacity;
    }
    copies[index].style.animation = "none";
    copies[index].style.transition = "none";
    copies[index].removeAttribute("id");
  });
  return { copy, restore };
}

/** Navigation is interruptible; playback updates never create a transition. */
export function useLcdMotion(
  content: RefObject<HTMLDivElement | null>,
  scene: string,
) {
  const pending = useRef<{ node: HTMLElement; direction: Direction } | null>(null);
  const running = useRef<Animation[]>([]);
  const ghost = useRef<HTMLElement | null>(null);
  const stop = () => {
    running.current.forEach((animation) => animation.cancel());
    running.current = [];
    ghost.current?.remove();
    ghost.current = null;
  };
  const capture = (direction: Direction) => {
    pending.current?.node.remove();
    pending.current = null;
    const element = content.current;
    const viewport = element?.parentElement;
    if (!element || !viewport || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      stop();
      return;
    }
    const frame = document.createElement("div");
    frame.className = "screen-outgoing";
    frame.inert = true;
    frame.setAttribute("aria-hidden", "true");
    // Preserve both halves of an in-flight slide, rather than jumping the live
    // page to its resting position or exposing a white gap on a quick reversal.
    const layers = ghost.current ? [ghost.current, element] : [element];
    const snapshots = layers.map(snapshot);
    for (const { copy } of snapshots) {
      const original = layers[frame.childElementCount];
      const style = getComputedStyle(original);
      copy.style.transform = style.transform;
      copy.style.opacity = style.opacity;
      frame.append(copy);
    }
    viewport.append(frame);
    snapshots.forEach(({ restore }) => restore());
    stop();
    pending.current = { node: frame, direction };
  };
  useLayoutEffect(() => {
    const element = content.current;
    const next = pending.current;
    pending.current = null;
    if (!element || !next) return;
    const { node, direction } = next;
    const tokens = getComputedStyle(element);
    const duration = durationInMilliseconds(tokens.getPropertyValue(
      direction === "replace" ? "--lcd-view-duration" : "--lcd-page-duration",
    ));
    ghost.current = node;
    const distance = element.clientWidth * (direction === "back" ? -1 : 1);
    const options: KeyframeAnimationOptions = {
      duration,
      easing: tokens.getPropertyValue("--lcd-ease").trim(),
      fill: "both",
    };
    running.current = direction === "replace"
      ? [node.animate([{ opacity: 1 }, { opacity: 0 }], options),
         element.animate([{ opacity: 0 }, { opacity: 1 }], options)]
      : [node.animate([{ transform: "translateX(0)" },
           { transform: `translateX(${-distance}px)` }], options),
         element.animate([{ transform: `translateX(${distance}px)` },
           { transform: "translateX(0)" }], options)];
    running.current.at(-1)!.onfinish = stop;
  }, [scene]);
  useLayoutEffect(() => () => {
    pending.current?.node.remove();
    stop();
  }, []);
  return capture;
}
