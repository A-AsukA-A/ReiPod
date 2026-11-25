import type { ClassicGameId } from "../models/classicGames";
import type { VortexOptions } from "../models/vortex";

const vortexOptionsKey = "reipod-vortex-options-v1";
export function readVortexOptions(): VortexOptions {
  try {
    const raw = localStorage.getItem(vortexOptionsKey);
    const value = raw && raw.length < 500 ? JSON.parse(raw) as VortexOptions : null;
    return { control: value?.control === "position" ? "position" : "rotation",
      difficulty: ["Newbie", "Rookie", "Intermediate", "Pro", "Expert"].includes(value?.difficulty ?? "") ? value!.difficulty : "Newbie" };
  } catch { return { control: "rotation", difficulty: "Newbie" }; }
}
export function saveVortexOptions(options: VortexOptions) {
  try { localStorage.setItem(vortexOptionsKey, JSON.stringify(options)); return true; } catch { return false; }
}

const prefix = "reipod-game-v1:";
/** Games have their own bounded storage; no media/account/session state is written. */
export function readGame<T>(id: ClassicGameId, valid: (value: unknown) => value is T): T | null {
  try {
    const raw = localStorage.getItem(prefix + id);
    if (!raw || raw.length > 100_000) return null;
    const value = JSON.parse(raw) as { version?: number; data?: unknown };
    return value?.version === 1 && valid(value.data) ? value.data : null;
  } catch { return null; }
}
export function saveGame(id: ClassicGameId, value: unknown) {
  try {
    const raw = JSON.stringify({ version: 1, savedAt: Date.now(), data: value });
    if (raw.length > 100_000) return false;
    localStorage.setItem(prefix + id, raw);
    return true;
  } catch { return false; }
}

export function hasGameProgress(id: ClassicGameId) {
  try {
    const raw = localStorage.getItem(prefix + id);
    if (!raw || raw.length > 100_000) return false;
    const value = JSON.parse(raw) as { version?: number; savedAt?: number };
    return value?.version === 1 && Number.isFinite(value.savedAt);
  } catch { return false; }
}
