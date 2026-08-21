// Tents & Trees puzzle logic — generation and validation, kept pure so both the
// game component and vitest can use it. Rules: every tree gets exactly one tent
// on an orthogonally adjacent cell (1:1 pairing), tents never touch each other
// (diagonals included), and row/column tent counts must match the hints.

export type Pos = [number, number];

export type TentsPuzzle = {
  size: number;
  trees: Pos[];
  rowHints: number[];
  colHints: number[];
};

const ORTHO: Pos[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function neighbors8(r: number, c: number, size: number): Pos[] {
  const out: Pos[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size) out.push([nr, nc]);
    }
  }
  return out;
}

/**
 * Generate a puzzle with a guaranteed solution: place tent+tree pairs directly
 * (tent on a cell not touching another tent, tree on a free orthogonal
 * neighbor), then derive the row/column hints from the placed tents.
 */
export function generateTents(
  size: number,
  pairs: number,
  rng: () => number = Math.random,
): { puzzle: TentsPuzzle; solution: Pos[] } {
  const shuffled = <T,>(arr: readonly T[]): T[] => {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };

  const allCells: Pos[] = [];
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) allCells.push([r, c]);

  // occupancy: 0 free, 1 tree, 2 tent
  for (let attempt = 0; attempt < 100; attempt++) {
    const grid: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
    const trees: Pos[] = [];
    const tents: Pos[] = [];

    for (const [r, c] of shuffled(allCells)) {
      if (tents.length >= pairs) break;
      if (grid[r][c] !== 0) continue;
      if (neighbors8(r, c, size).some(([nr, nc]) => grid[nr][nc] === 2)) continue;
      const treeSpot = shuffled(ORTHO)
        .map(([dr, dc]) => [r + dr, c + dc] as Pos)
        .find(([nr, nc]) => nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc] === 0);
      if (!treeSpot) continue;
      grid[r][c] = 2;
      grid[treeSpot[0]][treeSpot[1]] = 1;
      tents.push([r, c]);
      trees.push(treeSpot);
    }

    if (tents.length === pairs) {
      const rowHints = Array(size).fill(0);
      const colHints = Array(size).fill(0);
      for (const [r, c] of tents) { rowHints[r]++; colHints[c]++; }
      return { puzzle: { size, trees, rowHints, colHints }, solution: tents };
    }
  }

  // With sane size/pairs ratios (≤ ~size²/5) placement never exhausts 100 tries;
  // fall back to fewer pairs rather than looping forever.
  return generateTents(size, pairs - 1, rng);
}

export type TentsValidation = {
  ok: boolean;
  complete: boolean;
  error: 'adjacent' | 'orphan' | 'count' | null;
};

/** True when tents↔trees admit a perfect 1:1 orthogonal-adjacency matching. */
function hasPerfectMatching(tents: Pos[], trees: Pos[]): boolean {
  if (tents.length !== trees.length) return false;
  const adj = tents.map(([r, c]) =>
    trees.reduce<number[]>((acc, [tr, tc], i) => {
      if (Math.abs(tr - r) + Math.abs(tc - c) === 1) acc.push(i);
      return acc;
    }, []),
  );
  const matchedBy: number[] = Array(trees.length).fill(-1);
  const assign = (tent: number, visited: boolean[]): boolean => {
    for (const tree of adj[tent]) {
      if (visited[tree]) continue;
      visited[tree] = true;
      if (matchedBy[tree] < 0 || assign(matchedBy[tree], visited)) {
        matchedBy[tree] = tent;
        return true;
      }
    }
    return false;
  };
  return tents.every((_, i) => assign(i, Array(trees.length).fill(false)));
}

export function validateTents(tents: Pos[], puzzle: TentsPuzzle): TentsValidation {
  const { size, trees, rowHints, colHints } = puzzle;

  // tents never touch, even diagonally
  for (let i = 0; i < tents.length; i++) {
    for (let j = i + 1; j < tents.length; j++) {
      if (Math.abs(tents[i][0] - tents[j][0]) <= 1 && Math.abs(tents[i][1] - tents[j][1]) <= 1) {
        return { ok: false, complete: false, error: 'adjacent' };
      }
    }
  }

  // every tent needs at least one orthogonally adjacent tree
  for (const [r, c] of tents) {
    const nearTree = trees.some(([tr, tc]) => Math.abs(tr - r) + Math.abs(tc - c) === 1);
    if (!nearTree) return { ok: false, complete: false, error: 'orphan' };
  }

  // row/column counts may undershoot mid-game but never overshoot
  const rowCount = Array(size).fill(0);
  const colCount = Array(size).fill(0);
  for (const [r, c] of tents) { rowCount[r]++; colCount[c]++; }
  for (let i = 0; i < size; i++) {
    if (rowCount[i] > rowHints[i] || colCount[i] > colHints[i]) {
      return { ok: false, complete: false, error: 'count' };
    }
  }

  const exact =
    rowCount.every((n, i) => n === rowHints[i]) &&
    colCount.every((n, i) => n === colHints[i]);
  const complete = exact && hasPerfectMatching(tents, trees);
  return { ok: true, complete, error: null };
}

