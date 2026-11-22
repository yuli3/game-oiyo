/**
 * 비눗방울 정원 (Bubble Garden) — an OIYO original bubble shooter.
 * Pure, seeded logic: hex grid, shot trajectory with wall bounces, snapping,
 * matching, floating drops, bombs, stones, rainbow reward bubbles and a sinking ceiling.
 * 30 stages (stage range 10-50).
 */
import { mulberry32 } from "./daily";

export const BUBBLE_SLUG = "bubble-garden";
export const LEVEL_COUNT = 30;

export const COLS = 9;
export const R = 20;
export const ROW_H = R * Math.sqrt(3);
export const FIELD_W = COLS * R * 2;
export const MAX_ROWS = 16;
/** A bubble whose row (plus ceiling drops) reaches this line ends the stage. */
export const DANGER_ROW = 13;
export const FIELD_H = Math.ceil(R + DANGER_ROW * ROW_H + R * 3.2);
export const SHOOTER: Readonly<{ x: number; y: number }> = { x: FIELD_W / 2, y: FIELD_H - R * 1.4 };

export const EMPTY = -1;
export const STONE = 10;
export const BOMB = 11;
export const RAINBOW = 12;
/** Popping at least this many at once earns a rainbow bubble. */
export const RAINBOW_AT = 7;

export type Cell = readonly [number, number];
export type Grid = number[][];

export interface Level {
  index: number;
  colors: number;
  missesPerDrop: number;
  grid: Grid;
}

export interface GameState {
  level: number;
  grid: Grid;
  colors: number;
  missesPerDrop: number;
  drops: number;
  misses: number;
  shots: number;
  current: number;
  next: number;
  score: number;
  status: "play" | "won" | "lost";
  seed: number;
  /** count of color bubbles at the start, for stars */
  startCount: number;
}

export interface ShotResult {
  path: Array<{ x: number; y: number }>;
  cell: Cell | null;
}

export interface ResolveResult {
  state: GameState;
  popped: Cell[];
  dropped: Array<{ cell: Cell; value: number }>;
  exploded: Cell[];
  placed: Cell | null;
  rainbowEarned: boolean;
}

export function rowLength(r: number): number {
  return r % 2 === 0 ? COLS : COLS - 1;
}

export function inGrid(r: number, c: number): boolean {
  return r >= 0 && r < MAX_ROWS && c >= 0 && c < rowLength(r);
}

export function cellCenter(r: number, c: number, drops = 0): { x: number; y: number } {
  return { x: R + c * 2 * R + (r % 2 === 1 ? R : 0), y: R + (r + drops) * ROW_H };
}

export function neighbors(r: number, c: number): Cell[] {
  const odd = r % 2 === 1;
  const raw: Cell[] = odd
    ? [[r - 1, c], [r - 1, c + 1], [r, c - 1], [r, c + 1], [r + 1, c], [r + 1, c + 1]]
    : [[r - 1, c - 1], [r - 1, c], [r, c - 1], [r, c + 1], [r + 1, c - 1], [r + 1, c]];
  return raw.filter(([a, b]) => inGrid(a, b));
}

export function emptyGrid(): Grid {
  return Array.from({ length: MAX_ROWS }, (_, r) => Array.from({ length: rowLength(r) }, () => EMPTY));
}

export function cloneGrid(g: Grid): Grid {
  return g.map((row) => row.slice());
}

export function isColor(v: number): boolean {
  return v >= 0 && v < 6;
}

export function colorCount(g: Grid): number {
  let n = 0;
  for (const row of g) for (const v of row) if (isColor(v)) n += 1;
  return n;
}

export function presentColors(g: Grid): number[] {
  const s = new Set<number>();
  for (const row of g) for (const v of row) if (isColor(v)) s.add(v);
  return [...s].sort((a, b) => a - b);
}

