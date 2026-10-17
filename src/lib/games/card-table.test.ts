import { describe, it, expect } from 'vitest';
import {
  createDeck,
  shuffleDeck,
  createInitialSolitaireState,
  drawFromStock,
  canMoveToTableau,
  canMoveToFoundation,
  getRankLabel,
  getSuitSymbol,
  type Card,
} from './card-table';

describe('Solitaire Card Table 3D Engine', () => {
  it('creates a standard 52-card deck', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    expect(deck.filter(c => c.suit === 'spades')).toHaveLength(13);
    expect(deck.filter(c => c.color === 'red')).toHaveLength(26);
    expect(deck.filter(c => c.color === 'black')).toHaveLength(26);
  });

  it('shuffles deck deterministically with random mock', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck, () => 0.5);
    expect(shuffled).toHaveLength(52);
    expect(shuffled.map(c => c.id)).not.toEqual(deck.map(c => c.id));
  });

  it('initializes tableau columns and stock correctly', () => {
    const state = createInitialSolitaireState();
    // 7 tableau cols with 1, 2, 3, 4, 5, 6, 7 cards = 28 cards total
    expect(state.tableau[0]).toHaveLength(1);
    expect(state.tableau[6]).toHaveLength(7);
    // Top card of each col is face up, rest face down
    for (let i = 0; i < 7; i++) {
      expect(state.tableau[i][i].faceUp).toBe(true);
      if (i > 0) {
        expect(state.tableau[i][0].faceUp).toBe(false);
      }
    }
    // Remaining 24 cards in stock
    expect(state.stock).toHaveLength(24);
    expect(state.waste).toHaveLength(0);
    expect(state.foundations.every(f => f.length === 0)).toBe(true);
  });

  it('draws card from stock into waste', () => {
    const state = createInitialSolitaireState();
    const afterDraw = drawFromStock(state);
    expect(afterDraw.stock).toHaveLength(23);
    expect(afterDraw.waste).toHaveLength(1);
    expect(afterDraw.waste[0].faceUp).toBe(true);
    expect(afterDraw.moves).toBe(1);
  });

  it('validates tableau moves correctly (color alternation and rank decrement)', () => {
    const blackKing: Card = { id: 's-13', suit: 'spades', rank: 13, color: 'black', faceUp: true };
    const redQueen: Card = { id: 'h-12', suit: 'hearts', rank: 12, color: 'red', faceUp: true };
    const blackQueen: Card = { id: 'c-12', suit: 'clubs', rank: 12, color: 'black', faceUp: true };

    // Empty col only allows King
    expect(canMoveToTableau(blackKing, [])).toBe(true);
    expect(canMoveToTableau(redQueen, [])).toBe(false);

    // Onto black king, red queen allowed, black queen forbidden
    expect(canMoveToTableau(redQueen, [blackKing])).toBe(true);
    expect(canMoveToTableau(blackQueen, [blackKing])).toBe(false);
  });

  it('validates foundation moves correctly (suit match and rank increment)', () => {
    const spadeAce: Card = { id: 's-1', suit: 'spades', rank: 1, color: 'black', faceUp: true };
    const spadeTwo: Card = { id: 's-2', suit: 'spades', rank: 2, color: 'black', faceUp: true };
    const heartTwo: Card = { id: 'h-2', suit: 'hearts', rank: 2, color: 'red', faceUp: true };

    // Empty foundation only allows Ace
    expect(canMoveToFoundation(spadeAce, [])).toBe(true);
    expect(canMoveToFoundation(spadeTwo, [])).toBe(false);

    // Onto spade ace, spade two allowed, heart two forbidden
    expect(canMoveToFoundation(spadeTwo, [spadeAce])).toBe(true);
    expect(canMoveToFoundation(heartTwo, [spadeAce])).toBe(false);
  });

  it('formats labels and symbols', () => {
    expect(getRankLabel(1)).toBe('A');
    expect(getRankLabel(11)).toBe('J');
    expect(getRankLabel(12)).toBe('Q');
    expect(getRankLabel(13)).toBe('K');
    expect(getRankLabel(7)).toBe('7');

    expect(getSuitSymbol('spades')).toBe('♠');
    expect(getSuitSymbol('hearts')).toBe('♥');
    expect(getSuitSymbol('diamonds')).toBe('♦');
    expect(getSuitSymbol('clubs')).toBe('♣');
  });
});
