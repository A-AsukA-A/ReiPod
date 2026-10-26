export type SeekDraft = { trackId: string; position: number };

export function committedSeek(
  draft: SeekDraft | null,
  currentId: string | null,
  duration: number,
) {
  if (!draft || draft.trackId !== currentId || duration <= 0) return null;
  return Math.max(0, Math.min(duration, draft.position));
}
