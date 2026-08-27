import { describe, expect, it } from "vitest";

import { dayIndex, minutesUntilNextDaily, mulberry32, previousDayKey, shuffle, todayKey } from "./daily";
import { countTentsSolutions, generateUniqueTents, validateTents } from "./tents";

describe("daily: date helpers", () => {
  it("dayIndex counts days since 2024-01-01 at local midnight", () => {
    expect(dayIndex(new Date("2024-01-01T12:34:56"))).toBe(0);
    expect(dayIndex(new Date("2024-01-02T00:00:01"))).toBe(1);
    expect(dayIndex(new Date(2024, 2, 10, 23, 59))).toBe(69);
    expect(dayIndex(new Date(2024, 2, 11, 0, 1))).toBe(70);
  });

  it("todayKey formats a local YYYY-MM-DD", () => {
    expect(todayKey(new Date(2026, 6, 16, 23, 59))).toBe("2026-07-16");
    expect(todayKey(new Date(2026, 0, 5, 0, 0))).toBe("2026-01-05");
  });

  it("previousDayKey handles month and year boundaries", () => {
    expect(previousDayKey("2026-07-16")).toBe("2026-07-15");
    expect(previousDayKey("2026-07-01")).toBe("2026-06-30");
    expect(previousDayKey("2026-01-01")).toBe("2025-12-31");
    expect(previousDayKey("2024-03-01")).toBe("2024-02-29"); // leap year
  });

  it("counts whole minutes to the next local day", () => {
    expect(minutesUntilNextDaily(new Date(2026, 7, 27, 23, 59, 1))).toBe(1);
    expect(minutesUntilNextDaily(new Date(2026, 7, 27, 22, 30, 0))).toBe(90);
  });
});

describe("daily: seeded randomness", () => {
  it("mulberry32 is deterministic per seed and differs across seeds", () => {
    const a1 = mulberry32(42), a2 = mulberry32(42), b = mulberry32(43);
    const seqA1 = [a1(), a1(), a1()];
    const seqA2 = [a2(), a2(), a2()];
    const seqB = [b(), b(), b()];
    expect(seqA1).toEqual(seqA2);
    expect(seqA1).not.toEqual(seqB);
    for (const v of seqA1) expect(v).toBeGreaterThanOrEqual(0);
    for (const v of seqA1) expect(v).toBeLessThan(1);
  });

  it("shuffle is deterministic under a seeded rng and keeps all elements", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out1 = shuffle(input, mulberry32(7));
    const out2 = shuffle(input, mulberry32(7));
    expect(out1).toEqual(out2);
    expect([...out1].sort((a, b) => a - b)).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]); // input untouched
  });
});

describe("daily: seeded puzzle generation is reproducible", () => {
  it("generateUniqueTents yields the identical puzzle for the same seed", () => {
    const p1 = generateUniqueTents(6, 7, mulberry32(123));
    const p2 = generateUniqueTents(6, 7, mulberry32(123));
    expect(p1).toEqual(p2);
    expect(countTentsSolutions(p1.puzzle, 2)).toBe(1);
  });

  it("the generated solution actually solves the generated puzzle", () => {
    for (const seed of [1, 2, 3, 99, 20260716]) {
      const { puzzle, solution } = generateUniqueTents(6, 7, mulberry32(seed));
      const v = validateTents(solution, puzzle);
      expect(v).toEqual({ ok: true, complete: true, error: null });
    }
  });
});
