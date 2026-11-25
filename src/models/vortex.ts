export type VortexBall = { x: number; y: number; vx: number; vy: number; caught?: number };
export type VortexBrick = { id: number; ring: number; sector: number; hits: number; kind?: "bomb" | "steel" };
export type VortexDrop = { angle: number; radius: number; kind: "wide" | "multi" | "laser" | "narrow" | "sticky" | "slow" | "fast" | "triple" | "power" };
export type VortexState = { level: number; score: number; lives: number; paddle: number;
  phase: "ready" | "playing" | "lost" | "cleared" | "won"; balls: VortexBall[];
  bricks: VortexBrick[]; drops: VortexDrop[]; time: number; wideUntil: number; laserUntil: number; narrowUntil?: number; stickyUntil?: number; slowUntil?: number; fastUntil?: number; tripleUntil?: number; powerUntil?: number };
export const circle = Math.PI * 2;
export const vortexDifficulties = ["Newbie", "Rookie", "Intermediate", "Pro", "Expert"] as const;
export type VortexOptions = { control: "rotation" | "position"; difficulty: typeof vortexDifficulties[number] };
// Five original difficulty names; entry levels map onto ReiPod's ten independent boards (A).
export const vortexStartLevel = (difficulty: VortexOptions["difficulty"]) => 1 + vortexDifficulties.indexOf(difficulty) * 2;
export const angleDifference = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
export function newVortex(level = 1, score = 0, lives = 3): VortexState {
  return { level, score, lives, paddle: Math.PI / 2, phase: "ready", balls: [], drops: [],
    time: 0, wideUntil: 0, laserUntil: 0,
    bricks: Array.from({ length: 36 }, (_, id) => ({ id, ring: Math.floor(id / 12), sector: id % 12,
      hits: level > 2 && id % 4 === 0 ? 2 : 1,
      ...(level >= 4 && id % 13 === 0 ? { kind: "steel" as const } : level >= 2 && id % 11 === 0 ? { kind: "bomb" as const } : {}) })) };
}
export const vortexBrickAngle = (brick: VortexBrick, state: VortexState) =>
  brick.sector * circle / 12 + state.time * (brick.ring % 2 ? -0.025 : 0.025) * Math.min(3, state.level);
export function rotateVortex(state: VortexState, steps: number): VortexState {
  return positionVortex(state, state.paddle + steps * 0.085);
}
export function positionVortex(state: VortexState, angle: number): VortexState {
  if (!Number.isFinite(angle)) return state;
  const paddle = ((angle % circle) + circle) % circle;
  return { ...state, paddle, balls: state.balls.map(ball => ball.caught === undefined ? ball :
    { ...ball, x: Math.cos(paddle + ball.caught) * 110, y: Math.sin(paddle + ball.caught) * 110 }) };
}
export function launchVortex(state: VortexState): VortexState {
  if (state.phase === "cleared") return newVortex(state.level + 1, state.score, state.lives);
  if (state.balls.some(ball => ball.caught !== undefined)) return { ...state, balls: state.balls.map(ball => {
    if (ball.caught === undefined) return ball;
    const angle = state.paddle + ball.caught, speed = Math.hypot(ball.vx, ball.vy);
    return { x: ball.x, y: ball.y, vx: -Math.cos(angle) * speed, vy: -Math.sin(angle) * speed };
  }) };
  if (state.phase !== "ready") return state;
  const speed = 90 + Math.min(60, state.level * 7);
  return { ...state, phase: "playing", balls: [{ x: Math.cos(state.paddle) * 109, y: Math.sin(state.paddle) * 109,
    vx: -Math.cos(state.paddle) * speed, vy: -Math.sin(state.paddle) * speed }] };
}
export const vortexPaddleWidth = (state: VortexState) => state.wideUntil > state.time ? 0.54 : (state.narrowUntil ?? 0) > state.time ? 0.2 : 0.33;
export const vortexPaddles = (state: VortexState) => (state.tripleUntil ?? 0) > state.time
  ? [state.paddle, state.paddle + circle / 3, state.paddle - circle / 3] : [state.paddle];
const copyBoard = (state: VortexState): VortexState => ({ ...state, balls: state.balls.map(ball => ({ ...ball })),
  bricks: state.bricks.map(brick => ({ ...brick })), drops: state.drops.map(drop => ({ ...drop })) });
