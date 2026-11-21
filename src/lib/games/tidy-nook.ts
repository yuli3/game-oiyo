/**
 * Tidy Nook (아늑한 방 정리) — an original cozy packing puzzle (2026-11-21).
 *
 * Trend basis: cozy life-sim/decorating games (Loftia in the Oct 2026 Next Fest top
 * demos) and the long-running love for "put everything in its place" puzzles.
 * Spread hook: beautiful, screenshot-worthy tidy shelves + underserved cozy fans.
 *
 * 20 rooms. Each room has a shelf grid (some cells already hold fixed decor) and a
 * tray of items shaped like polyominoes. Rotate and place every item so the shelf is
 * filled exactly. Rooms are made by cutting the free cells into pieces, so every
 * room has at least one solution by construction (and tests check it).
 */

export const TIDY_SLUG = "tidy-nook";
export const ROOM_COUNT = 20;

export type Cell = readonly [number, number]; // [x, y]
export type ItemKind = "mug" | "plant" | "frame" | "books" | "candle" | "lamp" | "teddy" | "box" | "rug" | "radio" | "yarn" | "kettle";

export interface Piece {
  id: number;
  kind: ItemKind;
  cells: Cell[]; // normalised: min x = min y = 0
  color: string;
}

export interface Room {
  index: number;
  w: number;
  h: number;
  blocked: Cell[];
  pieces: Piece[];
  /** One solution: piece id → absolute cells. */
  solution: Record<number, Cell[]>;
}

function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function normalise(cells: readonly Cell[]): Cell[] {
  const minX = Math.min(...cells.map((c) => c[0]));
  const minY = Math.min(...cells.map((c) => c[1]));
  return cells
    .map((c) => [c[0] - minX, c[1] - minY] as Cell)
    .sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}

/** Rotates 90° clockwise and normalises. */
export function rotate(cells: readonly Cell[]): Cell[] {
  return normalise(cells.map(([x, y]) => [-y, x] as Cell));
}

export function shapeKey(cells: readonly Cell[]): string {
  return normalise(cells).map((c) => c.join(",")).join(";");
}

const KIND_BY_SIZE: Record<number, ItemKind[]> = {
  1: ["mug", "plant", "frame", "candle"],
  2: ["books", "radio", "kettle"],
  3: ["lamp", "teddy", "yarn"],
  4: ["box", "rug"],
};
const COLORS: Record<ItemKind, string> = {
  mug: "#e07a5f", plant: "#81b29a", frame: "#f2cc8f", candle: "#f4a261", books: "#3d5a80", radio: "#98c1d9",
  kettle: "#ee6c4d", lamp: "#ffd166", teddy: "#b08968", yarn: "#cdb4db", box: "#ddb892", rug: "#e5989b",
};

export function roomSize(index: number): { w: number; h: number; blocked: number } {
  const i = Math.max(0, Math.min(ROOM_COUNT - 1, index));
  const w = 4 + Math.floor(i / 4); // 4..8
  const h = 3 + Math.floor(i / 5); // 3..6
  return { w, h, blocked: Math.floor(i / 3) };
}

/** Builds room `index` deterministically. */
export function buildRoom(index: number): Room {
  const { w, h, blocked: blockedCount } = roomSize(index);
  for (let attempt = 0; attempt < 200; attempt++) {
    const r = rng(4242 + index * 977 + attempt * 31);
    const blocked: Cell[] = [];
    while (blocked.length < blockedCount) {
      const c: Cell = [Math.floor(r() * w), Math.floor(r() * h)];
      if (!blocked.some((b) => b[0] === c[0] && b[1] === c[1])) blocked.push(c);
    }
    const owner: number[][] = Array.from({ length: h }, () => Array(w).fill(-1));
    for (const [x, y] of blocked) owner[y][x] = -2;
    const groups: Cell[][] = [];
    const maxSize = index < 3 ? 3 : 4;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (owner[y][x] !== -1) continue;
        const target = 1 + Math.floor(r() * maxSize) + (r() < 0.5 ? 1 : 0);
        const group: Cell[] = [[x, y]];
        owner[y][x] = groups.length;
        while (group.length < Math.min(maxSize, target)) {
          const frontier: Cell[] = [];
          for (const [gx, gy] of group) {
            for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
              const nx = gx + dx;
              const ny = gy + dy;
              if (nx >= 0 && ny >= 0 && nx < w && ny < h && owner[ny][nx] === -1) frontier.push([nx, ny]);
            }
          }
          if (!frontier.length) break;
          const pick = frontier[Math.floor(r() * frontier.length)];
          owner[pick[1]][pick[0]] = groups.length;
          group.push(pick);
        }
        groups.push(group);
      }
    }
    const singles = groups.filter((g) => g.length === 1).length;
    if (singles > Math.max(2, Math.floor(groups.length / 4))) continue; // too many trivial pieces
    const pieces: Piece[] = [];
    const solution: Record<number, Cell[]> = {};
    groups.forEach((g, id) => {
      const kinds = KIND_BY_SIZE[g.length];
      const kind = kinds[Math.floor(r() * kinds.length)];
      let cells = normalise(g);
      const turns = Math.floor(r() * 4);
      for (let t = 0; t < turns; t++) cells = rotate(cells);
      pieces.push({ id, kind, cells, color: COLORS[kind] });
      solution[id] = g.map((c) => [c[0], c[1]] as Cell);
    });
    // Shuffle the tray order.
    for (let i = pieces.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
    }
    return { index, w, h, blocked, pieces, solution };
  }
  throw new Error(`room ${index} could not be built`);
}

