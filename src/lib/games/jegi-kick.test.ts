import { describe, expect, it } from "vitest";
import { FIELD_W, STAGES, STAGE_COUNT, WIN_POINTS, newYard, pilot, stageCleared, starsFor, stepYard, tapAt } from "./jegi-kick";

function run(stage: number, seed: number, withPilot: boolean, limit = 90): ReturnType<typeof newYard> {
  const y = newYard(stage, seed);
  let t = 0;
  while (!y.over && t < limit) {
    if (withPilot) pilot(y);
    stepYard(y, 1 / 60);
    t += 1 / 60;
    if (y.kicks >= STAGES[stage].target * 2) break;
  }
  return y;
}

describe("jegi-kick", () => {
  it("has 30 stages that grow from calm yard to two jegis", () => {
    expect(STAGE_COUNT).toBe(30);
    expect(STAGES.slice(0, 5).every((s) => s.wind === 0 && s.magpies === 0 && s.jegis === 1)).toBe(true);
    expect(STAGES.slice(5, 10).every((s) => s.wind > 0)).toBe(true);
    expect(STAGES.slice(10, 15).every((s) => s.magpies > 0)).toBe(true);
    expect(STAGES.slice(15, 20).every((s) => s.ice)).toBe(true);
    expect(STAGES.slice(25).every((s) => s.jegis === 2)).toBe(true);
    for (const s of STAGES) expect(s.target).toBeGreaterThanOrEqual(5);
  });

  it("drops the jegi when nobody kicks", () => {
    for (const stage of [0, 12, 27]) {
      const y = run(stage, 3, false, 10);
      expect(y.over).toBe(true);
      expect(y.kicks).toBe(0);
    }
  });

  it("a sharp pilot clears every single-jegi stage", () => {
    for (let s = 0; s < 25; s++) {
      for (const seed of [11, 29]) expect(stageCleared(run(s, seed, true)), `stage ${s + 1} seed ${seed}`).toBe(true);
    }
  });

  it("two-jegi stages are clearable but harder", () => {
    let clears = 0;
    for (let s = 25; s < 30; s++) for (const seed of [5, 17, 41]) if (stageCleared(run(s, seed, true))) clears += 1;
    expect(clears).toBeGreaterThanOrEqual(9);
  });

  it("stars scale with how far past the target you go", () => {
    expect(starsFor(4, 5)).toBe(0);
    expect(starsFor(5, 5)).toBe(1);
    expect(starsFor(8, 5)).toBe(2);
    expect(starsFor(10, 5)).toBe(3);
  });

  it("two players: taps pick a side and a missed jegi scores for the other side", () => {
    const y = newYard(0, 9, true);
    expect(tapAt(y, 30)).toBe(0);
    expect(tapAt(y, FIELD_W - 30)).toBe(1);
    // left pilots well, right side idles: left should win the match
    let t = 0;
    while (!y.over && t < 120) {
      pilot(y, 0);
      stepYard(y, 1 / 60);
      t += 1 / 60;
    }
    expect(y.over).toBe(true);
    expect(y.score[0]).toBe(WIN_POINTS);
  });
});
