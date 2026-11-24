import { describe, expect, it } from "vitest";
import { LOCK_STAGES, STAGE_COUNT, TRIES, equations, evaluate, guess, isTrue, newSafe, pilot, score, starsFor } from "./formula-lock";

const T = 60_000;
const HUMANS = [11, 12, 13, 14].map((seed) => ({ slip: 0.25, seed }));

describe("formula-lock", () => {
  it("reads sums with × and ÷ first, whole numbers only", () => {
    expect(evaluate("2+3*4")).toBe(14);
    expect(evaluate("12/4-3")).toBe(0);
    expect(evaluate("7/2")).toBeNull(); // not whole
    expect(evaluate("3-5")).toBeNull(); // below zero
    expect(evaluate("03+1")).toBeNull(); // leading zero
    expect(isTrue("12+35=47")).toBe(true);
    expect(isTrue("12+35=48")).toBe(false);
    expect(isTrue("47=47")).toBe(false); // no sum on the left
  }, T);

  it("lights greens, then yellows only as often as the answer has them", () => {
    expect(score("12+35=47", "12+35=47").every((m) => m === 2)).toBe(true);
    expect(score("11+1=12", "2+10=12")).toEqual([1, 0, 1, 0, 2, 2, 2]);
  }, T);

  it("lists only true equations of each length", () => {
    for (const L of [6, 7, 8]) {
      const all = equations(L);
      expect(all.length).toBeGreaterThan(100);
      for (const e of all.slice(0, 400)) {
        expect(e).toHaveLength(L);
        expect(isTrue(e)).toBe(true);
      }
    }
  }, T);

  it("has 30 safes from six symbols up to eight, and takes only true guesses of the right length", () => {
    expect(LOCK_STAGES).toHaveLength(STAGE_COUNT);
    expect(LOCK_STAGES[0].length).toBe(6);
    expect(LOCK_STAGES[29].length).toBe(8);
    const st = LOCK_STAGES[3];
    const s = newSafe(st);
    expect(guess(s, "1+1=2")).toBe("wrong length");
    expect(guess(s, "1+1=30")).toBe("not true");
    expect(guess(s, st.answer)).toBe("opened");
    expect(starsFor(s)).toBe(3);
  }, T);

  it("lets careful crackers open every safe within the tries, with three stars", () => {
    for (const st of LOCK_STAGES) {
      const s = pilot(st, { seed: 1 });
      expect(s.won).toBe(true);
      expect(s.guesses.length).toBeLessThanOrEqual(TRIES);
      expect(starsFor(s)).toBe(3);
    }
  }, T);

  it("lets human-like crackers who overlook a clue now and then open almost every safe", () => {
    let wins = 0;
    for (const st of LOCK_STAGES) for (const o of HUMANS) if (pilot(st, o).won) wins++;
    expect(wins).toBeGreaterThanOrEqual(115);
  }, T);

  it("keeps the safe shut against true equations typed at random", () => {
    for (const st of LOCK_STAGES) for (const seed of [21, 22, 23, 24]) expect(pilot(st, { mode: "random", seed }).won).toBe(false);
  }, T);
});
