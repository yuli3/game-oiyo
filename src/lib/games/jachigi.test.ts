import { describe, expect, it } from "vitest";
import { CATCH_H, LEVELS, REACH_HI, REACH_LO, STAGE_COUNT, SWINGS, apexTotal, hitShot, newJachigi, playOffsets, starsFor, stepJachigi, swingAt, tap } from "./jachigi";

describe("jachigi", () => {
  it("builds 30 fields that add fielders, wind, a branch and a ditch", () => {
    expect(LEVELS).toHaveLength(STAGE_COUNT);
    expect(LEVELS[0].fielders).toHaveLength(1);
    expect(LEVELS[0].wind).toBe(0);
    const z = LEVELS[STAGE_COUNT - 1];
    expect(z.fielders.length).toBeGreaterThanOrEqual(4);
    expect(z.wind).not.toBe(0);
    expect(z.branch).not.toBeNull();
    expect(z.ditch).not.toBeNull();
  });

  it("every mark is reached by a player tapping within 20 ms of the steady moment", () => {
    for (const l of LEVELS) {
      expect(playOffsets(l, [0, 0, 0]), `stage ${l.stage + 1}`).toBeGreaterThanOrEqual(l.goal);
      expect(playOffsets(l, [0.02, -0.02, 0.01]), `stage ${l.stage + 1} ±20 ms`).toBeGreaterThanOrEqual(l.goal);
    }
  });

  it("timing matters: a 50 ms-off player clears the first fields but fails most later ones", () => {
    expect(playOffsets(LEVELS[0], [0.05, -0.05, 0.03])).toBeGreaterThanOrEqual(LEVELS[0].goal);
    const late = LEVELS.slice(10).filter((l) => playOffsets(l, [0.05, -0.05, 0.03]) < l.goal);
    expect(late.length).toBeGreaterThanOrEqual(15);
    // and simply waiting for the top of the flick is not enough on most fields
    expect(LEVELS.filter((l) => apexTotal(l) < l.goal).length).toBeGreaterThanOrEqual(24);
  });

  it("low hits fly flat and high hits lob", () => {
    expect(hitShot(REACH_LO).angle).toBeLessThan(hitShot(REACH_HI).angle);
    expect(hitShot(46).speed).toBeGreaterThan(hitShot(REACH_HI).speed);
  });

  it("a line drive past a fielder is caught and scores nothing", () => {
    const l = { ...LEVELS[0], fielders: [120] };
    const s = newJachigi(0, l);
    tap(s);
    // swing as the stick rises through the bottom of the reach: a flat, low drive
    while (s.stick.h < REACH_LO + 1) stepJachigi(s, 1 / 240);
    tap(s);
    let caught = false;
    for (let k = 0; k < 2000 && s.distances.length === 0; k++) caught = stepJachigi(s, 1 / 240).caught || caught;
    expect(caught).toBe(true);
    expect(s.distances[0]).toBe(0);
    expect(CATCH_H).toBeGreaterThan(REACH_LO);
  });

  it("three swings end the stage, and the total decides the stars", () => {
    const l = LEVELS[3];
    const s = newJachigi(3, l);
    for (let sw = 0; sw < SWINGS; sw++) {
      tap(s);
      let hit = false;
      for (let k = 0; k < 3000 && s.distances.length === sw; k++) {
        if (!hit && s.phaseT >= l.bestT && s.phase === "up") { tap(s); hit = true; }
        stepJachigi(s, 1 / 240);
      }
      for (let k = 0; k < 400 && s.phase !== "rest" && !s.over; k++) stepJachigi(s, 1 / 240);
    }
    expect(s.over).toBe(true);
    expect(s.distances).toHaveLength(SWINGS);
    expect(s.total).toBeCloseTo(swingAt(l, l.bestT) * SWINGS, 0);
    expect(s.won).toBe(true);
    expect(starsFor(s)).toBe(3);
  });
});
