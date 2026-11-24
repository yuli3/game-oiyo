import { describe, expect, it } from "vitest";
import { DALJIP_STAGES, STAGE_COUNT, STRAW, arrival, crossTime, idx, light, newYard, plan, play, reachTop, route, starsFor, stepYard, toggleStraw } from "./daljip-fire";

const T = 60_000;

describe("daljip-fire", () => {
  it("has 30 daljip with more straw, damper pine and stronger wind later", () => {
    expect(DALJIP_STAGES).toHaveLength(STAGE_COUNT);
    expect(DALJIP_STAGES[29].straws).toBeGreaterThan(DALJIP_STAGES[0].straws);
    expect(DALJIP_STAGES[29].cells.filter((k) => k === "damp").length).toBeGreaterThan(DALJIP_STAGES[0].cells.filter((k) => k === "damp").length);
    expect(Math.abs(DALJIP_STAGES[29].wind)).toBeGreaterThan(Math.abs(DALJIP_STAGES[0].wind));
  }, T);

  it("burns fastest through straw, climbs readily and creeps down", () => {
    const st = DALJIP_STAGES[0];
    const a = idx(4, 6);
    const up = idx(4, 5);
    const down = idx(4, 7);
    expect(crossTime(st, a, up, new Set([up]))).toBeCloseTo(STRAW * 0.8, 5);
    expect(crossTime(st, a, up, new Set())).toBeLessThan(crossTime(st, up, a, new Set()) * 1.5);
    expect(crossTime(st, up, a, new Set())).toBeGreaterThan(crossTime(st, down, a, new Set()) * 0.9);
    expect(arrival(st, new Set())[st.base]).toBe(0);
  }, T);

  it("packs only into the cone, only as much straw as there is, and only before lighting", () => {
    const st = DALJIP_STAGES[0];
    const y = newYard(st);
    expect(toggleStraw(y, idx(0, 0))).toBeNull(); // air beside the top
    const cone = route(st, new Set());
    for (let k = 0; k < st.straws; k++) expect(toggleStraw(y, cone[k])).toBe("packed");
    expect(toggleStraw(y, cone[st.straws])).toBe("full");
    expect(toggleStraw(y, cone[0])).toBe("removed");
    light(y);
    expect(toggleStraw(y, cone[0])).toBeNull();
  }, T);

  it("wins when the top catches before the moon is up", () => {
    const st = DALJIP_STAGES[4];
    const y = play(st, plan(st));
    expect(y.won).toBe(true);
    const late = newYard(st);
    light(late);
    while (!late.over) stepYard(late, 0.05);
    expect(late.won).toBe(false);
  }, T);

  it("can be lit in time on every stage with the best packing", () => {
    for (const st of DALJIP_STAGES) {
      const y = play(st, plan(st));
      expect(y.won, `stage ${st.stage + 1}`).toBe(true);
      expect(starsFor(y)).toBe(3);
    }
  }, T);

  it("can be lit in time by unseen human-like packers who follow the fire's route", () => {
    for (const st of DALJIP_STAGES) {
      const wins = [11, 12, 13, 14].filter((seed) => reachTop(st, plan(st, { mode: "route", seed })) <= st.moonrise).length;
      expect(wins, `stage ${st.stage + 1}`).toBeGreaterThanOrEqual(3);
    }
  }, T);

  it("can't be lit in time with no straw, straw straight up the middle, or straw anywhere", () => {
    for (const st of DALJIP_STAGES) {
      expect(reachTop(st, new Set())).toBeGreaterThan(st.moonrise);
      expect(reachTop(st, plan(st, { mode: "straight" }))).toBeGreaterThan(st.moonrise);
      for (const seed of [1, 2, 3]) expect(reachTop(st, plan(st, { mode: "random", seed }))).toBeGreaterThan(st.moonrise);
    }
  }, T);
});
