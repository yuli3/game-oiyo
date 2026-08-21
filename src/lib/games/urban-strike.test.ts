import { describe, expect, it } from "vitest";
import {
  WEAPONS,
  damageForHit,
  directionFromAim,
  explainFireFailure,
  finishReload,
  formatMatchTime,
  recoilAt,
  reloadDuration,
  resolveHitscan,
  scoreForElimination,
  shotIntervalMs,
  spreadFor,
  reviewUrbanStrikeResult,
} from "./urban-strike";

describe("urban strike weapon handling", () => {
  it("gives every weapon a distinct, authored recoil pattern", () => {
    const signatures = Object.values(WEAPONS).map((weapon) => JSON.stringify(weapon.recoil));
    expect(new Set(signatures).size).toBe(3);
    for (const weapon of Object.values(WEAPONS)) {
      expect(weapon.recoil.length).toBeGreaterThanOrEqual(10);
      expect(recoilAt(weapon, 0)).toEqual(weapon.recoil[0]);
      expect(recoilAt(weapon, weapon.recoil.length)[0]).toBeGreaterThan(weapon.recoil[0][0]);
    }
  });

  it("converts RPM into an exact firing interval", () => {
    expect(shotIntervalMs(WEAPONS.m4)).toBeCloseTo(78.947, 3);
    expect(shotIntervalMs(WEAPONS.ak)).toBeGreaterThan(shotIntervalMs(WEAPONS.m4));
    expect(shotIntervalMs(WEAPONS.mp5)).toBeLessThan(shotIntervalMs(WEAPONS.m4));
  });

  it("tightens spread with ADS and crouching, but penalizes sprinting", () => {
    const stillHip = spreadFor(WEAPONS.m4, { ads: false, moving: false, sprinting: false, crouched: false });
    const adsCrouched = spreadFor(WEAPONS.m4, { ads: true, moving: false, sprinting: false, crouched: true });
    const sprinting = spreadFor(WEAPONS.m4, { ads: false, moving: true, sprinting: true, crouched: false });
    expect(adsCrouched).toBeLessThan(stillHip);
    expect(sprinting).toBeGreaterThan(stillHip * 2);
  });

  it("produces a normalized, seeded shot direction", () => {
    const a = directionFromAim(0.2, -0.1, 0.02, 42);
    const b = directionFromAim(0.2, -0.1, 0.02, 42);
    expect(a).toEqual(b);
    expect(Math.hypot(a.x, a.y, a.z)).toBeCloseTo(1, 8);
  });

  it("names empty, sprint, reload, respawn and rate-limit fire blocks without shooting", () => {
    expect(explainFireFailure({ magazine: 0, reloading: false, sprinting: false, respawning: false, rateLimited: false })).toBe("empty");
    expect(explainFireFailure({ magazine: 10, reloading: true, sprinting: false, respawning: false, rateLimited: false })).toBe("reloading");
    expect(explainFireFailure({ magazine: 10, reloading: false, sprinting: true, respawning: false, rateLimited: false })).toBe("sprinting");
    expect(explainFireFailure({ magazine: 10, reloading: false, sprinting: false, respawning: true, rateLimited: false })).toBe("respawn");
    expect(explainFireFailure({ magazine: 10, reloading: false, sprinting: false, respawning: false, rateLimited: true })).toBe("rate");
    expect(explainFireFailure({ magazine: 10, reloading: false, sprinting: false, respawning: false, rateLimited: false })).toBeNull();
  });

  it("handles tactical and empty reloads without creating ammunition", () => {
    expect(reloadDuration(WEAPONS.m4, 8)).toBe(WEAPONS.m4.tacticalReloadMs);
    expect(reloadDuration(WEAPONS.m4, 0)).toBe(WEAPONS.m4.reloadMs);
    expect(finishReload(WEAPONS.m4, 8, 12)).toEqual({ magazine: 20, reserve: 0 });
    expect(finishReload(WEAPONS.m4, 0, 120)).toEqual({ magazine: 30, reserve: 90 });
  });
});

describe("urban strike result review", () => {
  it("prioritizes aim, then survival, then objective", () => {
    expect(reviewUrbanStrikeResult({ accuracy: 20, deaths: 12, blueScore: 8, redScore: 12 })).toBe("aim");
    expect(reviewUrbanStrikeResult({ accuracy: 40, deaths: 9, blueScore: 8, redScore: 12 })).toBe("survival");
    expect(reviewUrbanStrikeResult({ accuracy: 40, deaths: 3, blueScore: 8, redScore: 12 })).toBe("objective");
  });
});

describe("urban strike hit-scan", () => {
  const targets = [
    {
      id: "near",
      alive: true,
      body: { x: 0, y: 1.05, z: -8 },
      bodyRadius: 0.45,
      head: { x: 0, y: 1.72, z: -8 },
      headRadius: 0.22,
    },
    {
      id: "far",
      alive: true,
      body: { x: 0, y: 1.05, z: -18 },
      bodyRadius: 0.45,
      head: { x: 0, y: 1.72, z: -18 },
      headRadius: 0.22,
    },
  ] as const;

  it("selects the closest target and reports a headshot", () => {
    const hit = resolveHitscan(
      { x: 0, y: 1.72, z: 0 },
      { x: 0, y: 0, z: -1 },
      targets,
    );
    expect(hit?.id).toBe("near");
    expect(hit?.zone).toBe("head");
    expect(hit?.distance).toBeCloseTo(7.78, 2);
  });

  it("ignores dead targets and range-limited shots", () => {
    const withDeadNear = [{ ...targets[0], alive: false }, targets[1]];
    expect(resolveHitscan({ x: 0, y: 1.72, z: 0 }, { x: 0, y: 0, z: -1 }, withDeadNear)?.id).toBe("far");
    expect(resolveHitscan({ x: 0, y: 1.72, z: 0 }, { x: 0, y: 0, z: -1 }, targets, 5)).toBeNull();
  });

  it("applies head multipliers, distance falloff and score bonuses", () => {
    expect(damageForHit(WEAPONS.m4, "head", 10)).toBeGreaterThan(damageForHit(WEAPONS.m4, "body", 10) * 2);
    expect(damageForHit(WEAPONS.mp5, "body", 55)).toBeLessThan(damageForHit(WEAPONS.mp5, "body", 10));
    expect(scoreForElimination("head", 3)).toBe(180);
    expect(scoreForElimination("body", 99)).toBe(150);
  });

  it("formats the match clock at round boundaries", () => {
    expect(formatMatchTime(120)).toBe("2:00");
    expect(formatMatchTime(59.1)).toBe("1:00");
    expect(formatMatchTime(-3)).toBe("0:00");
  });
});
