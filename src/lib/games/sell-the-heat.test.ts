import { describe, expect, it } from "vitest";
import { HEAT_STAGES, STAGE_COUNT, activeAt, handUp, newMorning, pilot, score, starsFor, stepMorning, tap } from "./sell-the-heat";

describe("sell-the-heat", () => {
  it("builds 30 mornings: more neighbours, quicker turns, shorter windows after the hand goes up", () => {
    expect(HEAT_STAGES).toHaveLength(STAGE_COUNT);
    const a = HEAT_STAGES[0];
    const z = HEAT_STAGES[STAGE_COUNT - 1];
    expect(z.turns.length).toBeGreaterThan(a.turns.length);
    const win = (st: typeof a) => {
      const r = st.turns.filter((t) => t.real);
      return r.reduce((s, t) => s + (t.call - t.tell), 0) / r.length;
    };
    expect(win(z)).toBeLessThan(win(a));
    for (const s of HEAT_STAGES) expect(s.turns.some((t) => !t.real)).toBe(true);
  });

  it("tapping each neighbour once their hand goes up sells every heat with 3 stars", () => {
    for (const s of HEAT_STAGES) {
      const m = pilot(s);
      expect(m.won, `morning ${s.stage + 1}`).toBe(true);
      expect(starsFor(m), `morning ${s.stage + 1}`).toBe(3);
    }
  });

  it("a human reacting in 0.3–0.45 s clears every morning", () => {
    for (const s of HEAT_STAGES) for (const seed of [5, 31, 47, 53]) expect(pilot(s, { react: 0.3, jitter: 0.15, seed }).won, `morning ${s.stage + 1} seed ${seed}`).toBe(true);
  });

  it("tapping everyone who turns, never tapping or tapping at random loses every morning", () => {
    for (const s of HEAT_STAGES) {
      expect(pilot(s, { mode: "any", react: 0.3 }).won, `morning ${s.stage + 1} any`).toBe(false);
      expect(pilot(s, { mode: "never" }).won, `morning ${s.stage + 1} never`).toBe(false);
      expect(pilot(s, { mode: "spam", seed: 3 }).won, `morning ${s.stage + 1} spam`).toBe(false);
    }
  });

  it("reacting too slowly (0.7–0.9 s) loses most of the later mornings", () => {
    let lost = 0;
    for (const s of HEAT_STAGES.slice(10)) if (!pilot(s, { react: 0.7, jitter: 0.2, seed: 9 }).won) lost++;
    expect(lost).toBeGreaterThanOrEqual(15);
  });

  it("sell before the call, buy after it, and tapping a looker or an empty window is rude", () => {
    const s = HEAT_STAGES[0];
    const tr = s.turns[0];
    const m = newMorning(s);
    expect(tap(m, (tr.win + 1) % 5)).toBe("rude");
    stepMorning(m, tr.at + tr.tell + 0.01);
    expect(activeAt(m, tr.win)).toBe(0);
    expect(handUp(m, 0)).toBe(true);
    expect(tap(m, tr.win)).toBe("sold");
    expect(score(m)).toBe(0);
    // let the next real caller call first
    const m2 = newMorning(s);
    stepMorning(m2, tr.at + tr.call + 0.01);
    expect(m2.bought).toBe(1);
  });
});
