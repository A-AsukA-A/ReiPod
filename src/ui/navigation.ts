export type Page =
  "home" | "songs" | "demos" | "playing" | "settings" | "confirm-clear";
export type Screen = { page: Page; selectedKey: string | null };
export type NavigationState = {
  screen: Screen;
  history: Screen[];
  remembered: Partial<Record<Page, string | null>>;
};
export const initialNavigation: NavigationState = {
  screen: { page: "home", selectedKey: "music" },
  history: [],
  remembered: {},
};
export type NavigationAction =
  | { type: "open"; page: Page; selectedKey?: string; defaultKey?: string }
  | { type: "select"; key: string }
  | { type: "move"; keys: string[]; steps: number }
  | { type: "back" }
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
    [state.screen.page]: state.screen.selectedKey,
  };
  if (action.type === "home")
    return {
      screen: { page: "home", selectedKey: remembered.home ?? "music" },
      history: [],
      remembered,
    };
  if (action.type === "back") {
    const previous = state.history.at(-1);
    return previous
      ? { screen: previous, history: state.history.slice(0, -1), remembered }
      : {
          screen: { page: "home", selectedKey: remembered.home ?? "music" },
          history: [],
          remembered,
        };
  }
  if (action.type === "open") {
    if (action.page === state.screen.page && action.selectedKey === undefined)
      return state;
    return {
      screen: {
        page: action.page,
        selectedKey:
          action.selectedKey ??
          remembered[action.page] ??
          action.defaultKey ??
          null,
      },
      history:
        action.page === state.screen.page
          ? state.history
          : [...state.history, state.screen],
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
