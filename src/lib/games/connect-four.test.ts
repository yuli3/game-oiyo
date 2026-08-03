import { describe, expect, it } from "vitest";
import {
  checkWinAt,
  createConnectFourBoard,
  dropDisc,
  findDropRow,
  isBoardFull,
  type ConnectFourBoard,
} from "./connect-four";

function boardFromRows(rows: number[][]): ConnectFourBoard {
  return rows as ConnectFourBoard;
}

/** Builds a board from per-column stacks (bottom-first), respecting gravity. */
function boardFromColumns(columns: number[][]): ConnectFourBoard {
  const board = createConnectFourBoard();
  columns.forEach((stack, col) => {
    stack.forEach((value, indexFromBottom) => {
      board[5 - indexFromBottom][col] = value as ConnectFourBoard[number][number];
    });
  });
  return board;
}

describe("connect-four engine", () => {
  it("creates an empty 6x7 board", () => {
    const board = createConnectFourBoard();
    expect(board.length).toBe(6);
    expect(board.every((row) => row.length === 7 && row.every((cell) => cell === 0))).toBe(true);
  });

  it("drops into the lowest empty row of a column", () => {
    const board = createConnectFourBoard();
    const first = dropDisc(board, 3, 1)!;
    expect(first.row).toBe(5);
    const second = dropDisc(first.board, 3, 2)!;
    expect(second.row).toBe(4);
    // original board passed in is untouched (immutability)
    expect(board[5][3]).toBe(0);
    expect(first.board[5][3]).toBe(1);
  });

  it("rejects a drop into a full column", () => {
    let board = createConnectFourBoard();
    for (let i = 0; i < 6; i += 1) {
      const move = dropDisc(board, 0, (i % 2 === 0 ? 1 : 2))!;
      board = move.board;
    }
    expect(findDropRow(board, 0)).toBe(-1);
    expect(dropDisc(board, 0, 1)).toBeNull();
  });

  it("detects a horizontal win", () => {
    const board = boardFromRows([
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [1, 1, 1, 0, 0, 0, 0],
    ]);
    const move = dropDisc(board, 3, 1)!;
    expect(move.result).toBe(1);
    expect(move.winCells).toHaveLength(4);
  });

  it("detects a vertical win", () => {
    const board = boardFromRows([
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 2, 0, 0, 0, 0, 0],
      [0, 2, 0, 0, 0, 0, 0],
      [0, 2, 0, 0, 0, 0, 0],
      [0, 1, 0, 0, 0, 0, 0],
    ]);
    const move = dropDisc(board, 1, 2)!;
    expect(move.result).toBe(2);
  });

  it("detects a down-right diagonal win", () => {
    // Target diagonal (row,col): (1,1) (2,2) (3,3) (4,4), all player 1.
    // Each column stack (bottom-first) fills the rows *below* its diagonal
    // cell with player-2 filler so gravity leaves the diagonal cell as the
    // next landing spot; column 1 is left empty so the winning drop lands
    // exactly on (1,1).
    const board = boardFromColumns([
      [], // col 0: unused
      [2, 2, 2, 2], // col 1: rows 5,4,3,2 filled -> next drop lands at row 1
      [2, 2, 2, 1], // col 2: rows 5,4,3 filler, then (2,2)=1
      [2, 2, 1], // col 3: rows 5,4 filler, then (3,3)=1
      [2, 1], // col 4: row 5 filler, then (4,4)=1
    ]);
    const move = dropDisc(board, 1, 1)!;
    expect(move.result).toBe(1);
    expect(checkWinAt(move.board, 1, 1, 1)).not.toBeNull();
  });

  it("detects a down-left diagonal win", () => {
    // Target diagonal (row,col): (1,3) (2,2) (3,1) (4,0), all player 2.
    const board = boardFromColumns([
      [1, 2], // col 0: row 5 filler, then (4,0)=2
      [1, 1, 2], // col 1: rows 5,4 filler, then (3,1)=2
      [1, 1, 1, 2], // col 2: rows 5,4,3 filler, then (2,2)=2
      [1, 1, 1, 1], // col 3: rows 5,4,3,2 filled -> next drop lands at row 1
    ]);
    const move = dropDisc(board, 3, 2)!;
    expect(move.result).toBe(2);
  });

  it("declares a draw when the board fills with no winner", () => {
    // A hand-built full board with no four-in-a-row for either player.
    const board = boardFromRows([
      [1, 1, 2, 1, 2, 2, 1],
      [2, 2, 1, 2, 1, 1, 2],
      [1, 1, 2, 1, 2, 2, 1],
      [2, 2, 1, 2, 1, 1, 2],
      [1, 1, 2, 1, 2, 2, 1],
      [2, 2, 1, 2, 1, 1, 0],
    ]);
    const move = dropDisc(board, 6, 2)!;
    expect(move.result).toBe(0);
    expect(isBoardFull(move.board)).toBe(true);
  });

  it("returns no result while the game is still in progress", () => {
    const board = createConnectFourBoard();
    const move = dropDisc(board, 0, 1)!;
    expect(move.result).toBeNull();
    expect(move.winCells).toBeNull();
  });
});
