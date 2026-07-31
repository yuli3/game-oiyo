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

export type MinesweeperDifficulty = Readonly<{
  width: number;
  height: number;
  mineCount: number;
  maxGenerationAttempts: number;
}>;

export const MINESWEEPER_BEGINNER: MinesweeperDifficulty = {
  width: 10,
  height: 10,
  mineCount: 10,
  maxGenerationAttempts: 96,
};

// Classic Microsoft Minesweeper's Intermediate size — matches decades of
// player expectation and the "minesweeper intermediate" search query.
export const MINESWEEPER_INTERMEDIATE: MinesweeperDifficulty = {
  width: 16,
  height: 16,
  mineCount: 40,
  maxGenerationAttempts: 48,
};

// Classic Expert size. Genuinely logic-solvable Expert boards are rare (real
// Expert play often requires at least one educated guess), and the solver's
// cost scales with board area — so this keeps the attempt ceiling low rather
// than burning many expensive full-board solves chasing a verified board that
// usually doesn't exist. A quick, honest "safe-fallback" beats a slow one.
export const MINESWEEPER_EXPERT: MinesweeperDifficulty = {
  width: 30,
  height: 16,
  mineCount: 99,
  maxGenerationAttempts: 8,
};

export type MinesweeperDifficultyId = "beginner" | "intermediate" | "expert";

export const MINESWEEPER_DIFFICULTIES: Record<MinesweeperDifficultyId, MinesweeperDifficulty> = {
  beginner: MINESWEEPER_BEGINNER,
  intermediate: MINESWEEPER_INTERMEDIATE,
  expert: MINESWEEPER_EXPERT,
};

