import { describe, expect, it } from "vitest";
import { IPCHUN_STAGES, STAGE_COUNT, STROKES, W_MIN, W_STILL, average, hand, inked, judgeStroke, pilot, starsFor, strokePath, widthAt } from "./ipchun-brush";

const T = 60_000;

describe("ipchun-brush", () => {
  it("has 30 stages that go round the eight strokes with more strokes and tighter limits", () => {
    expect(IPCHUN_STAGES).toHaveLength(STAGE_COUNT);
    expect(STROKES).toHaveLength(8);
    expect(IPCHUN_STAGES[29].strokes.length).toBeGreaterThan(IPCHUN_STAGES[0].strokes.length);
    expect(IPCHUN_STAGES[29].tol).toBeLessThan(IPCHUN_STAGES[0].tol);
    expect(IPCHUN_STAGES[29].wTol).toBeLessThan(IPCHUN_STAGES[0].wTol);
  }, T);

  it("lays a thick line slowly and a thin one fast", () => {
    const slow = inked(Array.from({ length: 60 }, (_, i) => ({ x: 100 + i * 0.5, y: 100, t: i / 60 })));
    const fast = inked(Array.from({ length: 60 }, (_, i) => ({ x: 100 + i * 8, y: 100, t: i / 60 })));
    expect(slow[59].w).toBeGreaterThan(fast[59].w + 10);
    expect(slow[59].w).toBeLessThanOrEqual(W_STILL);
    expect(fast[59].w).toBeGreaterThanOrEqual(W_MIN);
  }, T);

  it("swells the right-falling stroke before its tip and thins the rising one", () => {
    expect(widthAt("rightFall", 0.66)).toBeGreaterThan(widthAt("rightFall", 0));
    expect(widthAt("rightFall", 1)).toBeLessThan(widthAt("rightFall", 0.66));
    expect(widthAt("rising", 1)).toBeLessThan(widthAt("rising", 0));
  }, T);

  it("scores a careful stroke well and a stroke drawn elsewhere badly", () => {
    const good = judgeStroke(strokePath("longLeft"), hand("longLeft"), 15, 4);
    expect(good.score).toBeGreaterThan(0.8);
    const off = hand("longLeft").map((p) => ({ ...p, x: p.x + 60 }));
    expect(judgeStroke(strokePath("longLeft"), off, 15, 4).score).toBeLessThan(0.2);
  }, T);

  it("can be written on every stage by the autopilot", () => {
    for (const st of IPCHUN_STAGES) {
      const sh = pilot(st);
      expect(sh.won, `stage ${st.stage + 1}`).toBe(true);
      expect(starsFor(sh)).toBeGreaterThanOrEqual(2);
      expect(average(sh)).toBeGreaterThan(st.mark);
    }
  }, T);

  it("can be written by unseen human-like hands", () => {
    for (const st of IPCHUN_STAGES) {
      const wins = [11, 12, 13, 14].filter((seed) => pilot(st, { wobble: 4.5, speedErr: 0.22, ease: 0.16, seed }).won).length;
      expect(wins, `stage ${st.stage + 1}`).toBeGreaterThanOrEqual(2);
    }
  }, T);

  it("mostly fails at one even speed, with a shaky hand, or with badly judged speed", () => {
    let steady = 0;
    let shaky = 0;
    let rushed = 0;
    for (const st of IPCHUN_STAGES) {
      if (!pilot(st, { mode: "steady", wobble: 3 }).won) steady++;
      if (!pilot(st, { wobble: 14, speedErr: 0.2, ease: 0.15, seed: 3 }).won) shaky++;
      if (!pilot(st, { wobble: 4, speedErr: 0.6, ease: 0.3, seed: 4 }).won) rushed++;
    }
    expect(steady).toBeGreaterThanOrEqual(22);
    expect(shaky).toBeGreaterThanOrEqual(26);
    expect(rushed).toBeGreaterThanOrEqual(27);
  }, T);
});
