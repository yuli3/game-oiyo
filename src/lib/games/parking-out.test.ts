import { describe, expect, it } from "vitest";
import { MAX_BUMPS, PARKING_STAGES, STAGE_COUNT, blocker, canLeave, depth, newLot, pilot, squares, starsFor, tap } from "./parking-out";

const T = 60_000;
const HUMANS = [11, 12, 13, 14].map((seed) => ({ rash: 0.05, look: 1.3, seed }));

describe("parking-out", () => {
  it("has 30 car parks that grow, fill up and jam deeper", () => {
    expect(PARKING_STAGES).toHaveLength(STAGE_COUNT);
    expect(PARKING_STAGES[29].w).toBeGreaterThan(PARKING_STAGES[0].w);
    expect(PARKING_STAGES[29].cars.length).toBeGreaterThan(PARKING_STAGES[0].cars.length * 2);
    expect(depth(PARKING_STAGES[29])).toBeGreaterThan(depth(PARKING_STAGES[0]));
    for (const st of PARKING_STAGES) {
      expect(Number.isFinite(depth(st))).toBe(true);
      // no two cars share a square, and every car is inside the lot
      const seen = new Set<number>(st.pillars);
      for (const c of st.cars) for (const [x, y] of squares(c)) {
        expect(x >= 0 && y >= 0 && x < st.w && y < st.h).toBe(true);
        expect(seen.has(y * st.w + x)).toBe(false);
        seen.add(y * st.w + x);
      }
    }
  }, T);

  it("drives a car out when its road ahead is clear, and bumps when it is not", () => {
    const st = PARKING_STAGES[8];
    const l = newLot(st);
    const freeCar = st.cars.findIndex((_, i) => canLeave(st, l.out, i));
    const stuckCar = st.cars.findIndex((_, i) => !canLeave(st, l.out, i));
    expect(blocker(st, l.out, freeCar)).toBeNull();
    expect(tap(l, freeCar)).toBe("out");
    expect(tap(l, freeCar)).toBeNull();
    expect(tap(l, stuckCar)).toBe("bump");
    expect(l.bumps).toBe(1);
    for (let k = 1; k < MAX_BUMPS; k++) tap(l, stuckCar);
    expect(l.over).toBe(true);
    expect(l.won).toBe(false);
  }, T);

  it("gets a careful driver out of every car park with three stars", () => {
    for (const st of PARKING_STAGES) {
      const l = pilot(st, { look: 1.2 });
      expect(l.won).toBe(true);
      expect(starsFor(l)).toBe(3);
    }
  }, T);

  it("lets human-like drivers (who slip now and then) clear every car park", () => {
    let wins = 0;
    for (const st of PARKING_STAGES) {
      const w = HUMANS.filter((o) => pilot(st, o).won).length;
      expect(w).toBeGreaterThanOrEqual(3);
      wins += w;
    }
    expect(wins).toBeGreaterThanOrEqual(115);
  }, T);

  it("does not let tapping cars at random clear a car park", () => {
    for (const st of PARKING_STAGES) for (const seed of [1, 2, 3]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
