// Adapted from ipod-classic-js/app/components/ClickWheel/helpers.ts.
// Copyright (c) 2019 Tanner Villarete. MIT; see vendor/ipod-classic-js/LICENSE.
export type Point = { x: number; y: number };

export const getCircularBoundingInfo = (
  rect: Pick<DOMRect, "left" | "top" | "width" | "height">,
) => {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const radius = Math.max(rect.width, rect.height) / 2;
  return {
    radius,
    diameter: radius * 2,
    centerPoint: { x: centerX, y: centerY },
  };
};

export const getAngleBetweenPoints = (point1: Point, point2: Point) =>
  (Math.atan2(point1.y - point2.y, point1.x - point2.x) * 180) / Math.PI;

// Unwrap every sample, rather than reversing only above a threshold.
export const angleDelta = (from: number, to: number) =>
  ((to - from + 540) % 360) - 180;
