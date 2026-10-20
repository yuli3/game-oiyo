import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BEATS,
  GAME_ID,
  HURDLES,
  LIVES,
  act,
  begin,
  createLevel,
  createRun,
  hazard,
  type Run,
} from "./failure-eater";

function clear(run: Run): Run {
  let current = run.phase === "ready" ? begin(run) : run;
  let guard = 0;
  while (current.phase === "play" && guard < 40) {
    guard += 1;
    current = act(current, hazard(current, current.cursor));
  }
  return current;
}

describe("failure eater", () => {
  it("builds the same track and clears it when every hazard is jumped", () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const level = createLevel(seed);
      expect(createLevel(seed)).toEqual(level);
      expect(level.beats).toHaveLength(BEATS);
      expect(level.beats.filter((beat) => beat === "hurdle")).toHaveLength(HURDLES);
      const won = clear(createRun(level));
      expect(won.phase).toBe("won");
      expect(won.fails).toBe(0);
      expect(won.monsters).toEqual([]);
    }
  });

  it("turns a wrong jump into a creature that the next pass must jump", () => {
    const level = createLevel(2);
    let run = begin(createRun(level));
    const ground = level.beats.findIndex((beat) => beat === "ground");
    while (run.cursor < ground) run = act(run, hazard(run, run.cursor));
    run = act(run, true);
    expect(run.fails).toBe(1);
    expect(run.cursor).toBe(0);
    expect(run.monsters).toContain(ground);
    expect(hazard(run, ground)).toBe(true);
    const won = clear(run);
    expect(won.phase).toBe("won");
    expect(won.fails).toBe(1);
  });

  it("closes the run on the third miss", () => {
    let run = begin(createRun(createLevel(5)));
    let guard = 0;
    while (run.phase === "play" && guard < 10) {
      guard += 1;
      run = act(run, !hazard(run, run.cursor));
    }
    expect(run.phase).toBe("lost");
    expect(run.fails).toBe(LIVES);
    expect(act(run, true)).toEqual(run);
  });

  it("registers the catalog slug", () => {
    const page = readFileSync("src/pages/[...lang]/failure-eater.astro", "utf8");
    const catalog = readFileSync("src/pages/[...lang]/index.astro", "utf8");
    expect(page).toContain('slug="failure-eater"');
    expect(catalog).toContain('slug: "failure-eater"');
    expect(GAME_ID).toBe("failure-eater");
  });
});
