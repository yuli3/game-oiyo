import { describe, expect, it } from "vitest";
import {
  ANIMAL_TIME_LIMIT,
  addAnimalTime,
  animalMatchTimeBonus,
  createAnimalBoard,
  findAnimalMatches,
  parseAnimal,
  scoreAnimalMatch,
  serializeAnimal,
  swapAnimals,
  tickAnimalFever,
  ANIMAL_TYPES,
  hasAnimalMove,
  reshuffleAnimalBoard,
} from "./animal-pop";
describe("animal pop engine", () => {
  it("creates deterministic settled boards", () => {
    const a = createAnimalBoard(7);
    expect(a).toEqual(createAnimalBoard(7));
    expect(findAnimalMatches(a.board).flat().some(Boolean)).toBe(false);
  });
  it("rejects non-adjacent swaps", () => {
    const a = createAnimalBoard(1);
    expect(swapAnimals(a.board, 0, 8, a.seed).valid).toBe(false);
  });
  it("resolves a known cascade", () => {
    const board = Array.from({ length: 7 }, (_, r) =>
      Array.from(
        { length: 7 },
        (_, c) => ["🐵", "🐱", "🐷", "🐭", "🐰", "🐶", "🐤"][(r + c) % 7],
      ),
    );
    board[0][0] = "🐵";
    board[0][1] = "🐵";
    board[0][2] = "🐱";
    board[0][3] = "🐵";
    const x = swapAnimals(board, 2, 3, 3);
    expect(x.valid).toBe(true);
    expect(x.cleared).toBeGreaterThanOrEqual(3);
    expect(x.steps).toHaveLength(x.waves);
    expect(x.steps[0].matched.length).toBeGreaterThanOrEqual(3);
    expect(x.steps[0].falls.some((fall) => fall.spawned)).toBe(true);
    expect(x.steps.at(-1)?.collapsed).toEqual(x.board);
  });
  it("validates active save", () => {
    const a = createAnimalBoard(4);
    expect(parseAnimal(serializeAnimal(a.seed, a.board, 120, 40))?.score).toBe(
      120,
    );
    expect(parseAnimal('{"v":1}')).toBeNull();
  });
  it("restores remaining Fever time while accepting older saves without it", () => {
    const board = createAnimalBoard(4);
    expect(parseAnimal(serializeAnimal(board.seed, board.board, 120, 40, 7))?.feverSeconds).toBe(7);
    const oldSave = JSON.parse(serializeAnimal(board.seed, board.board, 120, 40));
    delete oldSave.feverSeconds;
    expect(parseAnimal(JSON.stringify(oldSave))?.feverSeconds).toBe(0);
    expect(parseAnimal(serializeAnimal(board.seed, board.board, 120, 40, 11))).toBeNull();
  });
  it("adds time only for successful matches, capped at the round limit", () => {
    expect(animalMatchTimeBonus(0, 0)).toBe(0);
    expect(animalMatchTimeBonus(2, 1)).toBe(0);
    expect(animalMatchTimeBonus(3, 1)).toBe(1);
    expect(animalMatchTimeBonus(4, 1)).toBe(2);
    expect(animalMatchTimeBonus(3, 2)).toBe(2);
    expect(animalMatchTimeBonus(5, 3)).toBe(3);
    expect(addAnimalTime(40, 1)).toBe(41);
    expect(addAnimalTime(ANIMAL_TIME_LIMIT - 1, 3)).toBe(ANIMAL_TIME_LIMIT);
    const a = createAnimalBoard(1);
    const miss = swapAnimals(a.board, 0, 8, a.seed);
    expect(miss.valid).toBe(false);
    expect(animalMatchTimeBonus(miss.cleared, miss.waves)).toBe(0);
  });
  it("starts ten seconds of double-score fever on a five-wave cascade", () => {
    expect(scoreAnimalMatch(12, 5, 0)).toEqual({ points: 1200, feverSeconds: 10 });
  });
  it("keeps double score for later matches, then expires after ten active ticks", () => {
    let remaining = 10;
    for (let second = 0; second < 9; second++) remaining = tickAnimalFever(remaining);
    expect(remaining).toBe(1);
    expect(scoreAnimalMatch(3, 1, remaining).points).toBe(60);
    expect(tickAnimalFever(remaining)).toBe(0);
    expect(scoreAnimalMatch(3, 1, 0).points).toBe(30);
  });

  it("detects a board with no move and deals the same animals into a playable one", () => {
    const kinds = [...ANIMAL_TYPES];
    // Rows are a cycle shifted by three: no two equal neighbours share a line within reach of one swap.
    const dead = Array.from({ length: 7 }, (_, r) => Array.from({ length: 7 }, (_, c) => kinds[(c + r * 3) % 7]));
    expect(findAnimalMatches(dead).flat().some(Boolean)).toBe(false);
    expect(hasAnimalMove(dead)).toBe(false);
    const dealt = reshuffleAnimalBoard(dead, 9);
    expect(dealt.reshuffled).toBe(true);
    expect(hasAnimalMove(dealt.board)).toBe(true);
    expect(findAnimalMatches(dealt.board).flat().some(Boolean)).toBe(false);
    expect([...dealt.board.flat()].sort()).toEqual([...dead.flat()].sort());
    expect(reshuffleAnimalBoard(dead, 9)).toEqual(dealt);
    const live = createAnimalBoard(4);
    expect(hasAnimalMove(live.board)).toBe(true);
    expect(reshuffleAnimalBoard(live.board, live.seed)).toEqual({ board: live.board, seed: live.seed, reshuffled: false });
  });

  it("never hands back a dead board after a swap", () => {
    let { board, seed } = createAnimalBoard(31);
    let shuffles = 0;
    for (let step = 0; step < 4000; step++) {
      let moved = false;
      for (let i = 0; i < 49 && !moved; i++) {
        for (const j of [i + 1, i + 7]) {
          if (j >= 49 || (j === i + 1 && i % 7 === 6)) continue;
          const next = swapAnimals(board, i, j, seed);
          if (!next.valid) continue;
          board = next.board; seed = next.seed; moved = true;
          if (next.reshuffled) shuffles++;
          break;
        }
      }
      expect(moved).toBe(true);
    }
    expect(hasAnimalMove(board)).toBe(true);
    expect(shuffles).toBeGreaterThanOrEqual(0);
  });
});
