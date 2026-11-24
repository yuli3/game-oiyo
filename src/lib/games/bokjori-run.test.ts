import { describe, expect, it } from "vitest";
import { STAGE_COUNT, jump, launchVelocity, levelFor, newRun, pilotRun, power, release, score, starsFor, startCharge, stepRun, yardEnd, yardStart, type BokjoriLevel } from "./bokjori-run";

const all = Array.from({ length: STAGE_COUNT }, (_, i) => levelFor(i));

describe("bokjori-run", () => {
  it("builds 30 alleys that get faster, longer and busier", () => {
    expect(all[0].dogs).toHaveLength(0);
    expect(all[0].houses.every((h) => h.wants)).toBe(true);
    const z = all[STAGE_COUNT - 1];
    expect(z.speed).toBeGreaterThan(all[0].speed * 1.5);
    expect(z.houses.length).toBeGreaterThan(all[0].houses.length);
    expect(z.dogs.length).toBeGreaterThan(4);
  });

  it("every alley is delivered with 3 stars by the planning autopilot and won by sloppy ones", () => {
    for (const l of all) {
      const run = pilotRun(l);
      expect(run.won, `alley ${l.stage + 1}`).toBe(true);
      expect(starsFor(run), `alley ${l.stage + 1}`).toBe(3);
      expect(pilotRun(l, 0.6, 7).won, `alley ${l.stage + 1} sloppy`).toBe(true);
      expect(pilotRun(l, 0.8, 13).won, `alley ${l.stage + 1} sloppier`).toBe(true);
    }
  });

  it("reading the lanterns and jumping the dogs both matter", () => {
    const everyHouse = all.filter((l) => !pilotRun(l, 0, 1, { everyHouse: true }).won);
    expect(everyHouse.length).toBeGreaterThanOrEqual(12);
    const noJumps = all.slice(11).filter((l) => !pilotRun(l, 0, 1, { jumps: false }).won);
    expect(noJumps.length).toBeGreaterThanOrEqual(12);
  });

  it("one fixed throw rhythm delivers clearly fewer strainers than reading each house", () => {
    const got = (o?: { fixedPower: number }) => all.reduce((n, l) => n + pilotRun(l, 0, 1, o).delivered.filter(Boolean).length, 0);
    expect(got({ fixedPower: 0.6 })).toBeLessThan(got() * 0.92);
  });

  it("a longer wind-up throws further", () => {
    expect(power(0.45)).toBeCloseTo(0.5, 5);
    expect(launchVelocity(150, 1).vy).toBeGreaterThan(launchVelocity(150, 0.2).vy);
  });

  it("a strainer dropped into a lit yard is delivered; a dark yard counts against you", () => {
    const level: BokjoriLevel = { stage: 0, speed: 120, houses: [{ wall: 200, front: 8, wallH: 50, yard: 90, houseH: 110, wants: false }], dogs: [], length: 400, strainers: 2, need: 0 };
    const r = newRun(level);
    r.flying.push({ x: (yardStart(level.houses[0]) + yardEnd(level.houses[0])) / 2, y: 5, vx: 0, vy: 0, spin: 0, done: false, result: "", house: -1 });
    for (let k = 0; k < 30; k++) stepRun(r, 1 / 60);
    expect(r.wrong).toBe(1);
    expect(score(r)).toBe(-1);
  });

  it("running into a dog without jumping costs a strainer", () => {
    const level: BokjoriLevel = { stage: 3, speed: 150, houses: [], dogs: [100], length: 300, strainers: 3, need: 0 };
    const r = newRun(level);
    let bitten = false;
    for (let k = 0; k < 120 && !bitten; k++) bitten = stepRun(r, 1 / 60).bitten;
    expect(bitten).toBe(true);
    expect(r.left).toBe(2);
    const r2 = newRun(level);
    let b2 = false;
    for (let k = 0; k < 70; k++) {
      if (r2.x > 70 && r2.y === 0) jump(r2);
      b2 = stepRun(r2, 1 / 60).bitten || b2;
    }
    expect(b2).toBe(false);
    startCharge(r2);
    expect(release(r2)).toBe(true);
  });
});
