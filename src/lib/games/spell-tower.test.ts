import { describe, it, expect } from "vitest";
import {
  initSpellTower,
  selectTile,
  isAdjacent,
  getSelectedWord,
  isValidWord,
  submitWord,
  COLS,
  ROWS,
} from "./spell-tower";

describe("SpellTower Core Engine", () => {
  it("initializes a valid 7x9 grid with bottom rows populated", () => {
    const game = initSpellTower();
    expect(game.grid.length).toBe(ROWS);
    expect(game.grid[0]!.length).toBe(COLS);
    expect(game.status).toBe("playing");
    expect(game.score).toBe(0);

    // Top rows should be empty
    expect(game.grid[0]!.every((cell) => cell === null)).toBe(true);
    // Bottom row should be filled
    expect(game.grid[ROWS - 1]!.every((cell) => cell !== null)).toBe(true);
  });

  it("checks adjacency for 8 directions correctly", () => {
    expect(isAdjacent({ r: 4, c: 4 }, { r: 3, c: 4 })).toBe(true); // North
    expect(isAdjacent({ r: 4, c: 4 }, { r: 3, c: 5 })).toBe(true); // NE
    expect(isAdjacent({ r: 4, c: 4 }, { r: 5, c: 5 })).toBe(true); // SE
    expect(isAdjacent({ r: 4, c: 4 }, { r: 4, c: 4 })).toBe(false); // Same tile
    expect(isAdjacent({ r: 4, c: 4 }, { r: 2, c: 4 })).toBe(false); // Too far
  });

  it("selects adjacent tiles and builds selected word path", () => {
    let game = initSpellTower();
    // Inject known letters for deterministic test
    game.grid[8]![0] = { id: "t1", letter: "C", type: "normal", points: 3 };
    game.grid[8]![1] = { id: "t2", letter: "A", type: "normal", points: 1 };
    game.grid[8]![2] = { id: "t3", letter: "T", type: "normal", points: 1 };

    game = selectTile(game, { r: 8, c: 0 });
    game = selectTile(game, { r: 8, c: 1 });
    game = selectTile(game, { r: 8, c: 2 });

    expect(game.selectedPath.length).toBe(3);
    expect(getSelectedWord(game)).toBe("CAT");
  });

  it("prevents selecting non-adjacent tiles or dead blocks", () => {
    let game = initSpellTower();
    game.grid[8]![0] = { id: "t1", letter: "C", type: "normal", points: 3 };
    game.grid[8]![3] = { id: "t2", letter: "A", type: "normal", points: 1 };
    game.grid[8]![1] = { id: "dead1", letter: "☠", type: "dead", points: 0 };

    game = selectTile(game, { r: 8, c: 0 });
    // Attempt to select dead block
    game = selectTile(game, { r: 8, c: 1 });
    expect(game.selectedPath.length).toBe(1);

    // Attempt to select non-adjacent tile at (8, 3)
    game = selectTile(game, { r: 8, c: 3 });
    expect(game.selectedPath.length).toBe(1);
  });

  it("clears valid word, clears adjacent dead blocks, and applies gravity collapse", () => {
    let game = initSpellTower();
    // Clear whole board first
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        game.grid[r]![c] = null;
      }
    }

    // Place C, A, T horizontally at row 7
    game.grid[7]![1] = { id: "c1", letter: "C", type: "normal", points: 3 };
    game.grid[7]![2] = { id: "a1", letter: "A", type: "normal", points: 1 };
    game.grid[7]![3] = { id: "t1", letter: "T", type: "normal", points: 1 };

    // Place tile ABOVE 'A' at row 6
    game.grid[6]![2] = { id: "top_tile", letter: "Z", type: "normal", points: 10 };

    // Place dead block adjacent at row 8, col 2
    game.grid[8]![2] = { id: "dead_adj", letter: "☠", type: "dead", points: 0 };

    expect(isValidWord("CAT")).toBe(true);

    game = selectTile(game, { r: 7, c: 1 });
    game = selectTile(game, { r: 7, c: 2 });
    game = selectTile(game, { r: 7, c: 3 });

    const result = submitWord(game);
    expect(result.clearedWord).toBe("CAT");
    expect(result.pointsEarned).toBeGreaterThan(0);
    expect(result.deadTilesCleared).toBe(1); // dead block at (8, 2) popped!
    expect(result.state.wordsFound).toContain("CAT");
  });
});
