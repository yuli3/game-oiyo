import { describe, expect, it } from "vitest";
import { countTentsSolutions } from "./tents";
import { TENTS_STAGE_COUNT, isTentsStageIndex, tentsStagePuzzle } from "./tents-stages";

describe("tents stages", () => {
  it("ships 50 stages that grow from 5x5 to 10x10 and never get easier", () => {
    expect(TENTS_STAGE_COUNT).toBe(50);
    expect(tentsStagePuzzle(0).size).toBe(5);
    expect(tentsStagePuzzle(49).size).toBe(10);
    for (let i = 1; i < TENTS_STAGE_COUNT; i += 1) {
      const prev = tentsStagePuzzle(i - 1);
      const cur = tentsStagePuzzle(i);
      expect(cur.size).toBeGreaterThanOrEqual(prev.size);
      if (cur.size === prev.size) expect(cur.trees.length).toBeGreaterThanOrEqual(prev.trees.length);
    }
  });

  it("gives every stage one fixed board with exactly one answer", () => {
    const seen = new Set<string>();
    for (let i = 0; i < TENTS_STAGE_COUNT; i += 1) {
      const puzzle = tentsStagePuzzle(i);
      const treeCells = puzzle.trees.map(([r, c]) => r * puzzle.size + c);
      expect(new Set(treeCells).size).toBe(treeCells.length);
      expect(treeCells.every((cell) => cell >= 0 && cell < puzzle.size * puzzle.size)).toBe(true);
      expect(puzzle.rowHints).toHaveLength(puzzle.size);
      expect(puzzle.colHints).toHaveLength(puzzle.size);
      const tents = puzzle.rowHints.reduce((a, b) => a + b, 0);
      expect(tents).toBe(puzzle.trees.length);
      expect(puzzle.colHints.reduce((a, b) => a + b, 0)).toBe(tents);
      expect(countTentsSolutions(puzzle, 2)).toBe(1);
      const key = JSON.stringify(puzzle);
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  }, 60_000);

  it("clamps odd indexes and recognizes valid ones", () => {
    expect(tentsStagePuzzle(-3)).toBe(tentsStagePuzzle(0));
    expect(tentsStagePuzzle(999)).toBe(tentsStagePuzzle(49));
    expect(isTentsStageIndex(0)).toBe(true);
    expect(isTentsStageIndex(49)).toBe(true);
    expect(isTentsStageIndex(50)).toBe(false);
    expect(isTentsStageIndex(1.5)).toBe(false);
  });
});
