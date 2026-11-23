// Patch Dungeon v2 (2026-11-23). The old version was three verb buttons whose
// labels drifted. Now it is a grid crawl where the game patches its own
// controls: every floor posts patch notes that remap the four directions, and
// later floors hot-patch mid-floor after a set number of moves. Slimes patrol,
// spikes blink, keys open doors. 30 floors, 3 hearts per floor.
// GAME_ID, the w/l GameRecord and the "score" best (deepest floor reached, as
// before: rooms cleared) are kept.

export const GAME_ID = "patch-dungeon";
export const FLOOR_COUNT = 30;
export const COLS = 7;
export const ROWS = 9;
export const HEARTS = 3;

export type Dir = "up" | "down" | "left" | "right";
export const DIRS: readonly Dir[] = ["up", "right", "down", "left"];
export const DELTA: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

/** Tiles: . floor, # wall, ^ spike (always), ~ blinking spike (on when move count is even), K key, D door, E exit, S start */
export type Tile = "." | "#" | "^" | "~" | "K" | "D" | "E" | "S";

export interface Slime { x: number; y: number; dx: number; dy: number }

export type Mapping = Record<Dir, Dir>; // pressed → actual

export interface Patch { at: number; map: Mapping } // takes effect once `moves >= at`

export interface Floor {
  index: number;
  grid: Tile[][]; // [y][x]
  start: [number, number];
  slimes: Slime[];
  patches: Patch[]; // patches[0].at === 0
  par: number;
}

export type Status = "ready" | "play" | "won" | "lost";

export interface RunState {
  floor: Floor;
  status: Status;
  x: number;
  y: number;
  hearts: number;
  moves: number;
  keys: number;
  opened: string[]; // "x,y" of opened doors
  taken: string[]; // "x,y" of picked keys
  slimes: Slime[];
  lastHurt: boolean;
  lastPatch: boolean; // a new patch took effect on the last move
}

// ---------- seeded random ----------
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const IDENTITY: Mapping = { up: "up", down: "down", left: "left", right: "right" };

export function swapMap(base: Mapping, a: Dir, b: Dir): Mapping {
  const m = { ...base };
  const t = m[a];
  m[a] = m[b];
  m[b] = t;
  return m;
}

export function activeMap(floor: Floor, moves: number): Mapping {
  let m = floor.patches[0]!.map;
  for (const p of floor.patches) if (moves >= p.at) m = p.map;
  return m;
}

export function patchIndex(floor: Floor, moves: number): number {
  let k = 0;
  floor.patches.forEach((p, i) => { if (moves >= p.at) k = i; });
  return k;
}

/** Which pressed keys differ from the identity, as pairs for the patch note. */
export function patchNote(map: Mapping): [Dir, Dir][] {
  const out: [Dir, Dir][] = [];
  for (const d of DIRS) if (map[d] !== d) out.push([d, map[d]]);
  return out;
}

const key = (x: number, y: number) => `${x},${y}`;

function inside(x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < COLS && y < ROWS;
}

export function spikeOn(tile: Tile, moves: number): boolean {
  return tile === "^" || (tile === "~" && moves % 2 === 0);
}

/** Shortest path length from start to exit, picking keys before doors. -1 if none. Ignores slimes and blink timing. */
export function shortestPath(grid: Tile[][], start: [number, number]): number {
  // state: x, y, keys held (0..2), opened mask is approximated by keys count (doors consume keys)
  const doors = new Map<string, number>();
  const keysAt = new Map<string, number>();
  grid.forEach((row, y) => row.forEach((t, x) => {
    if (t === "D") doors.set(key(x, y), doors.size);
    if (t === "K") keysAt.set(key(x, y), keysAt.size);
  }));
  const seen = new Set<string>();
  const sid = (x: number, y: number, km: number, dm: number) => `${x},${y},${km},${dm}`;
  let frontier: [number, number, number, number][] = [[start[0], start[1], 0, 0]];
  seen.add(sid(start[0], start[1], 0, 0));
  for (let dist = 0; frontier.length; dist++) {
    const next: [number, number, number, number][] = [];
    for (const [x, y, km, dm] of frontier) {
      if (grid[y]![x] === "E") return dist;
      for (const d of DIRS) {
        const nx = x + DELTA[d][0];
        const ny = y + DELTA[d][1];
        if (!inside(nx, ny)) continue;
        const t = grid[ny]![nx]!;
        if (t === "#" || t === "^") continue;
        let nk = km;
        let nd = dm;
        const k = keysAt.get(key(nx, ny));
        if (k !== undefined) nk |= 1 << k;
        const di = doors.get(key(nx, ny));
        if (di !== undefined && !(dm & (1 << di))) {
          const held = popcount(nk) - popcount(nd);
          if (held <= 0) continue;
          nd |= 1 << di;
        }
        const s = sid(nx, ny, nk, nd);
        if (seen.has(s)) continue;
        seen.add(s);
        next.push([nx, ny, nk, nd]);
      }
    }
    frontier = next;
  }
  return -1;
}

