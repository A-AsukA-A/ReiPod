import { useSyncExternalStore } from "react";
import { player } from "../player/store";

/** React binding only; every caller observes the same local playback session. */
export const useLocalPlayer = () => useSyncExternalStore(player.subscribe, player.getSnapshot);
