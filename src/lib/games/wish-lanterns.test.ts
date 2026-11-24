import { describe, expect, it } from "vitest";
import { mulberry } from "./pixel-kit";
import { FLAME_OUT, LEVELS, STAGE_COUNT, applyGust, newSky, pilotGust, starsFor, stepSky, type Sky } from "./wish-lanterns";

function run(stage: number, noise: null | number): Sky {
  const rng = mulberry(noise ?? 1);
  const s = newSky(stage);
  let cool = 0;
  for (let i = 0; i < 60 * 120 && !s.over; i++) {
    cool -= 1 / 60;
    if (noise !== null && cool <= 0) {
      const g = pilotGust(s);
      if (g) {
        const f = noise === 0 ? 1 : 0.75 + rng() * 0.5;
        applyGust(s, g.a, g.b, g.seconds / f);
        cool = noise === 0 ? 0.12 : 0.25 + rng() * 0.2;
      }
    }
    stepSky(s, 1 / 60);
  }
  return s;
}

describe("wish-lanterns", () => {
  it("has 30 stages that ask for more lanterns over time", () => {
    expect(LEVELS).toHaveLength(STAGE_COUNT);
    expect(LEVELS[29].count).toBeGreaterThan(LEVELS[0].count);
    expect(LEVELS[29].need).toBeGreaterThan(LEVELS[0].need);
    expect(LEVELS.some((l) => l.birds.length)).toBe(true);
    expect(LEVELS.some((l) => l.wind !== 0)).toBe(true);
  });

  it("the pilot clears every stage", () => {
    for (let st = 0; st < STAGE_COUNT; st++) {
      const s = run(st, 0);
      expect(s.won, `stage ${st + 1}`).toBe(true);
    }
  }, 60_000);

  it("a sloppy pilot still clears most stages, and doing nothing fails past the first", () => {
    let wins = 0;
    for (let st = 0; st < STAGE_COUNT; st++) for (const seed of [3, 4]) if (run(st, seed).won) wins++;
    expect(wins).toBeGreaterThanOrEqual(50);
    for (let st = 1; st < STAGE_COUNT; st++) expect(run(st, null).won, `idle stage ${st + 1}`).toBe(false);
  }, 60_000);

  it("a hard swipe blows the flame out", () => {
    const s = newSky(0);
    for (let i = 0; i < 120; i++) stepSky(s, 1 / 60);
    const ln = s.lanterns[0];
    applyGust(s, { x: ln.x - 60, y: ln.y }, { x: ln.x + 60, y: ln.y }, 0.03);
    applyGust(s, { x: ln.x - 60, y: ln.y }, { x: ln.x + 60, y: ln.y }, 0.03);
    expect(Math.hypot(ln.px, ln.py)).toBeGreaterThan(FLAME_OUT);
    stepSky(s, 1 / 60);
    expect(ln.fate).toBe("out");
  });

  it("stars", () => {
    expect(starsFor(LEVELS[10].count, LEVELS[10])).toBe(3);
    expect(starsFor(LEVELS[10].need, LEVELS[10])).toBe(1);
  });
});
