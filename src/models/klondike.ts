import { gameRandom, gameShuffle } from "./classicGames";

export type Card = { id: number; up: boolean };
export type CardSource = { pile: number; index: number };
export type KlondikeState = { stock: Card[]; waste: Card[]; foundations: Card[][];
  columns: Card[][]; draws: 1 | 3; bank: number; moves: number };
export const cardRank = (id: number) => id % 13 + 1;
export const cardSuit = (id: number) => Math.floor(id / 13);
export const cardRed = (id: number) => cardSuit(id) === 1 || cardSuit(id) === 2;
export const cardName = (id: number) => `${["黑桃", "红桃", "方块", "梅花"][cardSuit(id)]}${["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"][cardRank(id)]}`;

// Piles: stock 0, waste 1, foundations 2…5, tableau columns 6…12.
export function klondikePile(state: KlondikeState, pile: number): Card[] {
  return pile === 0 ? state.stock : pile === 1 ? state.waste
    : pile < 6 ? state.foundations[pile - 2] ?? [] : state.columns[pile - 6] ?? [];
}
export function dealKlondike(seed: number, draws: 1 | 3 = 1, bank = 100): KlondikeState {
  const deck = gameShuffle(Array.from({ length: 52 }, (_, id) => ({ id, up: false })), gameRandom(seed));
  const columns = Array.from({ length: 7 }, (_, column) => deck.splice(0, column + 1)
    .map((card, index) => ({ ...card, up: index === column })));
  return { stock: deck, waste: [], foundations: [[], [], [], []], columns, draws, bank: bank - 52, moves: 0 };
}
export function drawKlondike(state: KlondikeState): KlondikeState {
  if (!state.stock.length && !state.waste.length) return state;
  const next = structuredClone(state);
  if (!next.stock.length) {
    next.stock = next.waste.reverse().map(card => ({ ...card, up: false }));
    next.waste = [];
  } else for (let i = 0; i < state.draws && next.stock.length; i++) {
    const card = next.stock.pop()!;
    next.waste.push({ ...card, up: true });
  }
  next.moves++;
  return next;
}
export function canMoveKlondike(state: KlondikeState, source: CardSource, destination: number) {
  if (![source.pile, source.index, destination].every(Number.isInteger)) return false;
  if (source.pile === 0 || destination < 2 || destination > 12 || source.pile === destination) return false;
  const pile = klondikePile(state, source.pile), cards = pile.slice(source.index);
  if (!cards.length || source.index < 0 || cards.some(card => !card.up)) return false;
  if (source.pile < 6 && source.index !== pile.length - 1) return false;
  if (!cards.every((card, index) => !index ||
    (cardRank(cards[index - 1].id) === cardRank(card.id) + 1 && cardRed(cards[index - 1].id) !== cardRed(card.id)))) return false;
  const target = klondikePile(state, destination), last = target.at(-1);
  if (destination < 6) return cards.length === 1 && (last
    ? cardSuit(last.id) === cardSuit(cards[0].id) && cardRank(cards[0].id) === cardRank(last.id) + 1
    : cardRank(cards[0].id) === 1);
  return last ? last.up && cardRed(last.id) !== cardRed(cards[0].id) && cardRank(last.id) === cardRank(cards[0].id) + 1
    : cardRank(cards[0].id) === 13;
}
export function moveKlondike(state: KlondikeState, source: CardSource, destination: number) {
  if (!canMoveKlondike(state, source, destination)) return state;
  const next = structuredClone(state), from = klondikePile(next, source.pile);
  klondikePile(next, destination).push(...from.splice(source.index));
  if (from.length) from[from.length - 1].up = true;
  next.bank += (destination < 6 ? 5 : 0) - (source.pile >= 2 && source.pile < 6 ? 5 : 0);
  next.moves++;
  return next;
}
export const wonKlondike = (state: KlondikeState) => state.foundations.every(pile => pile.length === 13);

/** Validate the complete deck and legal visible runs before accepting persisted data. */
export function validKlondike(value: unknown): value is KlondikeState {
  if (!value || typeof value !== "object") return false;
  const state = value as KlondikeState;
  if (![1, 3].includes(state.draws) || !Number.isFinite(state.bank) || !Number.isSafeInteger(state.moves) || state.moves < 0 ||
    !Array.isArray(state.stock) || !Array.isArray(state.waste) || !Array.isArray(state.foundations) || state.foundations.length !== 4 ||
    !Array.isArray(state.columns) || state.columns.length !== 7 || ![...state.foundations, ...state.columns].every(Array.isArray)) return false;
  const all = [...state.stock, ...state.waste, ...state.foundations.flat(), ...state.columns.flat()];
  if (all.length !== 52 || all.some(card => !card || !Number.isInteger(card.id) || card.id < 0 || card.id > 51 || typeof card.up !== "boolean") ||
    new Set(all.map(card => card.id)).size !== 52 || state.stock.some(card => card.up) || state.waste.some(card => !card.up)) return false;
  return state.foundations.every(pile => pile.every((card, index) => card.up && cardRank(card.id) === index + 1 && cardSuit(card.id) === cardSuit(pile[0].id))) &&
    state.columns.every(pile => !pile.length || (pile.at(-1)!.up && pile.every((card, index) => !index ||
      (!pile[index - 1].up || (card.up && cardRank(pile[index - 1].id) === cardRank(card.id) + 1 && cardRed(pile[index - 1].id) !== cardRed(card.id))))));
}
