import { describe, expect, it } from "vitest";
import { mulberry } from "./pixel-kit";
import { BURNT, LEVELS, STAGE_COUNT, flick, newGriddle, pilotMoves, starsFor, stepGriddle, type Griddle } from "./hotteok-flip";

function play(stage: number, seed: number | null): Griddle {
  const rng = mulberry((seed ?? 0) * 13 + stage);
  const g = newGriddle(stage);
  let busy = 0;
  for (let i = 0; i < 60 * 240 && !g.over; i++) {
    busy -= 1 / 60;
    if (busy <= 0) {
      const m = pilotMoves(g, 640, seed === null ? 1.2 : 1.05 + rng() * 0.3)[0];
      if (m) {
        const sloppy = seed !== null;
        flick(g, m.id, sloppy ? m.offset * (0.8 + rng() * 0.4) : m.offset, 0, m.vy * (sloppy ? 0.85 + rng() * 0.3 : 1));
        busy = sloppy ? 0.35 + rng() * 0.3 : 0.1;
      }
    }
    stepGriddle(g, 1 / 60);
  }
  return g;
}

describe("hotteok-flip", () => {
  it("has 30 stages that get busier and hotter", () => {
    expect(LEVELS).toHaveLength(STAGE_COUNT);
    expect(LEVELS[29].slots.length).toBeGreaterThan(LEVELS[0].slots.length);
    expect(LEVELS[29].rate).toBeGreaterThan(LEVELS[0].rate);
    expect(LEVELS[29].count).toBeGreaterThan(LEVELS[0].count);
    expect(LEVELS.some((l) => l.hot >= 0)).toBe(true);
  });

  it("an edge flick at the right speed lands it upside down, a middle flick just hops", () => {
    const g = newGriddle(0);
    g.cakes[0].cook[0] = 1.2;
    expect(flick(g, 0, 0.8, 0, -640)).toBe("flipped");
    for (let i = 0; i < 120; i++) stepGriddle(g, 1 / 60);
    expect(g.cakes[0].fate).toBe("cooking");
    expect(g.cakes[0].angle).toBeCloseTo(Math.PI);
    const h = newGriddle(0);
    flick(h, 0, 0, 0, -640);
    for (let i = 0; i < 120; i++) stepGriddle(h, 1 / 60);
    expect(h.cakes[0].angle).toBe(0);
  });

  it("a quarter turn splats, a sideways toss drops it, and waiting burns it", () => {
    const a = newGriddle(0);
    flick(a, 0, 0.6, 0, -430);
    for (let i = 0; i < 120; i++) stepGriddle(a, 1 / 60);
    expect(a.cakes[0].why).toBe("splat");
    const b = newGriddle(29);
    flick(b, 0, 0, -900, -900);
    for (let i = 0; i < 120; i++) stepGriddle(b, 1 / 60);
    expect(b.cakes[0].why).toBe("dropped");
    const c = newGriddle(0);
    for (let i = 0; i < 60 * (BURNT / c.level.rate + 1); i++) stepGriddle(c, 1 / 60);
    expect(c.cakes[0].why).toBe("burnt");
  });

  it("the pilot serves every hotteok on every stage", () => {
    for (let st = 0; st < STAGE_COUNT; st++) {
      const g = play(st, null);
      expect(g.won, `stage ${st + 1}`).toBe(true);
      expect(g.ruined, `stage ${st + 1}`).toBe(0);
      expect(starsFor(g)).toBe(3);
    }
  });

  it("a sloppy cook still clears most stages", () => {
    let wins = 0;
    for (let st = 0; st < STAGE_COUNT; st++) for (const seed of [1, 2, 3]) if (play(st, seed).won) wins++;
    expect(wins).toBeGreaterThanOrEqual(70);
  });
});
