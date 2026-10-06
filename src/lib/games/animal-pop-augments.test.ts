import { describe, expect, it } from "vitest";
import {
  ANIMAL_NO_MODS,
  ANIMAL_TYPES,
  createAnimalBoard,
  findAnimalClears,
  findAnimalMatches,
  scoreAnimalMatch,
  swapAnimals,
  type AnimalBoard,
} from "./animal-pop";
import {
  ANIMAL_AUGMENTS,
  animalAugmentedTimeBonus,
  animalMods,
  animalPicksOwed,
  animalTimeUp,
  createAnimalRun,
  offerAnimalAugments,
  parseAnimalRun,
  pickAnimalAugment,
  scoreAnimalAugmented,
  serializeAnimalRun,
  type AnimalRun,
} from "./animal-pop-augments";

const [A, B, C, D, E, F, G] = ANIMAL_TYPES;
/** A board with no match anywhere: every row is a shifted cycle of the seven kinds. */
function quiet(): AnimalBoard {
  const kinds = [A, B, C, D, E, F, G];
  return Array.from({ length: 7 }, (_, r) => Array.from({ length: 7 }, (_, c) => kinds[(c + r * 2) % 7]));
}
const count = (m: boolean[][]) => m.flat().filter(Boolean).length;
const run = (owned: AnimalRun["owned"] = {}): AnimalRun => ({ owned, rng: 9, picks: 0, offer: null, secondUsed: false });

describe("animal pop rule modifiers", () => {
  it("changes nothing without a modifier", () => {
    const { board, seed } = createAnimalBoard(12);
    for (let from = 0; from < 48; from++) {
      expect(swapAnimals(board, from, from + 1, seed, ANIMAL_NO_MODS)).toEqual(swapAnimals(board, from, from + 1, seed));
    }
    expect(findAnimalClears(quiet())).toEqual(findAnimalMatches(quiet()));
    expect(count(findAnimalMatches(quiet()))).toBe(0);
  });

  it("clears the whole line for a run of four", () => {
    const board = quiet();
    for (let c = 1; c <= 4; c++) board[3][c] = A;
    board[3][0] = B; board[3][5] = C;
    expect(count(findAnimalMatches(board))).toBe(4);
    const blast = findAnimalClears(board, { ...ANIMAL_NO_MODS, lineBlast: true });
    expect(blast[3].every(Boolean)).toBe(true);
    expect(count(blast)).toBe(7);
  });

  it("clears every animal of a kind for a run of five, and only then", () => {
    const board = quiet().map((row) => row.map((animal) => (animal === G ? F : animal)));
    for (let r = 1; r <= 5; r++) board[r][2] = G;
    board[0][6] = G; board[6][5] = G;
    const mods = { ...ANIMAL_NO_MODS, stampede: true };
    expect(count(findAnimalClears(board, mods))).toBeGreaterThanOrEqual(7);
    expect(findAnimalClears(board, mods)[0][6]).toBe(true);
    board[5][2] = F;
    expect(findAnimalClears(board, mods)[0][6]).toBe(false);
  });

  it("lets a swap through without a match only with the free swap", () => {
    const board = quiet();
    expect(swapAnimals(board, 0, 1, 5).valid).toBe(false);
    const free = swapAnimals(board, 0, 1, 5, animalMods({ freeSwap: 1 }));
    expect(free.valid).toBe(true);
    expect(free.cleared).toBe(0);
    expect(free.board[0][0]).toBe(board[0][1]);
    expect(swapAnimals(board, 0, 9, 5, animalMods({ freeSwap: 1 })).valid).toBe(false);
  });

  it("drops only six kinds with the smaller forest", () => {
    const start = createAnimalBoard(77);
    let board = start.board.map((row) => row.map((animal) => (animal === G ? A : animal)));
    let seed = start.seed;
    const mods = animalMods({ fewer: 1, freeSwap: 1 });
    for (let i = 0; i < 300; i++) {
      const from = (i * 5) % 48;
      const next = swapAnimals(board, from, from % 7 === 6 ? from - 1 : from + 1, seed, mods);
      board = next.board;
      seed = next.seed;
    }
    expect(board.flat()).not.toContain(G);
  });
});

