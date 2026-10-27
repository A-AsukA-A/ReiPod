import type { ClassicGlyphName } from "./ClassicGlyph";
export type MenuPreviewSpec = {
  kind: "covers" | "playing" | "card";
  icon: ClassicGlyphName;
  title: string;
  detail?: string;
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
    "shuffle-mode": "shuffle",
    "repeat-mode": "repeat",
  };
  if (choiceIcons[page])
    return {
      kind: "card",
      icon: choiceIcons[page],
      title: label,
      detail: detail === "✓" ? undefined : detail,
    };
  if (
    ["coverflow", "music", "albums", "songs", "all", "demo"].includes(key) &&
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
    import: "import",
    playlists: "playlists",
    artists: "artists",
    search: "search",
    click: "speaker",
    finish: "finish",
    background: "background",
    clear: "clear",
    about: "info",
    credits: "info",
    licenses: "info",
    extras: "clock",
    "main-menu": "playlists",
    backlight: "background",
    brightness: "background",
    "volume-limit": "speaker",
    photos: "albums",
    "all-photos": "albums",
    "photo-import": "import",
    podcasts: "music",
    "podcast-import": "import",
  };
  return { kind: "card", icon: icons[key] ?? "music", title: label, detail };
}
