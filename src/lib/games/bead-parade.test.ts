import { describe, expect, it } from "vitest";
import { BEAD_STAGES, D, HUMAN_SHOOTERS, SHOOTER, STAGE_COUNT, canShoot, newParade, pilot, pointAt, shoot, spiral, starsFor, step, trackLength, type BeadStage } from "./bead-parade";

const T = 60_000;
// the same kind of shooter the parades were built against, on other seeds
const HUMANS = [11, 12, 13, 14].map((seed) => ({ ...HUMAN_SHOOTERS[0], seed }));

/** A straight track, beads waiting at its start. */
function line(beads: number[]): BeadStage {
  return { stage: 0, track: [[20, 100], [340, 100]], colors: 3, beads, speed: 0, seed: 1, plan: [] };
}

describe("bead-parade", () => {
  it("rolls the parade in along the track, beads a bead's width apart", () => {
    const st = line([0, 1, 2, 0]);
    const p = newParade({ ...st, speed: 30 });
    for (let n = 0; n < 240; n++) step(p);
    const s = p.beads.map((b) => b.s);
    for (let i = 1; i < s.length; i++) expect(s[i] - s[i - 1]).toBeCloseTo(D, 5);
    expect(pointAt(st, 0)).toEqual([20, 100]);
    expect(trackLength(st)).toBeCloseTo(320, 5);
  }, T);

  it("pops three of a colour where a shot lands next to a pair", () => {
    const st = line([1, 0, 0, 2]);
    const p = newParade(st);
    // place the parade on the track, then shoot the pair's colour at it
    p.beads.forEach((b, i) => (b.s = 200 - i * D));
    p.t = 5;
    p.current = 0;
    const pair = p.beads.findIndex((b) => b.c === 0);
    const [x, y] = pointAt(st, p.beads[pair].s);
    expect(shoot(p, x, y)).toBe(true);
    expect(canShoot(p)).toBe(false);
    let popped = 0;
    for (let n = 0; n < 120; n++) popped += step(p).popped;
    expect(popped).toBe(3);
    expect(p.beads.map((b) => b.c)).toEqual([2, 1]);
  }, T);

  it("wins when every bead has popped, and loses when one reaches the hole", () => {
    const won = newParade(line([0]));
    won.beads = [];
    step(won);
    expect(won.won).toBe(true);
    const lost = newParade({ ...line([0, 1]), speed: 400 });
    for (let n = 0; n < 2000 && !lost.over; n++) step(lost);
    expect(lost.over).toBe(true);
    expect(lost.won).toBe(false);
  }, T);

  it("winds spirals inward to the hole beside the launcher", () => {
    let a = 7;
    const rng = () => ((a = (a * 16807) % 2147483647) / 2147483647);
    const tr = spiral(10, rng);
    const d0 = Math.hypot(tr[0][0] - SHOOTER[0], tr[0][1] - SHOOTER[1]);
    const d1 = Math.hypot(tr[tr.length - 1][0] - SHOOTER[0], tr[tr.length - 1][1] - SHOOTER[1]);
    expect(d1).toBeLessThan(d0 * 0.5);
    for (const [x, y] of tr) {
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(360);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(560);
    }
  }, T);

  it("has 30 parades, longer and in more colours later on", () => {
    expect(BEAD_STAGES).toHaveLength(STAGE_COUNT);
    expect(BEAD_STAGES[0].beads.length).toBeLessThan(BEAD_STAGES[29].beads.length);
    expect(BEAD_STAGES[0].colors).toBe(3);
    expect(BEAD_STAGES[29].colors).toBe(5);
    expect(BEAD_STAGES[29].speed).toBeGreaterThan(BEAD_STAGES[0].speed);
    for (const st of BEAD_STAGES) for (const c of st.beads) expect(c).toBeLessThan(st.colors);
  }, T);

  it("clears every parade with its planned shots, keeping the front back for three stars", () => {
    for (const st of BEAD_STAGES) {
      const p = pilot(st);
      expect(p.won).toBe(true);
      expect(starsFor(p)).toBe(3);
    }
  }, T);

  // human-like shooters, ten stages at a time so each part stays quick
  for (const [from, need] of [[0, 36], [10, 31], [20, 24]] as const) {
    it(`lets human-like shooters clear most parades in stages ${from + 1}–${from + 10}`, () => {
      let wins = 0;
      for (const st of BEAD_STAGES.slice(from, from + 10)) for (const o of HUMANS) if (pilot(st, o).won) wins++;
      expect(wins).toBeGreaterThanOrEqual(need);
    }, T);
  }

  it("almost never clears a parade shooting in random directions", () => {
    let wins = 0;
    for (const st of BEAD_STAGES) for (const seed of [21, 22, 23, 24]) if (pilot(st, { mode: "random", seed }).won) wins++;
    expect(wins).toBeLessThan(10);
    for (const st of BEAD_STAGES) for (const seed of [1, 2, 3, 4, 5, 6]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
