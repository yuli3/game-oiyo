import { describe, expect, it } from "vitest";
import { ARENA_COUNT, POWER_PERIOD, TOP_R, cpuHold, dashSpeed, matchOver, newRound, powerOf, roundWinner, step, type World } from "./spin-sumo";

type Skill = { tolerance: number; delay: number; charge: number; dodge: number };
const BOTS: Skill[] = [
  { tolerance: 0.3, delay: 0.5, charge: 0.6, dodge: 0.4 },
  { tolerance: 0.12, delay: 0.2, charge: 0.7, dodge: 0.7 },
  { tolerance: 0.2, delay: 0.25, charge: 0.5, dodge: 0.6 },
];

function play(arena: number, seed: number, me: Skill | null): number {
  let w: World = newRound(arena, seed);
  let wait0 = 0;
  for (let i = 0; i < 60 * 90; i++) {
    let h0 = false;
    if (me) {
      const r = cpuHold({ ...w, cpuWait: wait0 }, 0, me);
      h0 = r.hold;
      if (r.wait) wait0 = r.wait;
      wait0 = Math.max(0, wait0 - 1 / 60);
    }
    const r1 = cpuHold(w, 1);
    const res = step(w, [h0, r1.hold], 1 / 60);
    w = { ...res.world, cpuWait: r1.wait ? r1.wait : res.world.cpuWait };
    const win = roundWinner(w);
    if (win >= 0) return win;
  }
  return -1;
}

describe("spin sumo", () => {
  it("power swings 0 → 1 → 0 and maps to dash speed", () => {
    expect(powerOf(0)).toBe(0);
    expect(powerOf(POWER_PERIOD / 2)).toBeCloseTo(1);
    expect(powerOf(POWER_PERIOD)).toBeCloseTo(0);
    expect(dashSpeed(1)).toBeGreaterThan(dashSpeed(0));
  });

  it("holding then releasing dashes along the arrow", () => {
    let w = newRound(0, 1);
    for (let i = 0; i < 20; i++) w = step(w, [true, false], 1 / 60).world;
    const angle = w.tops[0].angle;
    const r = step(w, [false, false], 1 / 60);
    expect(r.events.dash).toEqual([0]);
    const t = r.world.tops[0];
    expect(Math.atan2(t.vy, t.vx)).toBeCloseTo(Math.atan2(Math.sin(angle), Math.cos(angle)), 1);
  });

  it("tops bump each other and the one off the ring loses", () => {
    let w = newRound(0, 1);
    w = { ...w, tops: [{ ...w.tops[0], x: 0, y: 0, vx: 300, vy: 0 }, { ...w.tops[1], x: TOP_R * 2 + 1, y: 0, vx: 0, vy: 0 }] };
    let res = step(w, [false, false], 1 / 60);
    expect(res.events.hit).toBeGreaterThan(0);
    expect(res.world.tops[1].vx).toBeGreaterThan(res.world.tops[0].vx);
    w = { ...res.world, tops: [res.world.tops[0], { ...res.world.tops[1], x: 400 }] };
    res = step(w, [false, false], 1 / 60);
    expect(roundWinner(res.world)).toBe(0);
    expect(matchOver({ wins: [2, 1] })).toBe(0);
    expect(matchOver({ wins: [1, 1] })).toBe(-1);
  });

  it("the computer beats a player who never presses, in every arena", () => {
    for (let a = 0; a < ARENA_COUNT; a++) {
      let cpuWins = 0;
      for (let s = 1; s <= 20; s++) if (play(a, s, null) === 1) cpuWins += 1;
      expect(cpuWins, `arena ${a + 1}`).toBeGreaterThanOrEqual(9);
    }
  }, 120_000);

  it("a skilled player can beat the computer in every arena", () => {
    for (let a = 0; a < ARENA_COUNT; a++) {
      const best = Math.max(...BOTS.map((b) => {
        let wins = 0;
        for (let s = 1; s <= 20; s++) if (play(a, s, b) === 0) wins += 1;
        return wins;
      }));
      expect(best, `arena ${a + 1}`).toBeGreaterThanOrEqual(5);
    }
  }, 120_000);
});
