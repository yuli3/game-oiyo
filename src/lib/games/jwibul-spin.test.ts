import { describe, expect, it } from "vitest";
import { LIGHT_SPEED, ROPE, STAGE_COUNT, lead, levelFor, newJwibul, playScript, starsFor, stepJwibul } from "./jwibul-spin";

describe("jwibul-spin", () => {
  it("builds 30 stages that grow", () => {
    const a = levelFor(0);
    const z = levelFor(STAGE_COUNT - 1);
    expect(a.tufts.length).toBe(3);
    expect(a.stacks.length).toBe(0);
    expect(z.tufts.length).toBe(10);
    expect(z.stacks.length).toBeGreaterThan(3);
    expect(z.wind).toBeGreaterThan(0);
  });

  it("every stage is cleared by the steady script and by a wobbly one", () => {
    for (let st = 0; st < STAGE_COUNT; st++) {
      const l = levelFor(st);
      const run = playScript(l, 0, 1);
      expect(run.won, `stage ${st + 1}`).toBe(true);
      expect(starsFor(run)).toBe(3);
      expect(playScript(l, 0.5, 8).won, `stage ${st + 1} wobbly`).toBe(true);
    }
  });

  it("circling the finger spins the can; stopping lets the embers die", () => {
    const s = newJwibul(levelFor(0));
    let a = 0;
    for (let k = 0; k < 120; k++) {
      a += 10 / 60;
      lead(s, s.pivot.x + Math.cos(a) * 24, s.pivot.y + Math.sin(a) * 24);
      stepJwibul(s, 1 / 60);
    }
    expect(s.speed).toBeGreaterThan(LIGHT_SPEED);
    expect(Math.hypot(s.can.x - s.pivot.x, s.can.y - s.pivot.y)).toBeCloseTo(ROPE, 3);
    lead(s, null);
    for (let k = 0; k < 60 * 12 && !s.over; k++) stepJwibul(s, 1 / 60);
    expect(s.over).toBe(true);
    expect(s.cause).toBe("cold");
  });

  it("sweeping a haystack ends the run", () => {
    const l = { ...levelFor(5), stacks: [{ x: 180, y: 420, r: 20 }], timeLimit: 99 };
    const s = newJwibul(l);
    let a = 0;
    for (let k = 0; k < 600 && !s.over; k++) {
      a += 10 / 60;
      lead(s, s.pivot.x + Math.cos(a) * 24, s.pivot.y + Math.sin(a) * 24);
      stepJwibul(s, 1 / 60);
    }
    expect(s.cause).toBe("stack");
  });
});
