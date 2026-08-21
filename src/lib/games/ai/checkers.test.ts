import { describe, expect, it } from 'vitest';
import {
  checkersApplyTurn,
  checkersBestMove,
  checkersMoves,
  checkersTurns,
  checkersTurnReview,
  type CheckersBoard,
} from './checkers';

function board(entries: Array<[number, number, boolean?]>): CheckersBoard {
  const value: CheckersBoard = Array(64).fill(null);
  for (const [index, player, isKing = false] of entries) value[index] = { player, isKing };
  return value;
}

describe('American checkers rules', () => {
  it('summarizes the final square and capture chain for review', () => {
    expect(checkersTurnReview({ from: 42, path: [24, 10], captures: [33, 17] })).toEqual({ from: 42, to: 10, captures: 2, chain: true });
    expect(checkersTurnReview({ from: 42, path: [33], captures: [] })).toEqual({ from: 42, to: 33, captures: 0, chain: false });
  });

  it('requires a capture anywhere on the board', () => {
    const position = board([[42, 1], [33, 2], [46, 1]]);
    expect(checkersMoves(position, 1)).toEqual([{ from: 42, to: 24, jumpOver: 33 }]);
  });

  it('does not let an uncrowned man move or capture backward', () => {
    const position = board([[26, 1], [35, 2]]);
    expect(checkersMoves(position, 1)).toEqual([
      { from: 26, to: 17 },
      { from: 26, to: 19 },
    ]);
  });

  it('expands a mandatory multiple jump into one complete turn', () => {
    const position = board([[58, 1], [49, 2], [33, 2]]);
    expect(checkersTurns(position, 1)).toEqual([
      { from: 58, path: [40, 26], captures: [49, 33] },
    ]);
    const result = checkersApplyTurn(position, checkersTurns(position, 1)[0]);
    expect(result[26]).toEqual({ player: 1, isKing: false });
    expect(result[49]).toBeNull();
    expect(result[33]).toBeNull();
  });

  it('ends a jump turn immediately when a man is crowned', () => {
    const position = board([[20, 1], [11, 2], [9, 2]]);
    expect(checkersTurns(position, 1)).toEqual([
      { from: 20, path: [2], captures: [11] },
    ]);
    expect(checkersApplyTurn(position, checkersTurns(position, 1)[0])[2]).toEqual({ player: 1, isKing: true });
  });

  it('treats having no legal move as a loss for the AI', () => {
    const blocked = board([[0, 1]]);
    expect(checkersMoves(blocked, 1)).toEqual([]);
    expect(checkersBestMove(blocked, 1, 3)).toBeNull();
  });

  it('makes the master AI complete the forced capture chain deterministically', () => {
    const position = board([[5, 2], [14, 1], [30, 1]]);
    expect(checkersBestMove(position, 2, 3)).toEqual({
      from: 5,
      path: [23, 37],
      captures: [14, 30],
    });
  });
});
