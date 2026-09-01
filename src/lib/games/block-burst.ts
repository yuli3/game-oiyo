export const COLS = 8;
export const ROWS = 10;
export const COLOR_COUNT = 5;
export const QUEUE_SIZE = 3;

export type BurstColor = 1 | 2 | 3 | 4 | 5;
export type BurstStatus = "playing" | "over";
export type BurstShapeId = "I" | "O" | "T" | "S" | "Z" | "J" | "L" | "P";
export type Cell = { r: number; c: number };

export interface BurstPiece {
  shape: BurstShapeId;
  rotation: number;
  x: number;
  y: number;
  color: BurstColor;
}

export interface BurstClear {
  rows: number[];
  cols: number[];
  cells: Cell[];
}

export interface BurstState {
  board: (BurstColor | null)[][];
  active: BurstPiece | null;
  queue: BurstPiece[];
  bag: BurstShapeId[];
  rng: number;
  score: number;
  combo: number;
  cleared: number;
  level: number;
  status: BurstStatus;
}

const SHAPES: Record<BurstShapeId, Cell[][]> = {
  I: [
    [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 0, c: 3 }],
    [{ r: 0, c: 1 }, { r: 1, c: 1 }, { r: 2, c: 1 }, { r: 3, c: 1 }],
  ],
  O: [[{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 0 }, { r: 1, c: 1 }]],
  T: [
    [{ r: 0, c: 1 }, { r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }],
    [{ r: 0, c: 1 }, { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 2, c: 1 }],
    [{ r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 2, c: 1 }],
    [{ r: 0, c: 1 }, { r: 1, c: 0 }, { r: 1, c: 1 }, { r: 2, c: 1 }],
  ],
  S: [
    [{ r: 0, c: 1 }, { r: 0, c: 2 }, { r: 1, c: 0 }, { r: 1, c: 1 }],
    [{ r: 0, c: 1 }, { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 2, c: 2 }],
  ],
  Z: [
    [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 1 }, { r: 1, c: 2 }],
    [{ r: 0, c: 2 }, { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 2, c: 1 }],
  ],
  J: [
    [{ r: 0, c: 0 }, { r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }],
    [{ r: 0, c: 1 }, { r: 0, c: 2 }, { r: 1, c: 1 }, { r: 2, c: 1 }],
    [{ r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 2, c: 2 }],
    [{ r: 0, c: 1 }, { r: 1, c: 1 }, { r: 2, c: 0 }, { r: 2, c: 1 }],
  ],
  L: [
    [{ r: 0, c: 2 }, { r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }],
    [{ r: 0, c: 1 }, { r: 1, c: 1 }, { r: 2, c: 1 }, { r: 2, c: 2 }],
    [{ r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 2, c: 0 }],
    [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 1 }, { r: 2, c: 1 }],
  ],
  P: [
    [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 0 }, { r: 1, c: 1 }, { r: 2, c: 0 }],
    [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 1, c: 1 }, { r: 1, c: 2 }],
    [{ r: 0, c: 1 }, { r: 1, c: 0 }, { r: 1, c: 1 }, { r: 2, c: 0 }, { r: 2, c: 1 }],
    [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }],
  ],
};

const SHAPE_BAG: BurstShapeId[] = ["I", "O", "T", "S", "Z", "J", "L", "P"];
const KICKS: Cell[] = [
  { r: 0, c: 0 },
  { r: 0, c: -1 },
  { r: 0, c: 1 },
  { r: -1, c: 0 },
  { r: 0, c: -2 },
  { r: 0, c: 2 },
  { r: 1, c: 0 },
];

export function nextRng(rng: number) {
  const state = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
  return { state, value: state / 0x1_0000_0000 };
}

export function emptyBoard(): (BurstColor | null)[][] {
  return Array.from({ length: ROWS }, () => Array<BurstColor | null>(COLS).fill(null));
}

export function pieceCells(piece: BurstPiece): Cell[] {
  const frames = SHAPES[piece.shape];
  const frame = frames[piece.rotation % frames.length];
  return frame.map((cell) => ({ r: piece.y + cell.r, c: piece.x + cell.c }));
}

function cloneBoard(board: (BurstColor | null)[][]) {
  return board.map((row) => [...row]);
}

function clonePiece(piece: BurstPiece): BurstPiece {
  return { ...piece };
}

export function cloneBurstState(state: BurstState): BurstState {
  return {
    board: cloneBoard(state.board),
    active: state.active ? clonePiece(state.active) : null,
    queue: state.queue.map(clonePiece),
    bag: [...state.bag],
    rng: state.rng,
    score: state.score,
    combo: state.combo,
    cleared: state.cleared,
    level: state.level,
    status: state.status,
  };
}

function inBounds(cell: Cell) {
  return cell.r >= 0 && cell.r < ROWS && cell.c >= 0 && cell.c < COLS;
}

export function canPlace(board: (BurstColor | null)[][], piece: BurstPiece) {
  return pieceCells(piece).every((cell) => {
    if (cell.c < 0 || cell.c >= COLS || cell.r >= ROWS) return false;
    if (cell.r < 0) return true;
    return board[cell.r][cell.c] === null;
  });
}

