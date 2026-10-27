/** A mouse notch is a single selection; precision deltas accumulate without acceleration. */
export class MouseWheel {
  private remainder = 0;
  private lastTime = -Infinity;
  move(delta: number, mode: number, time: number) {
    if (!Number.isFinite(delta) || delta === 0) return 0;
    if (
      time - this.lastTime > 180 ||
      Math.sign(delta) !== Math.sign(this.remainder)
    )
      this.remainder = 0;
    this.lastTime = time;
    this.remainder += delta * (mode === 1 ? 16 : mode === 2 ? 120 : 1);
    if (Math.abs(this.remainder) < 32) return 0;
    const step = Math.sign(this.remainder);
    this.remainder = 0;
    return step;
  }
}