function popcount(n: number): number {
  let c = 0;
  for (let v = n; v; v &= v - 1) c++;
  return c;
}

function carveMaze(r: () => number): Tile[][] {
  // recursive-backtracker on odd cells, then knock out extra walls for loops
  const g: Tile[][] = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => "#" as Tile));
  const stack: [number, number][] = [[1, 1]];
  g[1]![1] = ".";
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1]!;
    const opts = DIRS.map((d) => [cx + DELTA[d][0] * 2, cy + DELTA[d][1] * 2, DELTA[d][0], DELTA[d][1]] as const)
      .filter(([nx, ny]) => nx > 0 && ny > 0 && nx < COLS - 1 && ny < ROWS - 1 && g[ny]![nx] === "#");
    if (!opts.length) { stack.pop(); continue; }
    const [nx, ny, dx, dy] = opts[Math.floor(r() * opts.length)]!;
    g[cy + dy]![cx + dx] = ".";
    g[ny]![nx] = ".";
    stack.push([nx, ny]);
  }
  // open the border ring a bit and add loops
  for (let k = 0; k < 7; k++) {
    const x = 1 + Math.floor(r() * (COLS - 2));
    const y = 1 + Math.floor(r() * (ROWS - 2));
    g[y]![x] = ".";
  }
  return g;
}

function floorCells(g: Tile[][]): [number, number][] {
  const out: [number, number][] = [];
  g.forEach((row, y) => row.forEach((t, x) => { if (t === ".") out.push([x, y]); }));
  return out;
}

export function swapsFor(index: number): number {
  return index < 3 ? 1 : index < 12 ? 2 : 3;
}
export function hotPatchesFor(index: number): number {
  return index < 8 ? 0 : index < 20 ? 1 : 2;
}

function randomMap(r: () => number, swaps: number): Mapping {
  let m = IDENTITY;
  for (let tries = 0; tries < 50; tries++) {
    m = IDENTITY;
    for (let k = 0; k < swaps; k++) {
      const a = DIRS[Math.floor(r() * 4)]!;
      let b = DIRS[Math.floor(r() * 4)]!;
      if (a === b) b = DIRS[(DIRS.indexOf(a) + 1 + Math.floor(r() * 3)) % 4]!;
      m = swapMap(m, a, b);
    }
    if (patchNote(m).length > 0) return m;
  }
  return swapMap(IDENTITY, "up", "down");
}

export function makeFloor(index: number): Floor {
  const i = Math.max(0, Math.min(FLOOR_COUNT - 1, Math.floor(index)));
  for (let attempt = 0; attempt < 200; attempt++) {
    const r = rng(0xd00d + i * 104729 + attempt * 7);
    const grid = carveMaze(r);
    const cells = floorCells(grid);
    // start top-left area, exit far away
    const start: [number, number] = [1, 1];
    grid[1]![1] = "S";
    let far = cells[0]!;
    let farD = -1;
    for (const c of cells) {
      const d = Math.abs(c[0] - 1) + Math.abs(c[1] - 1);
      if (d > farD) { far = c; farD = d; }
    }
    grid[far[1]]![far[0]] = "E";
    const free = () => {
      const pool = floorCells(grid).filter(([x, y]) => Math.abs(x - 1) + Math.abs(y - 1) > 1 && grid[y]![x] === ".");
      return pool[Math.floor(r() * pool.length)];
    };
    // hazards scale with depth
    const spikes = Math.min(6, 1 + Math.floor(i / 4));
    for (let k = 0; k < spikes; k++) { const c = free(); if (c) grid[c[1]]![c[0]] = i >= 5 && k % 2 ? "~" : "^"; }
    if (i >= 10) {
      const kc = free();
      const dc = free();
      if (kc && dc) { grid[kc[1]]![kc[0]] = "K"; grid[dc[1]]![dc[0]] = "D"; }
    }
    const slimes: Slime[] = [];
    const slimeCount = i < 4 ? 0 : Math.min(3, 1 + Math.floor((i - 4) / 9));
    for (let k = 0; k < slimeCount; k++) {
      const c = free();
      if (!c) continue;
      const horizontal = r() < 0.5;
      slimes.push({ x: c[0], y: c[1], dx: horizontal ? 1 : 0, dy: horizontal ? 0 : 1 });
    }
    const len = shortestPath(grid, start);
    if (len < 6) continue;
    const patches: Patch[] = [{ at: 0, map: randomMap(r, swapsFor(i)) }];
    const hot = hotPatchesFor(i);
    for (let k = 1; k <= hot; k++) patches.push({ at: Math.max(3, Math.round((len * k) / (hot + 1))), map: randomMap(r, swapsFor(i)) });
    return { index: i, grid, start, slimes, patches, par: len + 2 + slimeCount };
  }
  throw new Error("no floor");
}

