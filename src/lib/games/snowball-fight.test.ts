import { describe, expect, it } from "vitest";
import {
  STAGES, STAGE_COUNT, newField, stepField, findShot, throwBall, setAiming, covered, velocityFromDrag, MAX_SPEED, starsFor, kidBox,
} from "./snowball-fight";

function run(f: ReturnType<typeof newField>, seconds: number, each?: () => void) {
  for (let t = 0; t < seconds && !f.over; t += 1 / 60) {
    each?.();
    stepField(f, 1 / 60);
  }
}

describe("snowball-fight", () => {
  it("has 30 stages with more kids later", () => {
    expect(STAGES).toHaveLength(STAGE_COUNT);
    expect(STAGES[0].enemies).toBe(1);
    expect(STAGES[29].enemies).toBeGreaterThanOrEqual(4);
  });

  it("every enemy on every stage can be hit with a clean throw", () => {
    for (let s = 0; s < STAGE_COUNT; s++) {
      const f = newField(s, 1);
      f.enemies.forEach((e, i) => {
        expect(findShot(f, e), `stage ${s} enemy ${i}`).not.toBeNull();
      });
    }
  });

  it("a clean throw knocks out a standing enemy", () => {
    const f = newField(0, 7);
    const e = f.enemies[0];
    const shot = findShot(f, e)!;
    e.up = true;
    e.timer = 99;
    e.throwAt = -1;
    setAiming(f, 0, true);
    expect(throwBall(f, 0, shot.vx, shot.vy)).toBe(true);
    run(f, 3);
    expect(e.hp).toBe(0);
    expect(f.over).toBe(true);
    expect(f.winner).toBe(0);
  });

  it("an aiming autopilot can clear every stage", () => {
    for (let s = 0; s < STAGE_COUNT; s++) {
      let wins = 0;
      for (let seed = 0; seed < 6; seed++) {
        const f = newField(s, 11 + s + seed * 101);
        run(f, 120, () => {
          const target = f.enemies.find((e) => e.hp > 0 && e.up && e.timer > 0.6);
          if (target && f.cooldown[0] === 0) {
            const shot = findShot(f, target);
            if (shot) {
              setAiming(f, 0, true);
              throwBall(f, 0, shot.vx, shot.vy);
            }
          } else setAiming(f, 0, false);
        });
        if (f.winner === 0) wins += 1;
      }
      expect(wins, `stage ${s}`).toBeGreaterThanOrEqual(s < 15 ? 6 : 2);
    }
  });

  it("an idle player eventually loses as their wall erodes", () => {
    const f = newField(20, 3);
    expect(covered(f, f.players[0])).toBe(true);
    run(f, 400);
    expect(f.over).toBe(true);
    expect(f.winner).toBe(1);
  });

  it("two-player mode: each side hits the other", () => {
    const f = newField(0, 5, true);
    expect(f.players).toHaveLength(2);
    expect(f.enemies).toHaveLength(0);
    // player 1 stands up aiming, player 0 throws at them
    setAiming(f, 1, true);
    const p1 = f.players[1];
    const box = kidBox(p1, true);
    let hit = false;
    for (let deg = 20; deg <= 75 && !hit; deg += 1) for (let sp = 250; sp <= MAX_SPEED && !hit; sp += 10) {
      const g = newField(0, 5, true);
      setAiming(g, 1, true);
      throwBall(g, 0, Math.cos((deg * Math.PI) / 180) * sp, -Math.sin((deg * Math.PI) / 180) * sp);
      run(g, 3);
      if (g.players[1].hp < 3) hit = true;
    }
    expect(box.x1).toBeGreaterThan(box.x0);
    expect(hit).toBe(true);
  });

  it("drag velocity is capped", () => {
    const v = velocityFromDrag(-500, 500);
    expect(Math.hypot(v.vx, v.vy)).toBeLessThanOrEqual(MAX_SPEED + 1e-6);
    expect(v.vx).toBeGreaterThan(0);
    expect(v.vy).toBeLessThan(0);
  });

  it("stars by hearts left", () => {
    expect(starsFor(3, 3)).toBe(3);
    expect(starsFor(2, 3)).toBe(2);
    expect(starsFor(1, 3)).toBe(1);
    expect(starsFor(0, 3)).toBe(0);
  });
});
