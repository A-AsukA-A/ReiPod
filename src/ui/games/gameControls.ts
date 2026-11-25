import { useImperativeHandle, useRef } from "react";
import type { Ref } from "react";
import type { GameInput } from "../gameInput";

/** Rapid wheel events always read the live command ports, independent of paints. */
export function useGameControls(ref: Ref<GameInput>, controls: GameInput) {
  const live = useRef(controls);
  live.current = controls;
  useImperativeHandle(ref, () => ({ rotate: steps => live.current.rotate(steps),
    position: radians => live.current.position?.(radians) ?? false,
    command: value => live.current.command(value) }), []);
}
