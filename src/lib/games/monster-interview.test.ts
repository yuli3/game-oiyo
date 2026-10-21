import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DEALS,
  GAME_ID,
  answer,
  begin,
  createPuzzle,
  createRun,
  distance,
  expire,
  legal,
  type Answer,
  type Deal,
} from "./monster-interview";

const ANSWERS: Answer[] = ["H", "W", "R"];
const PREFERS: Answer[][] = [
  ["H", "W", "R"],
  ["H", "R", "W"],
  ["W", "H", "R"],
  ["W", "R", "H"],
  ["R", "H", "W"],
  ["R", "W", "H"],
];

function permutations(prefix: Answer[] = []): Answer[][] {
  if (prefix.length === 3) return [prefix];
  return ANSWERS.filter((choice) => !prefix.includes(choice)).flatMap((choice) => permutations([...prefix, choice]));
}

const ORDERS = permutations();

function puzzleOf(deal: Deal) {
  return { seed: 1, rounds: [deal] };
}

function wins(deal: Deal): Answer[][] {
  return ORDERS.filter((order) => {
    let run = begin(createRun(puzzleOf(deal)));
    for (const choice of order) {
      run = answer(run, choice);
      if (run.phase === "lost") return false;
    }
    return run.phase === "won";
  });
}

function greedy(deal: Deal, prefer: readonly Answer[]): boolean {
  let run = begin(createRun(puzzleOf(deal)));
  for (let step = 0; step < 3; step += 1) {
    const seat = run.seats[run.used.length]!;
    const choice = prefer.find((label) => !run.used.includes(label) && legal(label, distance(seat, run.standard)));
    if (!choice) return false;
    run = answer(run, choice);
    if (run.phase === "lost") return false;
  }
  return run.phase === "won";
}

describe("monster interview", () => {
  it("has one winning order, and no preference clears every round of a day", () => {
    expect(DEALS).toHaveLength(9);
    for (const deal of DEALS) expect(wins(deal)).toHaveLength(1);
    for (let seed = 0; seed < 18; seed += 1) {
      const rounds = createPuzzle(seed).rounds;
      expect(new Set(rounds.map((deal) => `${deal.standard}:${deal.seats.join("")}`)).size).toBe(3);
      for (const prefer of PREFERS) {
        expect(rounds.some((deal) => !greedy(deal, prefer))).toBe(true);
      }
      for (const order of ORDERS) {
        expect(rounds.some((deal) => !wins(deal)[0] || wins(deal)[0]!.join("") !== order.join(""))).toBe(true);
      }
    }
  });

  it("opens the next seat only when hire flips the standard", () => {
    const deal = DEALS[0]!;
    expect(deal.seats).toEqual([0, 1, 2]);
    const started = begin(createRun(puzzleOf(deal)));
    const hired = answer(started, "H");
    expect(hired.phase).toBe("play");
    expect(hired.standard).toBe(2);
    const held = answer(hired, "W");
    expect(held.phase).toBe("lost");
    const cleared = answer(answer(hired, "R"), "W");
    expect(cleared.phase).toBe("won");
    expect(cleared.kept).toBe(1);
    expect(expire(started).phase).toBe("lost");
    expect(expire(cleared)).toEqual(cleared);
    expect(begin(cleared)).toEqual(cleared);
  });

  it("repeats the same three deals for a seed", () => {
    for (let seed = 0; seed < 18; seed += 1) {
      const puzzle = createPuzzle(seed);
      expect(createPuzzle(seed)).toEqual(puzzle);
      expect(puzzle.rounds).toHaveLength(3);
      for (const deal of puzzle.rounds) expect(wins(deal)).toHaveLength(1);
    }
  });

  it("registers the catalog slug", () => {
    const page = readFileSync("src/pages/[...lang]/monster-interview.astro", "utf8");
    const catalog = readFileSync("src/pages/[...lang]/index.astro", "utf8");
    expect(page).toContain('slug="monster-interview"');
    expect(catalog).toContain('slug: "monster-interview"');
    expect(GAME_ID).toBe("monster-interview");
  });
});
