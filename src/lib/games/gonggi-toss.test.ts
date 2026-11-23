import { describe, expect, it } from "vitest";
import { HAND, LEVELS, STAGE_COUNT, airFor, need, newGonggi, playAuto, starsFor, stepGonggi, tap, toss } from "./gonggi-toss";

describe("gonggi-toss", () => {
  it("has 30 stages that get harder", () => {
    expect(LEVELS).toHaveLength(STAGE_COUNT);
    expect(LEVELS[0].steps).toEqual([1]);
    expect(LEVELS[29].steps).toEqual([1, 2, 3, 4]);
    expect(LEVELS[29].airMax).toBeLessThan(LEVELS[0].airMax);
    expect(LEVELS[29].window).toBeLessThan(LEVELS[0].window);
    for (const l of LEVELS) expect(l.window).toBeGreaterThanOrEqual(0.11);
  });

  it("a quick steady hand clears every stage", () => {
    for (let st = 0; st < STAGE_COUNT; st++) {
      const s = playAuto(st, 0.16, 0, 1);
      expect(s.won, `stage ${st + 1}`).toBe(true);
      expect(starsFor(s)).toBe(3);
    }
  });

  it("a decent human clears late stages, a sloppy one mostly does not", () => {
    let good = 0;
    let sloppy = 0;
    for (let k = 0; k < 20; k++) {
      if (playAuto(27, 0.18, 0.05, 10 + k).won) good++;
      if (playAuto(27, 0.26, 0.11, 10 + k).won) sloppy++;
    }
    expect(good).toBeGreaterThanOrEqual(16);
    expect(sloppy).toBeLessThan(5);
  });

  it("grabbing early or short costs a life", () => {
    const s = newGonggi(0);
    toss(s, 1.2);
    expect(tap(s, HAND.x, 40)).toBe("early");
    expect(s.lives).toBe(2);
    toss(s, 1.2);
    for (let k = 0; k < 144; k++) stepGonggi(s, 1 / 120);
    expect(tap(s, HAND.x, 40)).toBe("short");
    expect(s.lives).toBe(1);
  });

  it("pick then catch advances the round; letting it fall drops", () => {
    const s = newGonggi(0);
    expect(need(s)).toBe(1);
    toss(s, 1.2);
    const st = s.stones[0];
    expect(tap(s, st.x + 3, st.y)).toBe("pick");
    for (let k = 0; k < 144; k++) stepGonggi(s, 1 / 120);
    expect(tap(s, HAND.x, 40)).toBe("catch");
    expect(s.round).toBe(1);
    toss(s, 1.2);
    let r = null;
    for (let k = 0; k < 400 && !r; k++) r = stepGonggi(s, 1 / 120);
    expect(r).toBe("drop");
    expect(airFor(LEVELS[0], 0)).toBe(LEVELS[0].airMin);
    expect(airFor(LEVELS[0], 99999)).toBe(LEVELS[0].airMax);
  });
});
