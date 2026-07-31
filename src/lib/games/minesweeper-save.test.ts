import { describe, expect, it } from "vitest";
import { createMinesweeperBoard, revealMinesweeperCell } from "./minesweeper";
import {
  MINESWEEPER_SAVE_KEY,
  clearMinesweeperSave,
  loadMinesweeperSave,
  parseMinesweeperSave,
  serializeMinesweeperSave,
  storeMinesweeperSave,
  type MinesweeperSave,
} from "./minesweeper-save";

const TODAY = "2026-07-31";
const NOW = Date.parse("2026-07-31T12:00:00.000Z");

function rng(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
    value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function activeSave(mode: MinesweeperSave["mode"] = "beginner"): Omit<MinesweeperSave, "version"> {
  const dims = mode === "expert" ? [30, 16, 99] : mode === "intermediate" || mode === "daily" ? [16, 16, 40] : [10, 10, 10];
  const generated = createMinesweeperBoard(dims[0], dims[1], dims[2], 0, 0, rng(17));
  const board = revealMinesweeperCell(generated, 0, 0).board;
  return {
    board,
    mode,
    dailyDate: TODAY,
    generationSeed: 17,
    generationStrategy: "verified",
    firstClick: false,
    hasStarted: true,
    elapsedMs: 12_345,
    savedAtEpochMs: NOW - 1_000,
    flagMode: false,
    activeCell: 0,
    assist: "none",
  };
}

describe("minesweeper active save", () => {
  it("round-trips a validated active board without sharing cell references", () => {
    const source = activeSave();
    const parsed = parseMinesweeperSave(serializeMinesweeperSave(source), TODAY, NOW)!;
    expect(parsed).toMatchObject({ version: 1, mode: "beginner", elapsedMs: 12_345 });
    expect(parsed.board).toEqual(source.board);
    expect(parsed.board).not.toBe(source.board);
    expect(parsed.board[0][0]).not.toBe(source.board[0][0]);
  });

  it("rejects stale daily, terminal, revealed-mine, bad clues, dimensions, coordinates, and future timestamps", () => {
    const daily = activeSave("daily");
    expect(parseMinesweeperSave(serializeMinesweeperSave(daily), "2026-08-01", NOW)).toBeNull();

    const won = structuredClone(activeSave());
    for (const cell of won.board.flat()) if (!cell.isMine) cell.isRevealed = true;
    expect(parseMinesweeperSave(serializeMinesweeperSave(won), TODAY, NOW)).toBeNull();

    const mine = structuredClone(activeSave());
    mine.board.flat().find((cell) => cell.isMine)!.isRevealed = true;
    expect(parseMinesweeperSave(serializeMinesweeperSave(mine), TODAY, NOW)).toBeNull();

    const badClue = structuredClone(activeSave());
    badClue.board.flat().find((cell) => !cell.isMine)!.neighborMines = 8;
    expect(parseMinesweeperSave(serializeMinesweeperSave(badClue), TODAY, NOW)).toBeNull();

    const badSize = structuredClone(activeSave());
    badSize.board.pop();
    expect(parseMinesweeperSave(serializeMinesweeperSave(badSize), TODAY, NOW)).toBeNull();

    const badCoordinate = structuredClone(activeSave());
    badCoordinate.board[0][0].x = 2;
    expect(parseMinesweeperSave(serializeMinesweeperSave(badCoordinate), TODAY, NOW)).toBeNull();

    expect(parseMinesweeperSave(serializeMinesweeperSave({ ...activeSave(), savedAtEpochMs: NOW + 300_001 }), TODAY, NOW)).toBeNull();
  });

  it("accepts a flagged pre-generation free board but rejects inconsistent pending state", () => {
    const board = Array.from({ length: 10 }, (_, y) => Array.from({ length: 10 }, (_, x) => ({
      x, y, isMine: false, isRevealed: false, isFlagged: x === 2 && y === 3, neighborMines: 0,
    })));
    const pending = { ...activeSave(), board, generationStrategy: "pending" as const, firstClick: true, hasStarted: false, elapsedMs: 0 };
    expect(parseMinesweeperSave(serializeMinesweeperSave(pending), TODAY, NOW)?.board[3][2].isFlagged).toBe(true);
    expect(parseMinesweeperSave(serializeMinesweeperSave({ ...pending, firstClick: false }), TODAY, NOW)).toBeNull();
  });

  it("loads, stores, and clears only its independent key", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); },
    };
    storeMinesweeperSave(activeSave(), storage);
    expect(values.has(MINESWEEPER_SAVE_KEY)).toBe(true);
    expect(loadMinesweeperSave(TODAY, NOW, storage)?.mode).toBe("beginner");
    clearMinesweeperSave(storage);
    expect(values.has(MINESWEEPER_SAVE_KEY)).toBe(false);
  });
});
