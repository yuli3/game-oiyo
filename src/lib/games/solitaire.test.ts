import { describe, expect, it } from 'vitest';
import {
  SOLITAIRE_SUITS,
  applySolitaireMove,
  canPlaceOnFoundation,
  canPlaceOnTableau,
  createSolitaireDeck,
  dealSolitaire,
  isSolitaireWon,
  isValidTableauRun,
  listSolitaireMoves,
  type SolitaireCard,
  type SolitaireState,
  type SolitaireSuit,
} from './solitaire';

function card(suit: SolitaireSuit, power: number, isFaceUp = true): SolitaireCard {
  const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  return {
    id: `${suit}-${power}`,
    suit,
    value: values[power - 1],
    power,
    isRed: suit === 'hearts' || suit === 'diamonds',
    isFaceUp,
  };
}

function emptyState(): SolitaireState {
  return {
    stock: [], waste: [], tableau: Array.from({ length: 7 }, () => []),
    foundations: { hearts: [], diamonds: [], clubs: [], spades: [] },
  };
}

describe('Klondike solitaire engine', () => {
  it('creates 52 unique cards and deals 7 columns with only each top card exposed', () => {
    const deck = createSolitaireDeck(() => 0.42);
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((entry) => entry.id)).size).toBe(52);

    const state = dealSolitaire(() => 0.42);
    expect(state.tableau.map((pile) => pile.length)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(state.stock).toHaveLength(24);
    state.tableau.forEach((pile) => {
      expect(pile.slice(0, -1).every((entry) => !entry.isFaceUp)).toBe(true);
      expect(pile[pile.length - 1].isFaceUp).toBe(true);
    });
  });

  it('draws one card and recycles the waste in the original draw order', () => {
    const state = emptyState();
    state.stock = [card('clubs', 3, false), card('hearts', 2, false), card('spades', 1, false)];
    const one = applySolitaireMove(state, { type: 'draw' })!;
    const two = applySolitaireMove(one, { type: 'draw' })!;
    const three = applySolitaireMove(two, { type: 'draw' })!;
    expect(three.waste.map((entry) => entry.id)).toEqual(['spades-1', 'hearts-2', 'clubs-3']);
    const recycled = applySolitaireMove(three, { type: 'recycle' })!;
    expect(recycled.stock.every((entry) => !entry.isFaceUp)).toBe(true);
    expect(applySolitaireMove(recycled, { type: 'draw' })!.waste[0].id).toBe('spades-1');
  });

  it('allows only descending alternating face-up tableau runs and kings in empty columns', () => {
    const blackQueen = card('spades', 12);
    const redJack = card('hearts', 11);
    expect(isValidTableauRun([blackQueen, redJack])).toBe(true);
    expect(isValidTableauRun([blackQueen, card('clubs', 11)])).toBe(false);
    expect(isValidTableauRun([blackQueen, card('hearts', 11, false)])).toBe(false);
    expect(canPlaceOnTableau(redJack, [blackQueen])).toBe(true);
    expect(canPlaceOnTableau(card('diamonds', 13), [])).toBe(true);
    expect(canPlaceOnTableau(blackQueen, [])).toBe(false);
  });

  it('moves a complete tableau run and automatically exposes the uncovered card', () => {
    const state = emptyState();
    state.tableau[0] = [card('clubs', 4, false), card('spades', 12), card('hearts', 11)];
    state.tableau[1] = [card('diamonds', 13)];
    const next = applySolitaireMove(state, { type: 'tableau-to-tableau', from: 0, cardIndex: 1, to: 1 })!;
    expect(next.tableau[0]).toEqual([{ ...card('clubs', 4, false), isFaceUp: true }]);
    expect(next.tableau[1].map((entry) => entry.id)).toEqual(['diamonds-13', 'spades-12', 'hearts-11']);
    expect(state.tableau[0][0].isFaceUp).toBe(false);
  });

  it('builds foundations by matching suit from ace upward and supports moving a card back', () => {
    const state = emptyState();
    state.waste = [card('hearts', 1)];
    expect(canPlaceOnFoundation(state.waste[0], state.foundations.hearts)).toBe(true);
    const aceUp = applySolitaireMove(state, { type: 'waste-to-foundation' })!;
    aceUp.waste = [card('hearts', 2)];
    const twoUp = applySolitaireMove(aceUp, { type: 'waste-to-foundation' })!;
    expect(twoUp.foundations.hearts.map((entry) => entry.power)).toEqual([1, 2]);
    twoUp.tableau[0] = [card('clubs', 3)];
    const backed = applySolitaireMove(twoUp, { type: 'foundation-to-tableau', suit: 'hearts', to: 0 })!;
    expect(backed.foundations.hearts.map((entry) => entry.power)).toEqual([1]);
    expect(backed.tableau[0].at(-1)?.id).toBe('hearts-2');
  });

  it('rejects illegal moves without mutating the source state', () => {
    const state = emptyState();
    state.tableau[0] = [card('spades', 12)];
    const snapshot = structuredClone(state);
    expect(applySolitaireMove(state, { type: 'tableau-to-tableau', from: 0, cardIndex: 0, to: 1 })).toBeNull();
    expect(applySolitaireMove(state, { type: 'tableau-to-foundation', from: 0 })).toBeNull();
    expect(state).toEqual(snapshot);
  });

  it('enumerates legal draw, flip, tableau, waste, and foundation moves', () => {
    const state = emptyState();
    state.stock = [card('clubs', 8, false)];
    state.waste = [card('hearts', 1)];
    state.tableau[0] = [card('clubs', 9, false)];
    state.tableau[1] = [card('spades', 12)];
    state.tableau[2] = [card('diamonds', 13)];
    state.foundations.clubs = [card('clubs', 1), card('clubs', 2)];
    const moves = listSolitaireMoves(state);
    expect(moves).toContainEqual({ type: 'draw' });
    expect(moves).toContainEqual({ type: 'flip', column: 0 });
    expect(moves).toContainEqual({ type: 'waste-to-foundation' });
    expect(moves).toContainEqual({ type: 'tableau-to-tableau', from: 1, cardIndex: 0, to: 2 });
  });

  it('wins only when all four foundations contain ace through king', () => {
    const state = emptyState();
    expect(isSolitaireWon(state)).toBe(false);
    SOLITAIRE_SUITS.forEach((suit) => {
      state.foundations[suit] = Array.from({ length: 13 }, (_, index) => card(suit, index + 1));
    });
    expect(isSolitaireWon(state)).toBe(true);
  });
});
