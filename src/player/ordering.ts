export function shuffled(ids: string[], random = Math.random) {
  const result = [...ids];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(random() * (i + 1)));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function shuffleAfterCurrent(
  ids: string[],
  currentId: string | null,
  random = Math.random,
) {
  const index = currentId ? ids.indexOf(currentId) : -1;
  return [
    ...ids.slice(0, index + 1),
    ...shuffled(ids.slice(index + 1), random),
  ];
}
