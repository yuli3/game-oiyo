import { describe, expect, it } from "vitest";
import { createFreeCellGame } from "./freecell";
import { dealSolitaire } from "./solitaire";
import { parseConnectFourSave, parseFreeCellSave, parseGomokuSave, parseSolitaireSave } from "./active-game-save";

describe("active game save v1", () => {
  it("accepts complete active card layouts and strips unknown fields", () => {
    const solitaire = parseSolitaireSave({ version: 1, state: dealSolitaire(() => 0.4), unknown: "drop" });
    const freecell = parseFreeCellSave({ version: 1, state: createFreeCellGame(() => 0.4), unknown: "drop" });
    expect(solitaire).not.toBeNull();
    expect(freecell).not.toBeNull();
    expect(solitaire).not.toHaveProperty("unknown");
    expect(freecell).not.toHaveProperty("unknown");
  });

  it("rejects duplicate, missing and terminal card layouts", () => {
    const state = dealSolitaire(() => 0.4);
    state.stock[0] = state.stock[1];
    expect(parseSolitaireSave({ version: 1, state })).toBeNull();
    const freecell = createFreeCellGame(() => 0.4);
    freecell.tableau[0].pop();
    expect(parseFreeCellSave({ version: 1, state: freecell })).toBeNull();
    const forged = createFreeCellGame(() => 0.4);
    forged.tableau[0][0] = { ...forged.tableau[0][0], value: "K" };
    expect(parseFreeCellSave({ version: 1, state: forged })).toBeNull();
  });

  it("accepts legal active boards and rejects floating, turn-drift and terminal boards", () => {
    const connect = { version: 1, board: Array.from({ length: 6 }, () => Array(7).fill(0)), currentPlayer: 2, mode: "ai", level: 3 } as const;
    connect.board[5][3] = 1;
    expect(parseConnectFourSave(connect)).not.toBeNull();
    const floating = structuredClone(connect); floating.board[4][3] = 2; floating.board[5][3] = 0;
    expect(parseConnectFourSave(floating)).toBeNull();
    expect(parseConnectFourSave({ ...connect, currentPlayer: 1 })).toBeNull();

    const board = Array<1 | 2 | null>(225).fill(null); board[112] = 1;
    expect(parseGomokuSave({ version: 1, board, isBlackTurn: false, mode: "local", level: 2 })).not.toBeNull();
    expect(parseGomokuSave({ version: 1, board, isBlackTurn: true, mode: "local", level: 2 })).toBeNull();
    [0, 1, 2, 3, 4].forEach((index) => { board[index] = 1; });
    expect(parseGomokuSave({ version: 1, board, isBlackTurn: false, mode: "local", level: 2 })).toBeNull();
  });
});
