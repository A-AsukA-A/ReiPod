import { parseExtras } from "../models/classicExtras";
import type { ExtrasState } from "../models/classicExtras";
const key = "reipod-classic-extras";
export function readExtras() {
  try { return parseExtras(JSON.parse(localStorage.getItem(key) ?? "null"), Date.now()); }
  catch { return parseExtras(null, Date.now()); }
}
export function writeExtras(state: ExtrasState) {
  try { localStorage.setItem(key, JSON.stringify(state)); return true; }
  catch { return false; }
}