export interface Board {
  room: Room;
  placed: Record<number, Cell[]>; // piece id → absolute cells
  rotation: Record<number, Cell[]>; // current shape of tray pieces
  moves: number;
}

export function createBoard(room: Room): Board {
  const rotation: Record<number, Cell[]> = {};
  for (const p of room.pieces) rotation[p.id] = p.cells;
  return { room, placed: {}, rotation, moves: 0 };
}

export function occupied(board: Board): Map<string, number> {
  const map = new Map<string, number>();
  for (const [x, y] of board.room.blocked) map.set(`${x},${y}`, -2);
  for (const [id, cells] of Object.entries(board.placed)) for (const [x, y] of cells) map.set(`${x},${y}`, Number(id));
  return map;
}

export function rotatePiece(board: Board, id: number): Board {
  if (board.placed[id] || !board.rotation[id]) return board;
  return { ...board, rotation: { ...board.rotation, [id]: rotate(board.rotation[id]) } };
}

/** Where the piece would land with its first cell at (x, y), or null if it does not fit. */
export function fitAt(board: Board, id: number, x: number, y: number): Cell[] | null {
  const shape = board.rotation[id];
  if (!shape || board.placed[id]) return null;
  const [ax, ay] = shape[0];
  const cells = shape.map(([cx, cy]) => [cx - ax + x, cy - ay + y] as Cell);
  const taken = occupied(board);
  for (const [cx, cy] of cells) {
    if (cx < 0 || cy < 0 || cx >= board.room.w || cy >= board.room.h || taken.has(`${cx},${cy}`)) return null;
  }
  return cells;
}

/** Tries the anchor at (x, y) first, then shifts the piece so any of its cells covers (x, y). */
export function placeNear(board: Board, id: number, x: number, y: number): Board {
  const shape = board.rotation[id];
  if (!shape) return board;
  const [ax, ay] = shape[0];
  for (const [cx, cy] of shape) {
    const cells = fitAt(board, id, x - (cx - ax), y - (cy - ay));
    if (cells) return { ...board, placed: { ...board.placed, [id]: cells }, moves: board.moves + 1 };
  }
  return board;
}

export function pickUp(board: Board, x: number, y: number): { board: Board; id: number | null } {
  const id = occupied(board).get(`${x},${y}`);
  if (id === undefined || id < 0) return { board, id: null };
  const placed = { ...board.placed };
  delete placed[id];
  return { board: { ...board, placed, moves: board.moves + 1 }, id };
}

export function isSolved(board: Board): boolean {
  return board.room.pieces.every((p) => board.placed[p.id]) && occupied(board).size === board.room.w * board.room.h;
}

export function roomStars(board: Board): number {
  if (!isSolved(board)) return 0;
  const par = board.room.pieces.length;
  if (board.moves <= par + 2) return 3;
  if (board.moves <= par + 8) return 2;
  return 1;
}

/** Shapes the same as each other after rotation (for tests). */
export function sameShape(a: readonly Cell[], b: readonly Cell[]): boolean {
  let s = normalise(a);
  for (let t = 0; t < 4; t++) {
    if (shapeKey(s) === shapeKey(b)) return true;
    s = rotate(s);
  }
  return false;
}
