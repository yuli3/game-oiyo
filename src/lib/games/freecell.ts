export type FreeCellSuit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

export type FreeCellCard = {
  suit: FreeCellSuit;
  value: string;
  power: number;
  isRed: boolean;
  id: string;
};

export type FreeCellState = {
  tableau: FreeCellCard[][];
  freeCells: (FreeCellCard | null)[];
  foundation: FreeCellCard[][];
};

export type FreeCellSource =
  | { type: 'tableau'; index: number; cardIndex: number }
  | { type: 'free'; index: number }
  | { type: 'foundation'; index: number };

export type FreeCellDestination =
  | { type: 'tableau'; index: number }
  | { type: 'free'; index: number }
  | { type: 'foundation'; index: number };

export type FreeCellMoveResult =
  | { ok: true; state: FreeCellState }
  | { ok: false; reason: 'empty-source' | 'invalid-run' | 'occupied-cell' | 'wrong-foundation' | 'blocked-tableau' | 'supermove-limit' | 'same-pile' };

export const FREECELL_SUITS: readonly FreeCellSuit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function createFreeCellGame(random: () => number = Math.random): FreeCellState {
  const deck: FreeCellCard[] = FREECELL_SUITS.flatMap((suit) =>
    VALUES.map((value, index) => ({
      suit,
      value,
      power: index + 1,
      isRed: suit === 'hearts' || suit === 'diamonds',
      id: `${suit}-${value}`,
    })),
  );

  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }

  const tableau = Array.from({ length: 8 }, () => [] as FreeCellCard[]);
  deck.forEach((card, index) => tableau[index % 8].push(card));
  return {
    tableau,
    freeCells: Array.from({ length: 4 }, () => null),
    foundation: Array.from({ length: 4 }, () => [] as FreeCellCard[]),
  };
}

export function createSeededFreeCellGame(seed:number):FreeCellState{
  let value=seed>>>0;
  const random=()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/0x1_0000_0000;};
  return createFreeCellGame(random);
}

export function isDescendingAlternatingRun(cards: readonly FreeCellCard[]): boolean {
  return cards.every((card, index) => {
    if (index === cards.length - 1) return true;
    const next = cards[index + 1];
    return card.power === next.power + 1 && card.isRed !== next.isRed;
  });
}

export function maxSupermoveCards(state: FreeCellState, destinationTableauIndex: number): number {
  const emptyFreeCells = state.freeCells.filter((card) => card === null).length;
  const usableEmptyColumns = state.tableau.filter((pile, index) => pile.length === 0 && index !== destinationTableauIndex).length;
  return (emptyFreeCells + 1) * (2 ** usableEmptyColumns);
}

export function getSourceCards(state: FreeCellState, source: FreeCellSource): FreeCellCard[] {
  if (source.type === 'tableau') return state.tableau[source.index]?.slice(source.cardIndex) ?? [];
  if (source.type === 'free') {
    const card = state.freeCells[source.index];
    return card ? [card] : [];
  }
  const pile = state.foundation[source.index];
  return pile?.length ? [pile[pile.length - 1]] : [];
}

function removeSource(state: FreeCellState, source: FreeCellSource): FreeCellState {
  const next: FreeCellState = {
    tableau: state.tableau.map((pile) => [...pile]),
    freeCells: [...state.freeCells],
    foundation: state.foundation.map((pile) => [...pile]),
  };
  if (source.type === 'tableau') next.tableau[source.index] = next.tableau[source.index].slice(0, source.cardIndex);
  else if (source.type === 'free') next.freeCells[source.index] = null;
  else next.foundation[source.index].pop();
  return next;
}

export function moveFreeCellCards(state: FreeCellState, source: FreeCellSource, destination: FreeCellDestination): FreeCellMoveResult {
  if (source.type === destination.type && source.index === destination.index) return { ok: false, reason: 'same-pile' };
  const cards = getSourceCards(state, source);
  if (cards.length === 0) return { ok: false, reason: 'empty-source' };
  if (source.type === 'tableau' && !isDescendingAlternatingRun(cards)) return { ok: false, reason: 'invalid-run' };

  if (destination.type === 'free') {
    if (cards.length !== 1) return { ok: false, reason: 'supermove-limit' };
    if (state.freeCells[destination.index] !== null) return { ok: false, reason: 'occupied-cell' };
    const next = removeSource(state, source);
    next.freeCells[destination.index] = cards[0];
    return { ok: true, state: next };
  }

  if (destination.type === 'foundation') {
    if (cards.length !== 1) return { ok: false, reason: 'wrong-foundation' };
    const card = cards[0];
    const suitIndex = FREECELL_SUITS.indexOf(card.suit);
    const target = state.foundation[destination.index];
    if (destination.index !== suitIndex || !target || card.power !== target.length + 1) {
      return { ok: false, reason: 'wrong-foundation' };
    }
    const next = removeSource(state, source);
    next.foundation[destination.index].push(card);
    return { ok: true, state: next };
  }

  const target = state.tableau[destination.index];
  if (!target) return { ok: false, reason: 'blocked-tableau' };
  const targetTop = target[target.length - 1];
  const first = cards[0];
  if (targetTop && (targetTop.power !== first.power + 1 || targetTop.isRed === first.isRed)) {
    return { ok: false, reason: 'blocked-tableau' };
  }
  if (cards.length > maxSupermoveCards(state, destination.index)) return { ok: false, reason: 'supermove-limit' };
  const next = removeSource(state, source);
  next.tableau[destination.index].push(...cards);
  return { ok: true, state: next };
}

export function isFreeCellWon(state: FreeCellState): boolean {
  return state.foundation.every((pile) => pile.length === 13);
}
