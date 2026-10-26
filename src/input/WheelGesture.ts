import { angleDelta, getAngleBetweenPoints } from "./geometry";
import type { Point } from "./geometry";

/** One pointer owns a gesture. Moving through the center cancels click eligibility. */
export class WheelGesture {
  private previous: number | null;
  private previousTime: number;
  private remainder = 0;
  private travelled = 0;
  private moved = false;
  private readonly ringStart: boolean;

  constructor(
    private start: Point,
    private center: Point,
    private radius: number,
    now: number,
  ) {
    this.ringStart =
      Math.hypot(start.x - center.x, start.y - center.y) > radius * 0.42;
    this.previous = this.ringStart
      ? getAngleBetweenPoints(start, center)
      : null;
    this.previousTime = now;
  }

  move(point: Point, now: number) {
    if (Math.hypot(point.x - this.start.x, point.y - this.start.y) > 7)
      this.moved = true;
    const distance = Math.hypot(
      point.x - this.center.x,
      point.y - this.center.y,
    );
    if (
      !this.ringStart ||
      distance < this.radius * 0.42 ||
      distance > this.radius * 1.25
    ) {
      this.previous = null;
      this.remainder = 0;
      this.previousTime = now;
      return 0;
    }
    const angle = getAngleBetweenPoints(point, this.center);
    const delta = this.previous === null ? 0 : angleDelta(this.previous, angle);
    const elapsed = Math.max(8, now - this.previousTime);
    this.previous = angle;
    this.previousTime = now;
    this.travelled += Math.abs(delta);
    if (this.travelled > 7) this.moved = true;
    if (Math.sign(delta) !== Math.sign(this.remainder)) this.remainder = 0;
    this.remainder += delta;
    const steps = Math.trunc(this.remainder / 15);
    this.remainder -= steps * 15;
    // Fast strokes browse more items; slow strokes keep one detent precise.
    const gain = Math.abs(delta) / elapsed > 0.65 ? 3 : 1;
    return steps * gain;
  }

  canClick(point: Point) {
    return (
      !this.moved &&
      Math.hypot(point.x - this.start.x, point.y - this.start.y) <= 7
    );
  }
}
