import { shuffle } from "./daily";

export type KurodokoCell = 0 | 1;
export type KurodokoPuzzle = (number | null)[][];
export type KurodokoDifficulty = "easy" | "medium" | "hard";

export const KURODOKO_DIFFICULTIES: Record<KurodokoDifficulty, { size: number; blacks: number; minimumClues: number }> = {
  easy: { size: 5, blacks: 4, minimumClues: 6 },
  medium: { size: 6, blacks: 6, minimumClues: 7 },
  hard: { size: 7, blacks: 9, minimumClues: 8 },
};

export function kurodokoDailySeed(index: number): number {
  return (0x6b7264 ^ Math.imul(index + 1, 2654435761)) | 0;
}

export type KurodokoValidation = {
  ok: boolean;
  complete: boolean;
  error: "number" | "adjacent" | "disconnected" | null;
};

const ORTHOGONAL = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

function isSquare<T>(value: T[][], size = value.length): boolean {
  return size > 0 && value.length === size && value.every((row) => row.length === size);
}

export function kurodokoWhitesConnected(board: readonly (readonly KurodokoCell[])[]): boolean {
  const size = board.length;
  if (!isSquare(board.map((row) => [...row]), size)) return false;
  let start: [number, number] | null = null;
  let whiteCount = 0;
  for (let row = 0; row < size; row++) for (let column = 0; column < size; column++) {
    if (board[row][column] === 0) {
      whiteCount++;
      start ??= [row, column];
    }
  }
  if (!start) return false;
  const visited = Array.from({ length: size }, () => Array(size).fill(false));
  const stack = [start];
  visited[start[0]][start[1]] = true;
  let seen = 1;
  while (stack.length) {
    const [row, column] = stack.pop()!;
    for (const [dr, dc] of ORTHOGONAL) {
      const nextRow = row + dr;
      const nextColumn = column + dc;
      if (nextRow < 0 || nextRow >= size || nextColumn < 0 || nextColumn >= size || visited[nextRow][nextColumn] || board[nextRow][nextColumn] !== 0) continue;
      visited[nextRow][nextColumn] = true;
      seen++;
      stack.push([nextRow, nextColumn]);
    }
  }
  return seen === whiteCount;
}

export function kurodokoVisibleWhites(board: readonly (readonly KurodokoCell[])[], row: number, column: number): number {
  const size = board.length;
  let seen = 1;
  for (const [dr, dc] of ORTHOGONAL) {
    for (let distance = 1; distance < size; distance++) {
      const nextRow = row + dr * distance;
      const nextColumn = column + dc * distance;
      if (nextRow < 0 || nextRow >= size || nextColumn < 0 || nextColumn >= size || board[nextRow][nextColumn] === 1) break;
      seen++;
    }
  }
  return seen;
}

export function validateKurodokoBoard(board: KurodokoCell[][], puzzle: KurodokoPuzzle): KurodokoValidation {
  const size = board.length;
  if (!isSquare(board) || !isSquare(puzzle, size)) return { ok: false, complete: false, error: "number" };
  let numbersExact = true;
  for (let row = 0; row < size; row++) for (let column = 0; column < size; column++) {
    const clue = puzzle[row][column];
    if (clue === null) continue;
    if (board[row][column] === 1) return { ok: false, complete: false, error: "number" };
    const visible = kurodokoVisibleWhites(board, row, column);
    if (visible < clue) return { ok: false, complete: false, error: "number" };
    if (visible !== clue) numbersExact = false;
  }
  for (let row = 0; row < size; row++) for (let column = 0; column < size; column++) {
    if (board[row][column] !== 1) continue;
    if ((column + 1 < size && board[row][column + 1] === 1) || (row + 1 < size && board[row + 1][column] === 1)) {
      return { ok: false, complete: false, error: "adjacent" };
    }
  }
  if (!kurodokoWhitesConnected(board)) return { ok: false, complete: false, error: "disconnected" };
  return { ok: true, complete: numbersExact, error: null };
}

type Assignment = -1 | KurodokoCell;

function clueCanStillMatch(assignment: Assignment[], puzzle: KurodokoPuzzle, row: number, column: number): boolean {
  const size = puzzle.length;
  const target = puzzle[row][column];
  if (target === null) return true;
  const clueIndex = row * size + column;
  if (assignment[clueIndex] === 1) return false;
  let minimum = 1;
  let maximum = 1;
  for (const [dr, dc] of ORTHOGONAL) {
    let minimumOpen = true;
    for (let distance = 1; distance < size; distance++) {
      const nextRow = row + dr * distance;
      const nextColumn = column + dc * distance;
      if (nextRow < 0 || nextRow >= size || nextColumn < 0 || nextColumn >= size) break;
      const value = assignment[nextRow * size + nextColumn];
      if (value === 1) break;
      maximum++;
      if (minimumOpen && value === 0) minimum++;
      else minimumOpen = false;
    }
  }
  return target >= minimum && target <= maximum;
}

