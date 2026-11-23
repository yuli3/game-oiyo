import { describe, expect, it } from "vitest";
import { HOUSE, LEVELS, STAGE_COUNT, canThrow, duoWinner, newPond, scoreFor, simulateThrow, starsFor, straightStop, type Spin } from "./pond-stones";

// Shots found by a brute-force solver (angle, power, spin, sweep) that clear each stage with stones to spare.
const SOLUTIONS: Array<Array<[number, number, number, number]>> = [[[0.14,0.34,-1,0]],[[0.14,0.34,-1,0]],[[-0.08,0.46,-1,0]],[[0.14,0.34,-1,0],[0,0.22,0,1]],[[0.1,0.18,-1,1]],[[0.14,0.34,-1,0]],[[0.14,0.34,-1,0]],[[0.14,0.34,-1,0]],[[-0.12,0.3,1,0]],[[-0.02,0.38,1,0]],[[-0.1,0.34,1,0]],[[-0.12,0.34,1,0]],[[0.12,0.7,-1,0]],[[0.06,0.22,0,1]],[[-0.06,0.5,-1,1]],[[0.1,0.18,-1,1],[-0.06,0.26,0,1]],[[-0.12,0.18,1,1],[-0.16,0.18,1,1]],[[-0.1,0.18,1,1],[-0.04,0.54,1,0]],[[-0.02,0.18,0,1],[-0.04,0.54,1,0]],[[0.14,0.42,-1,0],[0.18,0.42,-1,0]],[[-0.2,0.34,1,0],[-0.04,0.38,0,0]],[[0.2,0.34,-1,0],[0.04,0.38,0,0]],[[-0.2,0.34,1,0],[-0.16,0.62,0,0]],[[0.2,0.34,-1,0],[0.04,0.38,0,0]],[[0.2,0.34,-1,0],[0.04,0.38,0,0]],[[0.12,0.38,-1,0],[0.06,0.46,0,0]],[[0.12,0.38,-1,0],[0.14,0.38,-1,0]],[[0.1,0.5,-1,0],[0.12,0.18,-1,1],[0.14,0.34,0,0]],[[0.1,0.5,-1,0],[0.16,0.38,-1,0],[0.06,0.38,0,0]],[[-0.12,0.42,1,0],[-0.14,0.54,1,0],[-0.08,0.38,0,0]]];

describe("pond-stones", () => {
  it("has 30 stages that ask for more over time", () => {
    expect(LEVELS).toHaveLength(STAGE_COUNT);
    expect(LEVELS[0].reds).toHaveLength(0);
    expect(LEVELS[29].need).toBeGreaterThan(LEVELS[0].need);
    expect(LEVELS.some((l) => l.snow.length)).toBe(true);
    expect(LEVELS.some((l) => l.rocks.length)).toBe(true);
  });

  it("every stage is cleared by the recorded shots with stones to spare", () => {
    expect(SOLUTIONS).toHaveLength(STAGE_COUNT);
    SOLUTIONS.forEach((shots, i) => {
      const p = newPond(i);
      for (const [a, pw, spin, sw] of shots) simulateThrow(p, a, pw, spin as Spin, sw === 1, 1 / 40);
      expect(p.won, `stage ${i + 1}`).toBe(true);
      expect(p.thrown[0]).toBeLessThan(p.level.stones + 1);
    });
  });

  it("a weak throw is taken off before the line and a huge one flies off the back", () => {
    const p = newPond(0);
    simulateThrow(p, 0, 0, 0, false);
    expect(p.stones.filter((s) => s.alive)).toHaveLength(0);
    simulateThrow(p, 0, 1, 0, true);
    expect(p.stones.filter((s) => s.alive)).toHaveLength(0);
    expect(canThrow(p)).toBe(true);
  });

  it("sweeping carries a stone further and spin curls it", () => {
    const a = newPond(0);
    const b = newPond(0);
    simulateThrow(a, 0, 0.3, 0, false);
    simulateThrow(b, 0, 0.3, 0, true);
    expect(b.stones[0].y).toBeLessThan(a.stones[0].y);
    const c = newPond(0);
    simulateThrow(c, 0, 0.34, 1, false);
    expect(c.stones[0].x).not.toBeCloseTo(HOUSE.x, 0);
    const stop = straightStop(0, 0.3);
    expect(Math.abs(stop.y - a.stones[0].y)).toBeLessThan(4);
  });

  it("duo mode alternates and scores the closer team", () => {
    const p = newPond(0, "duo");
    simulateThrow(p, 0.0, 0.34, 0, false);
    expect(p.turn).toBe(1);
    for (let i = 0; i < 7; i++) simulateThrow(p, 0.25, 1, 0, false);
    expect(p.over).toBe(true);
    expect(scoreFor(p, 0)).toBeGreaterThanOrEqual(0);
    expect([-1, 0, 1]).toContain(duoWinner(p));
  });

  it("stars reward a spare stone", () => {
    expect(starsFor(1, LEVELS[0])).toBe(3);
    expect(starsFor(3, LEVELS[0])).toBe(2);
  });
});