/** Removes everything not connected to the top row. Returns the removed cells with their values. */
export function removeFloating(g: Grid): Array<{ cell: Cell; value: number }> {
  const seen = new Set<string>();
  const stack: Cell[] = [];
  for (let c = 0; c < rowLength(0); c++) if (g[0][c] !== EMPTY) { stack.push([0, c]); seen.add(`0,${c}`); }
  while (stack.length) {
    const [r, c] = stack.pop()!;
    for (const [a, b] of neighbors(r, c)) {
      const k = `${a},${b}`;
      if (!seen.has(k) && g[a][b] !== EMPTY) { seen.add(k); stack.push([a, b]); }
    }
  }
  const out: Array<{ cell: Cell; value: number }> = [];
  for (let r = 0; r < MAX_ROWS; r++) for (let c = 0; c < rowLength(r); c++) {
    if (g[r][c] !== EMPTY && !seen.has(`${r},${c}`)) { out.push({ cell: [r, c], value: g[r][c] }); g[r][c] = EMPTY; }
  }
  return out;
}

const PATTERNS = ["full", "gaps", "diamond", "stripes", "pillars"] as const;

export function buildLevel(index: number): Level {
  const i = Math.max(0, Math.min(LEVEL_COUNT - 1, index));
  const rng = mulberry32(i * 7919 + 131);
  const rows = Math.min(4 + Math.floor(i / 3), 10);
  const colors = i < 4 ? 3 : i < 11 ? 4 : i < 21 ? 5 : 6;
  const missesPerDrop = i < 10 ? 7 : i < 20 ? 6 : 5;
  const pattern = PATTERNS[i % PATTERNS.length];
  const g = emptyGrid();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < rowLength(r); c++) {
      let keep = true;
      const mid = (rowLength(r) - 1) / 2;
      if (pattern === "gaps") keep = !((r + c) % 4 === 3 && r > 0);
      if (pattern === "diamond") keep = r === 0 || Math.abs(c - mid) <= Math.max(1.5, mid - Math.abs(r - rows / 2) * 0.9);
      if (pattern === "pillars") keep = r < 2 || c % 3 !== 1;
      if (!keep) continue;
      let v: number;
      if (r === 0) {
        // the ceiling row never holds a long same-colour run, or one shot would drop everything
        do v = Math.floor(rng() * colors);
        while (c >= 2 && g[0][c - 1] === v && g[0][c - 2] === v);
      } else if (pattern === "stripes" && rng() < 0.6) v = (Math.floor(r / 2) + c % 2) % colors;
      else if (c > 0 && isColor(g[r][c - 1]) && rng() < 0.3) v = g[r][c - 1];
      else if (rng() < 0.22) {
        const up = neighbors(r, c).filter(([a]) => a === r - 1).map(([a, b]) => g[a][b]).filter(isColor);
        v = up.length ? up[Math.floor(rng() * up.length)] : Math.floor(rng() * colors);
      } else v = Math.floor(rng() * colors);
      g[r][c] = v;
    }
  }
  // stones from stage 11, bombs from stage 16
  const filled: Cell[] = [];
  for (let r = 1; r < rows; r++) for (let c = 0; c < rowLength(r); c++) if (g[r][c] !== EMPTY) filled.push([r, c]);
  const stones = i >= 10 ? Math.min(6, 1 + Math.floor((i - 10) / 4)) : 0;
  const bombs = i >= 15 ? (i >= 25 ? 3 : i >= 20 ? 2 : 1) : 0;
  for (let k = 0; k < stones + bombs && filled.length; k++) {
    const at = Math.floor(rng() * filled.length);
    const [r, c] = filled.splice(at, 1)[0];
    g[r][c] = k < stones ? STONE : BOMB;
  }
  removeFloating(g);
  return { index: i, colors, missesPerDrop, grid: g };
}

function pick(colors: number[], rng: () => number): number {
  return colors.length ? colors[Math.floor(rng() * colors.length)] : 0;
}

export function newGame(index: number, seed = index * 104729 + 7): GameState {
  const level = buildLevel(index);
  const rng = mulberry32(seed);
  const pc = presentColors(level.grid);
  return {
    level: level.index,
    grid: cloneGrid(level.grid),
    colors: level.colors,
    missesPerDrop: level.missesPerDrop,
    drops: 0,
    misses: 0,
    shots: 0,
    current: pick(pc, rng),
    next: pick(pc, rng),
    score: 0,
    status: "play",
    seed: Math.floor(rng() * 2 ** 31),
    startCount: colorCount(level.grid),
  };
}

export function clampAngle(a: number): number {
  const min = (8 * Math.PI) / 180;
  return Math.max(min, Math.min(Math.PI - min, a));
}