const finishBoard = (state: VortexState) => {
  if (state.bricks.every(brick => brick.kind === "steel")) state.phase = state.level >= 10 ? "won" : "cleared";
};
/** Mutates only a cloned board. Bomb chains cannot damage a brick twice. */
function damageBrick(state: VortexState, brick: VortexBrick, powerful = false) {
  const pending = [brick], seen = new Set<number>();
  while (pending.length) {
    const hit = pending.shift()!;
    if (seen.has(hit.id) || hit.kind === "steel" || !state.bricks.some(item => item.id === hit.id)) continue;
    seen.add(hit.id);
    hit.hits = powerful || hit.kind === "bomb" ? 0 : hit.hits - 1;
    state.score += hit.hits ? 10 : 25;
    if (hit.hits) continue;
    state.bricks = state.bricks.filter(item => item.id !== hit.id);
    if (hit.id % 4 === 0 && state.drops.length < 4) state.drops.push({ angle: vortexBrickAngle(hit, state), radius: 42 + hit.ring * 23,
      kind: (["wide", "multi", "laser", "sticky", "slow", "fast", "narrow", "triple", "power"] as const)[(hit.id / 4 + state.level - 1) % 9] });
    if (hit.kind === "bomb") pending.push(...state.bricks.filter(item => Math.abs(item.ring - hit.ring) <= 1 &&
      Math.abs(angleDifference(item.sector * circle / 12, hit.sector * circle / 12)) <= circle / 12 + 0.001));
  }
}
export function fireVortex(state: VortexState): VortexState {
  if (state.balls.some(ball => ball.caught !== undefined) || state.phase !== "playing" || state.laserUntil <= state.time) return launchVortex(state);
  const brick = state.bricks.filter(item => Math.abs(angleDifference(vortexBrickAngle(item, state), state.paddle)) < 0.25)
    .sort((a, b) => b.ring - a.ring)[0];
  if (!brick || brick.kind === "steel") return state;
  const next = copyBoard(state);
  damageBrick(next, next.bricks.find(item => item.id === brick.id)!);
  finishBoard(next);
  return next;
}