function spawnX(shape: BurstShapeId) {
  const width = Math.max(...SHAPES[shape][0].map((cell) => cell.c)) + 1;
  return Math.floor((COLS - width) / 2);
}

function refillBag(rng: number, bag: BurstShapeId[]) {
  let state = rng;
  const next = [...SHAPE_BAG];
  for (let i = next.length - 1; i > 0; i--) {
    const roll = nextRng(state);
    state = roll.state;
    const j = Math.floor(roll.value * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return { bag: [...bag, ...next], rng: state };
}

function takePiece(rng: number, bag: BurstShapeId[]): { piece: BurstPiece; bag: BurstShapeId[]; rng: number } {
  let nextBag = bag;
  let state = rng;
  if (nextBag.length === 0) {
    const filled = refillBag(state, nextBag);
    nextBag = filled.bag;
    state = filled.rng;
  }
  const shape = nextBag[0];
  const rest = nextBag.slice(1);
  const colorRoll = nextRng(state);
  const color = ((Math.floor(colorRoll.value * COLOR_COUNT) + 1) as BurstColor);
  return {
    piece: { shape, rotation: 0, x: spawnX(shape), y: 0, color },
    bag: rest,
    rng: colorRoll.state,
  };
}

function fillQueue(rng: number, bag: BurstShapeId[], queue: BurstPiece[]) {
  let state = rng;
  let nextBag = bag;
  const nextQueue = [...queue];
  while (nextQueue.length < QUEUE_SIZE) {
    const taken = takePiece(state, nextBag);
    nextQueue.push(taken.piece);
    nextBag = taken.bag;
    state = taken.rng;
  }
  return { queue: nextQueue, bag: nextBag, rng: state };
}

function spawnActive(state: BurstState): BurstState {
  const filled = fillQueue(state.rng, state.bag, state.queue);
  const [next, ...rest] = filled.queue;
  const topped = fillQueue(filled.rng, filled.bag, rest);
  const active = { ...next, x: spawnX(next.shape), y: 0, rotation: 0 };
  if (!canPlace(state.board, active)) {
    return { ...state, queue: topped.queue, bag: topped.bag, rng: topped.rng, active: null, status: "over", combo: 0 };
  }
  return { ...state, active, queue: topped.queue, bag: topped.bag, rng: topped.rng };
}

export function createBlockBurst(seed: number): BurstState {
  const filled = fillQueue(seed >>> 0, [], []);
  return spawnActive({
    board: emptyBoard(),
    active: null,
    queue: filled.queue,
    bag: filled.bag,
    rng: filled.rng,
    score: 0,
    combo: 0,
    cleared: 0,
    level: 1,
    status: "playing",
  });
}

export function findFullLines(board: (BurstColor | null)[][]): BurstClear {
  const rows: number[] = [];
  const cols: number[] = [];
  for (let r = 0; r < ROWS; r++) {
    if (board[r].every((cell) => cell !== null)) rows.push(r);
  }
  for (let c = 0; c < COLS; c++) {
    if (board.every((row) => row[c] !== null)) cols.push(c);
  }
  const marked = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  for (const r of rows) for (let c = 0; c < COLS; c++) marked[r][c] = true;
  for (const c of cols) for (let r = 0; r < ROWS; r++) marked[r][c] = true;
  const cells: Cell[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) if (marked[r][c]) cells.push({ r, c });
  }
  return { rows, cols, cells };
}

export function applyGravity(board: (BurstColor | null)[][]) {
  const next = emptyBoard();
  for (let c = 0; c < COLS; c++) {
    const stack: BurstColor[] = [];
    for (let r = ROWS - 1; r >= 0; r--) {
      const value = board[r][c];
      if (value !== null) stack.push(value);
    }
    for (let i = 0; i < stack.length; i++) next[ROWS - 1 - i][c] = stack[i];
  }
  return next;
}

export type BurstWave = {
  clear: BurstClear;
  before: (BurstColor | null)[][];
  after: (BurstColor | null)[][];
};

export function resolveClears(board: (BurstColor | null)[][], comboStart = 0) {
  let current = cloneBoard(board);
  let combo = comboStart;
  let cells = 0;
  let waves = 0;
  const wavesDetail: BurstWave[] = [];
  while (waves < 20) {
    const found = findFullLines(current);
    if (found.cells.length === 0) break;
    waves += 1;
    combo += 1;
    cells += found.cells.length;
    const before = cloneBoard(current);
    for (const cell of found.cells) current[cell.r][cell.c] = null;
    current = applyGravity(current);
    wavesDetail.push({ clear: found, before, after: cloneBoard(current) });
  }
  const both = wavesDetail.some((wave) => wave.clear.rows.length > 0 && wave.clear.cols.length > 0);
  const score = cells * 10 * Math.max(1, combo) * (both ? 2 : 1);
  return { board: current, combo, cells, waves, score, wavesDetail };
}

function mergeActive(state: BurstState) {
  if (!state.active) return cloneBoard(state.board);
  const board = cloneBoard(state.board);
  for (const cell of pieceCells(state.active)) {
    if (inBounds(cell)) board[cell.r][cell.c] = state.active.color;
  }
  return board;
}

export function settleLock(state: BurstState) {
  const merged = mergeActive(state);
  const resolved = resolveClears(merged, 0);
  const cleared = state.cleared + resolved.cells;
  const next: BurstState = {
    ...state,
    board: resolved.board,
    active: null,
    score: state.score + resolved.score,
    combo: resolved.waves,
    cleared,
    level: Math.min(15, 1 + Math.floor(cleared / 40)),
  };
  return { state: next, merged, wavesDetail: resolved.wavesDetail, gain: resolved.score };
}

export function spawnBurstPiece(state: BurstState): BurstState {
  return spawnActive(state);
}

function afterLock(state: BurstState): BurstState {
  return spawnActive(settleLock(state).state);
}

export function tryMove(state: BurstState, dr: number, dc: number): BurstState {
  if (state.status !== "playing" || !state.active) return state;
  const moved = { ...state.active, x: state.active.x + dc, y: state.active.y + dr };
  if (!canPlace(state.board, moved)) return state;
  return { ...state, active: moved, combo: dr > 0 || dc !== 0 ? state.combo : state.combo };
}

export function tryRotate(state: BurstState, dir = 1): BurstState {
  if (state.status !== "playing" || !state.active) return state;
  const frames = SHAPES[state.active.shape].length;
  const rotation = (state.active.rotation + dir + frames) % frames;
  for (const kick of KICKS) {
    const rotated = {
      ...state.active,
      rotation,
      x: state.active.x + kick.c,
      y: state.active.y + kick.r,
    };
    if (canPlace(state.board, rotated)) return { ...state, active: rotated };
  }
  return state;
}

export function softDrop(state: BurstState): BurstState {
  const moved = tryMove(state, 1, 0);
  if (moved === state) return state;
  return { ...moved, score: moved.score + 1 };
}

export function hardDrop(state: BurstState): BurstState {
  if (state.status !== "playing" || !state.active) return state;
  let current = state;
  let dropped = 0;
  while (true) {
    const next = tryMove(current, 1, 0);
    if (next === current) break;
    current = next;
    dropped += 1;
  }
  return afterLock({ ...current, score: current.score + dropped * 2 });
}

export function tickGravity(state: BurstState): BurstState {
  if (state.status !== "playing" || !state.active) return state;
  const moved = tryMove(state, 1, 0);
  if (moved !== state) return moved;
  return afterLock(state);
}

export function ghostPiece(state: BurstState): BurstPiece | null {
  if (!state.active) return null;
  let ghost = state.active;
  while (true) {
    const next = { ...ghost, y: ghost.y + 1 };
    if (!canPlace(state.board, next)) return ghost;
    ghost = next;
  }
}

export function gravityMs(level: number) {
  return Math.max(120, 820 - (level - 1) * 52);
}

export function serializeBurst(state: BurstState) {
  return JSON.stringify({
    v: 1,
    board: state.board,
    active: state.active,
    queue: state.queue,
    bag: state.bag,
    rng: state.rng,
    score: state.score,
    combo: state.combo,
    cleared: state.cleared,
    level: state.level,
    status: state.status,
  });
}

function isColor(value: unknown): value is BurstColor {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

function isShape(value: unknown): value is BurstShapeId {
  return value === "I" || value === "O" || value === "T" || value === "S" || value === "Z" || value === "J" || value === "L" || value === "P";
}

function isPiece(value: unknown): value is BurstPiece {
  if (!value || typeof value !== "object") return false;
  const piece = value as BurstPiece;
  return isShape(piece.shape) && Number.isInteger(piece.rotation) && Number.isInteger(piece.x) && Number.isInteger(piece.y) && isColor(piece.color);
}

export function parseBurst(raw: string | null): BurstState | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const data = parsed as Record<string, unknown>;
    if (data.v !== 1 || !Array.isArray(data.board) || data.board.length !== ROWS) return null;
    const board = data.board.map((row) => {
      if (!Array.isArray(row) || row.length !== COLS) return null;
      return row.map((cell) => (cell === null || isColor(cell) ? cell : null));
    });
    if (board.some((row) => row === null)) return null;
    const queue = Array.isArray(data.queue) ? data.queue.filter(isPiece) : [];
    const bag = Array.isArray(data.bag) ? data.bag.filter(isShape) : [];
    if (typeof data.rng !== "number" || typeof data.score !== "number") return null;
    const status = data.status === "over" ? "over" : "playing";
    const active = data.active === null || isPiece(data.active) ? (data.active as BurstPiece | null) : null;
    return {
      board: board as (BurstColor | null)[][],
      active,
      queue,
      bag,
      rng: data.rng >>> 0,
      score: Math.max(0, data.score),
      combo: typeof data.combo === "number" ? data.combo : 0,
      cleared: typeof data.cleared === "number" ? data.cleared : 0,
      level: typeof data.level === "number" ? Math.max(1, data.level) : 1,
      status,
    };
  } catch {
    return null;
  }
}
