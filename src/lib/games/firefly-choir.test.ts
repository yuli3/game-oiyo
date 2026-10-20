import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  FLIES,
  GAME_ID,
  NEED,
  PERIODS,
  TICKS,
  advance,
  begin,
  blinks,
  createPuzzle,
  createRun,
  pair,
  type Period,
  type Run,
} from "./firefly-choir";

function show(run: Run, tick: number): Run {
  let current = begin(run);
  while (current.phase === "play" && current.tick < tick) current = advance(current);
  return current;
}

function mates(run: Run, period: Period): Run {
  const indexes = run.puzzle.flies.flatMap((fly, index) => (fly.period === period ? [index] : []));
  const left = indexes[0];
  const right = indexes[1];
  if (left === undefined || right === undefined) return run;
  return pair(pair(run, left), right);
}

function lockTrue(run: Run): Run {
  return PERIODS.reduce((current, period) => mates(current, period), run);
}

function finish(run: Run): Run {
  let current = run;
  for (let guard = 0; guard < TICKS + 2 && current.phase === "play"; guard += 1) current = advance(current);
  return current;
}

describe("firefly choir", () => {
  it("deals two flies of each period and keeps the day stable", () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const puzzle = createPuzzle(seed);
      expect(createPuzzle(seed)).toEqual(puzzle);
      expect(puzzle.flies).toHaveLength(FLIES);
      for (const period of PERIODS) {
        expect(puzzle.flies.filter((fly) => fly.period === period)).toHaveLength(2);
      }
    }
    expect(blinks(3, 0)).toBe(true);
    expect(blinks(3, 1)).toBe(false);
    expect(blinks(5, 5)).toBe(true);
  });

  it("wins only when the true pairs lock before the confirming beat", () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const shown = show(createRun(createPuzzle(seed)), 4);
      expect(shown.tick).toBe(4);
      expect(shown.phase).toBe("play");
      const won = finish(lockTrue(shown));
      expect(won.phase).toBe("won");
      expect(won.sounds).toBe(NEED);
    }
  });

  it("loses when the player waits to see the last blink", () => {
    const shown = show(createRun(createPuzzle(7)), 5);
    expect(shown.tick).toBe(5);
    const late = advance(lockTrue(shown));
    expect(late.phase).toBe("lost");
    expect(late.sounds).toBeLessThan(NEED);
  });

  it("rejects a crossed pairing even on the first beat", () => {
    let run = begin(createRun(createPuzzle(3)));
    const fours = run.puzzle.flies.flatMap((fly, index) => (fly.period === 4 ? [index] : []));
    const fives = run.puzzle.flies.flatMap((fly, index) => (fly.period === 5 ? [index] : []));
    run = pair(pair(run, fours[0] ?? 0), fives[0] ?? 1);
    run = pair(pair(run, fours[1] ?? 2), fives[1] ?? 3);
    run = mates(run, 3);
    expect(advance(run).phase).toBe("lost");
    expect(pair(advance(run), 0)).toEqual(advance(run));
    expect(begin(advance(run))).toEqual(advance(run));
  });

  it("lets a pair come apart before the next beat locks it", () => {
    const shown = show(createRun(createPuzzle(4)), 4);
    const sealed = lockTrue(shown);
    const opened = PERIODS.reduce((current, period) => {
      const index = current.puzzle.flies.findIndex((fly) => fly.period === period);
      return pair(current, index);
    }, sealed);
    expect(opened.partner.every((value) => value === null)).toBe(true);
    expect(finish(opened).phase).toBe("lost");
  });

  it("registers the catalog slug", () => {
    const page = readFileSync("src/pages/[...lang]/firefly-choir.astro", "utf8");
    const catalog = readFileSync("src/pages/[...lang]/index.astro", "utf8");
    expect(page).toContain('slug="firefly-choir"');
    expect(catalog).toContain('slug: "firefly-choir"');
    expect(GAME_ID).toBe("firefly-choir");
  });
});
