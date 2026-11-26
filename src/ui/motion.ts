import type { CSSProperties } from "react";

/** CSS minifiers may serialize 180ms as .18s, including in custom properties. */
export function durationInMilliseconds(value: string) {
  const match = value.trim().match(/^(\d*\.?\d+)(ms|s)$/);
  return match ? Number(match[1]) * (match[2] === "s" ? 1000 : 1) : 0;
}

/** Weighty, silky 2007 classic hardware motion rhythm. */
export const classicMotion = {
  page: 360,
  view: 320,
  control: 360,
  volume: 150,
  album: 460,
  flowEnter: 440,
  flowExit: 480,
  easing: "cubic-bezier(0.32, 0.08, 0.24, 1)",
  albumEasing: "cubic-bezier(0.42, 0.04, 0.24, 1)",
  coverFrequency: 12,
  previewInterval: 7000,
  previewFade: 950,
  previewCard: 280,
} as const;

// One timing source for CSS, snapshots and the independent artwork timer.
export const lcdMotionStyle = {
  "--lcd-page-duration": `${classicMotion.page}ms`,
  "--lcd-view-duration": `${classicMotion.view}ms`,
  "--lcd-album-duration": `${classicMotion.album}ms`,
  "--lcd-flow-enter-duration": `${classicMotion.flowEnter}ms`,
  "--lcd-flow-exit-duration": `${classicMotion.flowExit}ms`,
  "--lcd-ease": classicMotion.easing,
  "--lcd-album-ease": classicMotion.albumEasing,
  "--lcd-preview-interval": `${classicMotion.previewInterval}ms`,
  "--lcd-preview-fade": `${classicMotion.previewFade}ms`,
  "--lcd-preview-card-duration": `${classicMotion.previewCard}ms`,
} as CSSProperties;

/** Lazer reference behavior, independently rendered for the LCD; not stock firmware. */
export const lyricMotion = {
  focus: 0.35,
  manualHold: 2500,
  interpolationLimit: 0.3,
  lineMass: 0.9,
  lineStiffness: 170,
  lineDamping: 29,
  scaleStiffness: 100,
  scaleDamping: 25,
  lineStagger: 0.05,
  inactiveScale: 0.97,
  wordLift: 0.05,
  feather: 0.5,
  maxBlur: 5,
} as const;
