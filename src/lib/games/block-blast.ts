/**
 * Block Blast Infinite Core Game Logic
 * 8x8 polyomino placement, simultaneous row/col line clearing, combo chain scoring, and revive loop.
 */

export type BlockColor = "cyan" | "orange" | "purple" | "yellow" | "green" | "red" | "blue";

export const BLOCK_COLORS: readonly BlockColor[] = [
  "cyan",
  "orange",
  "purple",
  "yellow",
  "green",
  "red",
  "blue",
] as const;

export const BLOCK_COLOR_HEXES: Record<BlockColor, string> = {
  cyan: "#06b6d4",
  orange: "#f97316",
  purple: "#a855f7",
  yellow: "#eab308",
  green: "#22c55e",
  red: "#ef4444",
  blue: "#3b82f6",
};

export interface PolyShape {
  id: string;
  matrix: number[][]; // 2D 0/1 array (row x col)
  color: BlockColor;
}

export const SHAPE_TEMPLATES: Array<{ matrix: number[][]; color: BlockColor }> = [
  // 1x1
  { matrix: [[1]], color: "yellow" },
  // 1x2, 2x1
  { matrix: [[1, 1]], color: "cyan" },
  { matrix: [[1], [1]], color: "cyan" },
  // 1x3, 3x1
  { matrix: [[1, 1, 1]], color: "blue" },
  { matrix: [[1], [1], [1]], color: "blue" },
  // 1x4, 4x1
  { matrix: [[1, 1, 1, 1]], color: "purple" },
  { matrix: [[1], [1], [1], [1]], color: "purple" },
  // 2x2 Square
  { matrix: [[1, 1], [1, 1]], color: "orange" },
  // 3x3 Square
  { matrix: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], color: "red" },
  // L-shapes
  { matrix: [[1, 0], [1, 0], [1, 1]], color: "green" },
  { matrix: [[0, 1], [0, 1], [1, 1]], color: "green" },
  { matrix: [[1, 1, 1], [1, 0, 0]], color: "green" },
  { matrix: [[1, 1, 1], [0, 0, 1]], color: "green" },
  // T-shapes
  { matrix: [[1, 1, 1], [0, 1, 0]], color: "purple" },
  { matrix: [[0, 1, 0], [1, 1, 1]], color: "purple" },
  // Small L (Corner 2x2)
  { matrix: [[1, 1], [1, 0]], color: "yellow" },
  { matrix: [[1, 1], [0, 1]], color: "yellow" },
];

export const BOARD_SIZE = 8;

export interface BlockBlastGameState {
  grid: (BlockColor | null)[][]; // 8x8
  score: number;
  highScore: number;
  comboCount: number;
  hand: (PolyShape | null)[];
  hasRevive: boolean;
  status: "playing" | "game_over" | "revived";
  linesClearedTotal: number;
}

function getRandomShape(seedOffset: number): PolyShape {
  const idx = Math.abs(Math.sin(seedOffset * 7919 + 65537)) * SHAPE_TEMPLATES.length;
  const t = SHAPE_TEMPLATES[Math.floor(idx) % SHAPE_TEMPLATES.length];
  return {
    id: `shape-${seedOffset}`,
    matrix: t.matrix,
    color: t.color,
  };
}

export function generateBlockHand(seed: number): PolyShape[] {
  return [0, 1, 2].map((i) => getRandomShape(seed * 31 + i * 17));
}

export function createEmptyGrid(): (BlockColor | null)[][] {
  return Array(BOARD_SIZE)
    .fill(null)
    .map(() => Array(BOARD_SIZE).fill(null));
}

export function createInitialBlockBlastGame(seed: number = 42, highScore: number = 0): BlockBlastGameState {
  return {
    grid: createEmptyGrid(),
    score: 0,
    highScore,
    comboCount: 0,
    hand: generateBlockHand(seed),
    hasRevive: true,
    status: "playing",
    linesClearedTotal: 0,
  };
}

export function canPlaceShape(
  grid: (BlockColor | null)[][],
  shape: PolyShape,
  atR: number,
  atC: number
): boolean {
  const rows = shape.matrix.length;
  const cols = shape.matrix[0].length;

  if (atR < 0 || atR + rows > BOARD_SIZE || atC < 0 || atC + cols > BOARD_SIZE) {
    return false;
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (shape.matrix[r][c] === 1) {
        if (grid[atR + r][atC + c] !== null) {
          return false;
        }
      }
    }
  }

  return true;
}

