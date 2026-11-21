/**
 * Trap Stairs (함정 계단) — an original one-minute trap platformer (2026-11-21).
 *
 * Trend basis: troll/trap platformers are among the most played web-portal games,
 * and short "one more try" runs suit browser sessions. Every stage is built from
 * hand-made 12×12 chunks whose left and right edges sit on flat ground, so any
 * chain of chunks is passable. Each chunk hides one trap idea (pop-up spikes,
 * floors that crumble, dropping blocks, blocks that appear when you jump, a door
 * that runs away). Hidden blocks that were revealed stay revealed after a death,
 * so every trap teaches its own answer.
 *
 * 40 stages (stage range 10-50). Pure logic, no DOM.
 */
import { mulberry32 } from "./daily";

export const TRAP_STAGES = 40;
export const TRAP_SLUG = "trap-stairs";
export const CHUNK = 12;
export const ROWS = 12;

// Physics in tiles and seconds.
export const GRAVITY = 40;
export const JUMP_V = 14;
export const BOUNCE_V = 20;
export const RUN_SPEED = 6;
export const MAX_FALL = 18;
export const PLAYER_W = 0.7;
export const PLAYER_H = 0.9;
export const COYOTE = 0.08;
export const JUMP_BUFFER = 0.12;
/** Fake floors give way this long after the player first touches them. */
export const CRUMBLE_DELAY = 0.25;
/** A pop spike rises when the player's centre comes this close horizontally. */
export const POP_RANGE = 1.5;
/** Droppers fall when the player is this far before (or under) them. */
export const DROP_RANGE = 2.5;
export const RUNAWAY_RANGE = 2.5;

interface ChunkDef {
  id: string;
  tier: number;
  kind: "start" | "mid" | "end";
  rows: string[];
}

const SKY = "............";
const GROUND = "############";
const flat = (rows: Record<number, string>, bottom: [string, string] = [GROUND, GROUND]): string[] =>
  Array.from({ length: ROWS }, (_, r) => (r === 10 ? bottom[0] : r === 11 ? bottom[1] : rows[r] ?? SKY));

export const CHUNKS: readonly ChunkDef[] = [
  { id: "start", tier: 0, kind: "start", rows: flat({ 9: ".S.........." }) },
  { id: "flat", tier: 0, kind: "mid", rows: flat({ 9: "............" }) },
  { id: "gap2", tier: 0, kind: "mid", rows: flat({}, ["#####..#####", "#####..#####"]) },
  { id: "steps", tier: 0, kind: "mid", rows: flat({ 8: "......##....", 9: "....######.." }) },
  { id: "spikes", tier: 0, kind: "mid", rows: flat({ 9: ".....^^....." }) },
  { id: "pit3", tier: 1, kind: "mid", rows: flat({}, ["####...#####", "####...#####"]) },
  { id: "pop", tier: 1, kind: "mid", rows: flat({ 9: "......p....." }) },
  { id: "crumble", tier: 1, kind: "mid", rows: flat({}, ["####fff#####", "####...#####"]) },
  { id: "dropper", tier: 1, kind: "mid", rows: flat({ 5: ".......d...." }) },
  { id: "bounce", tier: 1, kind: "mid", rows: flat({ 6: ".......##...", 7: ".......##...", 8: ".......##...", 9: ".....b.##..." }) },
  { id: "bonk", tier: 2, kind: "mid", rows: flat({ 8: ".....hh.....", 9: "......^....." }) },
  { id: "pop-gap", tier: 2, kind: "mid", rows: flat({ 9: ".......p...." }, ["####..######", "####..######"]) },
  { id: "crumble-isle", tier: 3, kind: "mid", rows: flat({}, ["###..fff.###", "###......###"]) },
  { id: "pop-pair", tier: 3, kind: "mid", rows: flat({ 9: "...p...p...." }) },
  { id: "double-drop", tier: 3, kind: "mid", rows: flat({ 4: "....d..d...." }) },
  { id: "spike-roof", tier: 4, kind: "mid", rows: flat({ 6: "....h.......", 9: ".....^^....." }) },
  { id: "drop-crumble", tier: 4, kind: "mid", rows: flat({ 5: "........d..." }, ["###fff######", "###...######"]) },
  { id: "end", tier: 0, kind: "end", rows: flat({ 9: "........E..." }) },
  { id: "end-ledge", tier: 1, kind: "end", rows: flat({ 7: ".........E..", 8: ".......#####", 9: ".......#####" }) },
  { id: "end-runaway", tier: 2, kind: "end", rows: flat({ 9: "..X......E.." }) },
  { id: "end-runaway-up", tier: 3, kind: "end", rows: flat({ 5: "..........X.", 6: ".........###", 9: "......b.E..." }) },
];

