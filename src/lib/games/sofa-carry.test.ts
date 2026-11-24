import { describe, expect, it } from "vitest";
import { HAND_SPEED, SOFA_STAGES, STAGE_COUNT, clear, middle, newCarry, pilot, starsFor, stepCarry } from "./sofa-carry";

const T = 60_000;
const HUMANS = [11, 12, 13, 14].map((seed) => ({ lag: 0.14, wobble: 2.5, seed }));

describe("sofa-carry", () => {
  it("has 30 buildings with more corners, a longer sofa and a narrower hall later", () => {
    expect(SOFA_STAGES).toHaveLength(STAGE_COUNT);
    expect(SOFA_STAGES[29].path.length).toBeGreaterThan(SOFA_STAGES[0].path.length);
    expect(SOFA_STAGES[29].length).toBeGreaterThan(SOFA_STAGES[0].length);
    expect(SOFA_STAGES[29].hall).toBeLessThan(SOFA_STAGES[0].hall);
    // the hall is narrower than the sofa is long: it only goes lengthwise, and turns on the landings
    for (const st of SOFA_STAGES) expect(st.hall).toBeLessThan(st.length);
  }, T);

  it("keeps the sofa its length while the two ends pull, and stops it dead at a wall", () => {
    const st = SOFA_STAGES[3];
    const c = newCarry(st);
    expect(clear(st, c.boxes, c.a, c.b)).toBe(true);
    const len = () => Math.hypot(c.b.x - c.a.x, c.b.y - c.a.y);
    for (let k = 0; k < 30; k++) stepCarry(c, { x: c.a.x, y: c.a.y - 50 }, null, 1 / 60);
    expect(len()).toBeCloseTo(st.length, 3);
    const before = { ...c.a };
    // turning it across the hall jams it against the walls
    let scraped = false;
    for (let k = 0; k < 60 && !scraped; k++) scraped = stepCarry(c, { x: c.a.x + 200, y: c.a.y }, { x: c.b.x - 200, y: c.b.y }, 1 / 60).scrape;
    expect(scraped).toBe(true);
    expect(Math.hypot(c.a.x - before.x, c.a.y - before.y)).toBeLessThan(HAND_SPEED);
    expect(c.scrapes).toBe(1);
  }, T);

  it("gets careful movers to the van with three stars in every building", () => {
    for (const st of SOFA_STAGES) {
      const c = pilot(st);
      expect(c.won).toBe(true);
      expect(c.scrapes).toBe(0);
      expect(starsFor(c)).toBe(3);
    }
  }, T);

  it("gets human-like movers (a beat behind, a little unsteady) to the van in time", () => {
    for (const st of SOFA_STAGES) expect(HUMANS.filter((o) => pilot(st, o).won).length).toBeGreaterThanOrEqual(3);
  }, T);

  it("does not let pulling straight at the van, pulling one end only or shaky hands get there", () => {
    for (const st of SOFA_STAGES) {
      expect(pilot(st, { mode: "straight" }).won).toBe(false);
      expect(pilot(st, { mode: "one" }).won).toBe(false);
    }
    expect(SOFA_STAGES.filter((st) => !pilot(st, { lag: 0.4, wobble: 9 }).won).length).toBeGreaterThanOrEqual(25);
  }, T);

  it("is deterministic and ends at the van", () => {
    const st = SOFA_STAGES[16];
    const a = pilot(st, HUMANS[0]);
    expect(pilot(st, HUMANS[0]).t).toBe(a.t);
    const end = st.path[st.path.length - 1];
    expect(Math.hypot(middle(a).x - end.x, middle(a).y - end.y)).toBeLessThan(14);
  }, T);
});
