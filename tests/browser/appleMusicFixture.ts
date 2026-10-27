import type { Page } from "@playwright/test";
export async function appleMusicFixture(
  page: Page,
  options: {
    expiredUser?: boolean;
    cancel?: boolean;
    queueDelay?: number;
  } = {},
) {
  const token = `${Buffer.from(JSON.stringify({ alg: "ES256" })).toString("base64url")}.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.contract-fixture`;
  await page.route("**/music-services.json", (route) =>
    route.fulfill({ json: { appleMusic: { developerToken: token } } }),
  );
  await page.addInitScript(({ expiredUser, cancel, queueDelay }) => {
    const target = window as unknown as {
      MusicKit: unknown;
      __appleTest: unknown;
    };
    const events = new EventTarget();
    const log = {
      logins: 0,
      plays: [] as string[],
      pauses: 0,
      queue: [] as { id: string; kind: "song" }[],
    };
    if (expiredUser) localStorage.setItem("reipod-apple-user", "expired-user");
    localStorage.setItem(
      "reipod-playlists",
      JSON.stringify([
        { id: "local-only", name: "Local Only List", trackIds: [] },
      ]),
    );
    const instance = {
      musicUserToken: "",
      currentPlaybackTime: 0,
      currentPlaybackDuration: 180,
      playbackState: 0,
      volume: 0.8,
      get isAuthorized() {
        return !!this.musicUserToken;
      },
      async authorize() {
        log.logins++;
        if (cancel) throw new Error("Canceled");
        this.musicUserToken = "test-user";
        return this.musicUserToken;
      },
      async unauthorize() {
        this.musicUserToken = "";
        events.dispatchEvent(new Event("authorizationStatusDidChange"));
      },
      async setQueue(options: { items: { id: string; kind: "song" }[] }) {
        if (queueDelay)
          await new Promise((resolve) => setTimeout(resolve, queueDelay));
        log.queue = options.items;
        this.currentPlaybackTime = 0;
        this.playbackState = 3;
      },
      async play() {
        log.plays.push(log.queue[0]?.id);
        this.playbackState = 2;
        events.dispatchEvent(new Event("playbackStateDidChange"));
      },
      async pause() {
        log.pauses++;
        this.playbackState = 3;
        events.dispatchEvent(new Event("playbackStateDidChange"));
      },
      async seekToTime(time: number) {
        this.currentPlaybackTime = time;
        events.dispatchEvent(new Event("playbackTimeDidChange"));
      },
      addEventListener: events.addEventListener.bind(events),
      removeEventListener: events.removeEventListener.bind(events),
    };
    target.MusicKit = {
      configure: async () => instance,
      getInstance: () => instance,
      PlaybackStates: {
        loading: 1,
        playing: 2,
        paused: 3,
        stopped: 4,
        ended: 5,
        waiting: 8,
        stalled: 9,
        completed: 10,
      },
    };
    target.__appleTest = log;
  }, options);
  const song = (id: string, name: string) => ({
    id,
    type: "library-songs",
    attributes: {
      name,
      artistName: "Cloud Artist",
      albumName: "Cloud Album",
      durationInMillis: 180000,
    },
  });
  await page.route("https://api.music.apple.com/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (request.headers()["music-user-token"] === "expired-user") {
      await route.fulfill({ status: 401, json: {} });
      return;
    }
    if (url.pathname === "/v1/me/storefront")
      await route.fulfill({ json: { data: [{ id: "us" }] } });
    else if (url.pathname === "/v1/me/library/songs")
      await route.fulfill({
        json: url.searchParams.has("offset")
          ? { data: [song("i.second", "Cloud Second")] }
          : {
              data: [song("i.first", "Cloud First")],
              next: "/v1/me/library/songs?offset=1",
            },
      });
    else if (url.pathname === "/v1/me/library/playlists")
      await route.fulfill({
        json: url.searchParams.has("offset")
          ? {
              data: [
                {
                  id: "p.two",
                  type: "library-playlists",
                  attributes: { name: "Apple Second List" },
                },
              ],
            }
          : {
              data: [
                {
                  id: "p.one",
                  type: "library-playlists",
                  attributes: { name: "Apple First List" },
                },
              ],
              next: "/v1/me/library/playlists?offset=1",
            },
      });
    else if (url.pathname.endsWith("/tracks"))
      await route.fulfill({
        json: url.searchParams.has("offset")
          ? { data: [song("i.second", "Cloud Second")] }
          : {
              data: [song("i.first", "Cloud First")],
              next: `${url.pathname}?offset=1`,
            },
      });
    else if (url.pathname.endsWith("/search"))
      await route.fulfill({
        json: {
          results: {
            songs: {
              data: [{ ...song("catalog1", "Catalog Result"), type: "songs" }],
            },
          },
        },
      });
    else await route.fulfill({ status: 404, json: {} });
  });
}
