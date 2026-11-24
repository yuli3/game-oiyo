import { describe, expect, it } from "vitest";
import { BREAK, ICICLE_STAGES, STAGE_COUNT, knock, newEaves, occupied, pilot, score, starsFor, stepEaves } from "./icicle-knock";

const T = 60_000;

describe("icicle-knock", () => {
  it("has 30 stages that get longer and busier", () => {
    expect(ICICLE_STAGES).toHaveLength(STAGE_COUNT);
    expect(ICICLE_STAGES[29].length).toBeGreaterThan(ICICLE_STAGES[0].length);
    expect(ICICLE_STAGES[29].walkers.length).toBeGreaterThan(ICICLE_STAGES[0].walkers.length);
  }, T);

  it("is the same every time a stage is played", () => {
    const a = pilot(ICICLE_STAGES[7]);
    const b = pilot(ICICLE_STAGES[7]);
    expect(score(a)).toBe(score(b));
    expect(a.bonks).toBe(b.bonks);
  }, T);

  it("won't knock an icicle that is still too small", () => {
    const e = newEaves(ICICLE_STAGES[0]);
    expect(knock(e, 0)).toBe("too-small");
    while (e.size[0] < BREAK) stepEaves(e, 1 / 60);
    expect(knock(e, 0)).toBe("knocked");
    expect(e.size[0]).toBe(0);
  }, T);

  it("bonks whoever is underneath when it lands", () => {
    const st = ICICLE_STAGES[3];
    const e = newEaves(st);
    // find a lane and moment where someone will be underneath on landing
    let lane = -1;
    for (let guard = 0; guard < 6000 && lane < 0; guard++) {
      stepEaves(e, 1 / 60);
      for (let l = 0; l < 5; l++) if (e.size[l] >= BREAK && e.wait[l] === 0 && occupied(st, l, e.t + 0.45)) lane = l;
    }
    expect(lane).toBeGreaterThanOrEqual(0);
    const before = e.bonks;
    knock(e, lane);
    for (let i = 0; i < 40; i++) stepEaves(e, 1 / 60);
    expect(e.bonks).toBeGreaterThan(before);
  }, T);

  it("can be cleared on every stage by the autopilot, with stars", () => {
    for (const st of ICICLE_STAGES) {
      const e = pilot(st);
      expect(e.won, `stage ${st.stage + 1}`).toBe(true);
      expect(starsFor(e)).toBeGreaterThanOrEqual(2);
    }
  }, T);

  it("is beatable by most human-paced players on every stage", () => {
    for (const st of ICICLE_STAGES) {
      const wins = [0.3, 0.37, 0.44].filter((react) => pilot(st, { react, tapGap: 0.32 }).won).length;
      expect(wins, `stage ${st.stage + 1}`).toBeGreaterThanOrEqual(2);
    }
  }, T);

  it("loses if you never tap, or tap without looking below", () => {
    for (const st of ICICLE_STAGES) {
      expect(pilot(st, { mode: "never" }).won).toBe(false);
      expect(pilot(st, { mode: "eager", react: 0.3, tapGap: 0.3 }).won).toBe(false);
    }
  }, T);
});
