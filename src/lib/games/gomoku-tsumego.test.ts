import { describe, it, expect } from "vitest";
import {
  TSUMEGO_PUZZLES,
  getDailyTsumego,
  evaluateTsumegoMove,
} from "./gomoku-tsumego";

describe("gomoku-tsumego module", () => {
  it("has valid curated tsumego puzzles with winning moves", () => {
    expect(TSUMEGO_PUZZLES.length).toBeGreaterThanOrEqual(4);
    for (const puzzle of TSUMEGO_PUZZLES) {
      expect(puzzle.id).toBeDefined();
      expect(puzzle.title).toBeDefined();
      expect(puzzle.winningMoves.length).toBeGreaterThan(0);
      expect(puzzle.initialStones.length).toBeGreaterThan(0);
    }
  });

  it("returns deterministic daily tsumego puzzle for given date string", () => {
    const puzzleA = getDailyTsumego("2026-10-25");
    const puzzleB = getDailyTsumego("2026-10-25");
    expect(puzzleA.id).toBe(puzzleB.id);
  });

  it("evaluates correct and incorrect player moves in tsumego", () => {
    const puzzle = TSUMEGO_PUZZLES[0]; // winning move is 111
    const wrong = evaluateTsumegoMove(puzzle, 0, 99);
    expect(wrong.isCorrect).toBe(false);
    expect(wrong.isComplete).toBe(false);

    const right = evaluateTsumegoMove(puzzle, 0, 111);
    expect(right.isCorrect).toBe(true);
    expect(right.isComplete).toBe(true);
  });
});
