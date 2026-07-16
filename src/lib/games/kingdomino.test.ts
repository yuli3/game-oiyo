import { describe, expect, it } from "vitest";

import {
  allLegalPlacements,
  applyPlacement,
  bonuses,
  buildDeck,
  CENTER,
  emptyBoard,
  emptyCrowns,
  GRID,
  isLegal,
  scoreBoard,
  scoreBoardBreakdown,
  shuffle,
  type Tile,
} from "./kingdomino";

describe("kingdomino: board setup", () => {
  it("starts with the castle at the centre and everything else empty", () => {
    const board = emptyBoard();
    expect(board[CENTER][CENTER]).toBe("castle");
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        if (r === CENTER && c === CENTER) continue;
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
    expect(isLegal(board, wheatTile, { a: { r: CENTER - 1, c: CENTER }, b: { r: CENTER - 2, c: CENTER } })).toBe(true);
  });

  it("rejects a domino that touches nothing (floating in a corner)", () => {
    const board = emptyBoard();
    expect(isLegal(board, wheatTile, { a: { r: 0, c: 0 }, b: { r: 0, c: 1 } })).toBe(false);
  });

  it("rejects non-adjacent squares", () => {
    const board = emptyBoard();
    expect(isLegal(board, wheatTile, { a: { r: CENTER - 1, c: CENTER }, b: { r: CENTER - 2, c: CENTER + 1 } })).toBe(false); // diagonal
  });

  it("rejects placement outside the coordinate canvas", () => {
    const board = emptyBoard();
    expect(isLegal(board, wheatTile, { a: { r: CENTER - 1, c: CENTER }, b: { r: -1, c: CENTER } })).toBe(false);
  });

  it("rejects placement on an already-occupied cell", () => {
    const board = emptyBoard();
    expect(isLegal(board, wheatTile, { a: { r: CENTER, c: CENTER }, b: { r: CENTER - 1, c: CENTER } })).toBe(false);
  });

  it("finds every legal placement for a fresh tile on an empty board", () => {
    const board = emptyBoard();
    // Every legal spot must touch the castle directly (nothing else is placed yet).
    expect(allLegalPlacements(board, wheatTile)).toHaveLength(24);
  });

  it("rejects a connected placement that would stretch the occupied kingdom past 5 cells", () => {
    const board = emptyBoard();
    for (let c = 0; c < CENTER; c++) board[CENTER][c] = "wheat";
    expect(isLegal(board, wheatTile, {
      a: { r: CENTER, c: CENTER + 1 },
      b: { r: CENTER, c: CENTER + 2 },
    })).toBe(false);
  });
});

describe("kingdomino: applyPlacement + scoreBoard", () => {
  it("scores a connected same-terrain region as size × total crowns", () => {
    const board = emptyBoard();
    const crowns = emptyCrowns();
    const tile: Tile = { id: 2, a: { terrain: "forest", crowns: 1 }, b: { terrain: "forest", crowns: 2 } };
    applyPlacement(board, crowns, tile, { a: { r: CENTER - 1, c: CENTER }, b: { r: CENTER - 2, c: CENTER } });

    expect(board[CENTER - 1][CENTER]).toBe("forest");
    expect(board[CENTER - 2][CENTER]).toBe("forest");
    // One connected forest region of size 2, total crowns 1+2=3 → 2 × 3 = 6.
    expect(scoreBoard(board, crowns)).toBe(6);
  });

  it("scores disconnected same-terrain regions separately", () => {
    const board = emptyBoard();
    const crowns = emptyCrowns();
    board[0][0] = "water"; // isolated single-cell region, no crown
    board[8][8] = "water"; // isolated single-cell region, no crown
    expect(scoreBoard(board, crowns)).toBe(0); // 1×0 + 1×0
  });

  it("reports crown and largest-region tie-break data without merging disconnected terrain", () => {
    const board = emptyBoard();
    const crowns = emptyCrowns();
    board[0][0] = "water";
    board[0][1] = "water";
    crowns[0][0] = 1;
    board[8][8] = "water";
    crowns[8][8] = 2;

    expect(scoreBoardBreakdown(board, crowns)).toMatchObject({
      points: 4,
      crowns: 3,
      largestRegion: 2,
    });
  });
});

describe("kingdomino: bonuses", () => {
  it("grants no bonus on a mostly-empty board", () => {
    const board = emptyBoard();
    expect(bonuses(board)).toEqual({ middleKingdom: false, harmony: false, points: 0 });
  });

  it("grants 5 harmony + 10 middleKingdom when the grid is full and no tile was discarded", () => {
    const board = emptyBoard();
    for (let r = CENTER - 2; r <= CENTER + 2; r++) {
      for (let c = CENTER - 2; c <= CENTER + 2; c++) {
        if (board[r][c] === null) board[r][c] = "wheat";
      }
    }
    expect(bonuses(board)).toEqual({ middleKingdom: true, harmony: true, points: 15 });
  });

  it("does not grant harmony after a discard, while preserving the centred-kingdom bonus", () => {
    const board = emptyBoard();
    for (let r = CENTER - 2; r <= CENTER + 2; r++) {
      for (let c = CENTER - 2; c <= CENTER + 2; c++) {
        if (board[r][c] === null) board[r][c] = "wheat";
      }
    }
    board[CENTER - 1][CENTER - 1] = null;
    board[CENTER + 1][CENTER + 1] = null;
    expect(bonuses(board, 1)).toEqual({ middleKingdom: true, harmony: false, points: 10 });
  });

  it("grants harmony but not Middle Kingdom when the castle is off-centre", () => {
    const board = emptyBoard();
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (board[r][c] === null) board[r][c] = "forest";
      }
    }
    // The castle at (4,4) is the bottom-right corner of this complete 5x5.
    expect(bonuses(board)).toEqual({ middleKingdom: false, harmony: true, points: 5 });
  });
});