export type NoGuessGenerationResult = {
  board: MinesweeperBoard;
  seed: number;
  attempts: number;
  verifiedNoGuess: boolean;
  strategy: "verified" | "safe-fallback";
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

function seededRandom(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
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

type SolverConstraint = { unknown: Set<string>; mines: number };

export type MinesweeperHint = {
  kind: "safe" | "mine" | "subset";
  conclusion: "safe" | "mine";
  targets: Array<{ x: number; y: number }>;
  clues: Array<{ x: number; y: number; value: number }>;
  remainingMines: number;
};

export type MinesweeperResultSummary = {
  safeTotal: number;
  safeRevealed: number;
  progressPercent: number;
  flags: number;
  correctFlags: number;
  incorrectFlags: number;
};

export function summarizeMinesweeperResult(board: MinesweeperBoard): MinesweeperResultSummary {
  const cells = board.flat();
  const safeTotal = cells.filter((cell) => !cell.isMine).length;
  const safeRevealed = cells.filter((cell) => !cell.isMine && cell.isRevealed).length;
  const flags = cells.filter((cell) => cell.isFlagged).length;
  const correctFlags = cells.filter((cell) => cell.isFlagged && cell.isMine).length;
  return {
    safeTotal,
    safeRevealed,
    progressPercent: safeTotal === 0 ? 0 : Math.round(safeRevealed / safeTotal * 100),
    flags,
    correctFlags,
    incorrectFlags: flags - correctFlags,
  };
}

const coordinateKey = (x: number, y: number) => `${x}:${y}`;

function isSubset(left: Set<string>, right: Set<string>): boolean {
  for (const value of left) if (!right.has(value)) return false;
  return true;
}

const sortedCoordinates = (keys: Iterable<string>): Array<{ x: number; y: number }> =>
  [...keys]
    .map((key) => {
      const [x, y] = key.split(":").map(Number);
      return { x, y };
    })
    .sort((left, right) => left.y - right.y || left.x - right.x);

/**
 * Returns one deterministic, explainable deduction from visible clues and the
 * player's flags. Hidden `isMine` values are never inspected.
 */
export function findMinesweeperHint(board: MinesweeperBoard): MinesweeperHint | null {
  const constraints: Array<SolverConstraint & { clue: MinesweeperCell }> = [];
  for (const clue of board.flat()) {
    if (!clue.isRevealed || clue.neighborMines === 0) continue;
    const adjacent = neighbors(board, clue.x, clue.y);
    const flagged = adjacent.filter((cell) => cell.isFlagged).length;
    const unknown = new Set(adjacent
      .filter((cell) => !cell.isRevealed && !cell.isFlagged)
      .map((cell) => coordinateKey(cell.x, cell.y)));
    const remainingMines = clue.neighborMines - flagged;
    if (remainingMines < 0 || remainingMines > unknown.size || unknown.size === 0) continue;
    const constraint = { clue, unknown, mines: remainingMines };
    constraints.push(constraint);
    if (remainingMines === 0) {
      return {
        kind: "safe", conclusion: "safe", targets: sortedCoordinates(unknown),
        clues: [{ x: clue.x, y: clue.y, value: clue.neighborMines }], remainingMines,
      };
    }
    if (remainingMines === unknown.size) {
      return {
        kind: "mine", conclusion: "mine", targets: sortedCoordinates(unknown),
        clues: [{ x: clue.x, y: clue.y, value: clue.neighborMines }], remainingMines,
      };
    }
  }

  for (let leftIndex = 0; leftIndex < constraints.length; leftIndex++) {
    for (let rightIndex = 0; rightIndex < constraints.length; rightIndex++) {
      if (leftIndex === rightIndex) continue;
      const left = constraints[leftIndex];
      const right = constraints[rightIndex];
      if (left.unknown.size >= right.unknown.size || !isSubset(left.unknown, right.unknown)) continue;
      const difference = new Set([...right.unknown].filter((key) => !left.unknown.has(key)));
      const remainingMines = right.mines - left.mines;
      if (difference.size === 0 || remainingMines < 0 || remainingMines > difference.size) continue;
      if (remainingMines === 0 || remainingMines === difference.size) {
        return {
          kind: "subset",
          conclusion: remainingMines === 0 ? "safe" : "mine",
          targets: sortedCoordinates(difference),
          clues: [left.clue, right.clue].map((clue) => ({ x: clue.x, y: clue.y, value: clue.neighborMines })),
          remainingMines,
        };
      }
    }
  }
  return null;
}

function revealSolverSafeCells(board: MinesweeperBoard, safe: Set<string>): MinesweeperBoard {
  let current = board;
  for (const key of safe) {
    const [x, y] = key.split(":").map(Number);
    if (current[y]?.[x] && !current[y][x].isRevealed) current = revealMinesweeperCell(current, x, y).board;
  }
  return current;
}

/**
 * Verifies that a board can be completed from the opening using only standard
 * deterministic deductions: clue completion, all-mines marking, and subset
 * differences between overlapping clue constraints. It never uses a hidden
 * cell's `isMine` value to make a deduction.
 */
export function canSolveMinesweeperWithoutGuessing(board: MinesweeperBoard, safeX: number, safeY: number): boolean {
  if (!board[safeY]?.[safeX] || board[safeY][safeX].isMine) return false;
  let working = revealMinesweeperCell(cloneBoard(board), safeX, safeY).board;
  const knownMines = new Set<string>();

  for (let iteration = 0; iteration < board.length * board[0].length * 2; iteration++) {
    if (isMinesweeperWon(working)) return true;
    const constraints: SolverConstraint[] = [];
    const newlySafe = new Set<string>();
    const newlyMined = new Set<string>();

    for (const clue of working.flat()) {
      if (!clue.isRevealed || clue.isMine || clue.neighborMines === 0) continue;
      const adjacent = neighbors(working, clue.x, clue.y);
      const unknown = new Set(
        adjacent
          .filter((cell) => !cell.isRevealed && !knownMines.has(coordinateKey(cell.x, cell.y)))
          .map((cell) => coordinateKey(cell.x, cell.y)),
      );
      const remainingMines = clue.neighborMines - adjacent.filter((cell) => knownMines.has(coordinateKey(cell.x, cell.y))).length;
      if (remainingMines < 0 || remainingMines > unknown.size) return false;
      if (unknown.size === 0) continue;
      constraints.push({ unknown, mines: remainingMines });
      if (remainingMines === 0) for (const key of unknown) newlySafe.add(key);
      else if (remainingMines === unknown.size) for (const key of unknown) newlyMined.add(key);
    }

    for (let leftIndex = 0; leftIndex < constraints.length; leftIndex++) {
      for (let rightIndex = 0; rightIndex < constraints.length; rightIndex++) {
        if (leftIndex === rightIndex) continue;
        const left = constraints[leftIndex];
        const right = constraints[rightIndex];
        if (left.unknown.size >= right.unknown.size || !isSubset(left.unknown, right.unknown)) continue;
        const difference = [...right.unknown].filter((key) => !left.unknown.has(key));
        const remaining = right.mines - left.mines;
        if (remaining === 0) difference.forEach((key) => newlySafe.add(key));
        else if (remaining === difference.length) difference.forEach((key) => newlyMined.add(key));
      }
    }

    const mineCountBefore = knownMines.size;
    for (const key of newlyMined) knownMines.add(key);
    for (const key of knownMines) newlySafe.delete(key);
    if (newlySafe.size === 0 && knownMines.size === mineCountBefore) return false;
    working = revealSolverSafeCells(working, newlySafe);
  }
  return isMinesweeperWon(working);
}

/** Seed-reproducible, bounded no-guess generation with a first-click-safe fallback. */
export function createNoGuessMinesweeperBoard(
  difficulty: MinesweeperDifficulty,
  safeX: number,
  safeY: number,
  seed: number,
): NoGuessGenerationResult {
  const { width, height, mineCount, maxGenerationAttempts } = difficulty;
  if (!Number.isInteger(maxGenerationAttempts) || maxGenerationAttempts < 1) {
    throw new RangeError("Generation attempts must be a positive integer");
  }

  let fallback: MinesweeperBoard | null = null;
  for (let attempt = 1; attempt <= maxGenerationAttempts; attempt++) {
    const attemptSeed = (seed + Math.imul(attempt, 0x9e3779b1)) | 0;
    const candidate = createMinesweeperBoard(width, height, mineCount, safeX, safeY, seededRandom(attemptSeed));
    fallback ??= candidate;
    if (canSolveMinesweeperWithoutGuessing(candidate, safeX, safeY)) {
      return { board: candidate, seed, attempts: attempt, verifiedNoGuess: true, strategy: "verified" };
    }
  }

  // The retry ceiling is an explicit responsiveness boundary. A conventional
  // first-click-safe board is preferable to freezing the UI on an unlucky seed.
  return {
    board: fallback!,
    seed,
    attempts: maxGenerationAttempts,
    verifiedNoGuess: false,
    strategy: "safe-fallback",
  };
}
