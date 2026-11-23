import { describe, expect, it } from "vitest";
import { LEVELS, STAGE_COUNT, cut, judge, newSlice, playAuto, starsFor, stepSlice, swipeAngle } from "./tteok-slice";

describe("tteok slice", () => {
  it("has 30 stages that speed up and tighten", () => {
    expect(LEVELS).toHaveLength(STAGE_COUNT);
    expect(LEVELS[29].speed).toBeGreaterThan(LEVELS[0].speed);
    expect(LEVELS[29].good).toBeLessThan(LEVELS[0].good);
    expect(LEVELS[29].need).toBeGreaterThan(LEVELS[0].need);
    expect(LEVELS[0].slant).toBe(false);
    expect(LEVELS[29].slant && !LEVELS[29].marks && LEVELS[29].wobble > 0).toBe(true);
  });

  it("a cook with good timing fills every bowl", () => {
    for (let st = 0; st < STAGE_COUNT; st++) {
      const s = playAuto(st, 0, 1);
      expect(s.won, `stage ${st + 1}`).toBe(true);
      expect(starsFor(s)).toBe(3);
    }
  });

  it("a little timing slop is fine early and hurts late", () => {
    let early = 0;
    let late = 0;
    for (let k = 0; k < 10; k++) {
      if (playAuto(3, 0.08, 20 + k).won) early++;
      if (playAuto(29, 0.08, 20 + k).won) late++;
    }
    expect(early).toBe(10);
    expect(late).toBeLessThan(early);
    let fair = 0;
    for (let k = 0; k < 10; k++) if (playAuto(29, 0.05, 40 + k).won) fair++;
    expect(fair).toBeGreaterThanOrEqual(7);
  });

  it("judges thickness and the slant", () => {
    const l = LEVELS[10];
    expect(judge(l, l.thick, 0.7)).toBe("perfect");
    expect(judge(l, l.thick + l.good - 0.5, 0.7)).toBe("good");
    expect(judge(l, l.thick - l.good - 1, 0.7)).toBe("thin");
    expect(judge(l, l.thick + l.good + 1, 0.7)).toBe("thick");
    expect(judge(l, l.thick, 0)).toBe("flat");
    expect(judge(LEVELS[0], LEVELS[0].thick, 0)).toBe("perfect");
    expect(swipeAngle(0, 50)).toBe(0);
    expect(swipeAngle(50, 50)).toBeCloseTo(Math.PI / 4);
  });

  it("a wrong size costs a heart and a forgotten log breaks off a lump", () => {
    const s = newSlice(0);
    for (let i = 0; i < 6; i++) stepSlice(s, 1 / 60);
    expect(cut(s, 0.5)).toBe("thin");
    expect(s.hearts).toBe(2);
    for (let i = 0; i < 600 && s.slices.length < 2; i++) stepSlice(s, 1 / 60);
    expect(s.slices[1].quality).toBe("chunk");
    expect(s.hearts).toBe(1);
  });
});
