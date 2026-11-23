import { describe, expect, it } from "vitest";
import { LEVELS, OVER, STAGE_COUNT, aimSpot, edgeDistance, newTtakji, playAuto, powerOf, slam, starsFor } from "./ttakji-flip";

describe("ttakji flip", () => {
  it("has 30 stages with more, smaller, heavier tiles", () => {
    expect(LEVELS).toHaveLength(STAGE_COUNT);
    expect(LEVELS[29].tiles.length).toBeGreaterThan(LEVELS[0].tiles.length);
    expect(LEVELS[29].tiles[0].size).toBeLessThan(LEVELS[0].tiles[0].size);
    expect(LEVELS[29].tiles[0].weight).toBeGreaterThan(LEVELS[0].tiles[0].weight);
    expect(LEVELS.some((l) => l.tiles.some((t) => t.hits > 1)) && LEVELS.some((l) => l.tiles.some((t) => t.slide)) && LEVELS.some((l) => l.tiles.some((t) => t.angle))).toBe(true);
  });

  it("a sure hand flips every stage with full stars", () => {
    for (let st = 0; st < STAGE_COUNT; st++) {
      const s = playAuto(st, 0, 0, 1);
      expect(s.won, `stage ${st + 1}`).toBe(true);
      expect(starsFor(s)).toBe(3);
    }
  });

  it("a slightly shaky hand still wins most stages, a very shaky one struggles late", () => {
    let ok = 0;
    for (let st = 0; st < STAGE_COUNT; st += 2) for (let k = 0; k < 4; k++) if (playAuto(st, 5, 0.08, 30 + k).won) ok++;
    expect(ok).toBe(60);
    let late = 0;
    for (let k = 0; k < 20; k++) if (playAuto(29, 14, 0.18, 70 + k).won) late++;
    expect(late).toBeLessThan(10);
  });

  it("the middle does nothing, the edge flips and too hard bounces", () => {
    const s = newTtakji(0);
    const t = s.level.tiles[0];
    expect(slam(s, t.x, t.y, 0.9)).toBe("miss");
    const a = aimSpot(s);
    expect(edgeDistance(t, t.x, t.y, a.x, a.y)).toBeLessThan(0);
    expect(slam(s, a.x, a.y, OVER + 0.1)).toBe("over");
    expect(slam(s, a.x, a.y, 0.05)).toBe("weak");
    expect(slam(s, a.x, a.y, 0.8)).toBe("flip");
    expect(s.won).toBe(true);
    expect(powerOf(950)).toBeCloseTo(0.5, 1);
  });

  it("runs out of slams", () => {
    const s = newTtakji(0);
    for (let k = 0; k < 10; k++) slam(s, 5, 5, 0.5);
    expect(s.over).toBe(true);
    expect(s.won).toBe(false);
    expect(starsFor(s)).toBe(0);
  });
});
