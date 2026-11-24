import { describe, expect, it } from "vitest";
import { BOWL_Y, OGOK_STAGES, STAGE_COUNT, bowlAt, bowlCentre, dragTo, grab, letGo, newPour, pilot, starsFor, stepPour } from "./ogokbap-sort";

describe("ogokbap-sort", () => {
  it("builds 30 pours: more grains, faster and closer together, bowls shuffled from stage 11", () => {
    expect(OGOK_STAGES).toHaveLength(STAGE_COUNT);
    const a = OGOK_STAGES[0];
    const z = OGOK_STAGES[STAGE_COUNT - 1];
    expect(z.grains.length).toBeGreaterThan(a.grains.length);
    expect(z.grains[0].speed).toBeGreaterThan(a.grains[0].speed * 1.2);
    expect(a.order).toEqual([0, 1, 2, 3, 4]);
    expect([...z.order].sort()).toEqual([0, 1, 2, 3, 4]);
    // no grain is ever poured straight over its own bowl
    for (const s of OGOK_STAGES) for (const g of s.grains) expect(s.order[bowlAt(g.x)]).not.toBe(g.kind);
  }, 60_000);

  it("dragging the soonest-landing grain to its bowl sorts every pour with 3 stars", () => {
    for (const s of OGOK_STAGES) {
      const p = pilot(s);
      expect(p.won, `pour ${s.stage + 1}`).toBe(true);
      expect(starsFor(p), `pour ${s.stage + 1}`).toBe(3);
    }
  }, 60_000);

  it("a human who takes 0.35 s (±20 %) to put a finger on a grain and drags at 700 px/s clears every pour", () => {
    for (const s of OGOK_STAGES) for (const seed of [5, 31, 47, 53]) expect(pilot(s, { react: 0.35, speed: 700, seed }).won, `pour ${s.stage + 1} seed ${seed}`).toBe(true);
  }, 60_000);

  it("never touching or dropping grains into random bowls loses every pour; a slow hand loses most later ones", () => {
    let slow = 0;
    for (const s of OGOK_STAGES) {
      expect(pilot(s, { mode: "never" }).won, `pour ${s.stage + 1} never`).toBe(false);
      expect(pilot(s, { mode: "random", seed: 3 }).won, `pour ${s.stage + 1} random`).toBe(false);
      if (s.stage >= 10 && !pilot(s, { react: 0.8, speed: 400 }).won) slow++;
    }
    expect(slow).toBeGreaterThanOrEqual(18);
  }, 60_000);

  it("a grabbed grain follows the finger sideways and keeps falling; the bowl under it decides", () => {
    const s = OGOK_STAGES[0];
    const p = newPour(s);
    const g = s.grains[0];
    stepPour(p, g.at + 0.5);
    expect(grab(p, p.x[0], p.y[0])).toBe(0);
    const home = bowlCentre(s.order.indexOf(g.kind));
    dragTo(p, home);
    letGo(p);
    expect(p.x[0]).toBe(home);
    let landed = false;
    for (let i = 0; i < 400 && !landed; i++) landed = stepPour(p, 1 / 60).landed.some((l) => l.i === 0 && l.right);
    expect(landed).toBe(true);
    expect(p.y[0]).toBe(BOWL_Y);
  }, 60_000);
});
