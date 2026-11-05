export type Playlist = { id: string; name: string; trackIds: string[]; savedOnTheGo?: number };
export const onTheGoId = "on-the-go";

/** A display-only empty working list does not write to storage. */
export function withOnTheGo(items: Playlist[]) {
  return [...items.filter(item => item.id !== onTheGoId),
    items.find(item => item.id === onTheGoId) ?? { id: onTheGoId, name: "On-The-Go", trackIds: [] }];
}
