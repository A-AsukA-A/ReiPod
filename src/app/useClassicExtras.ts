import { useEffect, useReducer } from "react";
import { extrasReducer } from "../models/classicExtras";
import { readExtras, writeExtras } from "../services/extrasStorage";
export function useClassicExtras(notice: (message: string) => void) {
  const [state, dispatch] = useReducer(extrasReducer, undefined, readExtras);
  useEffect(() => {
    if (!writeExtras(state)) notice("附加功能未能保存，本次仍可使用");
  }, [state, notice]);
  return { state, dispatch,
    toggle: () => dispatch({ type: "toggle", now: Date.now() }),
    pause: () => dispatch({ type: "pause", now: Date.now() }),
  };
}