/** Angle (radians, 0 = right, π/2 = straight up) from the shooter toward a point. */
export function aimAngle(x: number, y: number): number {
  const a = Math.atan2(SHOOTER.y - y, x - SHOOTER.x);
  return clampAngle(a < 0 ? (x < SHOOTER.x ? Math.PI : 0) : a);
}

function attachable(g: Grid, r: number, c: number): boolean {
  if (!inGrid(r, c) || g[r][c] !== EMPTY) return false;
  if (r === 0) return true;
  return neighbors(r, c).some(([a, b]) => g[a][b] !== EMPTY);
}

/** Traces a shot from the shooter. Returns the drawn path and the cell it settles in. */
export function traceShot(g: Grid, angle: number, drops: number): ShotResult {
  const a = clampAngle(angle);
  let dx = Math.cos(a);
  const dy = -Math.sin(a);
  let x = SHOOTER.x;
  let y = SHOOTER.y;
  const path = [{ x, y }];
  const step = 3;
  const top = R + drops * ROW_H;
  const hitDist = 2 * R * 0.86;
  for (let i = 0; i < 2000; i++) {
    x += dx * step;
    y += dy * step;
    if (x < R) { x = 2 * R - x; dx = -dx; path.push({ x: R, y }); }
    if (x > FIELD_W - R) { x = 2 * (FIELD_W - R) - x; dx = -dx; path.push({ x: FIELD_W - R, y }); }
    let hit = y <= top;
    if (!hit) {
      const approxRow = Math.round((y - R) / ROW_H) - drops;
      for (let r = Math.max(0, approxRow - 1); r <= Math.min(MAX_ROWS - 1, approxRow + 1) && !hit; r++) {
        for (let c = 0; c < rowLength(r); c++) {
          if (g[r][c] === EMPTY) continue;
          const p = cellCenter(r, c, drops);
          if ((p.x - x) ** 2 + (p.y - y) ** 2 < hitDist * hitDist) { hit = true; break; }
        }
      }
    }
    if (hit) {
      path.push({ x, y });
      const baseRow = Math.max(0, Math.round((y - R) / ROW_H) - drops);
      let best: Cell | null = null;
      let bestD = Infinity;
      for (let r = Math.max(0, baseRow - 1); r <= Math.min(MAX_ROWS - 1, baseRow + 1); r++) {
        for (let c = 0; c < rowLength(r); c++) {
          if (!attachable(g, r, c)) continue;
          const p = cellCenter(r, c, drops);
          const d = (p.x - x) ** 2 + (p.y - y) ** 2;
          if (d < bestD) { bestD = d; best = [r, c]; }
        }
      }
      if (best) path[path.length - 1] = cellCenter(best[0], best[1], drops);
      return { path, cell: best };
    }
  }
  return { path, cell: null };
}

function cluster(g: Grid, r: number, c: number, color: number): Cell[] {
  const out: Cell[] = [[r, c]];
  const seen = new Set([`${r},${c}`]);
  for (let i = 0; i < out.length; i++) {
    for (const [a, b] of neighbors(out[i][0], out[i][1])) {
      const k = `${a},${b}`;
      if (!seen.has(k) && g[a][b] === color) { seen.add(k); out.push([a, b]); }
    }
  }
  return out;
}

function nextShot(state: GameState, g: Grid): { current: number; next: number; seed: number } {
  const rng = mulberry32(state.seed);
  const pc = presentColors(g);
  const keepNext = isColor(state.next) && pc.includes(state.next) ? state.next : pick(pc, rng);
  return { current: keepNext, next: pick(pc, rng), seed: Math.floor(rng() * 2 ** 31) };
}

export function lowestRow(g: Grid): number {
  for (let r = MAX_ROWS - 1; r >= 0; r--) if (g[r].some((v) => v !== EMPTY)) return r;
  return -1;
}

