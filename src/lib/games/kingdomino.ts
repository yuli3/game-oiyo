// Kingdomino — pure game logic (deck, placement legality, region scoring).
// Kept UI-free so it can be unit-tested headlessly. 2-player adaptation:
// each player builds a 5x5 kingdom from domino tiles; scoring = Σ (region size × crowns).
export type Terrain = "wheat" | "forest" | "water" | "grass" | "swamp" | "mine";
export const TERRAINS: Terrain[] = ["wheat", "forest", "water", "grass", "swamp", "mine"];

export interface Square { terrain: Terrain; crowns: number }
export interface Tile { id: number; a: Square; b: Square }

export const GRID = 5;                 // 5x5 kingdom
export const CENTER = 2;               // castle sits at (2,2)
export const CASTLE: Terrain | "castle" = "castle";

// A placed cell: terrain or the wildcard castle. null = empty.
export type Cell = Terrain | "castle" | null;
export type Board = Cell[][];          // [row][col]
export type CrownGrid = number[][];    // crowns per cell

export function emptyBoard(): Board {
  const b: Board = Array.from({ length: GRID }, () => Array<Cell>(GRID).fill(null));
  b[CENTER][CENTER] = "castle";
  return b;
}
export function emptyCrowns(): CrownGrid {
  return Array.from({ length: GRID }, () => Array<number>(GRID).fill(0));
}

// ── Deck ────────────────────────────────────────────────────────────────────
// A balanced deck in the spirit of Kingdomino: crowns are scarce and skew toward
// the rarer terrains. 48 tiles; a 2-player game draws 24 of them.
export function buildDeck(): Tile[] {
  const T = TERRAINS;
  const tiles: Tile[] = [];
  let id = 1;
  const add = (aT: Terrain, aC: number, bT: Terrain, bC: number) =>
    tiles.push({ id: id++, a: { terrain: aT, crowns: aC }, b: { terrain: bT, crowns: bC } });

  // 18 crown-less "connector" tiles (same or mixed terrain, 0 crowns).
  for (let i = 0; i < 18; i++) {
    const x = T[i % 6];
    const y = T[(i + 1 + (i % 3)) % 6];
    add(x, 0, i % 2 ? y : x, 0);
  }
  // 18 single-crown tiles: crown on one terrain, plain on the other.
  for (let i = 0; i < 18; i++) {
    const crownT = T[(i + 2) % 6];
    const plainT = T[(i + 4) % 6];
    add(crownT, 1, plainT, 0);
  }
  // 8 two-crown tiles: skew to scarcer terrains (swamp, mine, water).
  const two: Terrain[] = ["swamp", "mine", "water", "swamp", "mine", "water", "swamp", "mine"];
  for (let i = 0; i < 8; i++) add(two[i], 2, T[i % 6], 0);
  // 4 three-crown tiles: the prized mines.
  for (let i = 0; i < 4; i++) add("mine", 3, T[(i * 2) % 6], 0);

  return tiles; // 18+18+8+4 = 48
}

export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Placement ─────────────────────────────────────────────────────────────
// A domino placement = two adjacent cells (posA for square a, posB for square b).
export interface Pos { r: number; c: number }
export interface Placement { a: Pos; b: Pos }

const inBounds = (p: Pos) => p.r >= 0 && p.r < GRID && p.c >= 0 && p.c < GRID;
const ORTHO = [[-1, 0], [1, 0], [0, -1], [0, 1]];

// Occupied bounding box must stay within 5 rows AND 5 cols (kingdom size limit).
function withinKingdom(board: Board, extra: Pos[]): boolean {
  let minR = GRID, maxR = -1, minC = GRID, maxC = -1;
  const mark = (r: number, c: number) => {
    minR = Math.min(minR, r); maxR = Math.max(maxR, r);
    minC = Math.min(minC, c); maxC = Math.max(maxC, c);
  };
  for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) if (board[r][c] !== null) mark(r, c);
  for (const p of extra) mark(p.r, p.c);
  return maxR - minR < GRID && maxC - minC < GRID;
}

