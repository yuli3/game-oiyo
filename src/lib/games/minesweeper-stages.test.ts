import { describe, expect, it } from "vitest";
import {
  MINESWEEPER_STAGE_COUNT,
  createMinesweeperStageBoard,
  isMinesweeperStageIndex,
  minesweeperStageDifficulty,
} from "./minesweeper-stages";

describe("minesweeper stages", () => {
  it("ships 30 stages that never get easier", () => {
    expect(MINESWEEPER_STAGE_COUNT).toBe(30);
    for (let i = 1; i < MINESWEEPER_STAGE_COUNT; i += 1) {
      const prev = minesweeperStageDifficulty(i - 1);
      const cur = minesweeperStageDifficulty(i);
      expect(cur.width).toBeGreaterThanOrEqual(prev.width);
      if (cur.width === prev.width) expect(cur.mineCount).toBeGreaterThan(prev.mineCount);
    }
    expect(minesweeperStageDifficulty(29).width).toBeLessThanOrEqual(16);
  });

  it("gives every stage a logic-only board, opened at the centre, the same each time", () => {
    for (let i = 0; i < MINESWEEPER_STAGE_COUNT; i += 1) {
      const a = createMinesweeperStageBoard(i);
      const b = createMinesweeperStageBoard(i);
      const dims = minesweeperStageDifficulty(i);
      expect(a.verified).toBe(true);
      expect(a.board).toEqual(b.board);
      expect(a.board.flat().filter((cell) => cell.isMine)).toHaveLength(dims.mineCount);
      const centre = a.board[Math.floor(dims.height / 2)][Math.floor(dims.width / 2)];
      expect(centre.isRevealed).toBe(true);
      expect(centre.isMine).toBe(false);
    }
  });

  it("recognizes valid stage indexes", () => {
    expect(isMinesweeperStageIndex(0)).toBe(true);
    expect(isMinesweeperStageIndex(29)).toBe(true);
    expect(isMinesweeperStageIndex(30)).toBe(false);
    expect(isMinesweeperStageIndex(-1)).toBe(false);
  });
});
