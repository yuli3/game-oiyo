import { describe, expect, it } from "vitest";
import { BOOM_STAGES, RUN_SECONDS, STAGE_COUNT, bestBuy, buy, cost, newRun, pilot, rate, shortNumber, starsFor, step, tap } from "./number-boom";

const T = 60_000;
const HUMANS = [11, 12, 13, 14].map((seed) => ({ look: 1.2, taps: 3.5, seed }));

describe("number-boom", () => {
  it("has 30 one-minute runs whose chains grow and whose targets explode", () => {
    expect(BOOM_STAGES).toHaveLength(STAGE_COUNT);
    expect(BOOM_STAGES[29].machines.length).toBeGreaterThan(BOOM_STAGES[0].machines.length);
    for (let i = 5; i < STAGE_COUNT; i++) expect(BOOM_STAGES[i].target).toBeGreaterThan(BOOM_STAGES[i - 5].target);
    expect(BOOM_STAGES[29].target).toBeGreaterThan(1e24);
    expect(STAGE_COUNT * RUN_SECONDS).toBe(1800); // the whole game is half an hour
  }, T);

  it("multiplies the first machine's output through the chain, and charges more for every level", () => {
    const st = BOOM_STAGES[12];
    const r = newRun(st);
    const base = rate(r);
    r.coins = 1e300;
    const c0 = cost(r, 1);
    expect(buy(r, 1)).toBe(true);
    expect(rate(r)).toBeCloseTo(base * (1 + st.machines[1].step), 6);
    expect(cost(r, 1)).toBeGreaterThan(c0);
    expect(bestBuy(r)).toBeGreaterThanOrEqual(0);
    const fresh = newRun(st);
    expect(buy(fresh, st.machines.length - 1)).toBe(false); // can't afford the dearest at the start
    expect(tap(fresh)).toBeGreaterThan(0);
    step(fresh, 1);
    expect(fresh.coins).toBeGreaterThan(st.start);
  }, T);

  it("writes big numbers short in each language", () => {
    expect(shortNumber(12_345, "en")).toBe("12.3K");
    expect(shortNumber(3.2e8, "ko")).toBe("3.20억");
    expect(shortNumber(5e12, "ja")).toBe("5.00兆");
    expect(shortNumber(7.5e24, "fr")).toBe("7.50Sp");
  }, T);

  it("gives a sharp player three stars on every run", () => {
    for (const st of BOOM_STAGES) {
      const r = pilot(st);
      expect(r.won).toBe(true);
      expect(starsFor(r)).toBe(3);
    }
  }, T);

  it("lets human-like players (a look at the shop every second or so) clear most runs", () => {
    let wins = 0;
    for (const st of BOOM_STAGES) wins += HUMANS.filter((o) => pilot(st, o).won).length;
    expect(wins).toBeGreaterThanOrEqual(100);
  }, T);

  it("does not let one-machine, dearest-only, random or tap-only play reach the target", () => {
    for (const st of BOOM_STAGES) {
      expect(pilot(st, { mode: "first", look: 1, taps: 4 }).won).toBe(false);
      expect(pilot(st, { mode: "dear", look: 1, taps: 4 }).won).toBe(false);
      expect(pilot(st, { mode: "none", taps: 4 }).won).toBe(false);
      for (const seed of [1, 2, 3]) expect(pilot(st, { mode: "random", look: 1, taps: 4, seed }).won).toBe(false);
    }
  }, T);
});
