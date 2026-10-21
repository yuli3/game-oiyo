import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ACTS,
  GAME_ID,
  LIP_SPEED,
  STEPS,
  SURF_AUGMENTS,
  SURF_CUES,
  begin,
  createPuzzle,
  createRun,
  expire,
  freshSeed,
  ride,
  sprayCell,
  surfCue,
  surfOffer,
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

  it("deals a practice wave that is not today's board", () => {
    expect(freshSeed(4, 4)).toBe(5);
    expect(freshSeed(4, 9)).toBe(4);
    const boards = new Set<string>();
    for (let seed = 0; seed < 1000; seed += 1) boards.add(JSON.stringify(createPuzzle(seed).columns));
    expect(boards.size).toBeGreaterThanOrEqual(950);
  });

  it("names six cues and sprays only on a cell the rider clears", () => {
    const open = { seed: 3, columns: Array.from({ length: STEPS }, () => column(["open", "open", "open"])) };
    const started = begin(createRun(open));
    expect(surfCue(started, ride(started, "straight"))).toBe("straight");
    expect(sprayCell(started, ride(started, "straight"))).toEqual({ step: 0, lane: 1 });
    expect(surfCue(started, ride(started, "left"))).toBe("turn");
    expect(surfCue(started, ride(started, "cut"))).toBe("cut");
    const lip = begin(createRun({ seed: 2, columns: [column(["open", "lip", "open"]), ...open.columns.slice(1)] }));
    expect(surfCue(lip, ride(lip, "straight"))).toBe("lip");
    let previous = started;
    let won = started;
    while (won.phase === "play") {
      previous = won;
      won = ride(won, "straight");
    }
    expect(won.phase).toBe("won");
    expect(surfCue(previous, won)).toBe("win");
    const blocked = begin(createRun({ seed: 4, columns: [column(["open", "wall", "open"]), ...open.columns.slice(1)] }));
    const fell = ride(blocked, "straight");
    expect(surfCue(blocked, fell)).toBe("lose");
    expect(sprayCell(blocked, fell)).toBeNull();
    expect(surfCue(ride(started, "straight"), createRun(createPuzzle(99)))).toBeNull();
    expect(SURF_CUES).toHaveLength(6);
  });

  it("offers three of eight practice augments and each one bends one rule", () => {
    expect(SURF_AUGMENTS).toHaveLength(8);
    const offer = surfOffer(9);
    expect(offer).toHaveLength(3);
    expect(new Set(offer).size).toBe(3);
    for (const id of offer) expect(SURF_AUGMENTS.some((augment) => augment.id === id)).toBe(true);

    const open = { seed: 5, columns: Array.from({ length: STEPS }, () => column(["open", "open", "open"])) };
    const base = begin(createRun(open));
    expect(createRun(open).speed).toBe(2);
    expect(createRun(open, "headStart").speed).toBe(3);
    expect(ride(base, "left").speed).toBe(1);
    expect(ride(begin(createRun(open, "glide")), "left").speed).toBe(2);
    expect(ride(base, "cut").speed).toBe(0);
    expect(ride(begin(createRun(open, "softCut")), "cut").speed).toBe(1);
    expect(ride(base, "straight").speed).toBe(3);
    expect(ride(begin(createRun(open, "tailwind")), "straight").speed).toBe(4);
    const slow = ride(base, "left");
    expect(ride(slow, "right").speed).toBe(0);
    expect(ride(ride(begin(createRun(open, "floor")), "left"), "right").speed).toBe(1);

    const lip = { seed: 6, columns: [column(["lip", "open", "open"]), ...open.columns.slice(1)] };
    expect(ride(begin(createRun(lip)), "left").phase).toBe("lost");
    expect(ride(begin(createRun(lip, "lowLip")), "left").phase).toBe("play");

    const wall = { seed: 7, columns: [column(["open", "wall", "open"]), column(["open", "wall", "open"]), ...open.columns.slice(2)] };
    const skimmed = ride(begin(createRun(wall, "skim")), "straight");
    expect(skimmed.phase).toBe("play");
    expect(skimmed.skimLeft).toBe(0);
    expect(ride(skimmed, "straight").phase).toBe("lost");

    const edged = ride(begin(createRun(open, "pocket")), "left");
    const held = ride(edged, "left");
    expect(held.phase).toBe("play");
    expect(held.lane).toBe(0);
    expect(held.pocketLeft).toBe(0);
    expect(ride(held, "left").phase).toBe("lost");
    expect(ride(ride(base, "left"), "left").phase).toBe("lost");
  });
});
