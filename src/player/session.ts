export type PlaybackSession = {
  currentId: string | null;
  position: number;
  volume: number;
  queue: string[];
  naturalOrder: string[];
};
export function readSession(value: unknown): PlaybackSession | null {
  if (!value || typeof value !== "object") return null;
  const saved = value as Record<string, unknown>;
  const ids = (input: unknown) =>
    Array.isArray(input)
      ? [...new Set(input.filter((id): id is string => typeof id === "string"))]
      : [];
  return {
    currentId: typeof saved.currentId === "string" ? saved.currentId : null,
    position:
      typeof saved.position === "number" && Number.isFinite(saved.position)
        ? Math.max(0, saved.position)
        : 0,
    volume:
      typeof saved.volume === "number" && Number.isFinite(saved.volume)
        ? Math.max(0, Math.min(1, saved.volume))
        : 0.8,
    queue: ids(saved.queue),
    naturalOrder: ids(saved.naturalOrder),
  };
}
