import { describe, expect, it } from "vitest";
import { chessApplyState, chessPositionKey, createInitialChessState, type ChessMove } from "./ai/chess";
import { CHESS_SAVE_KEY, LEGACY_CHESS_SAVE_KEY, clearChessSave, loadChessSave, parseChessSave, serializeChessSave, storeChessSave } from "./chess-save";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

describe("chess active-game persistence", () => {
  it("round-trips turn, castling, en-passant, clocks and repetition history", () => {
    const initial = createInitialChessState();
    const afterE4 = chessApplyState(initial, { from: [6, 4], to: [4, 4] });
    const history = [chessPositionKey(initial), chessPositionKey(afterE4)];
    const moveHistory = [{ notation: "e4", captured: null, white: true }];
    const restored = parseChessSave(serializeChessSave({ state: afterE4, positionHistory: history, mode: "ai", level: 3, moveHistory, orientation: "black" }));
    expect(restored).toEqual({ version: 2, state: afterE4, positionHistory: history, mode: "ai", level: 3, moveHistory, orientation: "black" });
    expect(restored?.state.enPassant).toEqual([5, 4]);
    expect(restored?.state.whiteToMove).toBe(false);
    expect(restored?.state.castling.K).toBe(true);
  });

  it("rejects malformed, old-version, invalid-board, and mismatched-history data", () => {
    expect(parseChessSave("not json")).toBeNull();
    expect(parseChessSave('{"version":0}')).toBeNull();
    const state = createInitialChessState();
    const valid = JSON.parse(serializeChessSave({ state, positionHistory: [chessPositionKey(state)], mode: "local", level: 2, moveHistory: [], orientation: "white" }));
    valid.state.board[7][4] = "X";
    expect(parseChessSave(JSON.stringify(valid))).toBeNull();
    valid.state = state;
    valid.positionHistory = ["unrelated position key"];
    expect(parseChessSave(JSON.stringify(valid))).toBeNull();
  });

  it("rejects a terminal position because completed games are not resumable", () => {
    let state = createInitialChessState();
    const history = [chessPositionKey(state)];
    const moves: ChessMove[] = [
      { from: [6, 5], to: [5, 5] },
      { from: [1, 4], to: [3, 4] },
      { from: [6, 6], to: [4, 6] },
      { from: [0, 3], to: [4, 7] },
    ];
    for (const move of moves) {
      state = chessApplyState(state, move);
      history.push(chessPositionKey(state));
    }
    expect(parseChessSave(serializeChessSave({ state, positionHistory: history, mode: "ai", level: 2, moveHistory: moves.map((_, index) => ({ notation: `m${index}`, captured: null, white: index % 2 === 0 })), orientation: "white" }))).toBeNull();
  });

  it("uses a dedicated versioned key and clears it without touching other records", () => {
    const storage = memoryStorage();
    const state = createInitialChessState();
    storage.setItem("oiyo:game-records:v1", "keep");
    storeChessSave({ state, positionHistory: [chessPositionKey(state)], mode: "local", level: 2, moveHistory: [], orientation: "white" }, storage);
    expect(storage.getItem(CHESS_SAVE_KEY)).not.toBeNull();
    expect(loadChessSave(storage)?.state).toEqual(state);
    clearChessSave(storage);
    expect(storage.getItem(CHESS_SAVE_KEY)).toBeNull();
    expect(storage.getItem("oiyo:game-records:v1")).toBe("keep");
  });

  it("fails safely when browser storage throws", () => {
    const throwing = {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
      removeItem: () => { throw new Error("blocked"); },
    };
    expect(loadChessSave(throwing)).toBeNull();
    expect(() => storeChessSave({ state: createInitialChessState(), positionHistory: [chessPositionKey(createInitialChessState())], mode: "local", level: 1, moveHistory: [], orientation: "white" }, throwing)).not.toThrow();
    expect(() => clearChessSave(throwing)).not.toThrow();
  });

  it("migrates a valid v1 active game into the separate v2 key without inventing history", () => {
    const storage = memoryStorage();
    const state = createInitialChessState();
    storage.setItem(LEGACY_CHESS_SAVE_KEY, JSON.stringify({
      version: 1, state, positionHistory: [chessPositionKey(state)], mode: "ai", level: 3,
    }));
    expect(loadChessSave(storage)).toEqual({
      version: 2, state, positionHistory: [chessPositionKey(state)], mode: "ai", level: 3,
      moveHistory: [], orientation: "white",
    });
    expect(storage.getItem(LEGACY_CHESS_SAVE_KEY)).not.toBeNull();
    expect(JSON.parse(storage.getItem(CHESS_SAVE_KEY)!)).toMatchObject({ version: 2, moveHistory: [], orientation: "white" });
  });

  it("rejects malformed v2 move history and orientation", () => {
    const state = createInitialChessState();
    const base = { version: 2, state, positionHistory: [chessPositionKey(state)], mode: "local", level: 2, moveHistory: [], orientation: "white" };
    expect(parseChessSave(JSON.stringify({ ...base, moveHistory: [{ notation: "", captured: "X", white: true }] }))).toBeNull();
    expect(parseChessSave(JSON.stringify({ ...base, orientation: "sideways" }))).toBeNull();
  });
});
