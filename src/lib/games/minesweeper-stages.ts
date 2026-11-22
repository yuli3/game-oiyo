import {
  createNoGuessMinesweeperBoard,
  revealMinesweeperCell,
  type MinesweeperBoard,
  type MinesweeperDifficulty,
} from "./minesweeper";

/**
 * Stage mode for Minesweeper (2026-11-22, stage range 10-50): 30 fixed boards
 * from 8×8 with 6 mines up to 16×16 with 48 mines. Like the daily, each stage
 * opens at the centre and is the same for everyone. Every seed below was picked
 * because its board is solvable by logic alone from that opening (no guessing);
 * minesweeper-stages.test.ts checks that.
 *
 * Row format: [side length, mines, generation seed].
 */

export const MINESWEEPER_STAGE_SLUG = "minesweeper";
export const MINESWEEPER_STAGE_BEST_KEY = "minesweeper-stage";

const STAGE_DATA: ReadonlyArray<readonly [number, number, number]> = [
  [8, 6, -1494566806],
  [8, 7, -1348575758],
  [8, 8, 1451845865],
  [8, 9, -1056667102],
  [8, 10, -910676022],
  [9, 11, 1889761953],
  [9, 12, -1245377553],
  [9, 13, -2113297455],
  [9, 14, -1967306887],
  [9, 15, -180787534],
  [10, 15, -34862502],
  [10, 16, -1529392847],
  [10, 17, 257126538],
  [10, 18, 403051538],
  [10, 19, 549042618],
  [12, 22, -945503087],
  [12, 24, -799512519],
  [12, 26, 360331623],
  [12, 28, -507588247],
  [12, 30, -840310815],
  [14, 31, 1424856138],
  [14, 33, 944221383],
  [14, 35, 76301513],
  [14, 37, 1862821378],
  [14, 39, 2008746922],
  [16, 40, -2140229838],
  [16, 42, -1994231590],
  [16, 44, -1848306590],
  [16, 46, 952116057],
  [16, 48, -542421456],
];

export const MINESWEEPER_STAGE_COUNT = STAGE_DATA.length;

export function isMinesweeperStageIndex(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < MINESWEEPER_STAGE_COUNT;
}

function clampStage(index: number): number {
  return Math.min(MINESWEEPER_STAGE_COUNT - 1, Math.max(0, Math.trunc(Number.isFinite(index) ? index : 0)));
}

export function minesweeperStageDifficulty(index: number): MinesweeperDifficulty {
  const [side, mines] = STAGE_DATA[clampStage(index)];
  return { width: side, height: side, mineCount: mines, maxGenerationAttempts: 1 };
}

export function minesweeperStageSeed(index: number): number {
  return STAGE_DATA[clampStage(index)][2];
}

/** A fresh copy of stage `index`, already opened at the centre. */
export function createMinesweeperStageBoard(index: number): { board: MinesweeperBoard; verified: boolean } {
  const difficulty = minesweeperStageDifficulty(index);
  const cx = Math.floor(difficulty.width / 2);
  const cy = Math.floor(difficulty.height / 2);
  const generated = createNoGuessMinesweeperBoard(difficulty, cx, cy, minesweeperStageSeed(index));
  return { board: revealMinesweeperCell(generated.board, cx, cy).board, verified: generated.strategy === "verified" };
}
