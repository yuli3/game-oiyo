import { describe, expect, it } from "vitest";
import { LANE_L, LANE_R, PIN_SPOTS, PIN_STAGES, STAGE_COUNT, STRIKE_BONUS, newAlley, pilot, roll, runRoll, starsFor, type PinStage } from "./pin-roll";

const T = 60_000;
// shakier than the bowlers each lane was built against
const HUMANS = [11, 12, 13, 14].map((seed) => ({ place: 3, aim: 0.018, speed: 0.06, seed }));

const lane = (over: Partial<PinStage> = {}): PinStage => ({ stage: 0, frames: 1, posts: [], need: 5, par: 10, ...over });

describe("pin-roll", () => {
  it("sets ten pins in four rows", () => {
    expect(PIN_SPOTS).toHaveLength(10);
    expect(new Set(PIN_SPOTS.map(([, y]) => y)).size).toBe(4);
  }, T);

  it("knocks pins down with a roll up the middle, and none from the gutter", () => {
    const a = newAlley(lane());
    roll(a, (LANE_L + LANE_R) / 2, 0, 600);
    const ev = runRoll(a);
    expect(ev.down).toBeGreaterThan(4);
    const g = newAlley(lane());
    roll(g, LANE_L + 13, -0.5, 600); // straight into the left gutter
    expect(runRoll(g).down).toBe(0);
  }, T);

  it("gives a frame two rolls, and a strike its bonus", () => {
    const a = newAlley(lane({ frames: 2 }));
    roll(a, LANE_L + 13, -0.5, 600);
    runRoll(a);
    expect(a.roll).toBe(1);
    expect(a.frame).toBe(0);
    roll(a, LANE_L + 13, -0.5, 600);
    runRoll(a);
    expect(a.frame).toBe(1);
    expect(a.pins.every((p) => p.standing)).toBe(true); // a new rack
    expect(STRIKE_BONUS).toBeGreaterThan(0);
  }, T);

  it("has 30 lanes, more frames and posts later on", () => {
    expect(PIN_STAGES).toHaveLength(STAGE_COUNT);
    expect(PIN_STAGES[0].posts).toHaveLength(0);
    expect(PIN_STAGES[29].posts.length).toBeGreaterThan(0);
    expect(PIN_STAGES[29].frames).toBeGreaterThan(PIN_STAGES[0].frames);
    for (const st of PIN_STAGES) expect(st.par).toBeGreaterThan(st.need);
  }, T);

  // Split into groups of lanes so each test stays well inside the time limit on a busy CI runner.
  for (let from = 0; from < STAGE_COUNT; from += 5) {
    it(`lets the careful bowler take three stars on lanes ${from + 1}–${from + 5}`, () => {
      for (const st of PIN_STAGES.slice(from, from + 5)) expect(starsFor(pilot(st))).toBe(3);
    }, T);
  }

  // Each human-like seed is played in groups of five lanes; the per-seed test then checks the same bar as
  // before: at least 27 of the 30 lanes (108 of 120 in all).
  const humanWins = new Map<number, number[]>();
  for (const o of HUMANS) {
    for (let from = 0; from < STAGE_COUNT; from += 5) {
      it(`plays shakier human-like seed ${o.seed} on lanes ${from + 1}–${from + 5}`, () => {
        let wins = 0;
        for (const st of PIN_STAGES.slice(from, from + 5)) if (pilot(st, o).won) wins++;
        humanWins.set(o.seed as number, [...(humanWins.get(o.seed as number) ?? []), wins]);
      }, T);
    }
    it(`lets a shakier human-like bowler (seed ${o.seed}) clear almost every lane`, () => {
      const parts = humanWins.get(o.seed as number) ?? [];
      expect(parts).toHaveLength(6);
      expect(parts.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(27);
    }, T);
  }

  it("rarely reaches the goal rolling at random", () => {
    let wins = 0;
    for (const st of PIN_STAGES) for (const seed of [21, 22, 23, 24]) if (pilot(st, { mode: "random", seed }).won) wins++;
    expect(wins).toBeLessThan(10);
    for (const st of PIN_STAGES) for (const seed of [1, 2, 3, 4, 5, 6]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