export type TentsHint = { reason: "adjacent" | "orphan" | "count" | "pairing"; cells: Pos[] };
export function explainTentsHint(tents: Pos[], puzzle: TentsPuzzle): TentsHint {
  const { size, trees, rowHints, colHints } = puzzle;
  for (let i = 0; i < tents.length; i++) {
    for (let j = i + 1; j < tents.length; j++) {
      if (Math.abs(tents[i][0] - tents[j][0]) <= 1 && Math.abs(tents[i][1] - tents[j][1]) <= 1) {
        return { reason: "adjacent", cells: [tents[i], tents[j]] };
      }
    }
  }
  for (const tent of tents) {
    if (!trees.some(([tr, tc]) => Math.abs(tr - tent[0]) + Math.abs(tc - tent[1]) === 1)) return { reason: "orphan", cells: [tent] };
  }
  const rowCount = Array(size).fill(0);
  const colCount = Array(size).fill(0);
  for (const [r, c] of tents) { rowCount[r]++; colCount[c]++; }
  for (let i = 0; i < size; i++) {
    if (rowCount[i] > rowHints[i]) return { reason: "count", cells: tents.filter(([r]) => r === i) };
    if (colCount[i] > colHints[i]) return { reason: "count", cells: tents.filter(([, c]) => c === i) };
  }
  return { reason: "pairing", cells: [] };
}

/**
 * Count valid solutions up to `limit`.
 *
 * Daily boards use this as a generation gate: a published logic puzzle must
 * have exactly one solution, not merely a known generating layout. Candidate
 * cells are restricted to cells beside a tree and the search prunes touching
 * tents and exceeded row/column hints, keeping the 5x5/6x6 boards inexpensive.
 */
export function countTentsSolutions(puzzle: TentsPuzzle, limit = 2): number {
  if (limit <= 0) return 0;
  const { size, trees, rowHints, colHints } = puzzle;
  const target = rowHints.reduce((sum, value) => sum + value, 0);
  if (target !== colHints.reduce((sum, value) => sum + value, 0)) return 0;

  const treeKeys = new Set(trees.map(([r, c]) => `${r}:${c}`));
  const candidates: Pos[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (treeKeys.has(`${r}:${c}`)) continue;
      if (trees.some(([tr, tc]) => Math.abs(tr - r) + Math.abs(tc - c) === 1)) {
        candidates.push([r, c]);
      }
    }
  }

  const selected: Pos[] = [];
  const rowCount = Array(size).fill(0);
  const colCount = Array(size).fill(0);
  let solutions = 0;

  const search = (start: number): void => {
    if (solutions >= limit) return;
    if (selected.length === target) {
      if (validateTents(selected, puzzle).complete) solutions++;
      return;
    }
    const needed = target - selected.length;
    if (candidates.length - start < needed) return;

    for (let i = start; i <= candidates.length - needed; i++) {
      const [r, c] = candidates[i];
      if (rowCount[r] >= rowHints[r] || colCount[c] >= colHints[c]) continue;
      if (selected.some(([sr, sc]) => Math.abs(sr - r) <= 1 && Math.abs(sc - c) <= 1)) continue;

      selected.push(candidates[i]);
      rowCount[r]++;
      colCount[c]++;
      search(i + 1);
      colCount[c]--;
      rowCount[r]--;
      selected.pop();
      if (solutions >= limit) return;
    }
  };

  search(0);
  return solutions;
}

/** Generate a deterministic, uniquely solvable puzzle from the supplied RNG. */
export function generateUniqueTents(
  size: number,
  pairs: number,
  rng: () => number = Math.random,
  maxAttempts = 256,
): { puzzle: TentsPuzzle; solution: Pos[] } {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const generated = generateTents(size, pairs, rng);
    if (countTentsSolutions(generated.puzzle, 2) === 1) return generated;
  }
  throw new Error(`Unable to generate a unique ${size}x${size} Tents & Trees puzzle after ${maxAttempts} attempts`);
}
