import { movePuzzleTile } from "./react-state-transitions";

export const PUZZLE15_SIZES = [3, 4, 5] as const;
export type Puzzle15Size = (typeof PUZZLE15_SIZES)[number];
export type Puzzle15Board = number[]; // row-major, 0 = empty

export function createSolvedPuzzle15Board(size: Puzzle15Size): Puzzle15Board {
  return Array.from({ length: size * size }, (_, i) => (i + 1) % (size * size));
}

export function isPuzzle15Solved(board: readonly number[], size: Puzzle15Size): boolean {
  const cellCount = size * size;
  return board.length === cellCount && board.every((value, index) => value === (index + 1) % cellCount);
}

/**
 * Standard 15-puzzle solvability rule, checked against inversions of the
 * non-blank tiles: odd-width boards must have an even inversion count;
 * even-width boards must have (inversions + blank row counted from the
 * bottom, 1-indexed) be odd. Random legal-move shuffles always land on a
 * solvable board, but a forged/tampered save could claim any permutation —
 * this is what makes that state rejectable rather than a permanently stuck game.
 */
export function isPuzzle15Solvable(board: readonly number[], size: Puzzle15Size): boolean {
  if (board.length !== size * size) return false;
  const tiles = board.filter((value) => value !== 0);
  let inversions = 0;
  for (let i = 0; i < tiles.length; i += 1) {
    for (let j = i + 1; j < tiles.length; j += 1) {
      if (tiles[i] > tiles[j]) inversions += 1;
    }
  }
  if (size % 2 === 1) return inversions % 2 === 0;
  const blankIndex = board.indexOf(0);
  const blankRowFromBottom = size - Math.floor(blankIndex / size);
  return (inversions + blankRowFromBottom) % 2 === 1;
}

/** Shuffles by random legal moves from the solved state, so every board this produces is solvable. */
export function shufflePuzzle15(size: Puzzle15Size, steps: number, random: () => number = Math.random): Puzzle15Board {
  const board = createSolvedPuzzle15Board(size);
  let empty = board.indexOf(0);
  let previous = -1;
  for (let step = 0; step < steps; step += 1) {
    const row = Math.floor(empty / size), col = empty % size;
    const neighbors: number[] = [];
    if (row > 0) neighbors.push(empty - size);
    if (row < size - 1) neighbors.push(empty + size);
    if (col > 0) neighbors.push(empty - 1);
    if (col < size - 1) neighbors.push(empty + 1);
    const candidates = neighbors.filter((n) => n !== previous);
    const pick = candidates[Math.floor(random() * candidates.length)];
    board[empty] = board[pick];
    board[pick] = 0;
    previous = empty;
    empty = pick;
  }
  return board;
}

export function movePuzzle15Tile(board: readonly number[], tileIndex: number, size: Puzzle15Size) {
  return movePuzzleTile([...board], tileIndex, size);
}
