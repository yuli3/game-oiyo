import { describe, expect, it } from "vitest";
import { sheetCell, sheetFrameIndex } from "./sprite-sheet";

const eight = { cols: 8, rows: 1, frameCount: 8, fps: 12, loop: true };

describe("sheetCell", () => {
  it("crops uniform cells without divider math", () => {
    expect(sheetCell(eight, 0, 800, 100)).toEqual({ sx: 0, sy: 0, sw: 100, sh: 100 });
    expect(sheetCell(eight, 3, 800, 100)).toEqual({ sx: 300, sy: 0, sw: 100, sh: 100 });
    expect(sheetCell(eight, 7, 800, 100)).toEqual({ sx: 700, sy: 0, sw: 100, sh: 100 });
  });

  it("clamps out of range frames", () => {
    expect(sheetCell(eight, -2, 800, 100).sx).toBe(0);
    expect(sheetCell(eight, 99, 800, 100).sx).toBe(700);
  });

  it("walks a 4x2 grid in row-major order", () => {
    const grid = { cols: 4, rows: 2, frameCount: 8, fps: 10, loop: false };
    expect(sheetCell(grid, 4, 400, 200)).toEqual({ sx: 0, sy: 100, sw: 100, sh: 100 });
    expect(sheetCell(grid, 5, 400, 200)).toEqual({ sx: 100, sy: 100, sw: 100, sh: 100 });
  });
});

describe("sheetFrameIndex", () => {
  it("returns 0 when reduced motion or single frame", () => {
    expect(sheetFrameIndex(eight, 900, true)).toBe(0);
    expect(sheetFrameIndex({ ...eight, frameCount: 1 }, 900)).toBe(0);
  });

  it("loops at fps", () => {
    expect(sheetFrameIndex(eight, 0)).toBe(0);
    expect(sheetFrameIndex(eight, 1000 / 12)).toBe(1);
    expect(sheetFrameIndex(eight, 8000 / 12)).toBe(0);
  });

  it("holds the last frame when not looping", () => {
    const once = { ...eight, loop: false };
    expect(sheetFrameIndex(once, 10_000)).toBe(7);
  });
});
