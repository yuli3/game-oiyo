import { describe, expect, it } from "vitest";
import { BRACE, PULL, STAGE_COUNT, TUG_STAGES, WARN, YANKED, newTug, phaseAt, pilot, starsFor, stepTug, theirForce, yourForce } from "./tug-of-war";

describe("tug-of-war", () => {
  it("builds 30 pulls: their rhythm gets quicker and the pull longer", () => {
    expect(TUG_STAGES).toHaveLength(STAGE_COUNT);
    const gap = (i: number) => {
      const w = TUG_STAGES[i].waves;
      return (w[w.length - 1].start - w[0].start) / (w.length - 1);
    };
    expect(gap(STAGE_COUNT - 1)).toBeLessThan(gap(0));
    expect(TUG_STAGES[STAGE_COUNT - 1].limit).toBeGreaterThan(TUG_STAGES[0].limit);
  });

  it("pulling in their slack and bracing from the shout wins every pull with 3 stars", () => {
    for (const s of TUG_STAGES) {
      const g = pilot(s);
      expect(g.won, `pull ${s.stage + 1}`).toBe(true);
      expect(starsFor(g), `pull ${s.stage + 1}`).toBe(3);
    }
  });

  it("a human who reacts 0.2 or 0.25 s late still wins every pull", () => {
    for (const s of TUG_STAGES) for (const lag of [0.2, 0.25]) expect(pilot(s, { lag }).won, `pull ${s.stage + 1} lag ${lag}`).toBe(true);
  });

  it("always pulling, never pulling, a fixed rhythm or reacting half a second late loses every pull", () => {
    for (const s of TUG_STAGES) {
      expect(pilot(s, { mode: "always" }).won, `pull ${s.stage + 1} always`).toBe(false);
      expect(pilot(s, { mode: "never" }).won, `pull ${s.stage + 1} never`).toBe(false);
      expect(pilot(s, { mode: "beat", beat: 2 }).won, `pull ${s.stage + 1} beat`).toBe(false);
      expect(pilot(s, { lag: 0.5 }).won, `pull ${s.stage + 1} late`).toBe(false);
    }
  });

  it("they shout before each heave; pulling into a heave gets you yanked", () => {
    const s = TUG_STAGES[0];
    const w = s.waves[0];
    expect(phaseAt(s, w.start - WARN - 0.01)).toBe("slack");
    expect(phaseAt(s, w.start - 0.01)).toBe("warn");
    expect(phaseAt(s, w.start + 0.01)).toBe("heave");
    expect(theirForce(s, w.start + 0.01)).toBe(s.heaveF);
    const g = newTug(s);
    expect(yourForce(g)).toBe(BRACE);
    g.holding = true;
    expect(yourForce(g)).toBe(PULL);
    g.t = w.start + 0.01;
    expect(yourForce(g)).toBe(YANKED);
    // the flag crossing your line wins
    const h = newTug(s);
    h.x = 0.999;
    h.holding = true;
    expect(stepTug(h, 0.1)).toBe(true);
    expect(h.won).toBe(true);
  });
});
