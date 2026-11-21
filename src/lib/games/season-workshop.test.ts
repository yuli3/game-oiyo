import { describe, expect, it } from "vitest";
import {
  DONGJI_INDEX, OFFLINE_CAP_S, TERMS, TERM_COUNT, applyOffline, bestUpgrade, buyUpgrade, createWorkshop, nextTerm,
  tap, termDone, termForDate, termGoal, tick, upgradeCost,
} from "./season-workshop";

describe("season workshop terms", () => {
  it("has the 24 solar terms in order with 동지 as term 22", () => {
    expect(TERMS).toHaveLength(TERM_COUNT);
    expect(TERMS[0].name.ko).toBe("입춘");
    expect(TERMS[DONGJI_INDEX].name.ko).toBe("동지");
    expect(DONGJI_INDEX).toBe(21);
    for (const t of TERMS) for (const v of [...Object.values(t.name), ...Object.values(t.item)]) expect(v.length).toBeGreaterThan(0);
  });

  it("finds the solar term for a date", () => {
    expect(TERMS[termForDate(new Date(2026, 11, 21))].id).toBe("dongji");
    expect(TERMS[termForDate(new Date(2026, 11, 31))].id).toBe("dongji");
    expect(TERMS[termForDate(new Date(2027, 0, 2))].id).toBe("dongji");
    expect(TERMS[termForDate(new Date(2027, 0, 6))].id).toBe("sohan");
    expect(TERMS[termForDate(new Date(2026, 10, 21))].id).toBe("ipdong");
    expect(TERMS[termForDate(new Date(2026, 1, 4))].id).toBe("ipchun");
  });
});

describe("season workshop economy", () => {
  it("every term can be finished by a steady player, none takes too long", () => {
    let w = createWorkshop();
    let t = 0;
    let start = 0;
    const took: number[] = [];
    while (took.length < TERM_COUNT && t < 3 * 3600) {
      for (let k = 0; k < 3; k++) w = tap(w);
      w = tick(w, 1);
      t += 1;
      let u;
      while ((u = bestUpgrade(w, 3))) w = buyUpgrade(w, u);
      if (termDone(w)) {
        took.push(t - start);
        start = t;
        w = nextTerm(w);
      }
    }
    expect(took).toHaveLength(TERM_COUNT);
    expect(took[0]).toBeGreaterThanOrEqual(5);
    for (const s of took) expect(s).toBeLessThan(25 * 60);
    expect(t).toBeLessThan(2 * 3600);
  });

  it("goals grow and upgrades get pricier", () => {
    for (let i = 1; i < TERM_COUNT; i++) expect(termGoal(i)).toBeGreaterThan(termGoal(i - 1));
    const w = { ...createWorkshop(), coins: 1e9 };
    for (const id of ["tool", "helper", "stove"] as const) expect(upgradeCost(buyUpgrade(w, id), id)).toBeGreaterThan(upgradeCost(w, id));
    expect(buyUpgrade(createWorkshop(), "stove")).toEqual(createWorkshop());
  });

  it("stops at the goal and only then moves to the next term", () => {
    let w = createWorkshop();
    expect(nextTerm(w)).toBe(w);
    w = tick({ ...w, helpers: 50 }, 1000);
    expect(w.made).toBe(termGoal(0));
    expect(tap(w)).toEqual(w);
    expect(nextTerm(w).term).toBe(1);
    expect(nextTerm(w).made).toBe(0);
  });

  it("offline progress is half speed and capped at two hours", () => {
    const w = { ...createWorkshop(1000), helpers: 1, term: 23 };
    const short = applyOffline(w, 1000 + 10_000);
    expect(short.seconds).toBe(0);
    const long = applyOffline(w, 1000 + 10 * 3600 * 1000);
    expect(long.seconds).toBe(OFFLINE_CAP_S);
    expect(long.earned).toBeCloseTo(OFFLINE_CAP_S * 0.5 * 0.4, 5);
  });
});
