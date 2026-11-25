import { describe, expect, it } from "vitest";
import { BELOW, BOING_STAGES, JUMP, SPRING, STAGE_COUNT, newClimb, pilot, reachUp, starsFor, step, type BoingStage } from "./boing-up";

const T = 60_000;
// slower and shakier than the steerers each beanstalk was built against
const HUMANS = [11, 12, 13, 14].map((seed) => ({ look: 0.16, wobble: 10, seed }));

const stalk = (over: Partial<BoingStage>): BoingStage => ({ stage: 0, leaves: [{ x: 180, h: 0, kind: 0, amp: 0, rate: 0 }], berries: [], path: [0], top: 1000, par: 0, ...over });

describe("boing-up", () => {
  it("bounces off a leaf about 190 px up, and a mushroom higher", () => {
    expect(reachUp(JUMP)).toBeGreaterThan(180);
    expect(reachUp(JUMP * SPRING)).toBeGreaterThan(reachUp(JUMP) * 2);
    const c = newClimb(stalk({ leaves: [{ x: 180, h: 0, kind: 0, amp: 0, rate: 0 }] }));
    let peak = 0;
    for (let k = 0; k < 240; k++) {
      step(c);
      peak = Math.max(peak, c.h);
    }
    expect(peak).toBeCloseTo(reachUp(JUMP), -1);
    expect(c.bounces).toBeGreaterThan(0); // it came back down onto the leaf
  }, T);

  it("falls off the bottom with nothing to land on, and withers a withering leaf after one bounce", () => {
    const c = newClimb(stalk({ leaves: [{ x: 180, h: 0, kind: 2, amp: 0, rate: 0 }] }));
    c.target = 180;
    let n = 0;
    while (!c.over && n++ < 2000) step(c);
    expect(c.withered[0]).toBe(true);
    expect(c.over).toBe(true);
    expect(c.won).toBe(false);
    expect(c.h).toBeLessThan(c.floor);
    expect(BELOW).toBeGreaterThan(0);
  }, T);

  it("has 30 beanstalks, taller later on", () => {
    expect(BOING_STAGES).toHaveLength(STAGE_COUNT);
    expect(BOING_STAGES[29].top).toBeGreaterThan(BOING_STAGES[0].top);
    expect(BOING_STAGES[0].leaves.some((l) => l.kind === 1)).toBe(false); // no drifting leaves to start with
  }, T);

  it("climbs every beanstalk with three stars along the planned leaves", () => {
    for (const st of BOING_STAGES) expect(starsFor(pilot(st, { mode: "plan" }))).toBe(3);
  }, T);

  // Each human-like seed climbs in stretches of beanstalks; the last test checks at least 104 of the 120 runs win.
  const humanWins: number[] = [];
  for (const o of HUMANS) {
    for (let from = 0; from < STAGE_COUNT; from += 15) {
      it(`plays slower, shakier human-like seed ${o.seed} on beanstalks ${from + 1}–${from + 15}`, () => {
        let wins = 0;
        for (const st of BOING_STAGES.slice(from, from + 15)) if (pilot(st, o).won) wins++;
        humanWins.push(wins);
      }, T);
    }
  }
  it("lets slower, shakier human-like steerers climb almost every beanstalk", () => {
    expect(humanWins).toHaveLength(HUMANS.length * 2);
    expect(humanWins.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(104);
  }, T);

  it("rarely reaches the top steering at random", () => {
    let wins = 0;
    for (const st of BOING_STAGES) for (const seed of [21, 22, 23, 24]) if (pilot(st, { mode: "random", seed }).won) wins++;
    expect(wins).toBeLessThan(10);
    for (const st of BOING_STAGES) for (const seed of [1, 2, 3, 4, 5, 6]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
