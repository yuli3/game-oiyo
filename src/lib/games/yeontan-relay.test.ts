import { describe, expect, it } from "vitest";
import { FLIGHT, STAGE_COUNT, YEONTAN_STAGES, gripTime, newAlley, pass, pilot, starsFor, stepAlley } from "./yeontan-relay";

const T = 60_000;

describe("yeontan-relay", () => {
  it("has 30 stages with longer lines and quicker trucks later", () => {
    expect(YEONTAN_STAGES).toHaveLength(STAGE_COUNT);
    expect(YEONTAN_STAGES[29].line.length).toBeGreaterThan(YEONTAN_STAGES[0].line.length);
    expect(YEONTAN_STAGES[29].arrivals.length).toBeGreaterThan(YEONTAN_STAGES[0].arrivals.length);
  }, T);

  it("varies each person's grip time from catch to catch", () => {
    const st = YEONTAN_STAGES[0];
    const times = [0, 1, 2, 3, 4, 5].map((k) => gripTime(st, 1, k));
    expect(new Set(times.map((x) => x.toFixed(3))).size).toBeGreaterThan(3);
  }, T);

  it("breaks a briquette passed before the grip, and passes one after it", () => {
    const st = YEONTAN_STAGES[0];
    const a = newAlley(st);
    while (!a.holding[0]) stepAlley(a, 1 / 60);
    expect(pass(a, 0)).toBe("fumbled");
    expect(a.broken).toBe(1);
    while (!a.holding[0]) stepAlley(a, 1 / 60);
    while (a.t < a.readyAt[0]) stepAlley(a, 1 / 60);
    expect(pass(a, 0)).toBe("passed");
    for (let i = 0; i < Math.ceil(FLIGHT * 60) + 1; i++) stepAlley(a, 1 / 60);
    expect(a.holding[1]).toBe(true);
  }, T);

  it("drops a briquette held too long", () => {
    const st = YEONTAN_STAGES[0];
    const a = newAlley(st);
    for (let i = 0; i < 60 * (st.line[0].hold + 2); i++) stepAlley(a, 1 / 60);
    expect(a.broken).toBeGreaterThan(0);
  }, T);

  it("can be finished on every stage by the autopilot", () => {
    for (const st of YEONTAN_STAGES) {
      const a = pilot(st);
      expect(a.won, `stage ${st.stage + 1}`).toBe(true);
      expect(starsFor(a)).toBe(3);
    }
  }, T);

  it("can be finished by unseen human-like line leaders", () => {
    for (const st of YEONTAN_STAGES) {
      const wins = [{ gap: 0.27, lag: 0.17 }, { gap: 0.32, lag: 0.2 }, { gap: 0.3, lag: 0.25 }, { gap: 0.36, lag: 0.15 }].filter((o) => pilot(st, o).won).length;
      expect(wins, `stage ${st.stage + 1}`).toBe(4);
    }
  }, T);

  it("loses by tapping everyone in turn, by not tapping, or by being slow", () => {
    for (const st of YEONTAN_STAGES) {
      expect(pilot(st, { mode: "spam", gap: 0.12 }).won, `stage ${st.stage + 1}`).toBe(false);
      expect(pilot(st, { mode: "idle" }).won).toBe(false);
      expect(pilot(st, { gap: 0.6, lag: 0.4 }).won).toBe(false);
    }
  }, T);
});
