import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  GAME_ID,
  MISSES,
  RULES,
  SHOWN,
  begin,
  breakIndex,
  createPuzzle,
  createRun,
  explains,
  forecast,
  guess,
  reveal,
  type Rule,
  type Run,
} from "./unseen-boss";

function watch(run: Run): Run {
  let current = run.phase === "ready" ? begin(run) : run;
  let guard = 0;
  while (current.phase === "watch" && guard < 8) {
    guard += 1;
    current = reveal(current);
  }
  return current;
}

describe("unseen boss", () => {
  it("shows four shakes that fit exactly one rule", () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const puzzle = createPuzzle(seed);
      expect(createPuzzle(seed)).toEqual(puzzle);
      expect(puzzle.beats).toHaveLength(SHOWN + 1);
      const fit = RULES.filter((rule) => explains(rule, puzzle.beats.slice(0, SHOWN)));
      expect(fit).toEqual([puzzle.rule]);
      expect(puzzle.beats[SHOWN]).toBe(forecast(puzzle.rule, puzzle.beats));
      expect(breakIndex(puzzle.rule, puzzle.beats)).toBeNull();
      for (const rule of RULES) {
        if (rule === puzzle.rule) continue;
        const broken = breakIndex(rule, puzzle.beats.slice(0, SHOWN));
        expect(broken).not.toBeNull();
        expect(broken as number).toBeLessThan(SHOWN);
      }
      const won = guess(watch(createRun(puzzle)), puzzle.rule);
      expect(won.phase).toBe("won");
      expect(won.misses).toBe(0);
    }
  });

  it("keeps the shakes up after one wrong rule", () => {
    const puzzle = createPuzzle(2);
    let run = watch(createRun(puzzle));
    expect(run.phase).toBe("ask");
    expect(run.seen).toBe(SHOWN);
    const wrong = RULES.find((rule) => rule !== puzzle.rule) as Rule;
    run = guess(run, wrong);
    expect(run.phase).toBe("ask");
    expect(run.misses).toBe(1);
    expect(run.lastGuess).toBe(wrong);
    expect(breakIndex(wrong, puzzle.beats.slice(0, SHOWN))).not.toBeNull();
  });

  it("closes the watch on the second miss", () => {
    const puzzle = createPuzzle(6);
    let run = watch(createRun(puzzle));
    const wrong = RULES.filter((rule) => rule !== puzzle.rule);
    run = guess(run, wrong[0]);
    run = guess(run, wrong[1]);
    expect(run.phase).toBe("lost");
    expect(run.misses).toBe(MISSES);
    expect(guess(run, puzzle.rule)).toEqual(run);
    expect(reveal({ ...run, phase: "ready" })).toEqual({ ...run, phase: "ready" });
  });

  it("registers the catalog slug", () => {
    const page = readFileSync("src/pages/[...lang]/unseen-boss.astro", "utf8");
    const catalog = readFileSync("src/pages/[...lang]/index.astro", "utf8");
    expect(page).toContain('slug="unseen-boss"');
    expect(catalog).toContain('slug: "unseen-boss"');
    expect(GAME_ID).toBe("unseen-boss");
  });
});
