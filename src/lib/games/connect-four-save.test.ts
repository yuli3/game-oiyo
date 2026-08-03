import { describe, expect, it } from "vitest";
import {
  CONNECT_FOUR_SAVE_KEY,
  LEGACY_CONNECT_FOUR_SAVE_KEY,
  clearLegacyConnectFourSave,
  loadConnectFourSaveV2,
  migrateLegacyConnectFourSave,
  parseConnectFourSaveV2,
  serializeConnectFourSaveV2,
  storeConnectFourSaveV2,
  type ConnectFourSaveV2,
} from "./connect-four-save";
import { createConnectFourBoard, dropDisc, type ConnectFourBoard } from "./connect-four";

const NOW = 2_000_000;

function boardWithMoves(cols: number[]): { board: ConnectFourBoard; lastMove: { row: number; col: number } } {
  let board = createConnectFourBoard();
  let player: 1 | 2 = 1;
  let lastMove = { row: -1, col: -1 };
  for (const col of cols) {
    const move = dropDisc(board, col, player);
    if (!move) throw new Error("bad fixture move");
    board = move.board;
    lastMove = { row: move.row, col };
    player = player === 1 ? 2 : 1;
  }
  return { board, lastMove };
}

function validSave(overrides: Partial<Omit<ConnectFourSaveV2, "version">> = {}): Omit<ConnectFourSaveV2, "version"> {
  const { board, lastMove } = boardWithMoves([3, 4]);
  return {
    board,
    currentPlayer: 1,
    mode: "ai",
    level: 2,
    lastMove,
    startedAtEpochMs: NOW - 10_000,
    savedAtEpochMs: NOW - 1_000,
    ...overrides,
  };
}

describe("connect-four save v2 parser", () => {
  it("round-trips a valid in-progress match", () => {
    const save = validSave();
    const parsed = parseConnectFourSaveV2(serializeConnectFourSaveV2(save), NOW);
    expect(parsed).not.toBeNull();
    expect(parsed?.lastMove).toEqual(save.lastMove);
    expect(parsed?.mode).toBe("ai");
  });

  it("rejects an empty board — a fresh match with no progress is never saved", () => {
    const save = validSave({ board: createConnectFourBoard(), currentPlayer: 1, lastMove: null, startedAtEpochMs: NOW, savedAtEpochMs: NOW });
    expect(parseConnectFourSaveV2(serializeConnectFourSaveV2(save), NOW)).toBeNull();
  });

  it("accepts matching started/saved timestamps at the boundary", () => {
    const save = validSave({ startedAtEpochMs: NOW - 1_000, savedAtEpochMs: NOW - 1_000 });
    expect(parseConnectFourSaveV2(serializeConnectFourSaveV2(save), NOW)).not.toBeNull();
  });

  it("fails closed on corrupt or foreign payloads", () => {
    expect(parseConnectFourSaveV2(null, NOW)).toBeNull();
    expect(parseConnectFourSaveV2("not json {", NOW)).toBeNull();
    expect(parseConnectFourSaveV2(serializeConnectFourSaveV2(validSave({ mode: "vs" as never })), NOW)).toBeNull();
    expect(parseConnectFourSaveV2(serializeConnectFourSaveV2(validSave({ level: 4 as never })), NOW)).toBeNull();
    expect(parseConnectFourSaveV2(serializeConnectFourSaveV2(validSave({ savedAtEpochMs: NOW + 600_000 })), NOW)).toBeNull();
    expect(parseConnectFourSaveV2(serializeConnectFourSaveV2(validSave({ startedAtEpochMs: NOW - 1_000, savedAtEpochMs: NOW - 10_000 })), NOW)).toBeNull();
  });

  it("rejects a floating disc (gravity violation)", () => {
    const board = createConnectFourBoard();
    board[2][3] = 1; // floating: nothing beneath it
    const save = validSave({ board, currentPlayer: 2, lastMove: { row: 2, col: 3 } });
    expect(parseConnectFourSaveV2(serializeConnectFourSaveV2(save), NOW)).toBeNull();
  });

  it("rejects a lastMove that doesn't point at an occupied cell", () => {
    const save = validSave({ lastMove: { row: 0, col: 0 } });
    expect(parseConnectFourSaveV2(serializeConnectFourSaveV2(save), NOW)).toBeNull();
  });

  it("rejects an already-completed connect-four as non-restorable", () => {
    const { board, lastMove } = boardWithMoves([0, 1, 0, 1, 0, 1, 0]); // col0 completes a vertical four for player 1
    const save = validSave({ board, currentPlayer: 2, lastMove });
    expect(parseConnectFourSaveV2(serializeConnectFourSaveV2(save), NOW)).toBeNull();
  });

  it("rejects stone-count parity mismatches (tampered turn order)", () => {
    const save = validSave({ currentPlayer: 2 }); // 2 discs placed, should be player 1's turn again
    expect(parseConnectFourSaveV2(serializeConnectFourSaveV2(save), NOW)).toBeNull();
  });
});

