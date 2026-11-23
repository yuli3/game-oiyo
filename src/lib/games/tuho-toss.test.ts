import { describe, expect, it } from "vitest";
import { mulberry } from "./pixel-kit";
import { LEVELS, STAGE_COUNT, newThrowing, pilotThrow, starsFor, stepThrowing, throwArrow, type Throwing } from "./tuho-toss";

function play(stage: number, noise: number, seed: number, preferEar = false): Throwing {
  const s = newThrowing(stage);
  const rng = mulberry(seed);
  for (let guard = 0; !s.over && guard < 5000; guard++) {
    if (!s.arrows.some((a) => a.fate === "flying")) {
      const p = pilotThrow(s, preferEar) ?? { vx: 300, vy: -300 };
      const sp = Math.hypot(p.vx, p.vy) * (1 + (rng() - 0.5) * 2 * noise);
      const an = Math.atan2(p.vy, p.vx) + (rng() - 0.5) * 2 * noise * 0.6;
      throwArrow(s, Math.cos(an) * sp, Math.sin(an) * sp);
    }
    stepThrowing(s, 1 / 60);
  }
  return s;
}

describe("tuho toss", () => {
  it("has 30 stages that get harder", () => {
    expect(LEVELS).toHaveLength(STAGE_COUNT);
    expect(LEVELS[29].mouthW).toBeLessThan(LEVELS[0].mouthW);
    expect(LEVELS[29].potX).toBeGreaterThan(LEVELS[0].potX);
    expect(LEVELS.some((l) => l.screen) && LEVELS.some((l) => l.beam) && LEVELS.some((l) => l.slide) && LEVELS.some((l) => l.wind)).toBe(true);
  });

  it("a careful thrower clears every stage", () => {
    for (let st = 0; st < STAGE_COUNT; st++) expect(play(st, 0, 1).won, `stage ${st + 1}`).toBe(true);
  }, 120_000);

  it("a slightly shaky hand still clears most stages", () => {
    let wins = 0;
    for (let st = 0; st < STAGE_COUNT; st++) for (const seed of [11, 12]) if (play(st, 0.02, seed).won) wins++;
    expect(wins).toBeGreaterThanOrEqual(45);
  }, 180_000);

  it("a weak lob falls short and wastes an arrow", () => {
    const s = newThrowing(0);
    expect(throwArrow(s, 90, -120)).toBe(true);
    for (let i = 0; i < 300 && !s.over; i++) stepThrowing(s, 1 / 60);
    expect(s.arrows[0].fate).toBe("miss");
    expect(s.points).toBe(0);
  });

  it("an ear is worth two points", () => {
    const s = play(5, 0, 3, true);
    expect(s.arrows.some((a) => a.fate === "ear")).toBe(true);
    expect(s.won).toBe(true);
  }, 60_000);

  it("stars reward arrows to spare", () => {
    const s = newThrowing(0);
    s.thrown = 2;
    expect(starsFor(s)).toBe(3);
    s.thrown = 4;
    expect(starsFor(s)).toBe(2);
    s.thrown = 5;
    expect(starsFor(s)).toBe(1);
  });
});
