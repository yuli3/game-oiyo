import { describe, expect, it } from "vitest";
import { HEARTS, LAUNCH, REACH, RIVER, STAGE_COUNT, VINE_STAGES, hold, letGo, newLeap, pilot, starsFor, step, swingAngle, vineFor, type VineStage } from "./vine-leap";

const T = 60_000;
// shakier than the swingers each course was built against
const HUMANS = [11, 12, 13, 14].map((seed) => ({ mode: "human" as const, timing: 0.1, angle: 0.17, seed }));

const course = (hooks: Array<[number, number]>): VineStage => ({ stage: 0, hooks, bananas: [], goal: 5000, plan: [] });

describe("vine-leap", () => {
  it("grabs the nearest vine ahead within reach, and only one ahead", () => {
    const [x, y] = LAUNCH;
    const l = newLeap(course([[x + 100, y - 80], [x - 100, y - 80], [x + REACH + 50, y]]));
    expect(vineFor(l)).toBe(0);
    expect(hold(l)).toBe(true);
    expect(hold(l)).toBe(false); // already holding
    const far = newLeap(course([[x + REACH + 50, y]]));
    expect(hold(far)).toBe(false);
  }, T);

  it("swings on a held vine at its length, and flies free after letting go", () => {
    const [x, y] = LAUNCH;
    const l = newLeap(course([[x + 60, y - 100]]));
    hold(l);
    const len = l.len;
    for (let n = 0; n < 240; n++) {
      step(l);
      expect(Math.hypot(l.x - (x + 60), l.y - (y - 100))).toBeLessThanOrEqual(len + 0.5);
    }
    expect(Math.abs(swingAngle(l))).toBeLessThan(Math.PI);
    letGo(l);
    expect(l.hook).toBe(-1);
    expect(swingAngle(l)).toBe(0);
  }, T);

  it("loses a heart in the river and starts again, until the hearts run out", () => {
    const l = newLeap(course([]));
    let splashes = 0;
    for (let n = 0; n < 4000 && !l.over; n++) if (step(l).splash) splashes++;
    expect(splashes).toBe(HEARTS);
    expect(l.over).toBe(true);
    expect(l.won).toBe(false);
    expect(l.y).toBeLessThan(RIVER + 40);
  }, T);

  it("has 30 courses, growing from 3 vines to 12, each with three bananas", () => {
    expect(VINE_STAGES).toHaveLength(STAGE_COUNT);
    expect(VINE_STAGES[0].hooks).toHaveLength(3);
    expect(VINE_STAGES[29].hooks).toHaveLength(12);
    for (const st of VINE_STAGES) {
      expect(st.bananas).toHaveLength(3);
      expect(st.plan).toHaveLength(st.hooks.length);
      for (const [t0, t1] of st.plan) expect(t1).toBeGreaterThan(t0);
    }
  }, T);

  it("crosses every course with the planned holds, every banana and no splash, for three stars", () => {
    for (const st of VINE_STAGES) {
      const l = pilot(st);
      expect(l.won).toBe(true);
      expect(l.falls).toBe(0);
      expect(starsFor(l)).toBe(3);
    }
  }, T);

  it("lets shakier human-like swingers, who hold after the top of each leap and let go by eye, cross almost every course", () => {
    let wins = 0;
    for (const st of VINE_STAGES) for (const o of HUMANS) if (pilot(st, o).won) wins++;
    expect(wins).toBeGreaterThanOrEqual(105);
  }, T);

  it("almost never crosses holding and letting go at random", () => {
    let wins = 0;
    for (const st of VINE_STAGES) for (const seed of [21, 22, 23, 24]) if (pilot(st, { mode: "random", seed }).won) wins++;
    expect(wins).toBeLessThan(10);
    for (const st of VINE_STAGES) for (const seed of [1, 2, 3, 4, 5, 6]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
