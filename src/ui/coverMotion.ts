import { classicMotion } from "./motion";

/** Critically damped motion: continuous position and velocity when the wheel reverses. */
export function advanceCover(
  position: number,
  velocity: number,
  target: number,
  seconds: number,
) {
  const frequency = classicMotion.coverFrequency;
  const displacement = position - target;
  const impulse = velocity + frequency * displacement;
  const decay = Math.exp(-frequency * seconds);
  return {
    position: target + (displacement + impulse * seconds) * decay,
    velocity: (velocity - frequency * impulse * seconds) * decay,
  };
}

/** A continuous fan, including the turn from the side stack onto the center stage. */
export function coverPose(offset: number) {
  const distance = Math.abs(offset);
  const side = Math.sign(offset);
  const turn = Math.min(1, distance);
  return {
    x: side * (Math.min(distance, 1) * 86 + Math.max(0, distance - 1) * 34),
    z: -48 * turn,
    angle: -side * 66 * turn,
    depth: 100 - Math.round(distance * 10),
    opacity: Math.max(0, Math.min(1, 5 - distance)),
  };
}
