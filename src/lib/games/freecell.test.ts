import { describe, expect, it } from 'vitest';
import {
  FREECELL_SUITS,
  createFreeCellGame,
  createSeededFreeCellGame,
  isDescendingAlternatingRun,
  isFreeCellWon,
  maxSupermoveCards,
  moveFreeCellCards,
  type FreeCellCard,
  type FreeCellState,
} from './freecell';

const card = (suit: FreeCellCard['suit'], power: number): FreeCellCard => ({
  suit,
  power,
  value: power === 1 ? 'A' : power === 11 ? 'J' : power === 12 ? 'Q' : power === 13 ? 'K' : String(power),
  isRed: suit === 'hearts' || suit === 'diamonds',
  id: `${suit}-${power}`,
});

const state = (overrides: Partial<FreeCellState> = {}): FreeCellState => ({
  tableau: Array.from({ length: 8 }, () => []),
  freeCells: [null, null, null, null],
  foundation: Array.from({ length: 4 }, () => []),
  ...overrides,
});

describe('FreeCell engine', () => {
  it('replays the same deal from the same seed', () => {
    expect(createSeededFreeCellGame(42)).toEqual(createSeededFreeCellGame(42));
    expect(createSeededFreeCellGame(42)).not.toEqual(createSeededFreeCellGame(43));
  });

  it('deals 52 unique cards into 7/7/7/7/6/6/6/6 columns', () => {
    const game = createFreeCellGame(() => 0.42);
    expect(game.tableau.map((pile) => pile.length)).toEqual([7, 7, 7, 7, 6, 6, 6, 6]);
    expect(new Set(game.tableau.flat().map(({ id }) => id)).size).toBe(52);
  });

  it('recognizes only descending alternating tableau runs', () => {
    expect(isDescendingAlternatingRun([card('clubs', 8), card('hearts', 7), card('spades', 6)])).toBe(true);
    expect(isDescendingAlternatingRun([card('clubs', 8), card('spades', 7)])).toBe(false);
    expect(isDescendingAlternatingRun([card('clubs', 8), card('hearts', 6)])).toBe(false);
  });

  it('moves a legal run onto the opposite-color next rank', () => {
    const game = state({ tableau: [[card('clubs', 9), card('hearts', 8)], [card('diamonds', 10)], [], [], [], [], [], []] });
    const result = moveFreeCellCards(game, { type: 'tableau', index: 0, cardIndex: 0 }, { type: 'tableau', index: 1 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.state.tableau[1].map(({ power }) => power)).toEqual([10, 9, 8]);
  });

  it('moves one tableau card through a free cell and back to tableau', () => {
    const stored = card('clubs', 7);
    const game = state({ tableau: [[stored], [card('hearts', 8)], [], [], [], [], [], []] });
    const parked = moveFreeCellCards(game, { type: 'tableau', index: 0, cardIndex: 0 }, { type: 'free', index: 0 });
    expect(parked.ok).toBe(true);
    if (!parked.ok) return;
    const returned = moveFreeCellCards(parked.state, { type: 'free', index: 0 }, { type: 'tableau', index: 1 });
    expect(returned.ok).toBe(true);
    if (returned.ok) expect(returned.state.freeCells[0]).toBeNull();
  });

  it('builds foundations in exact suit and ascending order, including foundation rollback', () => {
    const ace = card('hearts', 1);
    const game = state({ tableau: [[ace], [], [], [], [], [], [], []] });
    const placed = moveFreeCellCards(game, { type: 'tableau', index: 0, cardIndex: 0 }, { type: 'foundation', index: 0 });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    const rolledBack = moveFreeCellCards(placed.state, { type: 'foundation', index: 0 }, { type: 'tableau', index: 1 });
    expect(rolledBack.ok).toBe(true);
    if (rolledBack.ok) expect(rolledBack.state.foundation[0]).toHaveLength(0);
  });

  it('moves a free-cell Ace to only its matching empty foundation', () => {
    const ace = card('spades', 1);
    const game = state({ freeCells: [ace, null, null, null] });
    expect(moveFreeCellCards(game, { type: 'free', index: 0 }, { type: 'foundation', index: 0 })).toEqual({ ok: false, reason: 'wrong-foundation' });
    const result = moveFreeCellCards(game, { type: 'free', index: 0 }, { type: 'foundation', index: 3 });
    expect(result.ok).toBe(true);
  });

  it('computes and enforces supermove capacity, excluding an empty destination', () => {
    const run = [card('clubs', 9), card('hearts', 8), card('spades', 7), card('diamonds', 6), card('clubs', 5)];
    const game = state({
      tableau: [run, [], [card('clubs', 13)], [card('clubs', 12)], [card('clubs', 11)], [card('clubs', 10)], [card('clubs', 4)], [card('clubs', 3)]],
      freeCells: [card('spades', 1), card('spades', 2), null, null],
    });
    expect(maxSupermoveCards(game, 1)).toBe(3);
    expect(moveFreeCellCards(game, { type: 'tableau', index: 0, cardIndex: 0 }, { type: 'tableau', index: 1 })).toEqual({ ok: false, reason: 'supermove-limit' });
  });

  it('detects victory only with all four complete foundations', () => {
    const won = state({ foundation: FREECELL_SUITS.map((suit) => Array.from({ length: 13 }, (_, index) => card(suit, index + 1))) });
    expect(isFreeCellWon(won)).toBe(true);
    won.foundation[0].pop();
    expect(isFreeCellWon(won)).toBe(false);
  });
});
