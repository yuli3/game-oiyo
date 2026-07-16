export type MinesweeperCell = {
  x: number;
  y: number;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborMines: number;
};

export type MinesweeperBoard = MinesweeperCell[][];
export type MinesweeperStatus = "playing" | "won" | "lost";

export type RevealResult = {
  board: MinesweeperBoard;
  status: MinesweeperStatus;
  changed: boolean;
};

export function createEmptyBoard(width: number, height: number): MinesweeperBoard {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new RangeError("Minesweeper dimensions must be positive integers");
  }
  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => ({
      x,
      y,
      isMine: false,
      isRevealed: false,
      isFlagged: false,
      neighborMines: 0,
    })),
  );
}

function neighbors(board: MinesweeperBoard, x: number, y: number): MinesweeperCell[] {
  const result: MinesweeperCell[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const cell = board[y + dy]?.[x + dx];
      if (cell) result.push(cell);
    }
  }
  return result;
}

function cloneBoard(board: MinesweeperBoard): MinesweeperBoard {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

export function createMinesweeperBoard(
  width: number,
  height: number,
  mineCount: number,
  safeX: number,
  safeY: number,
  rng: () => number = Math.random,
): MinesweeperBoard {
  const board = createEmptyBoard(width, height);
  if (!Number.isInteger(mineCount) || mineCount < 1 || mineCount >= width * height) {
    throw new RangeError("Mine count must leave at least one safe cell");
  }
  if (!board[safeY]?.[safeX]) throw new RangeError("Safe cell is outside the board");

  let candidates = board.flat().filter((cell) => Math.abs(cell.x - safeX) > 1 || Math.abs(cell.y - safeY) > 1);
  // Very dense/small custom boards may not fit a 3x3 safe opening. The clicked
  // cell itself remains safe rather than looping forever.
  if (candidates.length < mineCount) candidates = board.flat().filter((cell) => cell.x !== safeX || cell.y !== safeY);

  for (let i = candidates.length - 1; i > 0; i--) {
    const sample = rng();
    const j = Math.min(i, Math.max(0, Math.floor(sample * (i + 1))));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  for (const cell of candidates.slice(0, mineCount)) board[cell.y][cell.x].isMine = true;

  for (const row of board) {
    for (const cell of row) {
      if (!cell.isMine) cell.neighborMines = neighbors(board, cell.x, cell.y).filter((neighbor) => neighbor.isMine).length;
    }
  }
  return board;
}

export function isMinesweeperWon(board: MinesweeperBoard): boolean {
  return board.flat().every((cell) => cell.isMine || cell.isRevealed);
}

export function revealMinesweeperCell(board: MinesweeperBoard, x: number, y: number): RevealResult {
  const target = board[y]?.[x];
  if (!target || target.isRevealed || target.isFlagged) return { board, status: "playing", changed: false };

  const next = cloneBoard(board);
  if (next[y][x].isMine) {
    for (const cell of next.flat()) if (cell.isMine) cell.isRevealed = true;
    return { board: next, status: "lost", changed: true };
  }

  const queue: Array<[number, number]> = [[x, y]];
  const queued = new Set([`${x}:${y}`]);
  while (queue.length > 0) {
    const [cx, cy] = queue.shift()!;
    const cell = next[cy][cx];
    if (cell.isRevealed || cell.isFlagged || cell.isMine) continue;
    cell.isRevealed = true;
    if (cell.neighborMines !== 0) continue;
    for (const neighbor of neighbors(next, cx, cy)) {
      const key = `${neighbor.x}:${neighbor.y}`;
      if (!queued.has(key) && !neighbor.isRevealed && !neighbor.isFlagged && !neighbor.isMine) {
        queued.add(key);
        queue.push([neighbor.x, neighbor.y]);
      }
    }
  }
  return { board: next, status: isMinesweeperWon(next) ? "won" : "playing", changed: true };
}

export function chordMinesweeperCell(board: MinesweeperBoard, x: number, y: number): RevealResult {
  const target = board[y]?.[x];
  if (!target?.isRevealed || target.neighborMines === 0) return { board, status: "playing", changed: false };
  const adjacent = neighbors(board, x, y);
  if (adjacent.filter((cell) => cell.isFlagged).length !== target.neighborMines) {
    return { board, status: "playing", changed: false };
  }

  let current = board;
  let changed = false;
  for (const cell of adjacent) {
    if (cell.isRevealed || cell.isFlagged) continue;
    const result = revealMinesweeperCell(current, cell.x, cell.y);
    current = result.board;
    changed ||= result.changed;
    if (result.status === "lost") return { board: current, status: "lost", changed };
  }
  return { board: current, status: isMinesweeperWon(current) ? "won" : "playing", changed };
}

export function toggleMinesweeperFlag(board: MinesweeperBoard, x: number, y: number, mineCount: number): MinesweeperBoard {
  const target = board[y]?.[x];
  if (!target || target.isRevealed) return board;
  const flagCount = board.flat().filter((cell) => cell.isFlagged).length;
  if (!target.isFlagged && flagCount >= mineCount) return board;
  const next = cloneBoard(board);
  next[y][x].isFlagged = !next[y][x].isFlagged;
  return next;
}
