import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  GAME_ID,
  GAP,
  NEED,
  ROUNDS,
  RULES,
  WINDOW,
  begin,
  createMatch,
  createRun,
  expire,
  press,
  realAt,
  type Run,
} from "./late-press";

function hits(run: Run, count: number): Run {
  let current = run;
  for (let index = 0; index < count; index += 1) {
    const round = current.match.rounds[current.index];
    if (!round) break;
    current = press(current, realAt(round) + 1);
  }
  return current;
}

describe("late press", () => {
  it("hides the limit inside a window shorter than the next movement", () => {
    expect(WINDOW).toBeLessThan(GAP);
    for (let seed = 0; seed < 20; seed += 1) {
      const match = createMatch(seed);
      expect(createMatch(seed)).toEqual(match);
      expect(RULES).toContain(match.rule);
      expect(match.rounds).toHaveLength(ROUNDS);
      for (const round of match.rounds) {
        expect(round.moves).toHaveLength(match.rule);
        expect(round.limit).toBe(realAt(round) + WINDOW);
        for (let step = 1; step < round.moves.length; step += 1) {
          expect(round.moves[step] - round.moves[step - 1]).toBe(GAP);
        }
      }
      const first = match.rounds[0];
      expect(press(begin(createRun(match)), realAt(first) + 1).marks[0]).toBe("hit");
    }
  });

  it("counts a press on the movement as early and a press past the limit as late", () => {
    const match = createMatch(4);
    const round = match.rounds[0];
    expect(press(begin(createRun(match)), realAt(round)).marks[0]).toBe("early");
    expect(press(begin(createRun(match)), round.limit).marks[0]).toBe("hit");
    expect(expire(begin(createRun(match))).marks[0]).toBe("late");
  });

  it("closes once three hits land, and once three misses make three impossible", () => {
    const match = createMatch(9);
    const won = hits(begin(createRun(match)), NEED);
    expect(won.phase).toBe("won");
    expect(won.hits).toBe(NEED);
    expect(press(won, 1)).toEqual(won);
    let lost = begin(createRun(match));
    for (let index = 0; index < ROUNDS; index += 1) {
      if (lost.phase !== "play") break;
      lost = press(lost, 0);
    }
    expect(lost.phase).toBe("lost");
    expect(lost.hits).toBe(0);
    expect(expire(lost)).toEqual(lost);
  });

  it("registers the catalog slug", () => {
    const page = readFileSync("src/pages/[...lang]/late-press.astro", "utf8");
    const catalog = readFileSync("src/pages/[...lang]/index.astro", "utf8");
    expect(page).toContain('slug="late-press"');
    expect(catalog).toContain('slug: "late-press"');
    expect(GAME_ID).toBe("late-press");
  });
});
