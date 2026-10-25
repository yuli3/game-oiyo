import { describe, expect, it } from "vitest";
import {
  createInitialWaffleGame,
  IS_WAFFLE_HOLE,
  swapWaffleCells,
} from "./word-waffle";

describe("word-waffle core logic", () => {
  it("identifies 4 hole positions on the 5x5 board", () => {
    let holeCount = 0;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (IS_WAFFLE_HOLE(r, c)) holeCount++;
      }
    }
    expect(holeCount).toBe(4);
    expect(IS_WAFFLE_HOLE(1, 1)).toBe(true);
    expect(IS_WAFFLE_HOLE(1, 3)).toBe(true);
    expect(IS_WAFFLE_HOLE(3, 1)).toBe(true);
    expect(IS_WAFFLE_HOLE(3, 3)).toBe(true);
  });

  it("initializes a valid 5x5 waffle board with 21 active letters", () => {
    const { game } = createInitialWaffleGame("en", 0, 42);
    expect(game.swapsRemaining).toBe(15);
    expect(game.status).toBe("playing");

    let letterCount = 0;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (game.grid[r][c] !== null) letterCount++;
      }
    }
    expect(letterCount).toBe(21);
  });

  it("prevents swapping green/locked letters", () => {
    const { game, puzzle } = createInitialWaffleGame("en", 0, 42);
    // Find a green cell
    let greenCoord: { r: number; c: number } | null = null;
    let nonGreenCoord: { r: number; c: number } | null = null;

    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const cell = game.grid[r][c];
        if (cell?.isLocked) greenCoord = { r, c };
        else if (cell && !cell.isLocked) nonGreenCoord = { r, c };
      }
    }

    if (greenCoord && nonGreenCoord) {
      const swapped = swapWaffleCells(game, puzzle, greenCoord, nonGreenCoord);
      expect(swapped).toBeNull();
    }
  });

  it("decrements swaps and updates letter states on valid swap", () => {
    const { game, puzzle } = createInitialWaffleGame("en", 0, 42);
    const nonGreenCoords: Array<{ r: number; c: number }> = [];

    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const cell = game.grid[r][c];
        if (cell && !cell.isLocked) nonGreenCoords.push({ r, c });
      }
    }

    expect(nonGreenCoords.length).toBeGreaterThanOrEqual(2);
    const swapped = swapWaffleCells(game, puzzle, nonGreenCoords[0], nonGreenCoords[1]);
    expect(swapped).not.toBeNull();
    expect(swapped?.swapsRemaining).toBe(14);
  });
});