describe("connect-four legacy v1 migration", () => {
  it("promotes a valid in-progress v1 board without fabricating last move or timing", () => {
    const { board } = boardWithMoves([3, 4, 2]);
    const migrated = migrateLegacyConnectFourSave(JSON.stringify({ version: 1, board, currentPlayer: 2, mode: "ai", level: 2 }), NOW);
    expect(migrated).not.toBeNull();
    expect(migrated?.lastMove).toBeNull();
    expect(migrated?.startedAtEpochMs).toBe(NOW);
    expect(migrated?.savedAtEpochMs).toBe(NOW);
    expect(parseConnectFourSaveV2(serializeConnectFourSaveV2(migrated!), NOW)).not.toBeNull();
  });

  it("rejects migrating an already-completed or corrupt v1 board", () => {
    const { board } = boardWithMoves([0, 1, 0, 1, 0, 1, 0]);
    expect(migrateLegacyConnectFourSave(JSON.stringify({ version: 1, board, currentPlayer: 2, mode: "local", level: 2 }), NOW)).toBeNull();
    expect(migrateLegacyConnectFourSave("not json {", NOW)).toBeNull();
    expect(migrateLegacyConnectFourSave(null, NOW)).toBeNull();
  });

  it("moves a v1 save to the v2 key exactly once during load", () => {
    const { board } = boardWithMoves([3, 4]);
    const written = new Map<string, string>([
      [LEGACY_CONNECT_FOUR_SAVE_KEY, JSON.stringify({ version: 1, board, currentPlayer: 1, mode: "ai", level: 2 })],
    ]);
    const storage = {
      getItem: (key: string) => written.get(key) ?? null,
      setItem: (key: string, value: string) => { written.set(key, value); },
      removeItem: (key: string) => { written.delete(key); },
    };
    const loaded = loadConnectFourSaveV2(NOW, storage);
    expect(loaded?.lastMove).toBeNull();
    expect(written.has(LEGACY_CONNECT_FOUR_SAVE_KEY)).toBe(false);
    expect(written.has(CONNECT_FOUR_SAVE_KEY)).toBe(true);
    const reloaded = loadConnectFourSaveV2(NOW, storage);
    expect(reloaded?.lastMove).toBeNull();
  });

  it("removes only the legacy key and never throws on blocked storage", () => {
    const written = new Map<string, string>([
      [LEGACY_CONNECT_FOUR_SAVE_KEY, "{}"],
      [CONNECT_FOUR_SAVE_KEY, "keep"],
    ]);
    const storage = {
      getItem: (key: string) => written.get(key) ?? null,
      setItem: (key: string, value: string) => { written.set(key, value); },
      removeItem: (key: string) => { written.delete(key); },
    };
    clearLegacyConnectFourSave(storage);
    expect(written.has(LEGACY_CONNECT_FOUR_SAVE_KEY)).toBe(false);
    expect(written.get(CONNECT_FOUR_SAVE_KEY)).toBe("keep");
    const throwing = {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
      removeItem: () => { throw new Error("blocked"); },
    };
    expect(() => clearLegacyConnectFourSave(throwing)).not.toThrow();
    expect(loadConnectFourSaveV2(NOW, throwing)).toBeNull();
    expect(() => storeConnectFourSaveV2(validSave(), throwing)).not.toThrow();
  });
});
