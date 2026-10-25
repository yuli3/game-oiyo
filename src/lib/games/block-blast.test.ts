import { describe, expect, it } from "vitest";
import {
  BOARD_SIZE,
  canPlaceShape,
  createEmptyGrid,
  createInitialBlockBlastGame,
  hasAnyValidMove,
  placeShapeAndClear,
  triggerReviveBomb,
} from "./block-blast";

describe("block-blast core logic", () => {
  it("initializes an empty 8x8 grid with 3 hand pieces", () => {
    const game = createInitialBlockBlastGame(100);
    expect(game.grid).toHaveLength(BOARD_SIZE);
    expect(game.grid[0]).toHaveLength(BOARD_SIZE);
    expect(game.hand.filter(Boolean)).toHaveLength(3);
    expect(game.status).toBe("playing");
  });

  it("checks boundary and overlap placement accurately", () => {
    const grid = createEmptyGrid();
    const square2x2 = { id: "s", matrix: [[1, 1], [1, 1]], color: "cyan" as const };

    // Valid placement inside grid
    expect(canPlaceShape(grid, square2x2, 0, 0)).toBe(true);
    expect(canPlaceShape(grid, square2x2, 6, 6)).toBe(true);

    // Out of bounds
    expect(canPlaceShape(grid, square2x2, 7, 7)).toBe(false);
    expect(canPlaceShape(grid, square2x2, -1, 0)).toBe(false);

    // Overlap
    grid[0][0] = "red";
    expect(canPlaceShape(grid, square2x2, 0, 0)).toBe(false);
  });

  it("clears full rows and columns simultaneously and awards combo points", () => {
    const game = createInitialBlockBlastGame(100);
    // Fill row 0 completely except cell (0, 7)
    for (let c = 0; c < 7; c++) {
      game.grid[0][c] = "blue";
    }

    // Hand piece is a 1x1 yellow block
    game.hand[0] = { id: "p1", matrix: [[1]], color: "yellow" };

    const result = placeShapeAndClear(game, 0, 0, 7);
    expect(result).not.toBeNull();
    expect(result?.clearedRows).toEqual([0]);
    // Row 0 should now be cleared
    expect(result?.nextState.grid[0].every((cell) => cell === null)).toBe(true);
    expect(result?.nextState.comboCount).toBe(1);
    expect(result?.nextState.score).toBeGreaterThan(50);
  });

  it("detects game over when no valid moves exist and allows revive bomb", () => {
    const game = createInitialBlockBlastGame(100);
    // Fill the entire grid
    game.grid = Array(BOARD_SIZE)
      .fill(null)
      .map(() => Array(BOARD_SIZE).fill("red"));

    // Hand has a 2x2 shape that cannot fit
    game.hand = [{ id: "s", matrix: [[1, 1], [1, 1]], color: "cyan" }, null, null];

    expect(hasAnyValidMove(game.grid, game.hand)).toBe(false);

    game.status = "game_over";
    const revived = triggerReviveBomb(game);
    expect(revived).not.toBeNull();
    expect(revived?.status).toBe("revived");
    expect(revived?.hasRevive).toBe(false);
    // 4x4 area in center is now cleared
    expect(revived?.grid[3][3]).toBeNull();
  });
});
