import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ACTS,
  GAME_ID,
  LIP_SPEED,
  STEPS,
  begin,
  createPuzzle,
  createRun,
  expire,
  ride,
  type Puzzle,
  type Run,
  type Tile,
} from "./line-surf";

function solvable(puzzle: Puzzle): boolean {
  const seen = new Set<string>();
  const queue: Run[] = [begin(createRun(puzzle))];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    if (current.phase === "won") return true;
    if (current.phase !== "play") continue;
    const key = `${current.step}:${current.lane}:${current.speed}`;
    if (seen.has(key)) continue;
    seen.add(key);
    for (const act of ACTS) queue.push(ride(current, act));
  }
  return false;
}

function column(tiles: Tile[]): Tile[] {
  return tiles;
}

describe("line surf", () => {
  it("builds a course a line can finish", () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const puzzle = createPuzzle(seed);
      expect(createPuzzle(seed)).toEqual(puzzle);
      expect(puzzle.columns).toHaveLength(STEPS);
      for (const tiles of puzzle.columns) expect(tiles).toHaveLength(3);
      expect(solvable(puzzle)).toBe(true);
    }
  });

  it("ends the ride on a wall, a slow lip, or a curve off the side", () => {
    const columns = [
      column(["open", "wall", "open"]),
      column(["lip", "open", "open"]),
      column(["open", "open", "open"]),
      column(["open", "open", "open"]),
      column(["open", "open", "open"]),
      column(["open", "open", "open"]),
      column(["open", "open", "open"]),
      column(["open", "open", "open"]),
    ];
    const puzzle = { seed: 1, columns };
    const started = begin(createRun(puzzle));
    expect(ride(started, "straight").phase).toBe("lost");
    const curved = ride(started, "left");
    expect(curved.phase).toBe("play");
    expect(curved.lane).toBe(0);
    expect(curved.speed).toBe(1);
    expect(ride(curved, "cut").phase).toBe("lost");
    expect(ride(curved, "cut").speed).toBe(0);
    expect(curved.speed).toBeLessThan(LIP_SPEED);
    expect(ride(curved, "left").phase).toBe("lost");
    expect(ride(ride(curved, "left"), "straight")).toEqual(ride(curved, "left"));
    expect(begin(ride(curved, "left"))).toEqual(ride(curved, "left"));
  });

  it("counts a cut as empty speed and a timeout as a loss", () => {
    const puzzle = createPuzzle(4);
    const cut = ride(begin(createRun(puzzle)), "cut");
    expect(cut.speed).toBe(0);
    expect(cut.lane).toBe(1);
    const waiting = expire(begin(createRun(puzzle)));
    expect(waiting.phase).toBe("lost");
    expect(expire(waiting)).toEqual(waiting);
  });

  it("registers the catalog slug", () => {
    const page = readFileSync("src/pages/[...lang]/line-surf.astro", "utf8");
    const catalog = readFileSync("src/pages/[...lang]/index.astro", "utf8");
    expect(page).toContain('slug="line-surf"');
    expect(catalog).toContain('slug: "line-surf"');
    expect(GAME_ID).toBe("line-surf");
  });
});
