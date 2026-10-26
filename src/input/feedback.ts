import { getPreferences } from "../ui/preferences";
export type FeedbackKind = "press" | "release" | "step";
let context: AudioContext | null = null;
let lastStep = -Infinity;

/** Original synthesized clicks; no reference-app audio is used. */
export function feedback(kind: FeedbackKind) {
  if (!getPreferences().clickSound) return;
  if (kind === "step" && performance.now() - lastStep < 35) return;
  if (kind === "step") lastStep = performance.now();
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume().catch(() => {});
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(
      kind === "press" ? 650 : kind === "release" ? 1350 : 1850,
      now,
    );
    oscillator.frequency.exponentialRampToValueAtTime(180, now + 0.018);
    gain.gain.setValueAtTime(kind === "step" ? 0.035 : 0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.024);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.026);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  } catch {
    /* Audio feedback is optional and never blocks navigation. */
  }
}

if (import.meta.hot)
  import.meta.hot.dispose(() => {
    if (context) void context.close().catch(() => {});
  });
