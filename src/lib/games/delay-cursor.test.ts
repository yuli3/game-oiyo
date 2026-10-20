import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DELAY,
  GAME_ID,
  LIMIT,
  SIZE,
  begin,
  createPuzzle,
  createRun,
  ghostAt,
  tick,
  type Dir,
  type Puzzle,
  type Run,
} from "./delay-cursor";

function toward(from: number, to: number): Dir {
  const fromRow = Math.floor(from / SIZE);
  const toRow = Math.floor(to / SIZE);
  if (fromRow < toRow) return "s";
  if (fromRow > toRow) return "n";
  if (from % SIZE < to % SIZE) return "e";
  return "w";
}

function solve(puzzle: Puzzle): Run {
  let run = begin(createRun(puzzle));
  let guard = 0;
  while (run.at !== puzzle.ghostPlate && run.phase === "play" && guard < 40) {
    guard += 1;
    run = tick(run, toward(run.at, puzzle.ghostPlate));
  }
  for (let stay = 0; stay < DELAY && run.phase === "play"; stay += 1) run = tick(run, "stay");
  while (run.phase === "play" && run.at !== puzzle.livePlate && guard < 80) {
    guard += 1;
    run = tick(run, toward(run.at, puzzle.livePlate));
  }
  return run;
}

describe("delay cursor", () => {
  it("builds a same-day floor the ghost can reach in time", () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const puzzle = createPuzzle(seed);
      expect(createPuzzle(seed)).toEqual(puzzle);
      expect(new Set([puzzle.start, puzzle.ghostPlate, puzzle.livePlate]).size).toBe(3);
      expect(puzzle.grid.every((cell) => cell === 0)).toBe(true);
      const won = solve(puzzle);
      expect(won.phase).toBe("won");
      expect(won.elapsed).toBeGreaterThanOrEqual(DELAY);
      expect(won.elapsed).toBeLessThanOrEqual(LIMIT);
      expect(won.at).toBe(puzzle.livePlate);
      expect(ghostAt(won)).toBe(puzzle.ghostPlate);
    }
  });

  it("ignores a blocked step and loses when the clock runs out", () => {
    const grid = new Array<number>(SIZE * SIZE).fill(0);
    grid[1] = 1;
    const puzzle: Puzzle = { seed: 1, grid, start: 0, livePlate: 12, ghostPlate: 24 };
    const ready = createRun(puzzle);
    expect(tick(ready, "e")).toEqual(ready);
    const playing = begin(ready);
    expect(tick(playing, "e")).toEqual(playing);
    let run = playing;
    for (let second = 0; second < LIMIT; second += 1) run = tick(run, "stay");
    expect(run.phase).toBe("lost");
    expect(run.elapsed).toBe(LIMIT);
    expect(ghostAt(run)).toBe(run.history[run.elapsed - DELAY]);
  });

  it("registers the catalog slug", () => {
    const page = readFileSync("src/pages/[...lang]/delay-cursor.astro", "utf8");
    const catalog = readFileSync("src/pages/[...lang]/index.astro", "utf8");
    expect(page).toContain('slug="delay-cursor"');
    expect(catalog).toContain('slug: "delay-cursor"');
    expect(GAME_ID).toBe("delay-cursor");
  });
});
