export type MusicKitInstance = {
  musicUserToken: string;
  isAuthorized: boolean;
  storefrontId: string;
  currentPlaybackTime: number;
  currentPlaybackDuration: number;
  playbackState: number;
  volume: number;
  authorize(): Promise<string>;
  unauthorize(): Promise<void>;
  setQueue(options: {
    items: { id: string; kind: "song" }[];
  }): Promise<unknown>;
  play(): Promise<void>;
  pause(): Promise<void>;
  seekToTime(time: number): Promise<void>;
  addEventListener(name: string, listener: () => void): void;
  removeEventListener(name: string, listener: () => void): void;
};
export type MusicKitGlobal = {
  configure(options: {
    developerToken: string;
    app: { name: string; build: string };
  }): Promise<MusicKitInstance>;
  getInstance(): MusicKitInstance;
  PlaybackStates: Record<string, number>;
};
declare global {
  interface Window {
    MusicKit?: MusicKitGlobal;
  }
}

let loading: Promise<MusicKitGlobal> | undefined;
export function loadMusicKit() {
  if (window.MusicKit) return Promise.resolve(window.MusicKit);
  return (loading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://js-cdn.music.apple.com/musickit/v3/musickit.js";
    script.async = true;
    const finish = () => {
      if (!window.MusicKit) return;
      cleanup();
      resolve(window.MusicKit);
    };
    const fail = () => {
      cleanup();
      script.remove();
      loading = undefined;
      reject(new Error("Apple Music 组件未能载入，请检查网络后重试"));
    };
    const timer = setTimeout(fail, 20000);
    const cleanup = () => {
      clearTimeout(timer);
      document.removeEventListener("musickitloaded", finish);
      script.onload = script.onerror = null;
    };
    document.addEventListener("musickitloaded", finish);
    script.onload = finish;
    script.onerror = fail;
    document.head.append(script);
  }));
}

export function validDeveloperToken(token: string) {
  try {
    if (token.split(".").length !== 3) return false;
    const [head, body, signature] = token.split(".");
    const decode = (part: string) =>
      JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
    const header = decode(head),
      claims = decode(body);
    // This is an expiry/shape check; Apple verifies the signature on requests.
    return (
      !!signature &&
      header.alg === "ES256" &&
      typeof claims.exp === "number" &&
      claims.exp > Date.now() / 1000 + 30
    );
  } catch {
    return false;
  }
}