export type Cell = "." | "#" | "^" | "p" | "f" | "d" | "h" | "b" | "E" | "X" | "S";

export interface Level {
  stage: number;
  width: number;
  /** grid[row][col] as authored; traps keep their letters, runtime state lives in TrapState. */
  grid: Cell[][];
  chunkIds: string[];
  start: { x: number; y: number };
  exit: { x: number; y: number };
  runaway: { x: number; y: number } | null;
}

function hash(a: number, b: number): number {
  let h = 2166136261 ^ a;
  h = Math.imul(h, 16777619) ^ b;
  return Math.imul(h, 16777619) >>> 0;
}

export function stageTier(stage: number): number {
  return Math.min(4, Math.floor((stage - 1) / 8));
}

export function middleCount(stage: number): number {
  return 1 + Math.floor((stage - 1) / 10);
}

export function buildLevel(stage: number): Level {
  const s = Math.min(Math.max(1, Math.floor(stage)), TRAP_STAGES);
  const rnd = mulberry32(hash(20261121, s));
  const tier = stageTier(s);
  const mids = CHUNKS.filter((c) => c.kind === "mid" && c.tier <= tier);
  const newest = mids.filter((c) => c.tier === tier);
  const chosen: ChunkDef[] = [CHUNKS.find((c) => c.id === "start")!];
  const n = middleCount(s);
  for (let i = 0; i < n; i++) {
    // The stage's newest trap shows up at least once, at a random slot.
    const pool = i === Math.floor(rnd() * n) || (i === n - 1 && !chosen.some((c) => c.tier === tier && c.kind === "mid")) ? newest : mids;
    const prev = chosen[chosen.length - 1].id;
    let pick = pool[Math.floor(rnd() * pool.length)];
    if (pick.id === prev && pool.length > 1) pick = pool[(pool.indexOf(pick) + 1) % pool.length];
    chosen.push(pick);
  }
  const ends = CHUNKS.filter((c) => c.kind === "end" && c.tier <= Math.min(tier, 3));
  chosen.push(ends[Math.floor(rnd() * ends.length)]);

  const width = chosen.length * CHUNK;
  const grid: Cell[][] = Array.from({ length: ROWS }, () => Array<Cell>(width).fill("."));
  let start = { x: 1, y: 9 };
  let exit = { x: width - 3, y: 9 };
  let runaway: Level["runaway"] = null;
  chosen.forEach((chunk, ci) => {
    chunk.rows.forEach((row, r) => {
      for (let c = 0; c < CHUNK; c++) {
        const ch = row[c] as Cell;
        const x = ci * CHUNK + c;
        if (ch === "S") start = { x, y: r };
        else if (ch === "E") exit = { x, y: r };
        else if (ch === "X") runaway = { x, y: r };
        grid[r][x] = ch === "S" || ch === "E" || ch === "X" ? "." : ch;
      }
    });
  });
  return { stage: s, width, grid, chunkIds: chosen.map((c) => c.id), start, exit, runaway };
}

// ─── Runtime ──────────────────────────────────────────────────────────────

export interface Dropper {
  col: number;
  y: number;
  vy: number;
  state: "hang" | "fall" | "landed";
}

export interface TrapState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
  /** True while a player-started jump can still be cut short by releasing the button. */
  jumping: boolean;
  coyote: number;
  buffer: number;
  facing: 1 | -1;
  dead: boolean;
  won: boolean;
  time: number;
  popped: Set<string>;
  crumble: Map<string, number>;
  fallen: Set<string>;
  droppers: Dropper[];
  revealed: Set<string>;
  door: { x: number; y: number };
  doorMoved: boolean;
}

