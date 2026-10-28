import { describe, expect, it } from "vitest";
import {
  CHESS_TABLE_ENGINE,
  CHESS_TABLE_REJECTED_RUNTIMES,
  CHESS_TABLE_SECONDS,
  chessTableAiReply,
  chessTableClock,
  chessTablePick,
  chessTableResign,
  createChessTable,
} from "./chess-table";

describe("chess table slice", () => {
  it("starts with a ten-minute clock and resigns without leaving the web engine", () => {
    const table = createChessTable();
    expect(table.whiteSeconds).toBe(CHESS_TABLE_SECONDS);
    expect(table.blackSeconds).toBe(600);
    expect(chessTableResign(table)).toMatchObject({ end: "resign", winner: "black" });
    expect(CHESS_TABLE_ENGINE).toBe("src/lib/games/ai/chess.ts");
    expect(CHESS_TABLE_REJECTED_RUNTIMES).toEqual(["unity-webgl", "google-playground"]);
  });

  it("selects a white piece and moves it with one pick, then flags the clock", () => {
    const selected = chessTablePick(createChessTable(), [6, 4]);
    expect(selected.selected).toEqual([6, 4]);
    const moved = chessTablePick(selected, [4, 4]);
    expect(moved.position.board[4][4]).toBe("P");
    expect(moved.position.board[6][4]).toBeNull();
    expect(moved.position.whiteToMove).toBe(false);
    const flagged = chessTableClock({ ...moved, blackSeconds: 0.4 }, 0.5);
    expect(flagged.end).toBe("time");
    expect(flagged.winner).toBe("white");
  });

  it("answers with the existing chess engine", () => {
    const selected = chessTablePick(createChessTable(), [6, 4]);
    const moved = chessTablePick(selected, [4, 4]);
    const reply = chessTableAiReply(moved);
    expect(reply.position.whiteToMove).toBe(true);
    expect(reply.history.length).toBeGreaterThan(moved.history.length);
  });
});
