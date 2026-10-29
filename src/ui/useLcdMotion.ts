import { useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";
import { durationInMilliseconds } from "./motion";

type Direction =
  | "forward"
  | "back"
  | "replace"
  | "album-open"
  | "album-close"
  | "flow-open"
  | "flow-close";
let snapshotSequence = 0;

/** Freeze the pixels currently on the LCD, including an interrupted slide. */
function snapshot(element: HTMLElement) {
  const copy = element.cloneNode(true) as HTMLElement;
  const originals = [element, ...element.querySelectorAll<HTMLElement>("*")];
  const copies = [copy, ...copy.querySelectorAll<HTMLElement>("*")];
  const suffix = `-snapshot-${++snapshotSequence}`;
  const ids = new Map<string, string>();
  for (const child of copies)
    if (child.id) {
      const next = child.id + suffix;
      ids.set(child.id, next);
      child.id = next;
    }
  // SVG paints and accessible labels need their cloned IDs, not the live page's.
  for (const child of copies)
    for (const attribute of [...child.attributes]) {
      if (attribute.name === "id") continue;
      let value = attribute.value;
      for (const [oldId, newId] of ids) {
        if (value === `#${oldId}`) value = `#${newId}`;
        value = value
          .replaceAll(`url(#${oldId})`, `url(#${newId})`)
          .replaceAll(`url("#${oldId}")`, `url("#${newId}")`)
          .replaceAll(`url('#${oldId}')`, `url('#${newId}')`);
        if (
          attribute.name === "aria-labelledby" ||
          attribute.name === "aria-describedby" ||
          attribute.name === "for"
        )
          value = value
            .split(" ")
            .map((id) => (id === oldId ? newId : id))
            .join(" ");
      }
      if (value !== attribute.value) child.setAttribute(attribute.name, value);
    }
  // Apply scroll after insertion: detached nodes cannot retain a scroll offset.
  const restore = () =>
    originals.forEach((original, index) => {
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
  });
  return { copy, restore };
}

/** Navigation is interruptible; playback updates never create a transition. */
export function useLcdMotion(
  content: RefObject<HTMLDivElement | null>,
  scene: string,
) {
  const pending = useRef<{
    node: HTMLElement;
    direction: Direction;
    paneOnly: boolean;
  } | null>(null);
  const running = useRef<Animation[]>([]);
  const ghost = useRef<HTMLElement | null>(null);
  const staticPane = useRef<HTMLElement | null>(null);
  const stop = () => {
    running.current.forEach((animation) => animation.cancel());
    running.current = [];
    ghost.current?.remove();
    ghost.current = null;
    staticPane.current?.remove();
    staticPane.current = null;
  };
  const capture = (direction: Direction, paneOnly = false) => {
    pending.current?.node.remove();
    pending.current = null;
    const element = content.current;
    const viewport = element?.parentElement;
    if (
      !element ||
      !viewport ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      stop();
      return;
    }
    const frame = document.createElement("div");
    frame.className = "screen-outgoing";
    frame.inert = true;
    frame.setAttribute("aria-hidden", "true");
    // Preserve both halves of an in-flight slide, rather than jumping the live
    // page to its resting position or exposing a white gap on a quick reversal.
    // Flatten the visible fragments. Repeated interruptions must not recursively
    // clone all previous transition containers or retain offscreen page trees.
    const layers = [
      element,
      ...(ghost.current
        ? [
            ...ghost.current.querySelectorAll<HTMLElement>(".screen-content"),
          ].reverse()
        : []),
      ...(staticPane.current ? [staticPane.current] : []),
    ];
    const bounds = viewport.getBoundingClientRect();
    const snapshots: ReturnType<typeof snapshot>[] = [];
    for (const original of layers) {
      const rect = original.getBoundingClientRect();
      const oldClip: number[] = original.dataset.motionClip
        ? JSON.parse(original.dataset.motionClip)
        : [0, 0, 0, 0];
      let left = Math.max(bounds.left, rect.left + oldClip[3]);
      let right = Math.min(bounds.right, rect.right - oldClip[1]);
      let top = Math.max(bounds.top, rect.top + oldClip[0]);
      let bottom = Math.min(bounds.bottom, rect.bottom - oldClip[2]);
      let opacity = Number(getComputedStyle(original).opacity);
      for (
        let parent = original.parentElement;
        parent && parent !== viewport;
        parent = parent.parentElement
      ) {
        const style = getComputedStyle(parent);
        opacity *= Number(style.opacity);
        if (style.overflow === "hidden" || parent.dataset.motionClip) {
          const bounds = parent.getBoundingClientRect();
          const inset: number[] = parent.dataset.motionClip
            ? JSON.parse(parent.dataset.motionClip) : [0, 0, 0, 0];
          left = Math.max(left, bounds.left + inset[3]);
          right = Math.min(right, bounds.right - inset[1]);
          top = Math.max(top, bounds.top + inset[0]);
          bottom = Math.min(bottom, bounds.bottom - inset[2]);
        }
      }
      if (right <= left || bottom <= top || opacity < 0.001) continue;
      const captured = snapshot(original);
      const { copy } = captured;
      if (original === staticPane.current) copy.classList.add("screen-content");
      const clip = [
        top - rect.top,
        rect.right - right,
        rect.bottom - bottom,
        left - rect.left,
      ];
      copy.dataset.motionClip = JSON.stringify(clip);
      Object.assign(copy.style, {
        inset: "auto",
        left: "0",
        top: "0",
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        transform: `translate(${rect.left - bounds.left}px, ${rect.top - bounds.top}px)`,
        opacity: String(opacity),
        clipPath: `inset(${clip.map((value) => `${value}px`).join(" ")})`,
      });
      frame.append(copy);
      snapshots.push(captured);
    }
    viewport.append(frame);
    snapshots.forEach(({ restore }) => restore());
    const preview = paneOnly
      ? (staticPane.current ??
        element.querySelector<HTMLElement>(".menu-preview"))
      : null;
    const pane = preview ? snapshot(preview) : null;
    stop();
    if (pane) {
      Object.assign(pane.copy.style, {
        position: "absolute",
        inset: "0 0 0 50%",
        width: "50%",
        height: "100%",
        transform: "none",
        opacity: "1",
        zIndex: "20",
      });
      pane.copy.classList.add("screen-pane-still");
      pane.copy.inert = true;
      pane.copy.setAttribute("aria-hidden", "true");
      viewport.append(pane.copy);
      pane.restore();
      staticPane.current = pane.copy;
      frame.style.clipPath = "inset(0 50% 0 0)";
    }
    pending.current = { node: frame, direction, paneOnly: Boolean(pane) };
  };
  useLayoutEffect(() => {
    const element = content.current;
    const next = pending.current;
    pending.current = null;
    if (!element || !next) return;
    const { node, direction, paneOnly } = next;
    const tokens = getComputedStyle(element);
    const duration = durationInMilliseconds(
      tokens.getPropertyValue(
        direction.startsWith("album-")
          ? "--lcd-album-duration"
          : direction === "flow-open"
            ? "--lcd-flow-enter-duration"
            : direction === "flow-close"
              ? "--lcd-flow-exit-duration"
              : direction === "replace"
                ? "--lcd-view-duration"
                : "--lcd-page-duration",
      ),
    );
    ghost.current = node;
    const distance =
      element.clientWidth *
      (paneOnly ? 0.5 : 1) *
      (direction === "back" ? -1 : 1);
    const options: KeyframeAnimationOptions = {
      duration,
      easing: tokens.getPropertyValue("--lcd-ease").trim(),
      fill: "both",
    };
    if (direction === "flow-open") {
      // ReiPod entry adaptation: reverse the split-menu exit, revealing the fan.
      // Freeze both halves before changing the source tree, including interrupted layers.
      const oldLayers = [...node.children];
      const halves = (["left", "right"] as const).map(side => ({
        side, ...snapshot(node),
      }));
      running.current = [];
      for (const half of halves) {
        const clip = half.side === "left"
          ? [0, element.clientWidth / 2, 0, 0]
          : [0, 0, 0, element.clientWidth / 2];
        half.copy.className = "flow-opening-half";
        Object.assign(half.copy.style, {
          position: "absolute", inset: "0", width: "100%", height: "100%",
          clipPath: `inset(${clip.map(value => `${value}px`).join(" ")})`,
        });
        half.copy.dataset.motionClip = JSON.stringify(clip);
        half.copy.dataset.flowOpeningHalf = half.side;
        half.copy.inert = true;
        half.copy.setAttribute("aria-hidden", "true");
        node.append(half.copy);
        half.restore();
        running.current.push(half.copy.animate([
          { transform: "translateX(0)" },
          { transform: `translateX(${half.side === "left" ? "-50%" : "50%"})` },
        ], options));
      }
      oldLayers.forEach(layer => layer.remove());
      for (const region of element.querySelectorAll<HTMLElement>(
        ".screen-status, .cf-caption",
      ))
        running.current.push(
          region.animate(
            [{ opacity: 0 }, { opacity: 0, offset: 0.45 }, { opacity: 1 }],
            options,
          ),
        );
      running.current.at(-1)!.onfinish = stop;
      return;
    }
    if (direction === "flow-close") {
      // The two retained menu surfaces meet in the center over the fading fan.
      // Freeze each incoming half so interruptions can capture the visible pixels.
      const oldLayers = [...node.children] as HTMLElement[];
      running.current = [
        element.animate([{ opacity: 0 }, { opacity: 0 }], options),
      ];
      for (const layer of oldLayers)
        running.current.push(
          layer.animate(
            [{ opacity: 1 }, { opacity: 0.65, offset: 0.3 }, { opacity: 0 }],
            options,
          ),
        );
      for (const side of ["left", "right"] as const) {
        const half = snapshot(element);
        const clip =
          side === "left"
            ? [0, element.clientWidth / 2, 0, 0]
            : [0, 0, 0, element.clientWidth / 2];
        Object.assign(half.copy.style, {
          inset: "0",
          width: "100%",
          height: "100%",
          opacity: "1",
          transform: "none",
          clipPath: `inset(${clip.map((v) => `${v}px`).join(" ")})`,
        });
        half.copy.dataset.motionClip = JSON.stringify(clip);
        half.copy.dataset.flowHalf = side;
        half.copy.inert = true;
        half.copy.setAttribute("aria-hidden", "true");
        node.append(half.copy);
        half.restore();
        const edge = `translateX(${side === "left" ? "-50%" : "50%"})`;
        running.current.push(
          half.copy.animate(
            [
              { transform: edge },
              { transform: edge, offset: 0.25 },
              { transform: "translateX(0)" },
            ],
            options,
          ),
        );
      }
      running.current.at(-1)!.onfinish = stop;
      return;
    }
    if (direction === "album-open" || direction === "album-close") {
      const opening = direction === "album-open";
      const front = node.querySelector<HTMLElement>(
        opening ? '.cf-card[aria-current="true"]' : ".cf-album-panel",
      );
      const back = element.querySelector<HTMLElement>(
        opening ? ".cf-album-panel" : '.cf-card[aria-current="true"]',
      );
      if (front && back) {
        const timing = {
          ...options,
          easing: tokens.getPropertyValue("--lcd-album-ease").trim(),
        };
        const frontTransform = getComputedStyle(front).transform;
        const backTransform = getComputedStyle(back).transform;
        const initial = frontTransform === "none" ? "" : frontTransform;
        const final = backTransform === "none" ? "" : backTransform;
        const edge = `${final} rotateY(-90deg)${opening ? " scale(0.5, 0.64)" : ""}`;
        running.current = [
          front.animate(
            [
              { transform: `${initial} rotateY(0deg)` },
              { transform: `${initial} rotateY(90deg)`, offset: 0.5 },
              { transform: `${initial} rotateY(90deg)` },
            ],
            timing,
          ),
          back.animate(
            [
              { transform: edge },
              { transform: edge, offset: 0.5 },
              { transform: `${final} rotateY(0deg) scale(1)` },
            ],
            timing,
          ),
          node.animate(
            [
              { opacity: 1 },
              { opacity: 1, offset: 0.499 },
              { opacity: 0, offset: 0.5 },
              { opacity: 0 },
            ],
            timing,
          ),
        ];
        const caption = (opening ? node : element).querySelector<HTMLElement>(
          ".cf-caption",
        );
        if (caption)
          running.current.push(
            caption.animate(
              opening
                ? [{ opacity: 1 }, { opacity: 0, offset: 0.5 }, { opacity: 0 }]
                : [{ opacity: 0 }, { opacity: 0, offset: 0.5 }, { opacity: 1 }],
              timing,
            ),
          );
        running.current.at(-1)!.onfinish = stop;
        return;
      }
    }
    running.current =
      direction === "replace"
        ? [
            node.animate([{ opacity: 1 }, { opacity: 0 }], options),
            element.animate([{ opacity: 0 }, { opacity: 1 }], options),
          ]
        : [
            node.animate(
              [
                { transform: "translateX(0)" },
                { transform: `translateX(${-distance}px)` },
              ],
              options,
            ),
            element.animate(
              [
                { transform: `translateX(${distance}px)` },
                { transform: "translateX(0)" },
              ],
              options,
            ),
          ];
    if (staticPane.current) {
      const latest = element.querySelector<HTMLElement>(".menu-preview");
      if (
        latest &&
        (latest.dataset.preview !== staticPane.current.dataset.preview ||
          latest.textContent !== staticPane.current.textContent)
      )
        running.current.push(
          staticPane.current.animate(
            [
              { opacity: 1, offset: 0 },
              { opacity: 1, offset: 0.55 },
              { opacity: 0, offset: 1 },
            ],
            options,
          ),
        );
    }
    running.current.at(-1)!.onfinish = stop;
  }, [scene]);
  useLayoutEffect(
    () => () => {
      pending.current?.node.remove();
      stop();
    },
    [],
  );
  return capture;
}
