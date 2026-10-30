/** Appearance only: no player, platform capabilities, LCD geometry or menu policy. */
export type Appearance = {
  finish: "silver" | "black";
  background: "transparent" | "warm" | "dark";
};
export function parseAppearance(value: unknown): Appearance {
  const saved = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    finish: saved.finish === "black" ? "black" : "silver",
    background: saved.background === "dark" || saved.background === "warm" ? saved.background : "transparent",
  };
}
export const backgroundColors: Record<Appearance["background"], string> = {
  transparent: "transparent", warm: "#e8e3dc", dark: "#202124",
};