export function newRun(index: number): RunState {
  const floor = makeFloor(index);
  return {
    floor, status: "ready", x: floor.start[0], y: floor.start[1], hearts: HEARTS, moves: 0, keys: 0,
    opened: [], taken: [], slimes: floor.slimes.map((s) => ({ ...s })), lastHurt: false, lastPatch: false,
  };
}

export function begin(s: RunState): RunState {
  return s.status === "ready" ? { ...s, status: "play" } : s;
}

export function tileAt(s: RunState, x: number, y: number): Tile {
  const t = s.floor.grid[y]?.[x] ?? "#";
  if (t === "D" && s.opened.includes(key(x, y))) return ".";
  if (t === "K" && s.taken.includes(key(x, y))) return ".";
  return t;
}

function blocked(s: RunState, x: number, y: number): boolean {
  if (!inside(x, y)) return true;
  const t = tileAt(s, x, y);
  return t === "#" || (t === "D" && s.keys <= 0);
}

function stepSlimes(s: RunState, px: number, py: number): Slime[] {
  return s.slimes.map((sl) => {
    let { dx, dy } = sl;
    let nx = sl.x + dx;
    let ny = sl.y + dy;
    const bad = (x: number, y: number) => !inside(x, y) || ["#", "D", "E", "K"].includes(tileAt(s, x, y));
    if (bad(nx, ny)) { dx = -dx; dy = -dy; nx = sl.x + dx; ny = sl.y + dy; }
    if (bad(nx, ny)) return { ...sl, dx, dy };
    void px; void py;
    return { x: nx, y: ny, dx, dy };
  });
}

/** Press a direction. The active patch decides where the hero actually goes. */
export function press(s: RunState, pressed: Dir): RunState {
  if (s.status !== "play") return s;
  const before = patchIndex(s.floor, s.moves);
  const dir = activeMap(s.floor, s.moves)[pressed];
  let x = s.x + DELTA[dir][0];
  let y = s.y + DELTA[dir][1];
  let { keys } = s;
  let opened = s.opened;
  let taken = s.taken;
  if (blocked(s, x, y)) { x = s.x; y = s.y; } // bump: still costs a move
  else {
    const t = tileAt(s, x, y);
    if (t === "D") { keys -= 1; opened = [...opened, key(x, y)]; }
    if (t === "K") { keys += 1; taken = [...taken, key(x, y)]; }
  }
  const moves = s.moves + 1;
  const slimes = stepSlimes({ ...s, opened, taken }, x, y);
  let hurt = false;
  if (spikeOn(tileAt({ ...s, opened, taken }, x, y), moves)) hurt = true;
  if (slimes.some((sl) => sl.x === x && sl.y === y) || s.slimes.some((sl, k) => sl.x === x && sl.y === y && slimes[k]!.x === s.x && slimes[k]!.y === s.y)) hurt = true;
  const hearts = s.hearts - (hurt ? 1 : 0);
  let status: Status = "play";
  if (hearts <= 0) status = "lost";
  else if (tileAt({ ...s, opened, taken }, x, y) === "E") status = "won";
  const lastPatch = patchIndex(s.floor, moves) !== before;
  return { ...s, x, y, keys, opened, taken, moves, slimes, hearts, status, lastHurt: hurt, lastPatch };
}

export function stars(s: RunState): number {
  if (s.status !== "won") return 0;
  if (s.hearts === HEARTS && s.moves <= s.floor.par) return 3;
  if (s.moves <= s.floor.par + 4 || s.hearts === HEARTS) return 2;
  return 1;
}
