import { expect, it } from "vitest";
import {
  parsePlayHistory,
  recordPlay,
  selectMostPlayedTracks,
  selectRecentlyPlayedTracks,
  selectTopRatedTracks,
} from "./playHistoryModel";

it("parses bounded valid play history and evicts oldest entries beyond maxEntries", () => {
  expect(parsePlayHistory(null)).toEqual({});
  expect(parsePlayHistory({
    badCount: { count: 0, lastPlayedAt: 10 },
    badFloat: { count: 1.5, lastPlayedAt: 20 },
    badTime: { count: 1, lastPlayedAt: -1 },
    old: { count: 2, lastPlayedAt: 100 },
    newer: { count: 1, lastPlayedAt: 200 },
    newest: { count: 3, lastPlayedAt: 300 },
  }, 2)).toEqual({
    newest: { count: 3, lastPlayedAt: 300 },
    newer: { count: 1, lastPlayedAt: 200 },
  });

  let history = recordPlay({}, "a", 10, 2);
  history = recordPlay(history, "b", 20, 2);
  history = recordPlay(history, "a", 30, 2);
  history = recordPlay(history, "c", 40, 2);
  expect(history).toEqual({
    c: { count: 1, lastPlayedAt: 40 },
    a: { count: 2, lastPlayedAt: 30 },
  });
});

it("derives smart playlists from current library tracks, ratings, and play history", () => {
  const tracks = [
    { id: "t1", title: "Bravo" },
    { id: "t2", title: "Alpha" },
    { id: "t3", title: "Charlie" },
    { id: "t4", title: "Delta" },
  ];
  const ratings = { t1: 4, t2: 5, t3: 3, orphan: 5 };
  const history = {
    t1: { count: 2, lastPlayedAt: 100 },
    t2: { count: 5, lastPlayedAt: 50 },
    t3: { count: 1, lastPlayedAt: 300 },
    orphan: { count: 99, lastPlayedAt: 999 },
  };

  expect(selectTopRatedTracks(tracks, ratings).map((t) => t.id)).toEqual(["t2", "t1"]);
  expect(selectMostPlayedTracks(tracks, history, 2).map((t) => t.id)).toEqual(["t2", "t1"]);
  expect(selectRecentlyPlayedTracks(tracks, history, 2).map((t) => t.id)).toEqual(["t3", "t1"]);
});
