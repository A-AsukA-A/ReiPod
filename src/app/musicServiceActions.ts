import type { MusicService, MusicServiceState } from "../services/musicServices";
import type { NavigationState, Page } from "../ui/navigation";

type Context = {
  getServices: () => MusicServiceState;
  getNavigation: () => Pick<NavigationState, "screen" | "history">;
  open: (page: Page, key?: string, group?: string) => void;
  back: () => void;
  setNotice: (message: string) => void;
  ports: {
    select: (service: MusicService) => unknown;
    authorize: (channel?: string) => unknown;
    prepare: () => unknown;
    refresh: () => unknown;
    signOut: () => unknown;
    reopenLogin: (service: "netease" | "qq") => unknown;
    openSettings: () => Promise<unknown>;
    loadPlaylist: (id: string) => Promise<boolean>;
  };
};

/** Application commands own platform calls; menu construction stays synchronous. */
export function createMusicServiceActions({
  getServices,
  getNavigation,
  open,
  back,
  setNotice,
  ports,
}: Context) {
  return {
    select(service: MusicService) {
      ports.select(service);
      if (service === "netease" || service === "qq") open("music-account", "login");
      else back();
    },
    refresh() {
      void ports.refresh();
    },
    signOut() {
      void ports.signOut();
    },
    login(channel?: string) {
      const state = getServices();
      const thirdParty = state.selected === "netease" || state.selected === "qq";
      if (state.loginUrl && (state.selected === "netease" || state.selected === "qq")) {
        void ports.reopenLogin(state.selected);
      } else if (state.transport === "ios" &&
        ["denied", "restricted"].includes(state.nativeAuthorization ?? "")) {
        void ports.openSettings().catch((error: unknown) =>
          setNotice(error instanceof Error ? error.message : "未能打开系统设置"));
      } else if (state.ready || thirdParty) {
        void ports.authorize(channel);
      } else {
        void ports.prepare();
      }
    },
    async openPlaylist(id: string) {
      const selected = getServices().selected;
      const { history } = getNavigation();
      // Selection updates keep history; leaving/returning creates a new history array.
      const stillCurrent = () => {
        const services = getServices();
        const navigation = getNavigation();
        return navigation.history === history && navigation.screen.page === "playlists" &&
          navigation.screen.selectedKey === id && services.selected === selected &&
          services.auth === "authorized";
      };
      try {
        const loaded = await ports.loadPlaylist(id);
        if (!stillCurrent()) return;
        if (loaded) open("playlist-tracks", undefined, id);
        else setNotice(getServices().error || "歌单未能载入，请重试");
      } catch (error: unknown) {
        if (stillCurrent()) setNotice(error instanceof Error ? error.message : "歌单未能载入，请重试");
      }
    },
  };
}