export function hasAnyValidMove(
  grid: (BlockColor | null)[][],
  hand: (PolyShape | null)[]
): boolean {
  for (const shape of hand) {
    if (!shape) continue;

    const rows = shape.matrix.length;
    const cols = shape.matrix[0].length;

    for (let r = 0; r <= BOARD_SIZE - rows; r++) {
      for (let c = 0; c <= BOARD_SIZE - cols; c++) {
        if (canPlaceShape(grid, shape, r, c)) {
          return true;
        }
      }
    }
  }
  return false;
}

export interface MoveResult {
  nextState: BlockBlastGameState;
  clearedRows: number[];
  clearedCols: number[];
  pointsEarned: number;
}

export function placeShapeAndClear(
  state: BlockBlastGameState,
  handIndex: number,
  atR: number,
  atC: number
): MoveResult | null {
  if (state.status === "game_over") return null;

  const shape = state.hand[handIndex];
  if (!shape) return null;

  if (!canPlaceShape(state.grid, shape, atR, atC)) {
    return null;
  }

  // 1. Copy grid & place shape
  const nextGrid = state.grid.map((row) => [...row]);
  let placedBlocksCount = 0;

  for (let r = 0; r < shape.matrix.length; r++) {
    for (let c = 0; c < shape.matrix[0].length; c++) {
      if (shape.matrix[r][c] === 1) {
        nextGrid[atR + r][atC + c] = shape.color;
        placedBlocksCount++;
      }
    }
  }

  // 2. Check complete rows & columns simultaneously
  const clearedRows: number[] = [];
  const clearedCols: number[] = [];

  for (let r = 0; r < BOARD_SIZE; r++) {
    if (nextGrid[r].every((cell) => cell !== null)) {
      clearedRows.push(r);
    }
  }

  for (let c = 0; c < BOARD_SIZE; c++) {
    let colFull = true;
    for (let r = 0; r < BOARD_SIZE; r++) {
      if (nextGrid[r][c] === null) {
        colFull = false;
        break;
      }
    }
    if (colFull) {
      clearedCols.push(c);
    }
  }

  // 3. Clear matched lines
  for (const r of clearedRows) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      nextGrid[r][c] = null;
    }
  }

  for (const c of clearedCols) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      nextGrid[r][c] = null;
    }
  }

  const linesCleared = clearedRows.length + clearedCols.length;
  const isCombo = linesCleared > 0;
  const nextComboCount = isCombo ? state.comboCount + 1 : 0;

  // Scoring formula: placed blocks + (lines^2 * 100 * (1 + combo * 0.5))
  let pointsEarned = placedBlocksCount * 10;
  if (linesCleared > 0) {
    pointsEarned += Math.round(
      Math.pow(linesCleared, 2) * 80 * (1 + nextComboCount * 0.4)
    );
  }

  const nextScore = state.score + pointsEarned;
  const nextHighScore = Math.max(state.highScore, nextScore);

  // 4. Update hand
  const nextHand = [...state.hand];
  nextHand[handIndex] = null;

  const allEmpty = nextHand.every((h) => h === null);
  const refreshedHand = allEmpty
    ? generateBlockHand(Date.now())
    : nextHand;

  // 5. Check if moves remain
  let nextStatus: BlockBlastGameState["status"] = state.status;
  if (!hasAnyValidMove(nextGrid, refreshedHand)) {
    nextStatus = "game_over";
  }

  return {
    nextState: {
      ...state,
      grid: nextGrid,
      score: nextScore,
      highScore: nextHighScore,
      comboCount: nextComboCount,
      hand: refreshedHand,
      status: nextStatus,
      linesClearedTotal: state.linesClearedTotal + linesCleared,
    },
    clearedRows,
    clearedCols,
    pointsEarned,
  };
}

export function triggerReviveBomb(state: BlockBlastGameState): BlockBlastGameState | null {
  if (!state.hasRevive || state.status !== "game_over") {
    return null;
  }

  // Bomb clears a central 4x4 area
  const nextGrid = state.grid.map((row) => [...row]);
  for (let r = 2; r < 6; r++) {
    for (let c = 2; c < 6; c++) {
      nextGrid[r][c] = null;
    }
  }

  return {
    ...state,
    grid: nextGrid,
    hasRevive: false,
    status: "revived",
  };
}
