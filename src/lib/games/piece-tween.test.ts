import { describe, expect, it } from "vitest";
import {
  castleRookDelta,
  easeOutCubic,
  indexToRowCol,
  tweenFromDelta,
  tweenProgress,
  visualSquare,
} from "./piece-tween";

describe("piece-tween", () => {
  it("eases from 0 to 1", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });

  it("snaps to the end when reduced motion", () => {
    expect(tweenProgress(0, 220, 10, true)).toBe(1);
    expect(tweenProgress(0, 220, 0, false)).toBe(0);
    expect(tweenProgress(0, 220, 220, false)).toBe(1);
  });

  it("starts at the origin cell and ends on the destination", () => {
    const start = tweenFromDelta(6, 4, 4, 4, 0);
    expect(start.dxCells).toBe(0);
    expect(start.dyCells).toBe(2);
    const end = tweenFromDelta(6, 4, 4, 4, 1);
    expect(end.dxCells).toBe(0);
    expect(end.dyCells).toBe(0);
  });

  it("maps a kingside castle rook from h to f", () => {
    expect(castleRookDelta(7, 4, 7, 6)).toEqual({ fromRow: 7, fromCol: 7, toRow: 7, toCol: 5 });
    expect(castleRookDelta(7, 4, 7, 5)).toBeNull();
  });

  it("flips visual squares for black orientation", () => {
    expect(visualSquare(0, 0, true)).toEqual({ row: 7, col: 7 });
    expect(indexToRowCol(9, 8)).toEqual({ row: 1, col: 1 });
  });
});
