import { expect, it, vi } from "vitest";
import { createSearchMenu } from "./searchMenus";
import { searchLibrary } from "../player/librarySearch";
import type { Track } from "../player/Player";

const track: Track = { id: "song", title: "Dawn Song", artist: "Dawn Artist", album: "Dawn Album", url: "blob:song", filename: "song.mp3", size: 1 };
it("keeps the editable Search row first and opens collections without changing playback", () => {
  const open = vi.fn(), begin = vi.fn(), play = vi.fn();
  const results = searchLibrary([track], [{ id: "list", name: "Dawn List", trackIds: [track.id] }], [], "dawn");
  const rows = createSearchMenu({ results, query: "dawn", open, begin, play });
  expect(rows[0]).toMatchObject({ key: "edit-search", label: "搜索", searchKind: "search" });
  rows[0].action(); expect(begin).toHaveBeenCalledOnce();
  rows.find(row => row.searchKind === "artist")!.action();
  expect(open).toHaveBeenLastCalledWith("albums", undefined, undefined, "Dawn Artist");
  rows.find(row => row.searchKind === "album")!.action();
  expect(open).toHaveBeenLastCalledWith("album-tracks", undefined, JSON.stringify([track.artist, track.album]));
  rows.find(row => row.searchKind === "playlist")!.action();
  expect(open).toHaveBeenLastCalledWith("playlist-tracks", undefined, "list");
  expect(play).not.toHaveBeenCalled();
  rows.find(row => row.searchKind === "song")!.action();
  expect(play).toHaveBeenCalledWith(track.id, [track.id]);
});

it("plays only the matched playable results, excluding collection members and hidden library tracks", () => {
  const play = vi.fn();
  const rows = createSearchMenu({ results: searchLibrary([track, { ...track, id: "hidden", title: "Unmatched" }], [], [{ ...track, id: "podcast", title: "Dawn Talk" }], "dawn"), query: "dawn", open: vi.fn(), begin: vi.fn(), play });
  rows.find(row => row.key === "podcast")!.action();
  expect(play).toHaveBeenCalledWith("podcast", ["song", "podcast"]);
});
