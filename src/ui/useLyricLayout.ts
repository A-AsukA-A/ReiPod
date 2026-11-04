import { useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";
import { advanceLyricSpring } from "./lyricEffects";
import { lyricMotion } from "./motion";

type RowMotion = { position: number; velocity: number; scale: number; scaleVelocity: number; delay: number };

/** FLIP compensation keeps native scroll/overflow semantics while each visible line
 * settles independently. Retargets retain the live displacement and velocity. */
export function useLyricLayout(list: RefObject<HTMLDivElement | null>, trackId: string,
  active: number, wheelStep: number, synchronized: boolean, content: unknown) {
  const previousTrack = useRef("");
  const previousWheel = useRef(wheelStep);
  const manualUntil = useRef(0);
  const motion = useRef(new Map<HTMLElement, RowMotion>());
  useLayoutEffect(() => {
    const element = list.current;
    if (!element) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const rows = [...element.querySelectorAll<HTMLElement>("p[data-line-index]")];
    const first = previousTrack.current !== trackId;
    if (first) {
      previousTrack.current = trackId;
      previousWheel.current = wheelStep;
      manualUntil.current = 0;
      motion.current.clear();
      element.scrollTop = 0;
    }
    for (const row of rows) if (!motion.current.has(row)) motion.current.set(row,
      { position: 0, velocity: 0, scale: 1, scaleVelocity: 0, delay: 0 });
    for (const row of motion.current.keys()) if (!rows.includes(row)) motion.current.delete(row);
    let frame = 0, last = performance.now();
    let visibleRows: { row: HTMLElement; index: number; top: number; height: number }[] = [];
    const manual = () => performance.now() < manualUntil.current;
    const paint = () => {
      const focus = element.clientHeight * lyricMotion.focus;
      visibleRows.forEach(({ row, index: i, top, height }) => {
        const state = motion.current.get(row)!;
        row.style.transform = reduced.matches ? "none" : `translate3d(0, ${state.position}px, 0) scale(${state.scale})`;
        const distance = Math.abs(top + state.position + height / 2 - focus) / Math.max(1, height + 8);
        row.style.filter = !synchronized || reduced.matches || manual() || i === active ? "none" : `blur(${Math.min(lyricMotion.maxBlur, distance * 1.55)}px)`;
      });
    };
    const animate = (now: number) => {
      const dt = Math.min(1 / 30, (now - last) / 1000);
      last = now;
      let moving = false;
      visibleRows.forEach(({ row, index: i }) => {
        const state = motion.current.get(row)!;
        if (state.delay > 0) { state.delay -= dt; moving = true; return; }
        const next = advanceLyricSpring(state.position, state.velocity, 0, dt);
        const scale = advanceLyricSpring(state.scale, state.scaleVelocity,
          i === active || manual() || !synchronized ? 1 : lyricMotion.inactiveScale,
          dt, lyricMotion.scaleStiffness, lyricMotion.scaleDamping, 1);
        Object.assign(state, next, { scale: scale.position, scaleVelocity: scale.velocity });
        moving ||= next.position !== 0 || next.velocity !== 0 || scale.velocity !== 0;
      });
      paint();
      element.dataset.moving = String(moving && !reduced.matches);
      frame = moving && !document.hidden && !reduced.matches ? requestAnimationFrame(animate) : 0;
    };
    const center = (snap = false) => {
      cancelAnimationFrame(frame);
      const oldScroll = element.scrollTop;
      const oldOffsets = rows.map(row => row.offsetTop);
      const focus = element.clientHeight * lyricMotion.focus;
      if (synchronized) {
        element.style.setProperty("--lyric-inset", `${Math.max(0, focus - (rows[0]?.offsetHeight ?? 30) / 2)}px`);
        element.style.setProperty("--lyric-outset", `${Math.max(0, element.clientHeight - focus - (rows.at(-1)?.offsetHeight ?? 30) / 2)}px`);
        if (active >= 0 && !manual()) {
          const row = rows[active];
          if (row) element.scrollTop = row.offsetTop - focus + row.offsetHeight / 2;
        }
      }
      let delay = 0;
      visibleRows = [];
      rows.forEach((row, i) => {
        const state = motion.current.get(row)!;
        const top = row.offsetTop - element.scrollTop;
        const displacement = element.scrollTop - oldScroll + oldOffsets[i] - row.offsetTop;
        const inRange = (y: number) => y + row.offsetHeight >= -element.clientHeight / 2 && y <= element.clientHeight * 1.5;
        const visible = inRange(top) || inRange(top + state.position);
        state.position += displacement;
        state.delay = visible && !manual() ? delay : 0;
        if (visible) visibleRows.push({ row, index: i, top, height: row.offsetHeight });
        else { row.style.transform = "none"; row.style.filter = "none"; }
        if (visible) delay += lyricMotion.lineStagger / 1.05 ** Math.max(0, i - active);
        if (snap || reduced.matches || !visible || !synchronized) {
          Object.assign(state, { position: 0, velocity: 0, scale: i === active || manual() || !synchronized ? 1 : lyricMotion.inactiveScale, scaleVelocity: 0, delay: 0 });
        }
      });
      last = performance.now();
      element.dataset.following = String(!manual());
      paint();
      if (!reduced.matches && !document.hidden) frame = requestAnimationFrame(animate);
    };
    if (wheelStep !== previousWheel.current) {
      manualUntil.current = performance.now() + lyricMotion.manualHold;
      element.scrollTop += (wheelStep - previousWheel.current) * 28;
      previousWheel.current = wheelStep;
    }
    center(first);
    const timer = setTimeout(() => center(), Math.max(0, manualUntil.current - performance.now()) + 1);
    const observer = new ResizeObserver(() => center());
    observer.observe(element);
    rows.forEach(row => observer.observe(row));
    const visibility = () => { if (document.hidden) cancelAnimationFrame(frame); else center(true); };
    const preference = () => center(reduced.matches);
    document.addEventListener("visibilitychange", visibility);
    reduced.addEventListener("change", preference);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      reduced.removeEventListener("change", preference);
    };
  }, [active, trackId, wheelStep, synchronized, content, list]);
}
