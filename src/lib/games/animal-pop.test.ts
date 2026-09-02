import { describe, expect, it } from "vitest";
import {
  ANIMAL_TIME_LIMIT,
  addAnimalTime,
  animalMatchTimeBonus,
  createAnimalBoard,
  findAnimalMatches,
  parseAnimal,
  serializeAnimal,
  swapAnimals,
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
});
