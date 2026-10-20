import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ASKS,
  GAME_ID,
  MISSES,
  RHYTHM,
  SIGNALS,
  answer,
  begin,
  createLesson,
  createRun,
  nextTeach,
  type Run,
  type Signal,
} from "./untranslatable-creature";

function learn(run: Run): Run {
  let current = run.phase === "ready" ? begin(run) : run;
  let guard = 0;
  while (current.phase === "teach" && guard < 8) {
    guard += 1;
    current = nextTeach(current);
  }
  return current;
}

function solve(run: Run): Run {
  let current = learn(run);
  let guard = 0;
  while (current.phase === "ask" && guard < 20) {
    guard += 1;
    current = answer(current, current.lesson.asks[current.step] as Signal);
  }
  return current;
}

describe("untranslatable creature", () => {
  it("teaches one shared lesson and clears it when every ask matches", () => {
    const rhythms = SIGNALS.map((signal) => RHYTHM[signal].join(""));
    expect(new Set(rhythms).size).toBe(SIGNALS.length);
    for (let seed = 0; seed < 20; seed += 1) {
      const lesson = createLesson(seed);
      expect(createLesson(seed)).toEqual(lesson);
      expect(lesson.teach).toHaveLength(SIGNALS.length);
      expect([...lesson.teach].sort()).toEqual([...SIGNALS].sort());
      expect(lesson.asks).toHaveLength(ASKS);
      expect(new Set(lesson.asks).size).toBeGreaterThanOrEqual(3);
      const won = solve(createRun(lesson));
      expect(won.phase).toBe("won");
      expect(won.misses).toBe(0);
    }
  });

  it("keeps the same ask after a wrong mark", () => {
    let run = learn(createRun(createLesson(3)));
    const want = run.lesson.asks[0] as Signal;
    const wrong = SIGNALS.find((signal) => signal !== want) as Signal;
    run = answer(run, wrong);
    expect(run.phase).toBe("ask");
    expect(run.step).toBe(0);
    expect(run.misses).toBe(1);
    run = answer(run, want);
    expect(run.step).toBe(1);
    expect(run.misses).toBe(1);
  });

  it("closes the lesson on the third miss", () => {
    let run = learn(createRun(createLesson(5)));
    const want = run.lesson.asks[0] as Signal;
    const wrong = SIGNALS.find((signal) => signal !== want) as Signal;
    run = answer(run, wrong);
    run = answer(run, wrong);
    run = answer(run, wrong);
    expect(run.phase).toBe("lost");
    expect(run.misses).toBe(MISSES);
    expect(answer(run, want)).toEqual(run);
  });

  it("registers the catalog slug", () => {
    const page = readFileSync("src/pages/[...lang]/untranslatable-creature.astro", "utf8");
    const catalog = readFileSync("src/pages/[...lang]/index.astro", "utf8");
    expect(page).toContain('slug="untranslatable-creature"');
    expect(catalog).toContain('slug: "untranslatable-creature"');
    expect(GAME_ID).toBe("untranslatable-creature");
  });
});
