import { describe, expect, it } from "vitest";
import { BALL_R, CHALK_STAGES, STAGE_COUNT, addPoint, draw, lengthOf, newBoard, pilot, release, runOut, starsFor, step, type ChalkStage } from "./chalk-roll";

const T = 60_000;
// shakier hands than the drawers each board was built against
const HUMANS = [11, 12, 13, 14].map((seed) => ({ shake: 6, seed }));

const flat: ChalkStage = { stage: 0, ball: [60, 100], pail: { x: 200, y: 400, w: 70, h: 44 }, walls: [], tacks: [], ink: 300, plan: [], par: 200 };

describe("chalk-roll", () => {
  it("draws chalk only until it runs out, skipping points too close together", () => {
    const b = newBoard({ ...flat, ink: 100 });
    addPoint(b, 0, 200);
    expect(addPoint(b, 2, 200)).toBe(false); // too close
    addPoint(b, 80, 200);
    addPoint(b, 200, 200); // cut short at 100 px of chalk
    expect(b.used).toBeCloseTo(100, 5);
    expect(b.line[b.line.length - 1][0]).toBeCloseTo(100, 5);
    expect(addPoint(b, 220, 200)).toBe(false);
  }, T);

  it("drops the marble only when the chalk is lifted; it rests on a flat line, and a marble that stays put is out", () => {
    const b = newBoard(flat);
    draw(b, [[20, 160], [120, 160]]);
    for (let n = 0; n < 100; n++) step(b);
    expect(b.y).toBe(100); // still waiting
    release(b);
    for (let n = 0; n < 240; n++) step(b);
    expect(b.y).toBeGreaterThan(160 - BALL_R - 1);
    expect(b.y).toBeLessThan(160 - BALL_R + 1);
    expect(b.over).toBe(false);
    for (let n = 0; n < 480; n++) step(b);
    expect(b.over).toBe(true);
    expect(b.won).toBe(false);
  }, T);

  it("rolls down a slope into the pail, and loses with no line", () => {
    const b = newBoard(flat);
    draw(b, [[40, 130], [180, 340]]);
    runOut(b);
    expect(b.won).toBe(true);
    const none = runOut(newBoard(flat));
    expect(none.won).toBe(false);
  }, T);

  it("has 30 boards, with ledges and thumbtacks coming in, and chalk to spare over each plan", () => {
    expect(CHALK_STAGES).toHaveLength(STAGE_COUNT);
    expect(CHALK_STAGES[0].tacks).toHaveLength(0);
    expect(CHALK_STAGES[0].walls).toHaveLength(0);
    expect(CHALK_STAGES[29].tacks.length).toBeGreaterThan(0);
    expect(CHALK_STAGES[29].walls.length).toBeGreaterThan(0);
    for (const st of CHALK_STAGES) {
      expect(Math.abs(lengthOf(st.plan) - st.par)).toBeLessThan(1);
      expect(st.ink).toBeGreaterThan(st.par * 2);
    }
  }, T);

  it("lands the marble on every board with the planned line, for three stars", () => {
    for (const st of CHALK_STAGES) {
      const b = pilot(st);
      expect(b.won).toBe(true);
      expect(starsFor(b)).toBe(3);
    }
  }, T);

  it("lets shakier human-like hands land the marble on almost every board", () => {
    let wins = 0;
    for (const st of CHALK_STAGES) for (const o of HUMANS) if (pilot(st, o).won) wins++;
    expect(wins).toBeGreaterThanOrEqual(100);
  }, T);

  it("almost never lands it with a line drawn at random", () => {
    let wins = 0;
    for (const st of CHALK_STAGES) for (const seed of [21, 22, 23, 24]) if (pilot(st, { mode: "random", seed }).won) wins++;
    expect(wins).toBeLessThan(10);
    for (const st of CHALK_STAGES) for (const seed of [1, 2, 3, 4, 5, 6]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
