import { describe, expect, it } from "vitest";
import { BALL_R, LEFT, POCKETS, POOL_STAGES, SPOT, STAGE_COUNT, TOP, newTable, pilot, runOut, starsFor, strike, type PoolStage } from "./pocket-shot";

const T = 60_000;
// shakier than the players each table was built against
const HUMANS = [11, 12, 13, 14].map((seed) => ({ aim: 0.014, power: 0.06, seed }));

const one = (balls: Array<[number, number]>, cue: [number, number], shots = 3): PoolStage => ({ stage: 0, balls, cue, shots, par: 1 });

describe("pocket-shot", () => {
  it("knocks a ball straight on into the corner pocket", () => {
    // white, ball and the top-left pocket on one diagonal
    const t = newTable(one([[120, 180]], [200, 260]));
    strike(t, Math.atan2(-1, -1), 600);
    runOut(t);
    expect(t.balls[0].down).toBe(true);
    expect(t.won).toBe(true);
    expect(t.shots).toBe(1);
    expect(starsFor(t)).toBe(3);
  }, T);

  it("bounces off the cushions and slows to a stop", () => {
    const t = newTable(one([[300, 480]], [180, 300]));
    strike(t, -Math.PI / 2, 500); // straight up into the top cushion
    runOut(t);
    expect(t.moving).toBe(false);
    expect(t.cue.down).toBe(false);
    expect(t.cue.y).toBeGreaterThan(TOP + BALL_R);
    expect(t.shots).toBe(1);
    expect(t.over).toBe(false);
  }, T);

  it("puts the white ball back on its spot after it drops", () => {
    const st = one([[300, 480]], [120, 180]);
    const t = newTable(st);
    strike(t, Math.atan2(TOP - 180, LEFT - 120), 700);
    runOut(t);
    expect(t.scratch).toBe(true);
    expect(t.cue.down).toBe(false);
    expect([t.cue.x, t.cue.y]).toEqual(st.cue);
    expect(POCKETS).toHaveLength(6);
    expect(SPOT[1]).toBeGreaterThan(TOP);
  }, T);

  it("has 30 tables from one ball up to six", () => {
    expect(POOL_STAGES).toHaveLength(STAGE_COUNT);
    expect(POOL_STAGES[0].balls).toHaveLength(1);
    expect(POOL_STAGES[29].balls).toHaveLength(6);
    for (const st of POOL_STAGES) expect(st.shots).toBeGreaterThan(st.par);
  }, T);

  it("lets the careful player clear every table with three stars", () => {
    for (const st of POOL_STAGES) {
      const t = pilot(st);
      expect(t.won).toBe(true);
      expect(starsFor(t)).toBe(3);
    }
  }, T);

  it("lets shakier human-like players clear most tables", () => {
    let wins = 0;
    for (const st of POOL_STAGES) for (const o of HUMANS) if (pilot(st, o).won) wins++;
    expect(wins).toBeGreaterThanOrEqual(100);
  }, T);

  it("rarely clears a table shooting at random", () => {
    let wins = 0;
    for (const st of POOL_STAGES) for (const seed of [21, 22, 23, 24]) if (pilot(st, { mode: "random", seed }).won) wins++;
    expect(wins).toBeLessThan(10);
    for (const st of POOL_STAGES) for (const seed of [1, 2, 3, 4, 5, 6]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
