import { describe, expect, it } from "vitest";
import { CX, CY, DART_STAGES, R, SECTORS, STAGE_COUNT, newOche, pilot, pointsAt, reticle, starsFor, step, throwDart, type DartStage } from "./dart-drift";

const T = 60_000;
// slower and shakier than the throwers each stage was built against
const HUMANS = [11, 12, 13, 14].map((seed) => ({ react: 0.32, timing: 0.03, scatter: 3, window: 7, seed }));

describe("dart-drift", () => {
  it("scores the bull, the rings and the numbers", () => {
    expect(pointsAt(CX, CY)).toBe(50);
    expect(pointsAt(CX, CY - 0.1 * R)).toBe(25);
    expect(pointsAt(CX, CY - 0.3 * R)).toBe(20); // straight up is 20
    expect(pointsAt(CX, CY - 0.6 * R)).toBe(60); // the treble
    expect(pointsAt(CX, CY - 0.96 * R)).toBe(40); // the double
    expect(pointsAt(CX, CY - 1.1 * R)).toBe(0); // off the board
    expect(SECTORS).toHaveLength(20);
    expect(new Set(SECTORS).size).toBe(20);
  }, T);

  it("throws where the swaying ring is, and ends after the last dart", () => {
    const st: DartStage = { stage: 0, darts: 2, amp: [40, 30], rate: [1, 1.3], phase: [0, 0], centre: [CX, CY], need: 60, par: 100 };
    const o = newOche(st);
    expect(throwDart(o)).toBe(50); // the ring starts on the bull
    step(o, 1);
    const p = reticle(st, 1);
    expect(throwDart(o)).toBe(pointsAt(p.x, p.y));
    expect(o.over).toBe(true);
    expect(o.won).toBe(o.total >= 60);
  }, T);

  it("has 30 stages from 3 darts up to 8, swaying wider and faster", () => {
    expect(DART_STAGES).toHaveLength(STAGE_COUNT);
    expect(DART_STAGES[0].darts).toBe(3);
    expect(DART_STAGES[29].darts).toBe(8);
    expect(DART_STAGES[29].amp[0]).toBeGreaterThan(DART_STAGES[0].amp[0]);
    expect(DART_STAGES[29].rate[0]).toBeGreaterThan(DART_STAGES[0].rate[0]);
  }, T);

  it("lets quick, careful throwers clear every stage with three stars", () => {
    for (const st of DART_STAGES) {
      const o = pilot(st, { react: 0.22, timing: 0.008, scatter: 1, window: 5 });
      expect(o.won).toBe(true);
      expect(starsFor(o)).toBe(3);
    }
  }, T);

  it("lets slower, shakier human-like throwers clear almost every stage", () => {
    let wins = 0;
    for (const st of DART_STAGES) for (const o of HUMANS) if (pilot(st, o).won) wins++;
    expect(wins).toBeGreaterThanOrEqual(112);
  }, T);

  it("rarely scores enough throwing at random", () => {
    let wins = 0;
    for (const st of DART_STAGES) for (const seed of [21, 22, 23, 24]) if (pilot(st, { mode: "random", seed }).won) wins++;
    expect(wins).toBeLessThan(10);
    for (const st of DART_STAGES) for (const seed of [1, 2, 3, 4, 5, 6]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
