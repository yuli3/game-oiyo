import { describe, expect, it } from "vitest";
import {
  MINESWEEPER_BEGINNER,
  canSolveMinesweeperWithoutGuessing,
  chordMinesweeperCell,
  createEmptyBoard,
  createMinesweeperBoard,
  createNoGuessMinesweeperBoard,
  revealMinesweeperCell,
  toggleMinesweeperFlag,
} from "./minesweeper";

const seeded = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

describe("minesweeper engine", () => {
  it("places the exact mine count deterministically and protects the first-click neighborhood", () => {
    const first = createMinesweeperBoard(10, 10, 10, 5, 5, seeded(7));
    const second = createMinesweeperBoard(10, 10, 10, 5, 5, seeded(7));
    expect(first).toEqual(second);
    expect(first.flat().filter((cell) => cell.isMine)).toHaveLength(10);
    for (let y = 4; y <= 6; y++) for (let x = 4; x <= 6; x++) expect(first[y][x].isMine).toBe(false);
  });

  it("computes every clue from its adjacent mines", () => {
    const board = createMinesweeperBoard(10, 10, 18, 0, 0, seeded(99));
    for (const cell of board.flat()) {
      if (cell.isMine) continue;
      let expected = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if ((dx || dy) && board[cell.y + dy]?.[cell.x + dx]?.isMine) expected++;
      }
      expect(cell.neighborMines).toBe(expected);
    }
  });

  it("flood-reveals zero regions without opening mines or flags", () => {
    const board = createMinesweeperBoard(8, 8, 5, 0, 0, seeded(3));
    const flagged = toggleMinesweeperFlag(board, 7, 7, 5);
    const result = revealMinesweeperCell(flagged, 0, 0);
    expect(result.changed).toBe(true);
    expect(result.board.flat().some((cell) => cell.isRevealed)).toBe(true);
    expect(result.board.flat().filter((cell) => cell.isMine).every((cell) => !cell.isRevealed)).toBe(true);
    expect(result.board[7][7].isFlagged).toBe(true);
    expect(result.board[7][7].isRevealed).toBe(false);
  });

  it("reveals all mines on a loss", () => {
    const board = createMinesweeperBoard(6, 6, 5, 0, 0, seeded(10));
    const mine = board.flat().find((cell) => cell.isMine)!;
    const result = revealMinesweeperCell(board, mine.x, mine.y);
    expect(result.status).toBe("lost");
    expect(result.board.flat().filter((cell) => cell.isMine).every((cell) => cell.isRevealed)).toBe(true);
  });

  it("caps flags at the mine count while still allowing unflag", () => {
    let board = createEmptyBoard(3, 3);
    board = toggleMinesweeperFlag(board, 0, 0, 2);
    board = toggleMinesweeperFlag(board, 1, 0, 2);
    const capped = toggleMinesweeperFlag(board, 2, 0, 2);
    expect(capped).toBe(board);
    expect(toggleMinesweeperFlag(board, 0, 0, 2)[0][0].isFlagged).toBe(false);
  });

  it("chords a numbered cell only when adjacent flag count matches", () => {
    const board = createMinesweeperBoard(6, 6, 5, 0, 0, seeded(15));
    const numbered = board.flat().find((cell) => !cell.isMine && cell.neighborMines > 0)!;
    const opened = revealMinesweeperCell(board, numbered.x, numbered.y).board;
    expect(chordMinesweeperCell(opened, numbered.x, numbered.y).changed).toBe(false);
    let flagged = opened;
    const adjacentMines = board.flat().filter((cell) => cell.isMine && Math.abs(cell.x - numbered.x) <= 1 && Math.abs(cell.y - numbered.y) <= 1);
    for (const mine of adjacentMines) flagged = toggleMinesweeperFlag(flagged, mine.x, mine.y, 5);
    const chorded = chordMinesweeperCell(flagged, numbered.x, numbered.y);
    expect(chorded.changed).toBe(true);
    expect(chorded.status).not.toBe("lost");
  });

  it("reproduces the same verified no-guess board from the same seed and opening", () => {
    const first = createNoGuessMinesweeperBoard(MINESWEEPER_BEGINNER, 4, 6, 20260716);
    const second = createNoGuessMinesweeperBoard(MINESWEEPER_BEGINNER, 4, 6, 20260716);
    expect(first).toEqual(second);
    expect(first.verifiedNoGuess).toBe(true);
    expect(canSolveMinesweeperWithoutGuessing(first.board, 4, 6)).toBe(true);
  });

  it("generates verified beginner boards across many seeds and opening positions", () => {
    for (let seed = 0; seed < 120; seed++) {
      const x = (seed * 7) % MINESWEEPER_BEGINNER.width;
      const y = (seed * 3) % MINESWEEPER_BEGINNER.height;
      const generated = createNoGuessMinesweeperBoard(MINESWEEPER_BEGINNER, x, y, seed);
      expect(generated.verifiedNoGuess, `seed ${seed} at ${x},${y}`).toBe(true);
      expect(generated.board.flat().filter((cell) => cell.isMine)).toHaveLength(MINESWEEPER_BEGINNER.mineCount);
      expect(generated.attempts).toBeLessThanOrEqual(MINESWEEPER_BEGINNER.maxGenerationAttempts);
    }
  });

  it("honors the bounded generation ceiling and returns promptly", () => {
    const difficulty = { ...MINESWEEPER_BEGINNER, maxGenerationAttempts: 3 };
    const started = performance.now();
    const generated = createNoGuessMinesweeperBoard(difficulty, 5, 5, 31);
    expect(generated.attempts).toBeLessThanOrEqual(3);
    expect(performance.now() - started).toBeLessThan(100);
  });
});
