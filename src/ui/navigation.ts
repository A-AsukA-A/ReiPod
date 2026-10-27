export type Page =
  | "about"
  | "main-menu"
  | "backlight"
  | "brightness"
  | "volume-limit"
  | "extras"
  | "clock"
  | "home"
  | "music"
  | "songs"
  | "demos"
  | "playing"
  | "settings"
  | "confirm-clear"
  | "coverflow"
  | "albums"
  | "artists"
  | "album-tracks"
  | "artist-tracks"
  | "favorites"
  | "recent"
  | "playlists"
  | "queue"
  | "search"
  | "playlist-tracks"
  | "playlist-options"
  | "playlist-name"
  | "playlist-add-tracks"
  | "pick-playlist"
  | "track-options"
  | "confirm-delete-track"
  | "confirm-delete-playlist";
export type Screen = {
  page: Page;
  selectedKey: string | null;
  groupKey?: string;
};
export type NavigationState = {
  screen: Screen;
  history: Screen[];
  remembered: Record<string, string | null>;
};
export const initialNavigation: NavigationState = {
  screen: { page: "home", selectedKey: "music" },
  history: [],
  remembered: {},
};
export type NavigationAction =
  | {
      type: "open";
      page: Page;
      selectedKey?: string;
      defaultKey?: string;
      groupKey?: string;
    }
  | { type: "select"; key: string }
  | { type: "move"; keys: string[]; steps: number }
  | { type: "back"; levels?: number }
  | { type: "home" }
  | { type: "reset" };

/** Keep selection and navigation in one transaction, including direct row clicks. */
export function navigationReducer(
  state: NavigationState,
  action: NavigationAction,
): NavigationState {
  if (action.type === "reset") return initialNavigation;
  const remembered = {
    ...state.remembered,
    [state.screen.groupKey
      ? `${state.screen.page}:${state.screen.groupKey}`
      : state.screen.page]: state.screen.selectedKey,
  };
  if (action.type === "home")
    return {
      screen: { page: "home", selectedKey: remembered.home ?? "music" },
      history: [],
      remembered,
    };
  if (action.type === "back") {
    const levels = action.levels ?? 1;
    const previous = state.history.at(-levels);
    return previous
      ? {
          screen: previous,
          history: state.history.slice(0, -levels),
          remembered,
        }
      : {
          screen: { page: "home", selectedKey: remembered.home ?? "music" },
          history: [],
          remembered,
        };
  }
  if (action.type === "open") {
    const same =
      action.page === state.screen.page &&
      action.groupKey === state.screen.groupKey;
    if (same && action.selectedKey === undefined) return state;
    return {
      screen: {
        page: action.page,
        ...(action.groupKey ? { groupKey: action.groupKey } : {}),
        selectedKey:
          action.selectedKey ??
          remembered[
            action.groupKey ? `${action.page}:${action.groupKey}` : action.page
          ] ??
          action.defaultKey ??
          null,
      },
      history: same ? state.history : [...state.history, state.screen],
      remembered,
    };
  }
  const key =
    action.type === "select"
      ? action.key
      : (() => {
          if (!action.keys.length) return null;
          const current = Math.max(
            0,
            action.keys.indexOf(state.screen.selectedKey ?? ""),
          );
          return action.keys[
            Math.max(
              0,
              Math.min(action.keys.length - 1, current + action.steps),
            )
          ];
        })();
  return { ...state, screen: { ...state.screen, selectedKey: key } };
}
