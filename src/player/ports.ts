/** Minimum host audio contract. The shared core does not require DOM media types. */
export interface AudioPort {
  src: string;
  preload: "" | "none" | "metadata" | "auto";
  volume: number;
  readonly paused: boolean;
  currentTime: number;
  readonly duration: number;
  readonly error: { readonly code: number } | null;
  play(): Promise<void>;
  pause(): void;
  load(): void;
  addEventListener(name: string, listener: () => void): void;
  removeEventListener(name: string, listener: () => void): void;
  removeAttribute(name: string): void;
}
