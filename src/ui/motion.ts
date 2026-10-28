import type { CSSProperties } from "react";

/** CSS minifiers may serialize 180ms as .18s, including in custom properties. */
export function durationInMilliseconds(value: string) {
  const match = value.trim().match(/^(\d*\.?\d+)(ms|s)$/);
  return match ? Number(match[1]) * (match[2] === "s" ? 1000 : 1) : 0;
}

/** Calibration values, not recovered Apple constants. See HARDWARE_RESEARCH.md. */
export const classicMotion = {
  page: 360,
  view: 300,
  album: 360,
  flowEnter: 320,
  flowExit: 480,
  easing: "cubic-bezier(0.42, 0, 0.58, 1)",
  coverFrequency: 18,
  previewInterval: 6000,
  previewFade: 650,
  previewCard: 400,
} as const;

// One timing source for CSS, snapshots and the independent artwork timer.
export const lcdMotionStyle = {
  "--lcd-page-duration": `${classicMotion.page}ms`,
  "--lcd-view-duration": `${classicMotion.view}ms`,
  "--lcd-album-duration": `${classicMotion.album}ms`,
  "--lcd-flow-enter-duration": `${classicMotion.flowEnter}ms`,
  "--lcd-flow-exit-duration": `${classicMotion.flowExit}ms`,
  "--lcd-ease": classicMotion.easing,
  "--lcd-album-ease": classicMotion.easing,
  "--lcd-preview-interval": `${classicMotion.previewInterval}ms`,
  "--lcd-preview-fade": `${classicMotion.previewFade}ms`,
  "--lcd-preview-card-duration": `${classicMotion.previewCard}ms`,
} as CSSProperties;

/** ReiPod lyric additions: modest emphasis in the small LCD, not hardware measurements. */
export const lyricMotion = {
  focus: 0.35,
  manualHold: 2500,
  interpolationLimit: 0.3,
  mass: 1,
  stiffness: 100,
  damping: 10,
  settle: 0.5,
  wordScale: 0.035,
  wordLift: 0.035,
} as const;
