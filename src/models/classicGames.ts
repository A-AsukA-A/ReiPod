/** The 2007 classic's bundled titles; assets and engines are independent recreations. */
export const classicGames = [
  { id: "iquiz", name: "iQuiz" },
  { id: "klondike", name: "Klondike" },
  { id: "vortex", name: "Vortex" },
] as const;
export type ClassicGameId = typeof classicGames[number]["id"];
export const isClassicGame = (id: string | undefined): id is ClassicGameId =>
  classicGames.some(game => game.id === id);
export const classicGamesSource = "https://www.apple.com/newsroom/2007/09/05Apple-Introduces-New-iPod-classic/";

/** Deterministic shuffling keeps resumed deals/questions stable. Not an Apple RNG. */
export function gameRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}
export function gameShuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