export interface Input {
  left: boolean;
  right: boolean;
  jump: boolean;
  /** True on the frame the jump key went down. */
  jumpPressed: boolean;
}

const key = (r: number, c: number) => `${r},${c}`;

/** A fresh attempt. `revealed` carries hidden blocks found on earlier attempts at this stage. */
export function startAttempt(level: Level, revealed: Set<string> = new Set()): TrapState {
  const droppers: Dropper[] = [];
  level.grid.forEach((row, r) => row.forEach((cell, c) => { if (cell === "d") droppers.push({ col: c, y: r, vy: 0, state: "hang" }); }));
  return {
    x: level.start.x + (1 - PLAYER_W) / 2,
    y: level.start.y + 1 - PLAYER_H,
    vx: 0,
    vy: 0,
    onGround: false,
    jumping: false,
    coyote: 0,
    buffer: 0,
    facing: 1,
    dead: false,
    won: false,
    time: 0,
    popped: new Set(),
    crumble: new Map(),
    fallen: new Set(),
    droppers,
    revealed: new Set(revealed),
    door: { ...level.exit },
    doorMoved: false,
  };
}

/** Whether a grid cell currently blocks movement. */
export function isSolid(level: Level, st: TrapState, r: number, c: number): boolean {
  if (c < 0 || c >= level.width) return true; // world edges are walls
  if (r < 0 || r >= ROWS) return false;
  const cell = level.grid[r][c];
  if (cell === "#") return true;
  if (cell === "f") return !st.fallen.has(key(r, c));
  if (cell === "h") return st.revealed.has(key(r, c));
  return false;
}

function landedDropperAt(st: TrapState, r: number, c: number): boolean {
  return st.droppers.some((d) => d.state === "landed" && d.col === c && Math.round(d.y) === r);
}

function blocked(level: Level, st: TrapState, r: number, c: number): boolean {
  return isSolid(level, st, r, c) || landedDropperAt(st, r, c) || st.droppers.some((d) => d.state === "hang" && d.col === c && Math.floor(d.y) === r);
}

