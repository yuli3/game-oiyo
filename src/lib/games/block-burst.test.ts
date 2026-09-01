import { describe, expect, it } from "vitest";
import {
  COLS,
  ROWS,
  applyGravity,
  canPlace,
  createBlockBurst,
  findFullLines,
  hardDrop,
  parseBurst,
  pieceCells,
  resolveClears,
  serializeBurst,
  tickGravity,
  tryMove,
  tryRotate,
  type BurstColor,
  type BurstState,
} from "./block-burst";

function paint(cells: Array<[number, number]>, color: BurstColor = 1) {
  const board = Array.from({ length: ROWS }, () => Array<BurstColor | null>(COLS).fill(null));
  for (const [r, c] of cells) board[r][c] = color;
  return board;
}

describe("block burst engine", () => {
  it("creates a deterministic spawn and a full next queue", () => {
    expect(createBlockBurst(9)).toEqual(createBlockBurst(9));
    const game = createBlockBurst(3);
    expect(game.active).not.toBeNull();
    expect(game.queue).toHaveLength(3);
    expect(game.status).toBe("playing");
    expect(canPlace(game.board, game.active!)).toBe(true);
  });

  it("clears a full row and drops blocks above it", () => {
    const board = paint(
      Array.from({ length: COLS }, (_, c) => [ROWS - 1, c] as [number, number]).concat([[ROWS - 2, 0]]),
    );
    const found = findFullLines(board);
    expect(found.rows).toEqual([ROWS - 1]);
    expect(found.cols).toEqual([]);
    const resolved = resolveClears(board);
    expect(resolved.waves).toBe(1);
    expect(resolved.cells).toBe(COLS);
    expect(resolved.board[ROWS - 1][0]).toBe(1);
    expect(resolved.board[ROWS - 1][1]).toBeNull();
  });

  it("clears a full column", () => {
    const board = paint(Array.from({ length: ROWS }, (_, r) => [r, 2] as [number, number]));
    const found = findFullLines(board);
    expect(found.cols).toEqual([2]);
    expect(resolveClears(board).board.every((row) => row[2] === null)).toBe(true);
  });

  it("explodes intersecting rows and columns in one wave, then chains", () => {
    const board = paint([
      ...Array.from({ length: COLS }, (_, c) => [ROWS - 1, c] as [number, number]),
      ...Array.from({ length: ROWS - 1 }, (_, r) => [r, 0] as [number, number]),
    ]);
    const found = findFullLines(board);
    expect(found.rows).toEqual([ROWS - 1]);
    expect(found.cols).toEqual([0]);
    const resolved = resolveClears(board);
    expect(resolved.waves).toBeGreaterThanOrEqual(1);
    expect(resolved.score).toBeGreaterThan(resolved.cells * 10);
    expect(resolved.board.flat().every((cell) => cell === null)).toBe(true);
  });

  it("applies downward gravity after holes", () => {
    const board = paint([[0, 3], [2, 3]]);
    const next = applyGravity(board);
    expect(next[ROWS - 1][3]).toBe(1);
    expect(next[ROWS - 2][3]).toBe(1);
    expect(next[0][3]).toBeNull();
  });

  it("moves, rotates, and hard-drops a live piece", () => {
    const game = createBlockBurst(11);
    const right = tryMove(game, 0, 1);
    expect(right.active?.x).toBe((game.active?.x ?? 0) + 1);
    const rotated = tryRotate(game);
    expect(pieceCells(rotated.active!).length).toBeGreaterThanOrEqual(4);
    const dropped = hardDrop(game);
    expect(dropped.score).toBeGreaterThan(game.score);
    expect(dropped.board.flat().some(Boolean) || dropped.status === "over").toBe(true);
  });

  it("locks when gravity cannot drop further", () => {
    let state: BurstState = createBlockBurst(21);
    for (let i = 0; i < ROWS + 4; i++) state = tickGravity(state);
    expect(state.board.flat().some(Boolean) || state.status === "over").toBe(true);
  });

  it("round-trips an active save and rejects junk", () => {
    const game = createBlockBurst(4);
    const restored = parseBurst(serializeBurst(game));
    expect(restored?.score).toBe(0);
    expect(restored?.queue).toHaveLength(3);
    expect(parseBurst('{"v":1}')).toBeNull();
    expect(parseBurst(null)).toBeNull();
  });
});
