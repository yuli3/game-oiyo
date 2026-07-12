import { describe, expect, it } from "vitest";

import {
  DEFAULT_ROWS,
  MAX_BET,
  MIN_BET,
  calculateDropScore,
  clampBet,
  computeSlotMultipliers,
  generatePegLayout,
  resolveSlotIndex,
} from "./plinko";

describe("plinko: generatePegLayout", () => {
  it("row 0 (apex) has exactly one peg", () => {
    const pegs = generatePegLayout(DEFAULT_ROWS);
    expect(pegs.filter((p) => p.row === 0)).toHaveLength(1);
  });

  it("each row has exactly one more peg than the row above", () => {
    const pegs = generatePegLayout(6);
    for (let row = 0; row < 6; row++) {
      expect(pegs.filter((p) => p.row === row)).toHaveLength(row + 1);
    }
  });

  it("bottom row has `rows` pegs (so gaps form rows+1 slots)", () => {
    const rows = 9;
    const pegs = generatePegLayout(rows);
    expect(pegs.filter((p) => p.row === rows - 1)).toHaveLength(rows);
  });

  it("all normalized coordinates stay strictly within (0, 1)", () => {
    const pegs = generatePegLayout(DEFAULT_ROWS);
    for (const p of pegs) {
      expect(p.xNorm).toBeGreaterThan(0);
      expect(p.xNorm).toBeLessThan(1);
      expect(p.yNorm).toBeGreaterThan(0);
      expect(p.yNorm).toBeLessThan(1);
    }
  });

  it("yNorm strictly increases row over row (pegs move downward)", () => {
    const pegs = generatePegLayout(5);
    const yByRow = [0, 1, 2, 3, 4].map((row) => pegs.find((p) => p.row === row)!.yNorm);
    for (let i = 1; i < yByRow.length; i++) {
      expect(yByRow[i]).toBeGreaterThan(yByRow[i - 1]);
    }
  });

  it("each row's pegs are centered (symmetric around xNorm 0.5)", () => {
    const pegs = generatePegLayout(4);
    const row3 = pegs.filter((p) => p.row === 3).sort((a, b) => a.col - b.col);
    for (let i = 0; i < row3.length; i++) {
      const mirrorX = row3[row3.length - 1 - i].xNorm;
      expect(row3[i].xNorm + mirrorX).toBeCloseTo(1, 10);
    }
  });
});

describe("plinko: computeSlotMultipliers", () => {
  it("returns rows+1 slots", () => {
    expect(computeSlotMultipliers(9)).toHaveLength(10);
    expect(computeSlotMultipliers(6)).toHaveLength(7);
  });

  it("is symmetric (edges mirror each other)", () => {
    const m = computeSlotMultipliers(9);
    for (let i = 0; i < m.length; i++) {
      expect(m[i]).toBeCloseTo(m[m.length - 1 - i], 10);
    }
  });

  it("center slot(s) pay the least, edge slots pay the most", () => {
    const m = computeSlotMultipliers(9);
    const center = Math.min(...m);
    const edges = Math.max(m[0], m[m.length - 1]);
    expect(m[0]).toBe(edges);
    expect(m[m.length - 1]).toBe(edges);
    expect(center).toBeLessThan(edges);
  });

  it("all multipliers stay within the configured [0.2, 25] bounds", () => {
    for (const rows of [3, 6, 9, 12]) {
      for (const mult of computeSlotMultipliers(rows)) {
        expect(mult).toBeGreaterThanOrEqual(0.2);
        expect(mult).toBeLessThanOrEqual(25);
      }
    }
  });
});

describe("plinko: clampBet", () => {
  it("clamps below the minimum up to MIN_BET", () => {
    expect(clampBet(1)).toBe(MIN_BET);
    expect(clampBet(-50)).toBe(MIN_BET);
  });

  it("clamps above the maximum down to MAX_BET", () => {
    expect(clampBet(99999)).toBe(MAX_BET);
  });

  it("rounds to the nearest bet step", () => {
    expect(clampBet(23)).toBe(20);
    expect(clampBet(27)).toBe(30);
  });

  it("falls back to the minimum for non-finite input", () => {
    expect(clampBet(NaN)).toBe(MIN_BET);
    expect(clampBet(Infinity)).toBe(MIN_BET);
  });
});

describe("plinko: calculateDropScore", () => {
  it("multiplies bet by multiplier and rounds to the nearest integer", () => {
    expect(calculateDropScore(100, 2)).toBe(200);
    expect(calculateDropScore(100, 0.5)).toBe(50);
    expect(calculateDropScore(30, 1.3)).toBe(39);
  });

  it("rounds fractional results (banker's-adjacent, standard Math.round)", () => {
    expect(calculateDropScore(10, 0.25)).toBe(3); // 2.5 -> rounds up
  });
});

describe("plinko: resolveSlotIndex", () => {
  it("x=0 maps to the first slot", () => {
    expect(resolveSlotIndex(0, 10)).toBe(0);
  });

  it("x just under 1 maps to the last slot", () => {
    expect(resolveSlotIndex(0.999, 10)).toBe(9);
  });

  it("x=1 exactly still maps to the last slot (clamped)", () => {
    expect(resolveSlotIndex(1, 10)).toBe(9);
  });

  it("out-of-range x values are clamped instead of throwing", () => {
    expect(resolveSlotIndex(-5, 10)).toBe(0);
    expect(resolveSlotIndex(5, 10)).toBe(9);
  });

  it("splits the board evenly across slots", () => {
    expect(resolveSlotIndex(0.15, 10)).toBe(1);
    expect(resolveSlotIndex(0.55, 10)).toBe(5);
  });
});