function assignedWhitesCanConnect(assignment: Assignment[], size: number): boolean {
  const whites = assignment.flatMap((value, index) => value === 0 ? [index] : []);
  if (whites.length < 2) return true;
  const reachable = new Set([whites[0]]);
  const stack = [whites[0]];
  while (stack.length) {
    const index = stack.pop()!;
    const row = Math.floor(index / size);
    const column = index % size;
    for (const [dr, dc] of ORTHOGONAL) {
      const nextRow = row + dr;
      const nextColumn = column + dc;
      const next = nextRow * size + nextColumn;
      if (nextRow < 0 || nextRow >= size || nextColumn < 0 || nextColumn >= size || assignment[next] === 1 || reachable.has(next)) continue;
      reachable.add(next);
      stack.push(next);
    }
  }
  return whites.every((index) => reachable.has(index));
}

export function countKurodokoSolutions(puzzle: KurodokoPuzzle, limit = 2): number {
  const size = puzzle.length;
  if (!isSquare(puzzle) || !Number.isInteger(limit) || limit < 1) return 0;
  const assignment: Assignment[] = Array(size * size).fill(-1);
  const candidates: number[] = [];
  for (let row = 0; row < size; row++) for (let column = 0; column < size; column++) {
    const index = row * size + column;
    if (puzzle[row][column] === null) candidates.push(index);
    else assignment[index] = 0;
  }
  candidates.sort((left, right) => {
    const distance = (index: number) => {
      const row = Math.floor(index / size), column = index % size;
      return ORTHOGONAL.reduce((sum, [dr, dc]) => sum + Number(puzzle[row + dr]?.[column + dc] !== null && puzzle[row + dr]?.[column + dc] !== undefined), 0);
    };
    return distance(right) - distance(left);
  });
  let solutions = 0;
  const clues = puzzle.flatMap((row, r) => row.flatMap((clue, c) => clue === null ? [] : [[r, c] as const]));
  const search = (position: number) => {
    if (solutions >= limit) return;
    if (!clues.every(([row, column]) => clueCanStillMatch(assignment, puzzle, row, column))) return;
    if (!assignedWhitesCanConnect(assignment, size)) return;
    if (position === candidates.length) {
      const board = Array.from({ length: size }, (_, row) => assignment.slice(row * size, (row + 1) * size) as KurodokoCell[]);
      if (validateKurodokoBoard(board, puzzle).complete) solutions++;
      return;
    }
    const index = candidates[position];
    assignment[index] = 0;
    search(position + 1);
    const row = Math.floor(index / size), column = index % size;
    const touchesBlack = ORTHOGONAL.some(([dr, dc]) => {
      const nextRow = row + dr, nextColumn = column + dc;
      return nextRow >= 0 && nextRow < size && nextColumn >= 0 && nextColumn < size && assignment[nextRow * size + nextColumn] === 1;
    });
    if (!touchesBlack) {
      assignment[index] = 1;
      search(position + 1);
    }
    assignment[index] = -1;
  };
  search(0);
  return solutions;
}

export function generateKurodokoPuzzle(difficulty: KurodokoDifficulty, rng: () => number = Math.random): { puzzle: KurodokoPuzzle; solution: KurodokoCell[][] } {
  const { size, blacks, minimumClues } = KURODOKO_DIFFICULTIES[difficulty];
  const solution: KurodokoCell[][] = Array.from({ length: size }, () => Array(size).fill(0));
  let placed = 0;
  for (const index of shuffle(Array.from({ length: size * size }, (_, value) => value), rng)) {
    if (placed >= blacks) break;
    const row = Math.floor(index / size), column = index % size;
    const touching = ORTHOGONAL.some(([dr, dc]) => solution[row + dr]?.[column + dc] === 1);
    if (touching) continue;
    solution[row][column] = 1;
    if (kurodokoWhitesConnected(solution)) placed++;
    else solution[row][column] = 0;
  }
  const whites = shuffle(Array.from({ length: size * size }, (_, index) => index).filter((index) => solution[Math.floor(index / size)][index % size] === 0), rng);
  const puzzle: KurodokoPuzzle = Array.from({ length: size }, () => Array(size).fill(null));
  for (let index = 0; index < whites.length; index++) {
    const cell = whites[index];
    const row = Math.floor(cell / size), column = cell % size;
    puzzle[row][column] = kurodokoVisibleWhites(solution, row, column);
    if (index + 1 >= minimumClues && countKurodokoSolutions(puzzle) === 1) return { puzzle, solution };
  }
  throw new Error(`Unable to generate a unique ${difficulty} Kurodoko puzzle`);
}
