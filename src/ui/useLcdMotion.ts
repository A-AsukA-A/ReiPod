import { useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";

type Direction = "forward" | "back" | "replace";

/** Capture only on navigation, never on playback ticks. The old page is visual and inert. */
export function useLcdMotion(
  content: RefObject<HTMLDivElement | null>,
  scene: string,
  input: RefObject<string>,
) {
  const pending = useRef<{
    node: HTMLElement;
    direction: Direction;
    x: number;
    scroll: [number, number][];
  } | null>(null);
  const running = useRef<Animation[]>([]);
  const ghost = useRef<HTMLElement | null>(null);
  const stop = () => {
    running.current.forEach((animation) => animation.cancel());
    running.current = [];
    ghost.current?.remove();
    ghost.current = null;
  };
  const capture = (direction: Direction) => {
    const element = content.current;
    pending.current = null;
    if (
      !element ||
      input.current === "keyboard" ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      stop();
      return;
    }
    const transform = getComputedStyle(element).transform;
    const x = transform === "none" ? 0 : new DOMMatrixReadOnly(transform).m41;
    const node = element.cloneNode(true) as HTMLElement;
    node.inert = true;
    node.setAttribute("aria-hidden", "true");
    node.classList.add("screen-outgoing");
    node.removeAttribute("id");
    node
      .querySelectorAll("[id]")
      .forEach((child) => child.removeAttribute("id"));
    // cloneNode does not carry scroll positions; keep the departing menu exactly where it was.
    const scroll = [...element.querySelectorAll("*")].map(
      (child) => [child.scrollTop, child.scrollLeft] as [number, number],
    );
    stop();
    pending.current = { node, direction, x, scroll };
  };
  useLayoutEffect(() => {
    const element = content.current;
    const next = pending.current;
    pending.current = null;
    if (!element || !next || !element.parentElement) return;
    const { node, direction, x } = next;
    const tokens = getComputedStyle(element);
    const easing = tokens.getPropertyValue("--lcd-ease").trim();
    const duration = Number.parseFloat(
      tokens.getPropertyValue(
        direction === "replace" ? "--lcd-view-duration" : "--lcd-page-duration",
      ),
    );
    element.parentElement.prepend(node);
    node.querySelectorAll("*").forEach((child, index) => {
      child.scrollTop = next.scroll[index][0];
      child.scrollLeft = next.scroll[index][1];
    });
    ghost.current = node;
    const width = element.clientWidth;
    const sign = direction === "back" ? -1 : 1;
    const options = { duration, easing };
    running.current =
      direction === "replace"
        ? [
            node.animate([{ opacity: 1 }, { opacity: 0 }], options),
            element.animate([{ opacity: 0 }, { opacity: 1 }], options),
          ]
        : [
            node.animate(
              [
                { transform: `translateX(${x}px)` },
                { transform: `translateX(${-sign * width}px)` },
              ],
              options,
            ),
            element.animate(
              [
                { transform: `translateX(${x + sign * width}px)` },
                { transform: "translateX(0px)" },
              ],
              options,
            ),
          ];
    running.current.at(-1)!.onfinish = stop;
  }, [scene]);
  useLayoutEffect(() => stop, []);
  return capture;
}
