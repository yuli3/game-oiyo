import { describe, expect, it } from "vitest";
import { RIVALS, RIVAL_COUNT, duelWinner, intersect, newDuel, setTarget, stepDuel, thinkAi, type Duel, type Rival } from "./kite-duel";

function play(rival: number, seed: number, pilot: Rival | null): 0 | 1 | 2 {
  const d: Duel = newDuel(rival, seed);
  let pai = { next: 0, side: 1, phase: 0 };
  while (duelWinner(d) === null) {
    if (pilot) {
      const save = d.ai;
      d.ai = pai;
      thinkAi(d, 0, pilot);
      pai = d.ai;
      d.ai = save;
    }
    stepDuel(d, 1 / 30, [1]);
  }
  return duelWinner(d)!;
}

describe("kite duel", () => {
  it("has 20 rivals that get faster and tougher", () => {
    expect(RIVAL_COUNT).toBe(20);
    for (let i = 1; i < RIVAL_COUNT; i++) expect(RIVALS[i].speed).toBeGreaterThan(RIVALS[i - 1].speed);
    expect(RIVALS[19].hp).toBeGreaterThan(RIVALS[0].hp);
  });

  it("finds string crossings", () => {
    expect(intersect({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 })).toEqual({ x: 5, y: 5 });
    expect(intersect({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 5 }, { x: 10, y: 5 })).toBeNull();
  });

  it("a crossed, faster kite saws through the slower string", () => {
    const d = newDuel(0, 1, true);
    // put the strings across each other, then whip red back and forth while blue holds still
    d.kites[0].x = 60; d.kites[0].y = 100;
    d.kites[1].x = 20; d.kites[1].y = 500;
    let t = 0;
    while (duelWinner(d) === null && t < 30) {
      t += 1 / 30;
      setTarget(d, 0, 60 + Math.sin(t * 12) * 40, 100);
      setTarget(d, 1, 20, 500);
      stepDuel(d, 1 / 30, []);
    }
    expect(duelWinner(d)).toBe(0);
  });

  it("an idle player loses, and a sharp player beats the first rival but finds the last one harder", () => {
    const sharp: Rival = { ...RIVALS[0], speed: 300, think: 0.3, nerve: 0.8, wiggle: 70 };
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(seeds.filter((s) => play(0, s, null) === 1).length).toBe(seeds.length);
    const winsFirst = seeds.filter((s) => play(0, s, sharp) === 0).length;
    const winsLast = seeds.filter((s) => play(19, s, sharp) === 0).length;
    expect(winsFirst).toBeGreaterThanOrEqual(7);
    expect(winsLast).toBeLessThan(winsFirst);
  }, 60_000);
});
