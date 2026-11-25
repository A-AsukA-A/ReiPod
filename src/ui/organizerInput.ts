import type { WheelCommand } from "../input/ClickWheel";
export type OrganizerInput = { rotate: (steps: number) => void; command: (value: WheelCommand) => void };
