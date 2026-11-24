import { describe, expect, it } from "vitest";
import { CRANE_STAGES, STAGE_COUNT, allowed, answer, birdAt, close, currentFlock, newCensus, pilot, reds, starsFor, stepCensus } from "./crane-count";

const T = 60_000;
const HUMANS = [11, 12, 13, 14].map((seed) => ({ rate: 2.9, spread: 0.22, glance: 3, seed }));

describe("crane-count", () => {
  it("has 30 census days with bigger, faster flocks and grey cranes mixed in later", () => {
    expect(CRANE_STAGES).toHaveLength(STAGE_COUNT);
    const size = (i: number) => CRANE_STAGES[i].flocks.reduce((s, f) => s + f.birds.length, 0) / CRANE_STAGES[i].flocks.length;
    expect(size(29)).toBeGreaterThan(size(0) * 2);
    expect(CRANE_STAGES[29].flocks[0].time).toBeLessThan(CRANE_STAGES[0].flocks[0].time);
    expect(CRANE_STAGES[0].flocks.every((f) => reds(f) === f.birds.length)).toBe(true);
    expect(CRANE_STAGES[29].flocks.some((f) => reds(f) < f.birds.length)).toBe(true);
    expect(CRANE_STAGES[29].tolerance).toBeLessThan(CRANE_STAGES[0].tolerance);
  }, T);

  it("flies each flock across the sky and then asks for the count", () => {
    const st = CRANE_STAGES[3];
    const f = st.flocks[0];
    const bird = f.birds[0];
    expect(birdAt(f, bird, 0).x).toBeLessThan(0);
    expect(birdAt(f, bird, f.time).x).toBeGreaterThan(360);
    const c = newCensus(st);
    expect(answer(c, 5)).toBeNull(); // still flying
    while (!stepCensus(c, 1 / 30));
    expect(c.phase).toBe("answer");
  }, T);

  it("accepts a count within the stage's tolerance and no further", () => {
    const st = CRANE_STAGES[10];
    const f = st.flocks[0];
    const n = reds(f);
    const k = allowed(st, f);
    expect(close(st, f, n + k)).toBe(true);
    expect(close(st, f, n - k)).toBe(true);
    expect(close(st, f, n + k + 1)).toBe(false);
    const c = newCensus(st);
    while (c.phase === "fly") stepCensus(c, 1 / 30);
    expect(answer(c, n)).toBe(true);
    expect(currentFlock(c)).toBe(st.flocks[1]);
  }, T);

  it("gives an exact counter three stars on every day", () => {
    for (const st of CRANE_STAGES) {
      const c = pilot(st, { mode: "exact" });
      expect(c.won).toBe(true);
      expect(starsFor(c)).toBe(3);
    }
  }, T);

  it("lets human-like counters (who count some and estimate the rest) clear every day", () => {
    let wins = 0;
    for (const st of CRANE_STAGES) {
      const w = HUMANS.filter((o) => pilot(st, o).won).length;
      expect(w).toBeGreaterThanOrEqual(3);
      wins += w;
    }
    expect(wins).toBeGreaterThanOrEqual(115);
  }, T);

  it("does not let a fixed guess or a slow, sloppy count get by", () => {
    expect(CRANE_STAGES.filter((st) => !pilot(st, { mode: "guess" }).won).length).toBeGreaterThanOrEqual(25);
    // a slow counter who takes in one bird at a time and guesses loosely misses far more often than the human-like ones
    const slow = [1, 2, 3, 4, 5].reduce((n, seed) => n + CRANE_STAGES.filter((st) => !pilot(st, { rate: 1.5, spread: 0.4, glance: 1, seed }).won).length, 0);
    expect(slow).toBeGreaterThanOrEqual(40);
  }, T);

  it("is deterministic", () => {
    expect(pilot(CRANE_STAGES[12], HUMANS[0]).answers).toEqual(pilot(CRANE_STAGES[12], HUMANS[0]).answers);
  }, T);
});
