import { describe, expect, it } from "vitest";
import { COMMUTE_STAGES, STAGE_COUNT, carWith, current, decide, newRide, pilot, starsFor } from "./odd-commute";

const T = 60_000;
const HUMANS = [11, 12, 13, 14].map((seed) => ({ eye: 1, nerves: 0.03, seed }));

describe("odd-commute", () => {
  it("has 30 lines with busier cars, a longer way home and subtler changes later", () => {
    expect(COMMUTE_STAGES).toHaveLength(STAGE_COUNT);
    expect(COMMUTE_STAGES[29].car.length).toBeGreaterThan(COMMUTE_STAGES[0].car.length);
    expect(COMMUTE_STAGES[29].need).toBeGreaterThan(COMMUTE_STAGES[0].need);
    const kinds = (from: number, to: number) => new Set(COMMUTE_STAGES.slice(from, to).flatMap((st) => st.cars.filter(Boolean).map((a) => a!.change)));
    expect(kinds(0, 4).has("move")).toBe(false);
    expect(kinds(20, 30).size).toBeGreaterThan(kinds(0, 4).size);
    for (const st of COMMUTE_STAGES) expect(st.cars[0]).toBeNull(); // the first car is the one to learn
  }, T);

  it("shows exactly one change in an odd car", () => {
    const st = COMMUTE_STAGES[12];
    const a = st.cars.find(Boolean)!;
    const odd = carWith(st, a);
    const same = carWith(st, null);
    expect(same).toEqual(st.car);
    if (a.change === "gone") expect(odd).toHaveLength(st.car.length - 1);
    else if (a.change === "extra") expect(odd).toHaveLength(st.car.length + 1);
    else expect(odd.filter((t, i) => JSON.stringify(t) !== JSON.stringify(st.car[i]))).toHaveLength(1);
  }, T);

  it("counts a right call toward the station and sends you back to the start on a wrong one", () => {
    const st = COMMUTE_STAGES[4];
    const r = newRide(st);
    expect(decide(r, "on")).toBe(true); // the first car is ordinary
    expect(r.streak).toBe(1);
    while (current(r) === null) decide(r, "on");
    expect(decide(r, "on")).toBe(false); // missed a change
    expect(r.streak).toBe(0);
    expect(r.wrong).toBe(1);
  }, T);

  it("gets a rider who spots every change home with three stars on every line", () => {
    for (const st of COMMUTE_STAGES) {
      const r = pilot(st, { mode: "exact" });
      expect(r.won).toBe(true);
      expect(starsFor(r)).toBe(3);
    }
  }, T);

  it("gets human-like riders (an ordinary eye, a little nervy) home on most lines", () => {
    let wins = 0;
    for (const st of COMMUTE_STAGES) {
      const w = HUMANS.filter((o) => pilot(st, o).won).length;
      expect(w).toBeGreaterThanOrEqual(2);
      wins += w;
    }
    expect(wins).toBeGreaterThanOrEqual(100);
  }, T);

  it("does not let always going on, always turning back or coin flips reach the station", () => {
    for (const st of COMMUTE_STAGES) {
      expect(pilot(st, { mode: "on" }).won).toBe(false);
      expect(pilot(st, { mode: "back" }).won).toBe(false);
      for (const seed of [1, 2, 3, 4]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
    }
    const dull = COMMUTE_STAGES.reduce((n, st) => n + [1, 2, 3].filter((seed) => !pilot(st, { eye: 0.6, nerves: 0.1, seed }).won).length, 0);
    expect(dull).toBeGreaterThanOrEqual(40);
  }, T);
});
