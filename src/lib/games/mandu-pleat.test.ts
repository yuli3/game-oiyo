import { describe, expect, it } from "vitest";
import { MANDU_STAGES, STAGE_COUNT, gapOf, good, judgeSeam, newKitchen, pilot, press, release, starsFor, stepKitchen } from "./mandu-pleat";

const T = 60_000;

describe("mandu-pleat", () => {
  it("has 30 stages with more dumplings and quicker pleats later", () => {
    expect(MANDU_STAGES).toHaveLength(STAGE_COUNT);
    expect(MANDU_STAGES[29].dumplings.length).toBeGreaterThan(MANDU_STAGES[0].dumplings.length);
    const beat = (i: number) => {
      const ds = MANDU_STAGES[i].dumplings;
      return ds.reduce((s, d) => s + gapOf(d) / d.speed, 0) / ds.length;
    };
    expect(beat(29)).toBeLessThan(beat(0));
  }, T);

  it("judges a seam: even is sealed, bunched tears, sparse stays open", () => {
    const d = { fillRate: 0.5, lo: 0.5, hi: 0.7, pleats: 4, speed: 0.25, tol: 0.4 };
    expect(judgeSeam(d, [0.25, 0.5, 0.75])).toBe("");
    expect(judgeSeam(d, [0.25, 0.3, 0.75])).toBe("tear");
    expect(judgeSeam(d, [0.25, 0.5])).toBe("open");
  }, T);

  it("bursts when overfilled and is flat when underfilled", () => {
    const st = MANDU_STAGES[0];
    const k = newKitchen(st);
    press(k);
    while (k.level <= st.dumplings[0].hi) stepKitchen(k, 1 / 60);
    expect(release(k).done).toBe("burst");
    press(k);
    stepKitchen(k, 1 / 60);
    expect(release(k).done).toBe("flat");
  }, T);

  it("fills every tray on every stage with the autopilot", () => {
    for (const st of MANDU_STAGES) {
      const k = pilot(st);
      expect(k.won, `stage ${st.stage + 1}`).toBe(true);
      expect(good(k)).toBe(st.dumplings.length);
      expect(starsFor(k)).toBe(3);
    }
  }, T);

  it("is winnable by unseen human-like cooks", () => {
    for (const st of MANDU_STAGES) {
      const wins = [11, 12, 13, 14].filter((seed) => pilot(st, { lag: 0.18, jitter: 0.07, seed }).won).length;
      expect(wins, `stage ${st.stage + 1}`).toBeGreaterThanOrEqual(2);
    }
  }, T);

  it("loses by rushing the pleats, holding the spoon down, or not pleating", () => {
    for (const st of MANDU_STAGES) {
      expect(pilot(st, { mode: "rush" }).won).toBe(false);
      expect(pilot(st, { mode: "overfill" }).won).toBe(false);
      expect(pilot(st, { mode: "idle" }).won).toBe(false);
    }
  }, T);

  it("punishes sloppy timing on the late stages", () => {
    const late = MANDU_STAGES.slice(20);
    const losses = late.filter((st) => !pilot(st, { lag: 0.3, jitter: 0.16, seed: 3 }).won).length;
    expect(losses).toBeGreaterThanOrEqual(8);
  }, T);
});
