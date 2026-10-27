import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

export function MarqueeText({
  text,
  active = false,
}: {
  text: string;
  active?: boolean;
}) {
  const viewport = useRef<HTMLSpanElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(0);
  useLayoutEffect(() => {
    const measure = () =>
      setOverflow(
        Math.max(
          0,
          (label.current?.scrollWidth ?? 0) -
            (viewport.current?.clientWidth ?? 0),
        ),
      );
    const observer = new ResizeObserver(measure);
    if (viewport.current) observer.observe(viewport.current);
    if (label.current) observer.observe(label.current);
    measure();
    return () => observer.disconnect();
  }, [text]);
  return (
    <span
      className={`marquee-window ${overflow > 3 ? "has-overflow" : ""}`}
      ref={viewport}
    >
      <span
        key={text}
        ref={label}
        className={`marquee-text ${active && overflow > 3 ? "is-overflowing" : ""}`}
        style={
          {
            "--marquee-offset": `${-overflow}px`,
            "--marquee-duration": `${Math.max(5, overflow / 22 + 3)}s`,
          } as CSSProperties
        }
      >
        {text}
      </span>
    </span>
  );
}
