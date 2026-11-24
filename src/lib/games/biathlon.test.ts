import { describe, expect, it } from "vitest";
import { AIM_TIME, BIATHLON_STAGES, PENALTY, REST, SHOTS, STAGE_COUNT, fire, newRacer, pilot, setPush, starsFor, stepRacer, swayFor, tremorFor } from "./biathlon";

describe("biathlon", () => {
  it("builds 30 stages: smaller targets, and a second range from stage 16", () => {
    expect(BIATHLON_STAGES).toHaveLength(STAGE_COUNT);
    expect(BIATHLON_STAGES[0].legs).toBe(2);
    expect(BIATHLON_STAGES[15].legs).toBe(3);
    expect(BIATHLON_STAGES[29].radius).toBeLessThan(BIATHLON_STAGES[0].radius);
    for (const s of BIATHLON_STAGES) expect(s.goal).toBeGreaterThan(s.par);
  });

  it("pushing to a heart-rate cap, calming at the range and firing on target wins every stage with 3 stars", () => {
    for (const s of BIATHLON_STAGES) {
      const r = pilot(s, { lag: 0 });
      expect(r.won, `stage ${s.stage + 1}`).toBe(true);
      expect(starsFor(r), `stage ${s.stage + 1}`).toBe(3);
    }
  });

  it("a steady human with a 100 ms reaction wins every stage", () => {
    for (const s of BIATHLON_STAGES) for (const seed of [5, 9, 31, 47]) expect(pilot(s, { lag: 6, seed }).won, `stage ${s.stage + 1} seed ${seed}`).toBe(true);
  });

  it("firing at once, or skiing too gently, loses every stage; flat-out skiing loses almost all", () => {
    let allOut = 0;
    for (const s of BIATHLON_STAGES) {
      expect(pilot(s, { spray: true, seed: 3 }).won, `stage ${s.stage + 1} spray`).toBe(false);
      expect(pilot(s, { cap: 105, lag: 6, seed: 3 }).won, `stage ${s.stage + 1} gentle`).toBe(false);
      if (!pilot(s, { cap: 999, calm: 999, lag: 6, seed: 3 }).won) allOut++;
    }
    expect(allOut).toBeGreaterThanOrEqual(24);
  });

  it("the sight steadies as the heart calms; a miss costs a penalty loop", () => {
    expect(swayFor(REST + 100)).toBeGreaterThan(swayFor(REST + 20));
    expect(tremorFor(180)).toBeGreaterThan(tremorFor(90) * 4);
    const s = { ...BIATHLON_STAGES[0], leg: 1 };
    const r = newRacer(s);
    setPush(r, true);
    let ev = null;
    for (let i = 0; i < 120 && ev !== "range"; i++) ev = stepRacer(r, 1 / 60);
    expect(ev).toBe("range");
    expect(fire(r)).toBeNull(); // still raising the rifle
    for (let i = 0; i < Math.ceil(AIM_TIME * 60) + 1; i++) stepRacer(r, 1 / 60);
    const hr = r.hr;
    for (let k = 0; k < SHOTS; k++) {
      r.tx = 999; // the sight is far off
      expect(fire(r)).toBe("miss");
    }
    expect(r.hr).toBeLessThanOrEqual(hr);
    expect(r.penalty).toBe(PENALTY * SHOTS);
    expect(r.phase).toBe("ski");
    expect(r.leg).toBe(1);
  });
});
