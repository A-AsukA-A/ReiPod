import type { ClassicGlyphName } from "./ClassicGlyph";
export type MenuPreviewSpec = {
  kind: "covers" | "playing" | "card";
  icon: ClassicGlyphName;
  title: string;
  detail?: string;
  source?: "podcasts" | "photos";
};

/** Highlighting changes only the preview; selecting is a separate operation. */
export function menuPreview(
  page: string,
  key: string,
  label: string,
  detail?: string,
): MenuPreviewSpec {
  const choiceIcons: Record<string, ClassicGlyphName> = {
    finish: "finish",
    background: "background",
    "click-sound": "speaker",
    "lyrics-display": "info",
    "shuffle-mode": "shuffle",
    "repeat-mode": "repeat",
    eq: "eq",
    "sound-check": "speaker",
  };
  if (choiceIcons[page])
    return {
      kind: "card",
      icon: choiceIcons[page],
      title: label,
      detail: detail === "✓" ? undefined : detail,
    };
  if (page === "home" && key === "photos")
    return { kind: "covers", icon: "albums", title: label, detail, source: "photos" };
  if (page === "home" && key === "podcasts")
    return { kind: "covers", icon: "music", title: label, detail, source: "podcasts" };
  if (
    ["coverflow", "music", "albums", "songs", "all", "demo", "compilations"].includes(key) &&
    page !== "settings"
  )
    return { kind: "covers", icon: "music", title: label, detail };
  if (key === "playing")
    return { kind: "playing", icon: "playing", title: "正在播放", detail };
  const icons: Record<string, ClassicGlyphName> = {
    "shuffle-all": "shuffle",
    shuffle: "shuffle",
    repeat: "repeat",
    settings: "settings",
    "reipod-settings": "settings",
    "reset-settings": "settings",
    haptics: "settings",
    eq: "eq",
    "sound-check": "speaker",
    "date-time": "clock",
    "alarm-settings": "clock",
    import: "import",
    playlists: "playlists",
    organizer: "playlists",
    artists: "artists",
    search: "search",
    click: "speaker",
    "lyrics-display": "info",
    finish: "finish",
    background: "background",
    clear: "clear",
    about: "info",
    credits: "info",
    licenses: "info",
    "metadata-license": "info",
    "font-license": "info",
    extras: "clock",
    "main-menu": "playlists",
    "music-menu": "music",
    "music-services": "music",
    backlight: "background",
    brightness: "background",
    "volume-limit": "speaker",
    photos: "albums",
    "all-photos": "albums",
    "photo-settings": "albums",
    "photo-import": "import",
    podcasts: "music",
    "podcast-settings": "music",
    "podcast-import": "import",
  };
  return { kind: "card", icon: icons[key] ?? "music", title: label, detail };
}
