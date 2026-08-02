import { describe, expect, it } from "vitest";
import {
  GOMOKU_SAVE_KEY,
  LEGACY_GOMOKU_SAVE_KEY,
  clearLegacyGomokuSave,
  loadGomokuSaveV2,
  migrateLegacyGomokuSave,
  parseGomokuSaveV2,
  serializeGomokuSaveV2,
  storeGomokuSaveV2,
  type GomokuSaveV2,
} from "./gomoku-save";
import { createGomokuBoard, placeGomokuStone, type GomokuBoard } from "./gomoku";

const NOW = 2_000_000;

function boardWithMoves(moves: number[]): GomokuBoard {
  let board = createGomokuBoard();
  let player: 1 | 2 = 1;
  for (const index of moves) {
    const move = placeGomokuStone(board, index, player);
    if (!move) throw new Error("bad fixture move");
    board = move.board;
    player = player === 1 ? 2 : 1;
  }
  return board;
}

function validSave(overrides: Partial<Omit<GomokuSaveV2, "version">> = {}): Omit<GomokuSaveV2, "version"> {
  const board = boardWithMoves([112, 113]);
  return {
    board,
    isBlackTurn: true,
    mode: "ai",
    level: 2,
    lastMove: 113,
    startedAtEpochMs: NOW - 10_000,
    savedAtEpochMs: NOW - 1_000,
    ...overrides,
  };
}

describe("gomoku save v2 parser", () => {
  it("round-trips a valid in-progress match", () => {
    const save = validSave();
    const parsed = parseGomokuSaveV2(serializeGomokuSaveV2(save), NOW);
    expect(parsed).not.toBeNull();
    expect(parsed?.lastMove).toBe(113);
    expect(parsed?.mode).toBe("ai");
  });

  it("rejects an empty board — a fresh match with no progress is never saved", () => {
    const save = validSave({ board: createGomokuBoard(), isBlackTurn: true, lastMove: null, startedAtEpochMs: NOW, savedAtEpochMs: NOW });
    expect(parseGomokuSaveV2(serializeGomokuSaveV2(save), NOW)).toBeNull();
  });

  it("accepts matching started/saved timestamps at the boundary", () => {
    const save = validSave({ startedAtEpochMs: NOW - 1_000, savedAtEpochMs: NOW - 1_000 });
    expect(parseGomokuSaveV2(serializeGomokuSaveV2(save), NOW)).not.toBeNull();
  });

  it("fails closed on corrupt or foreign payloads", () => {
    expect(parseGomokuSaveV2(null, NOW)).toBeNull();
    expect(parseGomokuSaveV2("not json {", NOW)).toBeNull();
    expect(parseGomokuSaveV2(serializeGomokuSaveV2(validSave({ mode: "vs" as never })), NOW)).toBeNull();
    expect(parseGomokuSaveV2(serializeGomokuSaveV2(validSave({ level: 4 as never })), NOW)).toBeNull();
    expect(parseGomokuSaveV2(serializeGomokuSaveV2(validSave({ savedAtEpochMs: NOW + 600_000 })), NOW)).toBeNull();
    expect(parseGomokuSaveV2(serializeGomokuSaveV2(validSave({ startedAtEpochMs: NOW - 1_000, savedAtEpochMs: NOW - 10_000 })), NOW)).toBeNull();
  });

  it("rejects a lastMove that doesn't point at an occupied cell", () => {
    const save = validSave({ lastMove: 0 });
    expect(parseGomokuSaveV2(serializeGomokuSaveV2(save), NOW)).toBeNull();
  });

  it("rejects an already-completed five as non-restorable", () => {
    const board = boardWithMoves([0, 15, 1, 16, 2, 17, 3, 18, 4]); // black completes a horizontal five
    const save = validSave({ board, isBlackTurn: false, lastMove: 4 });
    expect(parseGomokuSaveV2(serializeGomokuSaveV2(save), NOW)).toBeNull();
  });

  it("rejects stone-count parity mismatches (tampered turn order)", () => {
    const save = validSave({ isBlackTurn: false }); // 2 stones placed, should be black's turn again
    expect(parseGomokuSaveV2(serializeGomokuSaveV2(save), NOW)).toBeNull();
  });
});

describe("gomoku legacy v1 migration", () => {
  it("promotes a valid in-progress v1 board without fabricating last move or timing", () => {
    const board = boardWithMoves([112, 113, 127]);
    const migrated = migrateLegacyGomokuSave(JSON.stringify({ version: 1, board, isBlackTurn: false, mode: "ai", level: 2 }), NOW);
    expect(migrated).not.toBeNull();
    expect(migrated?.lastMove).toBeNull();
    expect(migrated?.startedAtEpochMs).toBe(NOW);
    expect(migrated?.savedAtEpochMs).toBe(NOW);
    expect(parseGomokuSaveV2(serializeGomokuSaveV2(migrated!), NOW)).not.toBeNull();
  });

  it("rejects migrating an already-completed or corrupt v1 board", () => {
    const won = boardWithMoves([0, 15, 1, 16, 2, 17, 3, 18, 4]);
    expect(migrateLegacyGomokuSave(JSON.stringify({ version: 1, board: won, isBlackTurn: false, mode: "local", level: 2 }), NOW)).toBeNull();
    expect(migrateLegacyGomokuSave("not json {", NOW)).toBeNull();
    expect(migrateLegacyGomokuSave(null, NOW)).toBeNull();
  });

  it("moves a v1 save to the v2 key exactly once during load", () => {
    const board = boardWithMoves([112, 113]);
    const written = new Map<string, string>([
      [LEGACY_GOMOKU_SAVE_KEY, JSON.stringify({ version: 1, board, isBlackTurn: true, mode: "ai", level: 2 })],
    ]);
    const storage = {
      getItem: (key: string) => written.get(key) ?? null,
      setItem: (key: string, value: string) => { written.set(key, value); },
      removeItem: (key: string) => { written.delete(key); },
    };
    const loaded = loadGomokuSaveV2(NOW, storage);
    expect(loaded?.lastMove).toBeNull();
    expect(written.has(LEGACY_GOMOKU_SAVE_KEY)).toBe(false);
    expect(written.has(GOMOKU_SAVE_KEY)).toBe(true);
    const reloaded = loadGomokuSaveV2(NOW, storage);
    expect(reloaded?.lastMove).toBeNull();
  });

  it("removes only the legacy key and never throws on blocked storage", () => {
    const written = new Map<string, string>([
      [LEGACY_GOMOKU_SAVE_KEY, "{}"],
      [GOMOKU_SAVE_KEY, "keep"],
    ]);
    const storage = {
      getItem: (key: string) => written.get(key) ?? null,
      setItem: (key: string, value: string) => { written.set(key, value); },
      removeItem: (key: string) => { written.delete(key); },
    };
    clearLegacyGomokuSave(storage);
    expect(written.has(LEGACY_GOMOKU_SAVE_KEY)).toBe(false);
    expect(written.get(GOMOKU_SAVE_KEY)).toBe("keep");
    const throwing = {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
      removeItem: () => { throw new Error("blocked"); },
    };
    expect(() => clearLegacyGomokuSave(throwing)).not.toThrow();
    expect(loadGomokuSaveV2(NOW, throwing)).toBeNull();
    expect(() => storeGomokuSaveV2(validSave(), throwing)).not.toThrow();
  });
});