describe("animal pop augment run", () => {
  it("owes a pick before the round and at each score mark", () => {
    expect(animalPicksOwed(0)).toBe(1);
    expect(animalPicksOwed(299)).toBe(1);
    expect(animalPicksOwed(300)).toBe(2);
    expect(animalPicksOwed(15000)).toBe(10);
    expect(animalPicksOwed(18999)).toBe(10);
    expect(animalPicksOwed(19000)).toBe(11);
    const first = createAnimalRun(4);
    expect(first.offer).toHaveLength(3);
    const picked = pickAnimalAugment(first, first.offer![0], 60).run;
    expect(offerAnimalAugments(picked, 299)).toBe(picked);
    expect(offerAnimalAugments(picked, 900).offer).toHaveLength(3);
  });

  it("moves the clock the moment a clock card is taken", () => {
    const base = { ...run(), offer: ["clock", "double", "score"] as AnimalRun["offer"] };
    expect(pickAnimalAugment(base, "clock", 30).timeLeft).toBe(40);
    expect(pickAnimalAugment(base, "clock", 58).timeLeft).toBe(60);
    expect(pickAnimalAugment(base, "double", 31).timeLeft).toBe(16);
    expect(pickAnimalAugment(base, "double", 1).timeLeft).toBe(1);
    expect(pickAnimalAugment(base, "score", 31).timeLeft).toBe(31);
    expect(pickAnimalAugment(base, "wild", 31).run).toBe(base);
  });

  it("matches classic scoring with no card and multiplies with them", () => {
    for (const [cleared, waves, fever] of [[3, 1, 0], [5, 2, 0], [12, 5, 0], [4, 1, 6]] as const) {
      expect(scoreAnimalAugmented(cleared, waves, fever, {})).toEqual(scoreAnimalMatch(cleared, waves, fever));
    }
    expect(scoreAnimalAugmented(3, 1, 0, { score: 2 }).points).toBe(45);
    expect(scoreAnimalAugmented(4, 1, 0, { long: 1 }).points).toBe(60);
    expect(scoreAnimalAugmented(3, 1, 0, { long: 3 }).points).toBe(30);
    expect(scoreAnimalAugmented(3, 1, 0, { double: 1 }).points).toBe(60);
    expect(scoreAnimalAugmented(9, 3, 0, { wild: 1 })).toEqual({ points: 810, feverSeconds: 10 });
    expect(scoreAnimalAugmented(9, 3, 0, {})).toEqual({ points: 270, feverSeconds: 0 });
    expect(animalAugmentedTimeBonus(6, 2, { chainTime: 1 })).toBe(5);
    expect(animalAugmentedTimeBonus(3, 1, { chainTime: 1 })).toBe(1);
    expect(animalAugmentedTimeBonus(0, 0, { chainTime: 1 })).toBe(0);
  });

  it("gives the second chance once", () => {
    expect(animalTimeUp(run()).timeLeft).toBe(0);
    const saved = animalTimeUp(run({ second: 1 }));
    expect(saved.timeLeft).toBe(20);
    expect(animalTimeUp(saved.run).timeLeft).toBe(0);
  });

  it("takes every card to its cap and then stops offering", () => {
    let current = createAnimalRun(3);
    for (let i = 0; i < 40 && current.offer; i++) current = offerAnimalAugments(pickAnimalAugment(current, current.offer[0], 30).run, 10_000_000);
    for (const def of ANIMAL_AUGMENTS) expect(current.owned[def.id]).toBe(def.max);
    expect(current.offer).toBeNull();
    expect(offerAnimalAugments(current, 10_000_000)).toBe(current);
  });

  it("round-trips a save and rejects broken ones", () => {
    const { board, seed } = createAnimalBoard(8);
    const current = offerAnimalAugments(pickAnimalAugment(createAnimalRun(8), createAnimalRun(8).offer![1], 60).run, 400);
    const raw = serializeAnimalRun(seed, board, 400, 41, 3, current);
    expect(parseAnimalRun(raw)).toMatchObject({ seed, board, score: 400, timeLeft: 41, feverSeconds: 3, run: current });
    expect(parseAnimalRun(null)).toBeNull();
    expect(parseAnimalRun("nope")).toBeNull();
    const data = JSON.parse(raw);
    expect(parseAnimalRun(JSON.stringify({ ...data, v: 2 }))).toBeNull();
    expect(parseAnimalRun(JSON.stringify({ ...data, rng: -4 }))).toBeNull();
    expect(parseAnimalRun(JSON.stringify({ ...data, owned: { wild: 7, x: 1 }, offer: ["wild", "score"] }))?.run).toMatchObject({ owned: { wild: 1 }, offer: null });
    expect(parseAnimalRun(raw, Date.now() + 25 * 3600000)).toBeNull();
  });

  it("stays a valid board through random augmented play", () => {
    let seedRng = 5;
    const rand = () => { seedRng = (Math.imul(seedRng, 1664525) + 1013904223) >>> 0; return seedRng / 0x1_0000_0000; };
    const mods = animalMods({ lineBlast: 1, stampede: 1, fewer: 1, freeSwap: 1 });
    let { board, seed } = createAnimalBoard(101);
    for (let i = 0; i < 3000; i++) {
      const from = Math.floor(rand() * 49);
      const to = from % 7 === 6 ? from - 1 : from + 1;
      const next = swapAnimals(board, from, to, seed, mods);
      board = next.board;
      seed = next.seed;
      expect(next.waves).toBeLessThanOrEqual(20);
    }
    expect(board.flat().every((animal) => (ANIMAL_TYPES as readonly string[]).includes(animal))).toBe(true);
  });
});
