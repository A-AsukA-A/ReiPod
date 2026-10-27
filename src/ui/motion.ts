/** CSS minifiers may serialize 180ms as .18s, including in custom properties. */
export function durationInMilliseconds(value: string) {
  const match = value.trim().match(/^(\d*\.?\d+)(ms|s)$/);
  return match ? Number(match[1]) * (match[2] === "s" ? 1000 : 1) : 0;
}
