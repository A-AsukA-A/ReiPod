import { useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";

/** The LCD is a display. Input belongs to the physical wheel and the Hold switch. */
export function ReadOnlyScreen({
  children,
  scene,
}: {
  children: ReactNode;
  scene: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    root.current
      ?.querySelectorAll<HTMLElement>("button,input,a,[tabindex]")
      .forEach((element) => (element.tabIndex = -1));
    const observer = new MutationObserver((records) => {
      for (const record of records)
        for (const added of record.addedNodes)
          if (added instanceof HTMLElement) {
            if (added.matches("button,input,a,[tabindex]")) added.tabIndex = -1;
            added
              .querySelectorAll<HTMLElement>("button,input,a,[tabindex]")
              .forEach((element) => (element.tabIndex = -1));
          }
    });
    if (root.current)
      observer.observe(root.current, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [scene]);
  return (
    <div
      ref={root}
      className="screen-glass"
      onPointerDownCapture={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClickCapture={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {children}
    </div>
  );
}
