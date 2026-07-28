import { describe, expect, it } from 'vitest';
import {
    movePuzzleTile,
    moveSnake,
    resolveWhack,
} from './react-state-transitions';

describe('React game state transitions', () => {
    it('returns one Puzzle 15 move without scheduling nested state updates', () => {
        const board = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 0, 15];

        expect(movePuzzleTile(board, 15, 4)).toEqual({
            board: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0],
            moved: true,
            solved: true,
        });
    });

    it('describes one Snake food event without mutating score or food itself', () => {
        expect(moveSnake(
            [{ x: 2, y: 2 }],
            { x: 1, y: 0 },
            { x: 3, y: 2 },
            20,
        )).toEqual({
            snake: [{ x: 3, y: 2 }, { x: 2, y: 2 }],
            outcome: 'ate',
        });
    });

    it('resolves one whack from the clicked cell value', () => {
        expect(resolveWhack(['mole', null, 'bomb'], 0, 4)).toEqual({
            cells: [null, null, 'bomb'],
            score: 5,
            hit: true,
        });
        expect(resolveWhack(['mole', null, 'bomb'], 2, 1)).toEqual({
            cells: ['mole', null, null],
            score: 0,
            hit: true,
        });
    });
});