// Does a domino square placed at pos connect (orthogonally) to an existing tile
// whose terrain matches, or to the castle (wildcard)?
function squareConnects(board: Board, pos: Pos, terrain: Terrain): boolean {
  for (const [dr, dc] of ORTHO) {
    const nr = pos.r + dr, nc = pos.c + dc;
    if (nr < 0 || nr >= GRID || nc < 0 || nc >= GRID) continue;
    const cell = board[nr][nc];
    if (cell === "castle" || cell === terrain) return true;
  }
  return false;
}

export function isLegal(board: Board, tile: Tile, pl: Placement): boolean {
  // Two cells must be orthogonally adjacent and distinct.
  const adj = Math.abs(pl.a.r - pl.b.r) + Math.abs(pl.a.c - pl.b.c) === 1;
  if (!adj) return false;
  if (!inBounds(pl.a) || !inBounds(pl.b)) return false;
  if (board[pl.a.r][pl.a.c] !== null || board[pl.b.r][pl.b.c] !== null) return false;
  if (!withinKingdom(board, [pl.a, pl.b])) return false;
  // At least one square must legally connect (castle wildcard or matching terrain).
  // Neighbours may include the OTHER square of this same domino — but that square is
  // not yet placed, so it can't provide the connection; standard rule.
  return squareConnects(board, pl.a, tile.a.terrain) || squareConnects(board, pl.b, tile.b.terrain);
}

export function allLegalPlacements(board: Board, tile: Tile): Placement[] {
  const out: Placement[] = [];
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      for (const [dr, dc] of ORTHO) {
        const pl: Placement = { a: { r, c }, b: { r: r + dr, c: c + dc } };
        if (isLegal(board, tile, pl)) out.push(pl);
      }
    }
  }
  return out;
}

export function applyPlacement(board: Board, crowns: CrownGrid, tile: Tile, pl: Placement): void {
  board[pl.a.r][pl.a.c] = tile.a.terrain;
  crowns[pl.a.r][pl.a.c] = tile.a.crowns;
  board[pl.b.r][pl.b.c] = tile.b.terrain;
  crowns[pl.b.r][pl.b.c] = tile.b.crowns;
}

// ── Scoring ───────────────────────────────────────────────────────────────
// Each connected same-terrain region scores (region size × total crowns in region).
export function scoreBoard(board: Board, crowns: CrownGrid): number {
  const seen = Array.from({ length: GRID }, () => Array<boolean>(GRID).fill(false));
  let total = 0;
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const cell = board[r][c];
      if (cell === null || cell === "castle" || seen[r][c]) continue;
      // Flood fill the region of this terrain.
      let size = 0, regionCrowns = 0;
      const stack: Pos[] = [{ r, c }];
      seen[r][c] = true;
      while (stack.length) {
        const p = stack.pop()!;
        size++; regionCrowns += crowns[p.r][p.c];
        for (const [dr, dc] of ORTHO) {
          const nr = p.r + dr, nc = p.c + dc;
          if (nr < 0 || nr >= GRID || nc < 0 || nc >= GRID) continue;
          if (!seen[nr][nc] && board[nr][nc] === cell) {
            seen[nr][nc] = true; stack.push({ r: nr, c: nc });
          }
        }
      }
      total += size * regionCrowns;
    }
  }
  return total;
}

// Optional standard bonuses.
export function bonuses(board: Board): { middleKingdom: boolean; harmony: boolean; points: number } {
  let filled = 0;
  for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) if (board[r][c] !== null) filled++;
  const harmony = filled === GRID * GRID;           // every square placed
  const middleKingdom = board[CENTER][CENTER] === "castle" && harmony; // castle centred + full
  return { middleKingdom, harmony, points: (harmony ? 10 : 0) + (middleKingdom ? 10 : 0) };
}
