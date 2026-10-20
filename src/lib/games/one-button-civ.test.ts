import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  GAME_ID,
  GESTURES,
  PLOTS,
  POLICIES,
  begin,
  commit,
  createPuzzle,
  createRun,
  matched,
  resolved,
  type Gesture,
  type Policy,
  type Puzzle,
  type Run,
} from "./one-button-civ";

function play(puzzle: Puzzle, gestures: readonly Gesture[]): Run {
  let run = begin(createRun(puzzle));
  for (const gesture of gestures) run = commit(run, gesture);
  return run;
}

function winningLine(puzzle: Puzzle): Gesture[] {
  return puzzle.target.map((policy) => {
    const gesture = GESTURES.find((item) => puzzle.map[item] === policy);
    if (!gesture) throw new Error("missing gesture");
    return gesture;
  });
}

describe("one-button civ", () => {
  it("hides a total mapping and a target that uses every policy", () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const puzzle = createPuzzle(seed);
      expect(createPuzzle(seed)).toEqual(puzzle);
      expect(new Set(Object.values(puzzle.map)).size).toBe(POLICIES.length);
      expect(puzzle.target).toHaveLength(PLOTS);
      for (const policy of POLICIES) expect(puzzle.target).toContain(policy);
      const won = play(puzzle, winningLine(puzzle));
      expect(won.phase).toBe("won");
      expect(matched(won)).toBe(PLOTS);
      const missed = play(puzzle, Array.from({ length: PLOTS }, () => "rest" as const));
      expect(missed.phase).toBe("lost");
      expect(matched(missed)).toBeLessThan(PLOTS);
    }
  });

  it("resolves a plot only after that plot is committed", () => {
    const puzzle = createPuzzle(3);
    let run = begin(createRun(puzzle));
    expect(resolved(run, 0)).toBeNull();
    run = commit(run, "tap");
    expect(run.phase).toBe("play");
    expect(run.cursor).toBe(1);
    expect(resolved(run, 0)).toBe(puzzle.map.tap);
    expect(resolved(run, 1)).toBeNull();
    expect(commit({ ...run, phase: "ready" }, "hold")).toEqual({ ...run, phase: "ready" });
  });

  it("ignores input after the row closes", () => {
    const puzzle = createPuzzle(8);
    const lost = play(puzzle, ["tap", "tap", "tap", "tap"]);
    expect(lost.phase === "won" || lost.phase === "lost").toBe(true);
    expect(commit(lost, "hold")).toEqual(lost);
    expect(begin(lost)).toEqual(lost);
  });

  it("registers the catalog slug", () => {
    const page = readFileSync("src/pages/[...lang]/one-button-civ.astro", "utf8");
    const catalog = readFileSync("src/pages/[...lang]/index.astro", "utf8");
    expect(page).toContain('slug="one-button-civ"');
    expect(catalog).toContain('slug: "one-button-civ"');
    expect(GAME_ID).toBe("one-button-civ");
    const sample = createPuzzle(1);
    const policies = new Set<Policy>(Object.values(sample.map));
    expect(policies.size).toBe(3);
  });
});
