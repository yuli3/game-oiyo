import { describe, expect, it } from "vitest";
import { ARENA_H, balloonLines, balloonPos, balloonSlots, hitBalloon } from "./QuizBalloonArena";

describe("quiz balloon arena", () => {
  it("neighbouring balloons never overlap at the same moment", () => {
    const slots = balloonSlots(4);
    for (let t = 0; t < 12; t += 0.25) {
      for (let i = 0; i < 3; i++) {
        const a = balloonPos(slots[i]!, t, 12);
        const b = balloonPos(slots[i + 1]!, t, 12);
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(slots[i]!.r * 1.9);
      }
    }
  });

  it("every balloon starts on screen-ish and leaves above the top by the deadline", () => {
    for (const s of balloonSlots(4)) {
      expect(balloonPos(s, 0, 12).y).toBeLessThan(ARENA_H + s.r * 1.6);
      expect(balloonPos(s, 12, 12).y).toBeLessThanOrEqual(-s.r);
    }
  });

  it("hits the touched balloon and skips popped ones", () => {
    const slots = balloonSlots(4);
    const p = balloonPos(slots[2]!, 3, 12);
    expect(hitBalloon(slots, 3, 12, p.x, p.y, [false, false, false, false])).toBe(2);
    expect(hitBalloon(slots, 3, 12, p.x, p.y, [false, false, true, false])).toBe(-1);
    expect(hitBalloon(slots, 3, 12, -100, -100, [false, false, false, false])).toBe(-1);
  });

  it("wraps long labels into at most two lines", () => {
    expect(balloonLines("단군왕검")).toEqual(["단군왕검"]);
    expect(balloonLines("한산도 대첩")).toEqual(["한산도 대첩"]);
    expect(balloonLines("Republic of the Congo").length).toBe(2);
    expect(balloonLines("ABCDEFGHIJKL")).toEqual(["ABCDEF", "GHIJKL"]);
  });
});
