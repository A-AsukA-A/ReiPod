import type { WheelCommand } from "../input/ClickWheel";
export type GameInput = { rotate: (steps: number) => void; command: (value: WheelCommand) => void;
  /** Consume absolute ring position only when the current game opts into it. */
  position?: (radians: number) => boolean };
