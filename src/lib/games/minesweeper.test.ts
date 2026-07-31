import { describe, expect, it } from "vitest";
import {
  MINESWEEPER_BEGINNER,
  MINESWEEPER_EXPERT,
  MINESWEEPER_INTERMEDIATE,
  canSolveMinesweeperWithoutGuessing,
  chordMinesweeperCell,
  createEmptyBoard,
  createMinesweeperBoard,
  createNoGuessMinesweeperBoard,
  findMinesweeperHint,
  revealMinesweeperCell,
  summarizeMinesweeperResult,
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

describe("minesweeper explainable hints", () => {
  const displayBoard = (clues: Array<{ x: number; value: number }>, flagged: number[] = []) => {
    const board = createEmptyBoard(3, 2);
    for (const cell of board[1]) cell.isRevealed = true;
    for (const { x, value } of clues) {
      board[1][x].neighborMines = value;
    }
    for (const x of flagged) board[0][x].isFlagged = true;
    return board;
  };

  it("explains clue completion as safe without reading hidden mines", () => {
    const board = displayBoard([{ x: 0, value: 1 }], [0]);
    const hint = findMinesweeperHint(board);
    expect(hint).toMatchObject({ kind: "safe", conclusion: "safe", remainingMines: 0 });
    expect(hint?.targets).toEqual([{ x: 1, y: 0 }]);
    board[0][1].isMine = true;
    expect(findMinesweeperHint(board)).toEqual(hint);
  });

  it("explains an all-unknown constraint as mines", () => {
    const board = displayBoard([{ x: 0, value: 2 }]);
    expect(findMinesweeperHint(board)).toMatchObject({
      kind: "mine",
      conclusion: "mine",
      targets: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
    });
  });

  it("explains safe and mined subset differences", () => {
    const safe = displayBoard([{ x: 0, value: 1 }, { x: 1, value: 1 }]);
    expect(findMinesweeperHint(safe)).toMatchObject({
      kind: "subset", conclusion: "safe", targets: [{ x: 2, y: 0 }], remainingMines: 0,
    });
    const mine = displayBoard([{ x: 0, value: 1 }, { x: 1, value: 2 }]);
    expect(findMinesweeperHint(mine)).toMatchObject({
      kind: "subset", conclusion: "mine", targets: [{ x: 2, y: 0 }], remainingMines: 1,
    });
  });

  it("returns no hint when visible constraints cannot prove a move", () => {
    expect(findMinesweeperHint(displayBoard([{ x: 0, value: 1 }]))).toBeNull();
  });
});

describe("minesweeper result summary", () => {
  it("reports safe progress and correct versus incorrect flags", () => {
    const board = createMinesweeperBoard(4, 4, 2, 0, 0, seeded(21));
    const mines = board.flat().filter((cell) => cell.isMine);
    board[mines[0].y][mines[0].x].isFlagged = true;
    const wrong = board.flat().find((cell) => !cell.isMine)!;
    wrong.isFlagged = true;
    board.flat().find((cell) => !cell.isMine && !cell.isFlagged)!.isRevealed = true;
    expect(summarizeMinesweeperResult(board)).toEqual({
      safeTotal: 14,
      safeRevealed: 1,
      progressPercent: 7,
      flags: 2,
      correctFlags: 1,
      incorrectFlags: 1,
    });
  });
});

describe("minesweeper: classic difficulty tiers", () => {
  it("intermediate generates a correctly-sized, safe-opening board within its attempt ceiling", () => {
    const generated = createNoGuessMinesweeperBoard(MINESWEEPER_INTERMEDIATE, 8, 8, 12345);
    expect(generated.board).toHaveLength(MINESWEEPER_INTERMEDIATE.height);
    expect(generated.board[0]).toHaveLength(MINESWEEPER_INTERMEDIATE.width);
    expect(generated.board.flat().filter((c) => c.isMine)).toHaveLength(MINESWEEPER_INTERMEDIATE.mineCount);
    expect(generated.attempts).toBeLessThanOrEqual(MINESWEEPER_INTERMEDIATE.maxGenerationAttempts);
  });

  it("expert generates a correctly-sized, safe-opening board promptly (bounded attempts)", () => {
    const started = performance.now();
    const generated = createNoGuessMinesweeperBoard(MINESWEEPER_EXPERT, 15, 8, 999);
    expect(generated.board).toHaveLength(MINESWEEPER_EXPERT.height);
    expect(generated.board[0]).toHaveLength(MINESWEEPER_EXPERT.width);
    expect(generated.board.flat().filter((c) => c.isMine)).toHaveLength(MINESWEEPER_EXPERT.mineCount);
    expect(generated.attempts).toBeLessThanOrEqual(MINESWEEPER_EXPERT.maxGenerationAttempts);
    // safe-fallback or verified — either way, the first click must never be a mine.
    expect(generated.board[8][15].isMine).toBe(false);
    expect(performance.now() - started).toBeLessThan(2000);
  });
});
