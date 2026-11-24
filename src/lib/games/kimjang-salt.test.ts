import { describe, expect, it } from "vitest";
import { COLS, KIMJANG_STAGES, ROWS, STAGE_COUNT, cellCenter, done, hi, judge, kernel, lo, newTray, pilot, setHand, starsFor, stepTray } from "./kimjang-salt";

const T = 60_000;

describe("kimjang-salt", () => {
  it("has 30 stages with more cabbages, faster salt and tighter bands later", () => {
    expect(KIMJANG_STAGES).toHaveLength(STAGE_COUNT);
    expect(KIMJANG_STAGES[29].cabbages.length).toBeGreaterThan(KIMJANG_STAGES[0].cabbages.length);
    expect(KIMJANG_STAGES[29].rate).toBeGreaterThan(KIMJANG_STAGES[0].rate);
    expect(KIMJANG_STAGES[29].cabbages[0].tol).toBeLessThan(KIMJANG_STAGES[0].cabbages[0].tol);
  }, T);

  it("wants more salt on the thick stems than on the leaf tips", () => {
    for (const st of KIMJANG_STAGES) {
      const c = st.cabbages[0];
      const top = c.target.slice(0, COLS).reduce((s, v) => s + v, 0);
      const bottom = c.target.slice((ROWS - 1) * COLS).reduce((s, v) => s + v, 0);
      expect(bottom).toBeGreaterThan(top);
    }
  }, T);

  it("salts thickest under the hand and a little around it", () => {
    expect(kernel(0, 0)).toBe(1);
    expect(kernel(60, 0)).toBeGreaterThan(0);
    expect(kernel(60, 0)).toBeLessThan(0.1);
    const k = newTray(KIMJANG_STAGES[0]);
    const c = cellCenter(5);
    setHand(k, c.x, c.y);
    stepTray(k, 0.5);
    expect(k.salt[5]).toBeCloseTo(KIMJANG_STAGES[0].rate * 0.5, 5);
    expect(k.salt[6]).toBeGreaterThan(0);
    expect(k.salt[6]).toBeLessThan(k.salt[5] / 10);
  }, T);

  it("judges each patch raw, good or too salty", () => {
    const c = KIMJANG_STAGES[0].cabbages[0];
    const salt = c.target.map((_, i) => (i === 0 ? lo(c, 0) * 0.5 : i === 1 ? hi(c, 1) * 1.5 : c.target[i]));
    expect(judge(c, salt)).toEqual({ good: COLS * ROWS - 2, raw: 1, salty: 1 });
    const k = newTray(KIMJANG_STAGES[0]);
    k.salt = salt;
    done(k);
    expect(k.good).toBe(COLS * ROWS - 2);
    expect(k.idx).toBe(1);
  }, T);

  it("can be cleared on every stage by the autopilot", () => {
    for (const st of KIMJANG_STAGES) {
      const k = pilot(st);
      expect(k.won, `stage ${st.stage + 1}`).toBe(true);
      expect(starsFor(k)).toBe(3);
    }
  }, T);

  it("can be cleared by unseen human-like salters", () => {
    for (const st of KIMJANG_STAGES) {
      const wins = [11, 12, 13, 14].filter((seed) => pilot(st, { think: 0.27, speed: 650, aim: 10, lift: 0.14, seed }).won).length;
      expect(wins, `stage ${st.stage + 1}`).toBeGreaterThanOrEqual(3);
    }
  }, T);

  it("loses by salting every patch alike, by doing nothing, or by sloppy salting", () => {
    let sloppyLosses = 0;
    for (const st of KIMJANG_STAGES) {
      expect(pilot(st, { mode: "even" }).won, `stage ${st.stage + 1}`).toBe(false);
      expect(pilot(st, { mode: "idle" }).won).toBe(false);
      if (!pilot(st, { think: 0.4, speed: 500, aim: 22, lift: 0.3, seed: 5 }).won) sloppyLosses++;
    }
    expect(sloppyLosses).toBeGreaterThanOrEqual(25);
  }, T);
});
