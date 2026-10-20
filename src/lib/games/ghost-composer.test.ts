import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BEATS,
  GAME_ID,
  NEED,
  NOTES,
  RULES,
  begin,
  createPuzzle,
  createRun,
  play,
  predict,
  type Note,
  type Rule,
} from "./ghost-composer";

function oppose(rule: Rule, notes: readonly Note[]): Note {
  const expected = predict(rule, notes);
  if (expected === null) return 0;
  return expected === 0 ? 1 : 0;
}

describe("ghost composer", () => {
  it("keeps one unnamed habit and scores only a broken expectation", () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const puzzle = createPuzzle(seed);
      expect(createPuzzle(seed)).toEqual(puzzle);
      expect(RULES).toContain(puzzle.rule);
      let run = begin(createRun(puzzle));
      const notes: Note[] = [];
      while (run.phase === "play" && notes.length < BEATS) {
        const note = oppose(puzzle.rule, notes);
        notes.push(note);
        run = play(run, note);
      }
      expect(run.phase).toBe("won");
      expect(run.breaks).toBe(NEED);
      expect(predict(puzzle.rule, [])).toBeNull();
    }
  });

  it("lets the first note teach and a copied habit go unscored", () => {
    const puzzle = { seed: 1, rule: "echo" as const };
    let run = play(begin(createRun(puzzle)), 1);
    expect(run.phase).toBe("play");
    expect(run.breaks).toBe(0);
    expect(run.lastExpected).toBeNull();
    run = play(run, 1);
    expect(run.breaks).toBe(0);
    expect(run.lastBroke).toBe(false);
    expect(run.lastExpected).toBe(1);
    run = play(run, 0);
    expect(run.breaks).toBe(1);
    expect(run.lastBroke).toBe(true);
  });

  it("closes when the remaining notes cannot reach five breaks", () => {
    const puzzle = createPuzzle(2);
    let run = begin(createRun(puzzle));
    const notes: Note[] = [];
    while (run.phase === "play") {
      const expected = predict(puzzle.rule, notes);
      const note = expected ?? 0;
      notes.push(note);
      run = play(run, note);
    }
    expect(run.phase).toBe("lost");
    expect(run.breaks).toBe(0);
    expect(play(run, 1)).toEqual(run);
    expect(begin(run)).toEqual(run);
    expect(NOTES).toEqual([0, 1]);
  });

  it("registers the catalog slug", () => {
    const page = readFileSync("src/pages/[...lang]/ghost-composer.astro", "utf8");
    const catalog = readFileSync("src/pages/[...lang]/index.astro", "utf8");
    expect(page).toContain('slug="ghost-composer"');
    expect(catalog).toContain('slug: "ghost-composer"');
    expect(GAME_ID).toBe("ghost-composer");
  });
});
