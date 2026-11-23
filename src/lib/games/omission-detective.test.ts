import { describe, expect, it } from "vitest";
import {
  STAGE_COUNT, TRIES, brokenLine, clearPicks, createBoard, isSubsequence, lineOk, makeCase, pick, solutionCount, stars, submitOrder,
  type PlaceId,
} from "./omission-detective";

describe("omission-detective", () => {
  it("every case has exactly one route and every statement is true", () => {
    for (let i = 0; i < STAGE_COUNT; i++) {
      const c = makeCase(i);
      expect(solutionCount(c.order, c.lines), `case ${i + 1}`).toBe(1);
      expect(brokenLine(c.lines, c.order)).toBeNull();
      expect(new Set(c.lines.flat()).size).toBe(c.order.length);
      for (const p of c.order) expect(c.pins).toContain(p);
    }
  });

  it("cases get longer and add decoys", () => {
    expect(makeCase(0).order.length).toBe(4);
    expect(makeCase(STAGE_COUNT - 1).order.length).toBe(7);
    expect(makeCase(0).pins.length).toBe(4);
    expect(makeCase(STAGE_COUNT - 1).pins.length).toBeGreaterThan(7);
    expect(makeCase(12)).toEqual(makeCase(12));
  });

  it("subsequence and partial checks", () => {
    const o: PlaceId[] = ["market", "park", "school", "bridge"];
    expect(isSubsequence(["market", "school"], o)).toBe(true);
    expect(isSubsequence(["school", "market"], o)).toBe(false);
    expect(lineOk(["market", "school"], ["school"])).toBe(true);
    expect(lineOk(["market", "school"], ["school", "market"])).toBe(false);
  });

  it("picking pulls the string; tapping the last pin takes it back", () => {
    const c = makeCase(0);
    let b = createBoard(c);
    b = pick(b, c.order[0]!);
    b = pick(b, c.order[1]!);
    expect(b.picks).toEqual(c.order.slice(0, 2));
    b = pick(b, c.order[1]!);
    expect(b.picks).toEqual(c.order.slice(0, 1));
    b = pick(b, c.order[0]!); // already used but last → removed
    expect(b.picks).toEqual([]);
    expect(clearPicks(pick(b, c.order[2]!)).picks).toEqual([]);
  });

  it("wrong routes cost tries; the right one wins", () => {
    const c = makeCase(3);
    let b = createBoard(c);
    const wrong = [...c.order].reverse();
    for (const p of wrong) b = pick(b, p);
    b = submitOrder(b);
    expect(b.tries).toBe(1);
    expect(b.broken).not.toBeNull();
    expect(b.picks).toEqual([]);
    for (const p of c.order) b = pick(b, p);
    b = submitOrder(b);
    expect(b.phase).toBe("won");
    expect(stars(b)).toBe(2);
    let l = createBoard(c);
    for (let k = 0; k < TRIES; k++) { for (const p of wrong) l = pick(l, p); l = submitOrder(l); }
    expect(l.phase).toBe("lost");
  });
});
