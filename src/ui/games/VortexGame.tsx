import { useEffect, useRef, useState } from "react";
import type { Ref } from "react";
import { circle, fireVortex, newVortex, positionVortex, rotateVortex, stepVortex, validVortex, vortexBrickAngle, vortexPaddleWidth, vortexPaddles, vortexStartLevel } from "../../models/vortex";
import type { VortexState, VortexOptions } from "../../models/vortex";
import { readGame, saveGame } from "../../services/gameStorage";
import type { GameInput } from "../gameInput";
import { useGameControls } from "./gameControls";

function paintWell(context: CanvasRenderingContext2D, state: VortexState) {
  const ctx = context;
  ctx.setTransform(2, 0, 0, 2, 0, 0); ctx.clearRect(0, 0, 320, 240);
  const bg = ctx.createRadialGradient(160, 116, 8, 160, 116, 175);
  bg.addColorStop(0, "#051019"); bg.addColorStop(0.38, "#293b27"); bg.addColorStop(0.63, "#947f39"); bg.addColorStop(1, "#372c19");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 320, 240);
  ctx.save(); ctx.translate(160, 114); ctx.scale(1.05, 0.8);
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 48; i++) {
    const angle = i * circle / 48;
    ctx.strokeStyle = i % 4 ? "#a1b45e35" : "#090e0dad";
    ctx.beginPath(); ctx.moveTo(Math.cos(angle) * 24, Math.sin(angle) * 24);
    ctx.lineTo(Math.cos(angle) * 170, Math.sin(angle) * 170); ctx.stroke();
  }
  for (let radius = 25; radius < 160; radius += 13) {
    ctx.strokeStyle = "#07160c75"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, radius, 0, circle); ctx.stroke();
    ctx.strokeStyle = "#b2c76f38"; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.arc(0, 0, radius + 2, 0, circle); ctx.stroke();
  }
  const center = ctx.createRadialGradient(0, 0, 0, 0, 0, 31);
  center.addColorStop(0, "#02060a"); center.addColorStop(0.8, "#0d202b"); center.addColorStop(1, "#173124");
  ctx.fillStyle = center; ctx.beginPath(); ctx.arc(0, 0, 30, 0, circle); ctx.fill();
  for (const brick of state.bricks) {
    const angle = vortexBrickAngle(brick, state), r = 37 + brick.ring * 23;
    ctx.beginPath(); ctx.arc(0, 0, r + 10, angle - 0.218, angle + 0.218);
    ctx.arc(0, 0, r, angle + 0.218, angle - 0.218, true); ctx.closePath();
    const color = ctx.createRadialGradient(0, 0, r, 0, 0, r + 10);
    const colors = brick.kind === "steel" ? ["#d6d8af", "#4b625d", "#a7aca4"] : brick.kind === "bomb" ? ["#fbd588", "#a42c24", "#f09855"] : brick.hits > 1 ? ["#a7aca4", "#4b625d", "#d6d8af"]
      : brick.ring % 2 ? ["#c9d87b", "#5a7a1f", "#8ca83c"] : ["#f09855", "#a42c24", "#dd6740"];
    color.addColorStop(0, colors[0]); color.addColorStop(0.4, colors[1]); color.addColorStop(1, colors[2]);
    ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = "#0a180e"; ctx.lineWidth = 1.3; ctx.stroke();
    if (brick.kind) {
      const x = Math.cos(angle) * (r + 5), y = Math.sin(angle) * (r + 5);
      ctx.fillStyle = brick.kind === "steel" ? "#eaffed" : "#301311";
      ctx.beginPath(); ctx.arc(x, y, brick.kind === "steel" ? 1.8 : 3, 0, circle); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(0, 0, r + 9, angle - 0.2, angle + 0.2); ctx.strokeStyle = "#fff7bf6b"; ctx.lineWidth = 0.8; ctx.stroke();
  }
  const width = vortexPaddleWidth(state);
  for (const paddle of vortexPaddles(state)) {
    ctx.beginPath(); ctx.arc(0, 0, 118, paddle - width, paddle + width);
    ctx.lineWidth = 8; ctx.strokeStyle = state.laserUntil > state.time ? "#fbd588" : (state.stickyUntil ?? 0) > state.time ? "#b2e16f" : "#87bad8"; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 115, paddle - width, paddle + width);
    ctx.lineWidth = 2; ctx.strokeStyle = "#ecffff"; ctx.stroke();
  }
  const balls = state.phase === "ready" ? [{ x: Math.cos(state.paddle) * 106, y: Math.sin(state.paddle) * 106 }] : state.balls;
  for (const ball of balls) {
    ctx.beginPath(); ctx.arc(ball.x + 2, ball.y + 3, 4, 0, circle); ctx.fillStyle = "#071c26a0"; ctx.fill();
    const light = ctx.createRadialGradient(ball.x - 1, ball.y - 1, 0, ball.x, ball.y, 4);
    light.addColorStop(0, "white"); light.addColorStop(0.35, (state.powerUntil ?? 0) > state.time ? "#fbd588" : "#c5faff"); light.addColorStop(1, "#4996b2");
    ctx.beginPath(); ctx.arc(ball.x, ball.y, 3.5, 0, circle); ctx.fillStyle = light; ctx.fill();
  }
  for (const drop of state.drops) {
    const x = Math.cos(drop.angle) * drop.radius, y = Math.sin(drop.angle) * drop.radius;
    ctx.fillStyle = drop.kind === "multi" ? "#64d1e2" : drop.kind === "wide" ? "#e2cc4e" : "#e97442";
    ctx.fillRect(x - 5, y - 4, 10, 8); ctx.strokeStyle = "#ffedb5"; ctx.strokeRect(x - 5, y - 4, 10, 8);
    ctx.fillStyle = "#193022"; ctx.font = "bold 8px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(({ wide: "+", narrow: "−", multi: "3", laser: "L", sticky: "S", slow: "↓", fast: "↑", triple: "T", power: "P" })[drop.kind], x, y + 3);
  }
  ctx.restore();
  ctx.fillStyle = "#111b12ba"; ctx.fillRect(0, 218, 320, 22);
  ctx.fillStyle = "#b2e16f"; ctx.font = "bold 11px 'ReiPod Sans', sans-serif"; ctx.textAlign = "right";
  ctx.fillText(String(state.score).padStart(6, "0"), 309, 232);
  ctx.textAlign = "left"; ctx.fillText(`× ${state.lives}`, 31, 232);
  ctx.fillStyle = "#df4b39"; ctx.beginPath(); ctx.moveTo(18, 233); ctx.bezierCurveTo(-3, 217, 11, 211, 18, 220);
  ctx.bezierCurveTo(26, 210, 39, 218, 18, 233); ctx.fill();
  ctx.fillStyle = "#c6d58d"; ctx.font = "9px 'ReiPod Sans', sans-serif"; ctx.textAlign = "center";
  ctx.fillText(`Vortex Loop ${state.level}`, 160, 13);
}

