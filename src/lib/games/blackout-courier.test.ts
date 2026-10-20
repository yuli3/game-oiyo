import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  GAME_ID,
  MOVE_SLACK,
  SIZE,
  createPuzzle,
  createRun,
  extinguish,
  restore,
  step,
  visibleCells,
  type Dir,
  type Puzzle,
  type Run,
} from "./blackout-courier";

const DIRS: Dir[] = ["n", "e", "s", "w"];
const DELTA: Record<Dir, number> = { n: -SIZE, e: 1, s: SIZE, w: -1 };

function inside(index: number, delta: number): boolean {
  const next = index + delta;
  if (next < 0 || next >= SIZE * SIZE) return false;
  const col = index % SIZE;
  if (delta === -1 && col === 0) return false;
  if (delta === 1 && col === SIZE - 1) return false;
  return true;
}

function route(puzzle: Puzzle): number {
  const leg = (from: number, to: number) => {
    const seen = new Array<number>(SIZE * SIZE).fill(-1);
    const queue = [from];
    seen[from] = 0;
    for (let head = 0; head < queue.length; head += 1) {
      const here = queue[head] as number;
      if (here === to) return seen[here] as number;
      for (const dir of DIRS) {
        const delta = DELTA[dir];
        if (!inside(here, delta)) continue;
        const next = here + delta;
        if (puzzle.grid[next] !== 0 || seen[next] !== -1) continue;
        seen[next] = (seen[here] as number) + 1;
        queue.push(next);
      }
    }
    return Number.POSITIVE_INFINITY;
  };
  return leg(puzzle.start, puzzle.drops[0]) + leg(puzzle.drops[0], puzzle.drops[1]) + leg(puzzle.drops[1], puzzle.drops[2]);
}

function firstStep(grid: readonly number[], from: number, to: number): Dir {
  const seen = new Array<number>(SIZE * SIZE).fill(-1);
  const queue = [to];
  seen[to] = 0;
  for (let head = 0; head < queue.length; head += 1) {
    const here = queue[head] as number;
    for (const dir of DIRS) {
      const delta = DELTA[dir];
      if (!inside(here, delta)) continue;
      const next = here + delta;
      if (grid[next] !== 0 || seen[next] !== -1) continue;
      seen[next] = (seen[here] as number) + 1;
      queue.push(next);
    }
  }
  for (const dir of DIRS) {
    const delta = DELTA[dir];
    if (!inside(from, delta)) continue;
    const next = from + delta;
    if (seen[next] === (seen[from] as number) - 1) return dir;
  }
  throw new Error("no step");
}

function play(puzzle: Puzzle): Run {
  let run = extinguish(createRun(puzzle));
  let guard = 0;
  while (run.phase === "dark" && guard < 80) {
    guard += 1;
    const target = puzzle.drops[run.nextDrop];
    if (target === undefined) break;
    run = step(run, firstStep(puzzle.grid, run.at, target));
  }
  return run;
}

describe("blackout courier", () => {
  it("builds the same solvable daily map from a seed", () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const puzzle = createPuzzle(seed);
      expect(createPuzzle(seed)).toEqual(puzzle);
      expect(puzzle.grid).toHaveLength(SIZE * SIZE);
      expect(puzzle.grid[puzzle.start]).toBe(0);
      expect(new Set([puzzle.start, ...puzzle.drops]).size).toBe(4);
      for (const drop of puzzle.drops) expect(puzzle.grid[drop]).toBe(0);
      const length = route(puzzle);
      expect(length).toBeGreaterThanOrEqual(10);
      expect(length).toBeLessThan(80);
      expect(puzzle.moveCap).toBe(length + MOVE_SLACK);
      const won = play(puzzle);
      expect(won.phase).toBe("won");
      expect(won.moves).toBe(length);
    }
  });

  it("hides the map in the dark and refuses steps while the lights are on", () => {
    const grid = new Array<number>(SIZE * SIZE).fill(1);
    for (const cell of [0, 1, 2, 3]) grid[cell] = 0;
    const puzzle: Puzzle = { seed: 7, grid, start: 0, drops: [2, 3, 1], moveCap: 8 };
    const planned = createRun(puzzle);
    expect(step(planned, "e")).toEqual(planned);
    expect(visibleCells(planned)).toBeNull();
    const dark = extinguish(planned);
    expect(visibleCells(dark)).toEqual([0]);
    expect(step(dark, "n").moves).toBe(0);
    const passed = step(step(dark, "e"), "e");
    expect(passed.nextDrop).toBe(1);
    expect(passed.at).toBe(2);
    expect(visibleCells(passed)).toEqual([2]);
    const finished = step(step(step(passed, "e"), "w"), "w");
    expect(finished.phase).toBe("won");
    expect(finished.nextDrop).toBe(3);
    expect(restore(dark).phase).toBe("plan");
  });

  it("ends the run when the move budget is spent", () => {
    const grid = new Array<number>(SIZE * SIZE).fill(1);
    grid[0] = 0;
    grid[1] = 0;
    const puzzle: Puzzle = { seed: 8, grid, start: 0, drops: [8, 9, 10], moveCap: 1 };
    const lost = step(extinguish(createRun(puzzle)), "e");
    expect(lost.phase).toBe("lost");
    expect(lost.moves).toBe(1);
    expect(step(lost, "w")).toEqual(lost);
  });

  it("registers the catalog slug", () => {
    const page = readFileSync("src/pages/[...lang]/blackout-courier.astro", "utf8");
    const catalog = readFileSync("src/pages/[...lang]/index.astro", "utf8");
    expect(page).toContain('slug="blackout-courier"');
    expect(catalog).toContain('slug: "blackout-courier"');
    expect(GAME_ID).toBe("blackout-courier");
  });
});