function overlaps(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

const EPS = 1e-4;

export function stepTrap(level: Level, st: TrapState, input: Input, dt: number): TrapState {
  if (st.dead || st.won) return st;
  const s = st;
  s.time += dt;

  // Horizontal intent
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  s.vx = dir * RUN_SPEED;
  if (dir !== 0) s.facing = dir > 0 ? 1 : -1;

  // Jump with coyote time and buffering; releasing early cuts the jump (short hop).
  s.coyote = s.onGround ? COYOTE : Math.max(0, s.coyote - dt);
  s.buffer = input.jumpPressed ? JUMP_BUFFER : Math.max(0, s.buffer - dt);
  if (s.buffer > 0 && s.coyote > 0) {
    s.vy = -JUMP_V;
    s.buffer = 0;
    s.coyote = 0;
    s.onGround = false;
    s.jumping = true;
  }
  if (s.jumping && !input.jump) {
    if (s.vy < -JUMP_V * 0.35) s.vy = -JUMP_V * 0.35;
    s.jumping = false;
  }
  if (s.vy >= 0) s.jumping = false;

  s.vy = Math.min(MAX_FALL, s.vy + GRAVITY * dt);

  // Move X
  let nx = s.x + s.vx * dt;
  const top = Math.floor(s.y + EPS);
  const bottom = Math.floor(s.y + PLAYER_H - EPS);
  if (s.vx > 0) {
    const col = Math.floor(nx + PLAYER_W - EPS);
    for (let r = top; r <= bottom; r++) if (blocked(level, s, r, col)) { nx = col - PLAYER_W; break; }
  } else if (s.vx < 0) {
    const col = Math.floor(nx + EPS);
    for (let r = top; r <= bottom; r++) if (blocked(level, s, r, col)) { nx = col + 1; break; }
  }
  s.x = nx;

  // Move Y
  let ny = s.y + s.vy * dt;
  const left = Math.floor(s.x + EPS);
  const right = Math.floor(s.x + PLAYER_W - EPS);
  s.onGround = false;
  if (s.vy > 0) {
    const row = Math.floor(ny + PLAYER_H - EPS);
    for (let c = left; c <= right; c++) {
      if (blocked(level, s, row, c)) {
        ny = row - PLAYER_H;
        s.vy = 0;
        s.onGround = true;
        // Standing on a fake floor starts its timer.
        if (level.grid[row]?.[c] === "f" && !s.crumble.has(key(row, c))) s.crumble.set(key(row, c), s.time);
      }
    }
  } else if (s.vy < 0) {
    const row = Math.floor(ny + EPS);
    for (let c = left; c <= right; c++) {
      const cell = level.grid[row]?.[c];
      if (cell === "h" && !s.revealed.has(key(row, c))) s.revealed.add(key(row, c));
      if (blocked(level, s, row, c)) {
        ny = row + 1;
        s.vy = 0;
      }
    }
  }
  s.y = ny;

  // Fake floors crumble after the delay.
  for (const [k, t0] of s.crumble) if (!s.fallen.has(k) && s.time - t0 >= CRUMBLE_DELAY) s.fallen.add(k);

  const cx = s.x + PLAYER_W / 2;
  // Pop spikes and droppers trigger by distance.
  for (let c = Math.max(0, Math.floor(cx - POP_RANGE)); c <= Math.min(level.width - 1, Math.floor(cx + POP_RANGE)); c++) {
    for (let r = 0; r < ROWS; r++) {
      if (level.grid[r][c] === "p" && !s.popped.has(key(r, c)) && Math.abs(cx - (c + 0.5)) < POP_RANGE) s.popped.add(key(r, c));
    }
  }
  for (const d of s.droppers) {
    if (d.state === "hang" && cx > d.col + 0.5 - DROP_RANGE && cx < d.col + 1.2 && s.y > d.y) d.state = "fall";
    if (d.state === "fall") {
      d.vy = Math.min(MAX_FALL, d.vy + GRAVITY * dt);
      d.y += d.vy * dt;
      const below = Math.floor(d.y + 1 - EPS);
      if (isSolid(level, s, below, d.col) || landedDropperAt(s, below, d.col)) {
        d.y = below - 1;
        d.state = "landed";
      }
      if (overlaps(s.x, s.y, PLAYER_W, PLAYER_H, d.col, d.y, 1, 1)) s.dead = true;
    }
    if (d.y > ROWS + 2) d.state = "landed";
  }

  // Bounce pads
  if (s.vy >= 0) {
    for (let c = left; c <= right; c++) {
      const r = Math.floor(s.y + PLAYER_H - EPS);
      if (level.grid[r]?.[c] === "b" && s.y + PLAYER_H > r + 0.5) {
        s.vy = -BOUNCE_V;
        s.onGround = false;
        s.jumping = false;
      }
    }
  }

  // Spikes: the top 40 % of the cell is safe so a low hop can clear them.
  for (let r = Math.floor(s.y); r <= Math.floor(s.y + PLAYER_H); r++) {
    for (let c = Math.floor(s.x); c <= Math.floor(s.x + PLAYER_W); c++) {
      const cell = level.grid[r]?.[c];
      const live = cell === "^" || (cell === "p" && s.popped.has(key(r, c)));
      if (live && overlaps(s.x, s.y, PLAYER_W, PLAYER_H, c + 0.15, r + 0.4, 0.7, 0.6)) s.dead = true;
    }
  }

  if (s.y > ROWS + 1) s.dead = true;

  // The door may run away once.
  if (level.runaway && !s.doorMoved && Math.abs(cx - (s.door.x + 0.5)) < RUNAWAY_RANGE) {
    s.door = { ...level.runaway };
    s.doorMoved = true;
  } else if (overlaps(s.x, s.y, PLAYER_W, PLAYER_H, s.door.x + 0.2, s.door.y, 0.6, 1)) {
    s.won = true;
  }
  return s;
}

/** Score for the shared records: 100 per stage cleared, minus deaths on the last clear (never below 1). */
export function trapScore(clearedCount: number, deaths: number): number {
  return Math.max(1, clearedCount * 100 - Math.min(99, deaths));
}
