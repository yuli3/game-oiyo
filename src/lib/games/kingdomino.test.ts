import { describe, expect, it } from "vitest";

import {
  allLegalPlacements,
  applyPlacement,
  bonuses,
  buildDeck,
  emptyBoard,
  emptyCrowns,
  GRID,
  isLegal,
  scoreBoard,
  shuffle,
  type Tile,
} from "./kingdomino";

describe("kingdomino: board setup", () => {
  it("starts with the castle at the centre and everything else empty", () => {
    const board = emptyBoard();
    expect(board[2][2]).toBe("castle");
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        if (r === 2 && c === 2) continue;
        expect(board[r][c]).toBeNull();
      }
    }
  });
});

describe("kingdomino: deck", () => {
  it("builds a 48-tile deck", () => {
    expect(buildDeck()).toHaveLength(48);
  });

  it("shuffle keeps the same multiset of tile ids (no tiles lost or duplicated)", () => {
    const deck = buildDeck();
    const shuffled = shuffle(deck, () => 0.42);
    expect(shuffled).toHaveLength(deck.length);
    expect(shuffled.map((t) => t.id).sort((a, b) => a - b)).toEqual(deck.map((t) => t.id).sort((a, b) => a - b));
  });
});

describe("kingdomino: placement legality", () => {
  const wheatTile: Tile = { id: 1, a: { terrain: "wheat", crowns: 0 }, b: { terrain: "wheat", crowns: 0 } };

  it("allows a domino touching the castle on an empty board", () => {
    const board = emptyBoard();
    expect(isLegal(board, wheatTile, { a: { r: 1, c: 2 }, b: { r: 0, c: 2 } })).toBe(true);
  });

  it("rejects a domino that touches nothing (floating in a corner)", () => {
    const board = emptyBoard();
    expect(isLegal(board, wheatTile, { a: { r: 0, c: 0 }, b: { r: 0, c: 1 } })).toBe(false);
  });

  it("rejects non-adjacent squares", () => {
    const board = emptyBoard();
    expect(isLegal(board, wheatTile, { a: { r: 1, c: 2 }, b: { r: 0, c: 3 } })).toBe(false); // diagonal
  });

  it("rejects placement out of the 5x5 grid", () => {
    const board = emptyBoard();
    expect(isLegal(board, wheatTile, { a: { r: 1, c: 2 }, b: { r: -1, c: 2 } })).toBe(false);
  });

  it("rejects placement on an already-occupied cell", () => {
    const board = emptyBoard();
    expect(isLegal(board, wheatTile, { a: { r: 2, c: 2 }, b: { r: 1, c: 2 } })).toBe(false); // (2,2) is the castle
  });

  it("finds every legal placement for a fresh tile on an empty board", () => {
    const board = emptyBoard();
    // Every legal spot must touch the castle directly (nothing else is placed yet).
    expect(allLegalPlacements(board, wheatTile)).toHaveLength(24);
  });
});

describe("kingdomino: applyPlacement + scoreBoard", () => {
  it("scores a connected same-terrain region as size × total crowns", () => {
    const board = emptyBoard();
    const crowns = emptyCrowns();
    const tile: Tile = { id: 2, a: { terrain: "forest", crowns: 1 }, b: { terrain: "forest", crowns: 2 } };
    applyPlacement(board, crowns, tile, { a: { r: 1, c: 2 }, b: { r: 0, c: 2 } });

    expect(board[1][2]).toBe("forest");
    expect(board[0][2]).toBe("forest");
    // One connected forest region of size 2, total crowns 1+2=3 → 2 × 3 = 6.
    expect(scoreBoard(board, crowns)).toBe(6);
  });

  it("scores disconnected same-terrain regions separately", () => {
    const board = emptyBoard();
    const crowns = emptyCrowns();
    board[0][0] = "water"; // isolated single-cell region, no crown
    board[4][4] = "water"; // isolated single-cell region, no crown
    expect(scoreBoard(board, crowns)).toBe(0); // 1×0 + 1×0
  });
});

describe("kingdomino: bonuses", () => {
  it("grants no bonus on a mostly-empty board", () => {
    const board = emptyBoard();
    expect(bonuses(board)).toEqual({ middleKingdom: false, harmony: false, points: 0 });
  });

  it("grants harmony + middleKingdom when the grid is full and the castle stayed centred", () => {
    const board = emptyBoard();
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        if (board[r][c] === null) board[r][c] = "wheat";
      }
    }
    expect(bonuses(board)).toEqual({ middleKingdom: true, harmony: true, points: 20 });
  });
});
