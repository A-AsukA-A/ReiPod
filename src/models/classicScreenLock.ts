export type ScreenLockDigits = [number, number, number, number];
export type ScreenLockState = { code: string | null; locked: boolean };

export function parseScreenLock(value: unknown): ScreenLockState {
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const code = typeof input.code === "string" && /^\d{4}$/.test(input.code) ? input.code : null;
  return { code, locked: code !== null && input.locked === true };
}

export function dialDigit(digits: ScreenLockDigits, index: number, steps: number): ScreenLockDigits {
  const next: ScreenLockDigits = [...digits];
  if (index >= 0 && index < 4) {
    next[index] = (((next[index] + steps) % 10) + 10) % 10;
  }
  return next;
}

export const formatDigits = (digits: ScreenLockDigits): string => digits.join("");

export const verifyScreenLock = (code: string | null, attempt: ScreenLockDigits): boolean =>
  code !== null && code === formatDigits(attempt);