/** Bounded simulation steps prevent tunnelling after a suspended tab or long frame. */
export function stepVortex(state: VortexState, elapsed: number): VortexState {
  if (state.phase !== "playing" || !Number.isFinite(elapsed) || elapsed <= 0) return state;
  const next = copyBoard(state);
  const total = Math.min(0.05, elapsed), steps = Math.ceil(total / 0.004), dt = total / steps;
  for (let step = 0; step < steps; step++) {
    next.time += dt;
    for (const ball of next.balls) {
      if (ball.caught !== undefined) continue;
      const oldRadius = Math.hypot(ball.x, ball.y);
      const speedScale = (next.slowUntil ?? 0) > next.time ? 0.7 : (next.fastUntil ?? 0) > next.time ? 1.35 : 1;
      ball.x += ball.vx * dt * speedScale; ball.y += ball.vy * dt * speedScale;
      const radius = Math.hypot(ball.x, ball.y), angle = Math.atan2(ball.y, ball.x);
      const hit = next.bricks.find(brick => {
        const r = 37 + brick.ring * 23;
        return radius > r - 4 && radius < r + 13 &&
          Math.abs(angleDifference(angle, vortexBrickAngle(brick, next))) < 0.215;
      });
      if (hit) {
        damageBrick(next, hit, (next.powerUntil ?? 0) > next.time);
        const nx = ball.x / radius, ny = ball.y / radius, dot = ball.vx * nx + ball.vy * ny;
        if ((next.powerUntil ?? 0) <= next.time || hit.kind === "steel") {
          ball.vx -= 2 * dot * nx; ball.vy -= 2 * dot * ny;
        }
        const passing = (next.powerUntil ?? 0) > next.time && hit.kind !== "steel";
        const safeRadius = (oldRadius < radius) !== passing ? 37 + hit.ring * 23 - 5 : 37 + hit.ring * 23 + 14;
        ball.x = nx * safeRadius; ball.y = ny * safeRadius;
      }
      if (radius > 112 && ball.x * ball.vx + ball.y * ball.vy > 0) {
        const paddle = vortexPaddles(next).find(paddle => Math.abs(angleDifference(angle, paddle)) < vortexPaddleWidth(next)) ?? next.paddle;
        const delta = angleDifference(angle, paddle), width = vortexPaddleWidth(next);
        if (Math.abs(delta) < width) {
          const speed = Math.hypot(ball.vx, ball.vy), aim = angle + Math.PI + delta * 1.1;
          ball.x = Math.cos(angle) * 111; ball.y = Math.sin(angle) * 111;
          ball.vx = Math.cos(aim) * speed; ball.vy = Math.sin(aim) * speed;
          if ((next.stickyUntil ?? 0) > next.time) ball.caught = angleDifference(angle, next.paddle);
        } else if (radius > 127) next.balls = next.balls.filter(item => item !== ball);
      }
    }
    for (const drop of next.drops) {
      drop.radius += dt * 34;
      if (drop.radius < 112) continue;
      if (vortexPaddles(next).some(paddle => Math.abs(angleDifference(drop.angle, paddle)) < vortexPaddleWidth(next))) {
        if (drop.kind === "wide") { next.wideUntil = next.time + 14; next.narrowUntil = 0; }
        if (drop.kind === "narrow") { next.narrowUntil = next.time + 14; next.wideUntil = 0; }
        if (drop.kind === "sticky") next.stickyUntil = next.time + 14;
        if (drop.kind === "triple") next.tripleUntil = next.time + 14;
        if (drop.kind === "power") next.powerUntil = next.time + 14;
        if (drop.kind === "slow") { next.slowUntil = next.time + 14; next.fastUntil = 0; }
        if (drop.kind === "fast") { next.fastUntil = next.time + 14; next.slowUntil = 0; }
        if (drop.kind === "laser") next.laserUntil = next.time + 14;
        if (drop.kind === "multi" && next.balls[0]) {
          const ball = next.balls[0], speed = Math.hypot(ball.vx, ball.vy), angle = Math.atan2(ball.vy, ball.vx);
          for (const offset of [-0.3, 0.3]) if (next.balls.length < 5)
            next.balls.push({ x: ball.x, y: ball.y, vx: Math.cos(angle + offset) * speed, vy: Math.sin(angle + offset) * speed });
        }
        next.drops = next.drops.filter(item => item !== drop);
      } else if (drop.radius > 130) next.drops = next.drops.filter(item => item !== drop);
    }
    finishBoard(next);
    if (next.phase !== "playing") break;
    if (!next.balls.length) {
      next.lives--; next.phase = next.lives ? "ready" : "lost"; next.drops = [];
      next.wideUntil = next.laserUntil = 0;
      next.narrowUntil = next.stickyUntil = next.slowUntil = next.fastUntil = next.tripleUntil = next.powerUntil = 0;
      break;
    }
  }
  return next;
}
export function validVortex(value: unknown): value is VortexState {
  if (!value || typeof value !== "object") return false;
  const state = value as VortexState;
  return Number.isInteger(state.level) && state.level >= 1 && state.level <= 10 && Number.isInteger(state.lives) && state.lives >= 0 && state.lives <= 3 &&
    Number.isFinite(state.score) && state.score >= 0 && Number.isFinite(state.paddle) && Number.isFinite(state.time) && state.time >= 0 &&
    [state.narrowUntil, state.stickyUntil, state.slowUntil, state.fastUntil, state.tripleUntil, state.powerUntil].every(value => value === undefined || Number.isFinite(value) && value >= 0) &&
    Number.isFinite(state.wideUntil) && Number.isFinite(state.laserUntil) && ["ready", "playing", "lost", "cleared", "won"].includes(state.phase) &&
    Array.isArray(state.balls) && state.balls.length <= 5 && state.balls.every(ball => ball && [ball.x, ball.y, ball.vx, ball.vy].every(Number.isFinite) && (ball.caught === undefined || Number.isFinite(ball.caught))) &&
    Array.isArray(state.bricks) && state.bricks.length <= 36 && new Set(state.bricks.map(brick => brick?.id)).size === state.bricks.length &&
    state.bricks.every(brick => brick && Number.isInteger(brick.id) && brick.id >= 0 && brick.id < 36 &&
      brick.ring === Math.floor(brick.id / 12) && brick.sector === brick.id % 12 && [1, 2].includes(brick.hits) && (brick.kind === undefined || ["bomb", "steel"].includes(brick.kind))) &&
    Array.isArray(state.drops) && state.drops.length <= 4 && state.drops.every(drop => drop && Number.isFinite(drop.angle) && Number.isFinite(drop.radius) &&
      ["wide", "multi", "laser", "narrow", "sticky", "slow", "fast", "triple", "power"].includes(drop.kind));
}
