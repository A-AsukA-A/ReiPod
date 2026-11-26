export type PlayHistoryEntry = { count: number; lastPlayedAt: number };
export type PlayHistory = Record<string, PlayHistoryEntry>;

export function parsePlayHistory(input: unknown, maxEntries = 500): PlayHistory {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const valid = Object.entries(input).flatMap(([id, entry]) => {
    if (!id || !entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const { count, lastPlayedAt } = entry as { count?: unknown; lastPlayedAt?: unknown };
    if (
      typeof count !== "number" ||
      !Number.isInteger(count) ||
      count < 1 ||
      typeof lastPlayedAt !== "number" ||
      !Number.isFinite(lastPlayedAt) ||
      lastPlayedAt < 0
    ) {
      return [];
    }
    return [[id, { count, lastPlayedAt }] as const];
  });
  valid.sort((a, b) => b[1].lastPlayedAt - a[1].lastPlayedAt);
  return Object.fromEntries(valid.slice(0, Math.max(0, maxEntries)));
}

export function recordPlay(
  history: PlayHistory,
  trackId: string,
  at: number,
  maxEntries = 500,
): PlayHistory {
  if (!trackId || !Number.isFinite(at) || at < 0) return history;
  const previous = history[trackId];
  const updated: PlayHistory = {
    ...history,
    [trackId]: {
      count: (previous?.count ?? 0) + 1,
      lastPlayedAt: at,
    },
  };
  const entries = Object.entries(updated);
  if (entries.length <= maxEntries) return updated;
  entries.sort((a, b) => b[1].lastPlayedAt - a[1].lastPlayedAt);
  return Object.fromEntries(entries.slice(0, Math.max(0, maxEntries)));
}

export function selectTopRatedTracks<T extends { id: string; title: string }>(
  tracks: readonly T[],
  ratings: Readonly<Record<string, number>>,
): T[] {
  return tracks
    .filter((track) => (ratings[track.id] ?? 0) >= 4)
    .sort((a, b) => (ratings[b.id] ?? 0) - (ratings[a.id] ?? 0) || a.title.localeCompare(b.title));
}

export function selectMostPlayedTracks<T extends { id: string; title: string }>(
  tracks: readonly T[],
  history: PlayHistory,
  limit = 25,
): T[] {
  return tracks
    .filter((track) => (history[track.id]?.count ?? 0) >= 1)
    .sort(
      (a, b) =>
        (history[b.id]?.count ?? 0) - (history[a.id]?.count ?? 0) ||
        (history[b.id]?.lastPlayedAt ?? 0) - (history[a.id]?.lastPlayedAt ?? 0) ||
        a.title.localeCompare(b.title),
    )
    .slice(0, Math.max(0, limit));
}

export function selectRecentlyPlayedTracks<T extends { id: string; title: string }>(
  tracks: readonly T[],
  history: PlayHistory,
  limit = 25,
): T[] {
  return tracks
    .filter((track) => (history[track.id]?.lastPlayedAt ?? 0) > 0)
    .sort(
      (a, b) =>
        (history[b.id]?.lastPlayedAt ?? 0) - (history[a.id]?.lastPlayedAt ?? 0) ||
        a.title.localeCompare(b.title),
    )
    .slice(0, Math.max(0, limit));
}
