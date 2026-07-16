export type SudokuValue = number | null;

const ONE_TO_NINE = "1,2,3,4,5,6,7,8,9";

function isOneToNine(values: SudokuValue[]): boolean {
  return values.length === 9 && values.every((value) => Number.isInteger(value) && value! >= 1 && value! <= 9)
    && [...values].sort((a, b) => a! - b!).join(",") === ONE_TO_NINE;
}

export function isSudokuSolved(grid: SudokuValue[][]): boolean {
  if (grid.length !== 9 || grid.some((row) => row.length !== 9)) return false;
  if (!grid.every(isOneToNine)) return false;
  for (let column = 0; column < 9; column++) {
    if (!isOneToNine(grid.map((row) => row[column]))) return false;
  }
  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxColumn = 0; boxColumn < 3; boxColumn++) {
      const values: SudokuValue[] = [];
      for (let row = 0; row < 3; row++) for (let column = 0; column < 3; column++) {
        values.push(grid[boxRow * 3 + row][boxColumn * 3 + column]);
      }
      if (!isOneToNine(values)) return false;
    }
  }
  return true;
}

export type HitoriValidation = {
  duplicateFree: boolean;
  noAdjacentBlack: boolean;
  whiteConnected: boolean;
  valid: boolean;
};

export function validateHitori(values: number[][], dark: boolean[][]): HitoriValidation {
  const height = values.length;
  const width = values[0]?.length ?? 0;
  if (!height || !width || values.some((row) => row.length !== width) || dark.length !== height || dark.some((row) => row.length !== width)) {
    return { duplicateFree: false, noAdjacentBlack: false, whiteConnected: false, valid: false };
  }

  const unique = (items: number[]) => new Set(items).size === items.length;
  const duplicateFree = values.every((row, y) => unique(row.filter((_, x) => !dark[y][x])))
    && Array.from({ length: width }, (_, x) => unique(values.flatMap((row, y) => dark[y][x] ? [] : [row[x]]))).every(Boolean);

  let noAdjacentBlack = true;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (dark[y][x] && (dark[y + 1]?.[x] || dark[y]?.[x + 1])) noAdjacentBlack = false;
  }

  const whiteCells = values.flatMap((row, y) => row.flatMap((_, x) => dark[y][x] ? [] : [[x, y] as const]));
  let whiteConnected = whiteCells.length > 0;
  if (whiteConnected) {
    const queue: Array<readonly [number, number]> = [whiteCells[0]];
    const seen = new Set([`${whiteCells[0][0]}:${whiteCells[0][1]}`]);
    while (queue.length) {
      const [x, y] = queue.shift()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, key = `${nx}:${ny}`;
        if (values[ny]?.[nx] !== undefined && !dark[ny][nx] && !seen.has(key)) {
          seen.add(key);
          queue.push([nx, ny]);
        }
      }
    }
    whiteConnected = seen.size === whiteCells.length;
  }

  return { duplicateFree, noAdjacentBlack, whiteConnected, valid: duplicateFree && noAdjacentBlack && whiteConnected };
}

// null = white cell; number = black clue cell. Bulbs are meaningful only on white cells.
export type AkariSpec = Array<Array<number | null>>;
export type AkariEvaluation = {
  lit: boolean[][];
  bulbErrors: boolean[][];
  clueErrors: boolean[][];
  solved: boolean;
};

export function evaluateAkari(spec: AkariSpec, bulbs: boolean[][]): AkariEvaluation {
  const height = spec.length;
  const width = spec[0]?.length ?? 0;
  const lit = Array.from({ length: height }, () => Array(width).fill(false));
  const bulbErrors = Array.from({ length: height }, () => Array(width).fill(false));
  const clueErrors = Array.from({ length: height }, () => Array(width).fill(false));
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (!bulbs[y]?.[x] || spec[y][x] !== null) continue;
    lit[y][x] = true;
    for (const [dx, dy] of dirs) {
      let nx = x + dx, ny = y + dy;
      while (spec[ny]?.[nx] === null) {
        lit[ny][nx] = true;
        if (bulbs[ny]?.[nx]) {
          bulbErrors[y][x] = true;
          bulbErrors[ny][nx] = true;
        }
        nx += dx;
        ny += dy;
      }
    }
  }

  let cluesValid = true;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const clue = spec[y][x];
    if (clue === null) continue;
    const adjacent = dirs.filter(([dx, dy]) => bulbs[y + dy]?.[x + dx]).length;
    clueErrors[y][x] = adjacent !== clue;
    cluesValid &&= !clueErrors[y][x];
  }
  const allWhiteLit = spec.every((row, y) => row.every((cell, x) => cell !== null || lit[y][x]));
  const noBulbConflict = bulbErrors.every((row) => row.every((error) => !error));
  return { lit, bulbErrors, clueErrors, solved: allWhiteLit && noBulbConflict && cluesValid };
}
