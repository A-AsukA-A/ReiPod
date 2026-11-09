import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { classic2007 } from "../models/classic";
import type { WheelRotation } from "../input/WheelGesture";
import type { MenuItem } from "./MenuRows";
import type { Page, NavigationAction } from "./navigation";
import { ClassicQuickScroll, quickScrollIndex } from "./classicQuickScroll";

export function useClassicQuickScroll({ page, scope, rows, focusedKey, held, sleeping, dispatch, feedback }: {
  page: Page; scope: string; rows: MenuItem[]; focusedKey?: string;
  held: boolean; sleeping: boolean;
  dispatch: (action: NavigationAction) => void; feedback: (kind: "step") => void;
}) {
  const policy = classic2007.input.quickScroll;
  const eligible = ["songs", "local-songs", "artists", "albums"].includes(page) && !held && !sleeping;
  const index = useMemo(() => quickScrollIndex(rows), [rows]);
  const identity = JSON.stringify([scope, eligible, rows.map(row => [row.key, row.label, !!row.disabled])]);
  const engine = useRef(new ClassicQuickScroll(policy));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [display, setDisplay] = useState<{ identity: string; letter: string } | null>(null);
  const reset = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    engine.current.reset();
    setDisplay(null);
  };
  useLayoutEffect(() => { reset(); return reset; }, [identity]);
  return {
    letter: display?.identity === identity ? display.letter : undefined,
    end: reset,
    rotate(steps: number, source = "pointer", rotation?: WheelRotation) {
      if (!eligible || source !== "pointer" || !rotation) { reset(); return false; }
      const group = engine.current.move(index, rows.findIndex(row => row.key === focusedKey), rotation, performance.now());
      if (!group) return false;
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = setTimeout(reset, policy.idle);
      setDisplay({ identity, letter: group.letter });
      if (group.key !== focusedKey) {
        feedback("step"); dispatch({ type: "select", key: group.key });
      }
      return steps !== 0;
    },
  };
}
