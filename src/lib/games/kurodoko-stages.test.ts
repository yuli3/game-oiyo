import { describe, expect, it } from "vitest";
import { countKurodokoSolutions, generateKurodokoPuzzle, KURODOKO_DIFFICULTIES } from "./kurodoko";
import { mulberry32 } from "./daily";
import { KURODOKO_STAGE_COUNT, isKurodokoStageIndex, kurodokoStage } from "./kurodoko-stages";

describe("kurodoko stages", () => {
  it("builds 30 unique-solution boards that grow from 5×5 to 7×7", () => {
    expect(KURODOKO_STAGE_COUNT).toBe(30);
    let lastSize = 0;
    let lastClues = Number.POSITIVE_INFINITY;
    for (let i = 0; i < KURODOKO_STAGE_COUNT; i += 1) {
      const { difficulty, seed } = kurodokoStage(i);
      const { puzzle } = generateKurodokoPuzzle(difficulty, mulberry32(seed));
      expect(puzzle.length).toBe(KURODOKO_DIFFICULTIES[difficulty].size);
      expect(countKurodokoSolutions(puzzle)).toBe(1);
      const clues = puzzle.flat().filter((cell) => cell !== null).length;
      if (puzzle.length === lastSize) expect(clues).toBeLessThanOrEqual(lastClues);
      expect(puzzle.length).toBeGreaterThanOrEqual(lastSize);
      lastSize = puzzle.length;
      lastClues = clues;
    }
  });

  it("clamps the index and rejects stray values", () => {
    expect(kurodokoStage(99)).toEqual(kurodokoStage(29));
    expect(kurodokoStage(-3)).toEqual(kurodokoStage(0));
    expect(isKurodokoStageIndex(30)).toBe(false);
    expect(isKurodokoStageIndex(1.5)).toBe(false);
  });
});

describe("kurodoko stage restore", () => {
  it("maps a stage seed back to its stage and ignores random seeds", async () => {
    const { kurodokoStageForSeed } = await import("./kurodoko-stages");
    const stage = kurodokoStage(14);
    expect(kurodokoStageForSeed(stage.difficulty, stage.seed)).toBe(14);
    expect(kurodokoStageForSeed("hard", stage.seed)).toBeNull();
    expect(kurodokoStageForSeed("easy", 12345)).toBeNull();
  });
});