/** Places the current bubble at `cell` and resolves pops, bombs, drops, the ceiling and win/lose. */
export function resolveShot(state: GameState, cell: Cell | null): ResolveResult {
  const none: ResolveResult = { state, popped: [], dropped: [], exploded: [], placed: null, rainbowEarned: false };
  if (state.status !== "play" || !cell) return none;
  const g = cloneGrid(state.grid);
  const [r, c] = cell;
  if (!inGrid(r, c) || g[r][c] !== EMPTY) return none;
  let shot = state.current;
  if (shot === RAINBOW) {
    // becomes the colour that makes the biggest neighbouring group
    let bestColor = -1;
    let bestSize = 0;
    for (const [a, b] of neighbors(r, c)) {
      const v = g[a][b];
      if (!isColor(v)) continue;
      g[r][c] = v;
      const size = cluster(g, r, c, v).length;
      if (size > bestSize) { bestSize = size; bestColor = v; }
    }
    shot = bestColor >= 0 ? bestColor : 0;
  }
  g[r][c] = shot;
  let popped: Cell[] = [];
  const exploded: Cell[] = [];
  const group = cluster(g, r, c, shot);
  if (group.length >= 3) {
    popped = group;
    const bombs = new Set<string>();
    for (const [a, b] of group) {
      g[a][b] = EMPTY;
      for (const [x, y] of neighbors(a, b)) if (g[x][y] === BOMB) bombs.add(`${x},${y}`);
    }
    const queue = [...bombs].map((k) => k.split(",").map(Number) as unknown as Cell);
    for (let i = 0; i < queue.length; i++) {
      const [a, b] = queue[i];
      if (g[a][b] === EMPTY) continue;
      g[a][b] = EMPTY;
      exploded.push([a, b]);
      for (const [x, y] of neighbors(a, b)) {
        if (g[x][y] === BOMB) queue.push([x, y]);
        else if (g[x][y] !== EMPTY) { g[x][y] = EMPTY; exploded.push([x, y]); }
      }
    }
  }
  const dropped = removeFloating(g);
  const cleared = popped.length + exploded.length;
  let score = state.score + popped.length * 10 + exploded.length * 15 + dropped.length * 20 * (dropped.length >= 5 ? 2 : 1);
  const hit = cleared > 0 || dropped.length > 0;
  let misses = hit ? state.misses : state.misses + 1;
  let drops = state.drops;
  if (misses >= state.missesPerDrop) { misses = 0; drops += 1; }
  const shots = state.shots + 1;
  const rainbowEarned = popped.length + exploded.length + dropped.length >= RAINBOW_AT;
  const ns = nextShot(state, g);
  let status: GameState["status"] = "play";
  if (colorCount(g) === 0) {
    status = "won";
    score += 1000 + Math.max(0, state.startCount * 2 - shots) * 15;
  } else if (lowestRow(g) + drops >= DANGER_ROW) status = "lost";
  return {
    state: {
      ...state,
      grid: g,
      drops,
      misses,
      shots,
      current: rainbowEarned ? RAINBOW : ns.current,
      next: rainbowEarned ? ns.current : ns.next,
      seed: ns.seed,
      score,
      status,
    },
    popped,
    dropped,
    exploded,
    placed: [r, c],
    rainbowEarned,
  };
}

export function swap(state: GameState): GameState {
  if (state.status !== "play") return state;
  return { ...state, current: state.next, next: state.current };
}

export function stars(state: GameState): number {
  if (state.status !== "won") return 0;
  if (state.shots <= Math.ceil(state.startCount * 0.3) + 3) return 3;
  if (state.shots <= Math.ceil(state.startCount * 0.5) + 6) return 2;
  return 1;
}

/** Greedy helper used by tests (and the in-game hint): the angle with the best immediate payoff. */
export function bestAngle(state: GameState): { angle: number; swap: boolean } {
  let best = { angle: Math.PI / 2, swap: false };
  let bestV = -Infinity;
  for (const sw of [false, true]) {
    const s = sw ? swap(state) : state;
    if (sw && s.current === state.current) continue;
    for (let k = 0; k <= 80; k++) {
      const angle = clampAngle((8 + (164 * k) / 80) * (Math.PI / 180));
      const shot = traceShot(s.grid, angle, s.drops);
      if (!shot.cell) continue;
      const res = resolveShot(s, shot.cell);
      const removed = res.popped.length + res.exploded.length + res.dropped.length;
      let v = removed * 10 + res.dropped.length * 6 - shot.cell[0] * 0.6;
      if (removed === 0) {
        const same = neighbors(shot.cell[0], shot.cell[1]).filter(([a, b]) => s.grid[a][b] === s.current).length;
        v = same * 4 - shot.cell[0] * 1.5 - 8;
      }
      if (res.state.status === "lost") v -= 1000;
      if (res.state.status === "won") v += 1000;
      if (v > bestV) { bestV = v; best = { angle, swap: sw }; }
    }
  }
  return best;
}