export function VortexGame({ input, running, fresh, options, onSaveError }: {
  input: Ref<GameInput>; running: boolean; fresh: boolean; options: VortexOptions; onSaveError: () => void;
}) {
  const [initial] = useState(() => !fresh && readGame("vortex", validVortex) || newVortex(vortexStartLevel(options.difficulty)));
  const state = useRef(initial);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState(initial.phase);
  const [summary, setSummary] = useState({ score: initial.score, lives: initial.lives, level: initial.level });
  const paint = () => { const ctx = canvas.current?.getContext("2d"); if (ctx) paintWell(ctx, state.current); };
  const persist = () => { if (!saveGame("vortex", state.current)) onSaveError(); };
  useEffect(() => {
    paint();
    if (!running || phase !== "playing") { persist(); return; }
    let frame = 0, previous: number | undefined;
    const tick = (now: number) => {
      const old = state.current;
      state.current = stepVortex(old, previous === undefined ? 0 : (now - previous) / 1000);
      previous = now;
      if (state.current.phase !== old.phase) { setPhase(state.current.phase); persist(); }
      if (state.current.score !== old.score || state.current.lives !== old.lives || state.current.level !== old.level)
        setSummary({ score: state.current.score, lives: state.current.lives, level: state.current.level });
      paint(); frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); persist(); };
  }, [running, phase]);
  useGameControls(input, {
    position: radians => {
      if (!running || options.control !== "position") return false;
      state.current = positionVortex(state.current, radians); paint(); return true;
    },
    rotate: steps => { state.current = rotateVortex(state.current, steps); paint(); },
    command: value => {
      if (value !== "select") return;
      const before = state.current;
      state.current = ["lost", "won"].includes(before.phase) ? newVortex(vortexStartLevel(options.difficulty)) : fireVortex(before);
      setPhase(state.current.phase); setSummary({ score: state.current.score, lives: state.current.lives, level: state.current.level });
      paint(); persist();
    },
  });
  return <div className="vortex-game" data-game="vortex" data-phase={phase} data-level={summary.level} data-control={options.control}>
    <canvas width="640" height="480" ref={canvas} role="img" aria-label={`Vortex，第${summary.level}关，${summary.lives}次机会，${summary.score}分`} />
    {["cleared", "lost", "won"].includes(phase) && <div className="vortex-result">
      <strong>{phase === "lost" ? "GAME OVER" : phase === "won" ? "COMPLETE" : `LOOP ${summary.level} CLEAR`}</strong>
      <span>{String(summary.score).padStart(6, "0")}</span>
    </div>}
  </div>;
}
