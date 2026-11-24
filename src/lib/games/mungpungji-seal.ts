/**
 * Mungpungji Seal (문풍지 바르기) — find the drafts in the paper door and seal them before the room goes cold.
 *
 * A hanok's sliding doors are wooden lattices covered in hanji paper. In winter, cold wind finds every tiny
 * gap, and families paste strips of paper (문풍지) over the cracks. The gaps are too small to see, but you can
 * feel them: frost gathers on the paper around a draft, thickest right next to it. Read the frost, tap a
 * patch to paste paper there, and stop each draft before the room's warmth runs out. Paper is limited, and
 * frost from two drafts close together can fool you. Later, gusts tear new gaps while you work.
 *
 * Pure and deterministic: drafts are seeded per stage.
 */

export const MUNGPUNGJI_SLUG = "mungpungji-seal";
export const STAGE_COUNT = 30;
export const COLS = 6;
export const ROWS = 8;
export const PASTE = 0.6; // s a patch takes to paste
export const WARMTH = 100;

export interface Draft { cell: number; strength: number; at: number } // opens at time `at`
export interface MungStage {
  stage: number;
  drafts: Draft[];
  spread: number; // cells: frost falls off as exp(-(d/spread)²)
  shades: number; // how many frost shades the eye can tell apart
  paper: number;
  drain: number; // warmth lost per second per open draft
  par: number; // s the perfect sealer takes
}

export interface Room {
  stage: MungStage;
  t: number;
  warmth: number;
  sealed: boolean[]; // per draft
  patched: Set<number>; // cells covered
  paperLeft: number;
  busyUntil: number;
  wasted: number;
  over: boolean;
  won: boolean;
  fail: "" | "cold" | "paper";
}

export const cellXY = (i: number) => ({ c: i % COLS, r: Math.floor(i / COLS) });

export function openDrafts(room: Room): Draft[] {
  return room.stage.drafts.filter((d, k) => !room.sealed[k] && d.at <= room.t);
}

/** True frost on a cell: the sum of every open draft's chill, falling off with distance. */
export function frost(room: Room, cell: number): number {
  const a = cellXY(cell);
  let f = 0;
  for (const d of openDrafts(room)) {
    const b = cellXY(d.cell);
    const dist2 = (a.c - b.c) ** 2 + (a.r - b.r) ** 2;
    f += d.strength * Math.exp(-dist2 / (room.stage.spread * room.stage.spread));
  }
  return f;
}

/** The frost as the eye reads it: one of a few shades (0 = clear). */
export function shade(room: Room, cell: number): number {
  const f = frost(room, cell);
  return Math.min(room.stage.shades, Math.floor((f / 1.2) * room.stage.shades));
}

export function newRoom(stage: MungStage): Room {
  return { stage, t: 0, warmth: WARMTH, sealed: stage.drafts.map(() => false), patched: new Set(), paperLeft: stage.paper, busyUntil: 0, wasted: 0, over: false, won: false, fail: "" };
}

export type PasteResult = "sealed" | "wasted" | "busy" | null;

export function paste(room: Room, cell: number): PasteResult {
  if (room.over || room.patched.has(cell)) return null;
  if (room.t < room.busyUntil) return "busy";
  if (room.paperLeft <= 0) return null;
  room.paperLeft--;
  room.patched.add(cell);
  room.busyUntil = room.t + PASTE;
  let hit = false;
  room.stage.drafts.forEach((d, k) => {
    if (!room.sealed[k] && d.cell === cell && d.at <= room.t) {
      room.sealed[k] = true;
      hit = true;
    }
  });
  if (!hit) room.wasted++;
  check(room);
  return hit ? "sealed" : "wasted";
}

function check(room: Room): void {
  if (room.over) return;
  const allOpened = room.stage.drafts.every((d) => d.at <= room.t);
  if (allOpened && room.sealed.every(Boolean)) {
    room.over = true;
    room.won = true;
  } else if (room.paperLeft <= 0 && room.sealed.some((s, k) => !s && room.stage.drafts[k].cell !== -1)) {
    // a draft still open (or still to come) and no paper left
    room.over = true;
    room.fail = "paper";
  }
}

export interface RoomEvents { opened: number[]; end: boolean }

export function stepRoom(room: Room, dt: number): RoomEvents {
  const ev: RoomEvents = { opened: [], end: false };
  if (room.over) return ev;
  const before = room.t;
  room.t += dt;
  room.stage.drafts.forEach((d, k) => {
    if (d.at > before && d.at <= room.t) {
      // a gust tears a draft; a cell already papered over doesn't tear
      if (room.patched.has(d.cell)) room.sealed[k] = true;
      else ev.opened.push(d.cell);
    }
  });
  room.warmth -= openDrafts(room).reduce((s, d) => s + d.strength, 0) * room.stage.drain * dt;
  if (room.warmth <= 0) {
    room.warmth = 0;
    room.over = true;
    room.fail = "cold";
  } else check(room);
  ev.end = room.over;
  return ev;
}

export function starsFor(room: Room): number {
  if (!room.won) return 0;
  if (room.wasted === 0 && room.warmth >= 60) return 3;
  if (room.wasted <= 1 && room.warmth >= 35) return 2;
  return 1;
}

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface PilotOpts {
  /** s from one paste being done to choosing the next */
  think?: number;
  /** "read" pastes where the frost (as shades) peaks; "true" knows where the drafts are; "random" guesses */
  mode?: "read" | "true" | "random";
  /** chance a shade is misjudged by one step either way */
  misread?: number;
  seed?: number;
}

/**
 * Autopilot. "read" looks only at the shades a player sees: it pastes on the darkest cell, preferring the
 * one whose neighbours are darkest too (a draft sits in the middle of its frost), skipping papered cells.
 */
export function pilot(stage: MungStage, opts: PilotOpts = {}): Room {
  const { think = 0, mode = "read", seed = 1, misread = 0 } = opts;
  const rng = mulberry(seed);
  const room = newRoom(stage);
  const dt = 1 / 30;
  let next = 0;
  while (!room.over && room.t < 600) {
    if (room.t >= next && room.t >= room.busyUntil) {
      let pick = -1;
      if (mode === "true") {
        const k = room.stage.drafts.findIndex((d, j) => !room.sealed[j] && d.at <= room.t);
        if (k >= 0) pick = room.stage.drafts[k].cell;
      } else if (mode === "random") {
        if (openDrafts(room).length > 0) {
          const free = Array.from({ length: COLS * ROWS }, (_, i) => i).filter((i) => !room.patched.has(i));
          pick = free[Math.floor(rng() * free.length)];
        }
      } else {
        let best = 0;
        // the shades as this player sees them this time (a few misjudged by a step)
        const seen = Array.from({ length: COLS * ROWS }, (_, i) => {
          const s = shade(room, i);
          if (s === 0 || rng() >= misread) return s;
          return Math.max(1, s + (rng() < 0.5 ? -1 : 1));
        });
        for (let i = 0; i < COLS * ROWS; i++) {
          if (room.patched.has(i)) continue;
          const s = seen[i];
          if (s === 0) continue;
          const { c, r } = cellXY(i);
          let around = 0;
          for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const cc = c + dc;
            const rr = r + dr;
            if (cc >= 0 && cc < COLS && rr >= 0 && rr < ROWS) around += seen[rr * COLS + cc];
          }
          const score = s * 10 + around;
          if (score > best) {
            best = score;
            pick = i;
          }
        }
      }
      if (pick >= 0) {
        paste(room, pick);
        next = room.busyUntil + think;
      }
    }
    stepRoom(room, dt);
  }
  return room;
}

function shape(stage: number) {
  return {
    drafts: 2 + Math.floor(stage / 5),
    late: Math.floor(stage / 8), // drafts that a gust tears later
    spread: 1.1 + stage * 0.02,
    shades: Math.max(4, 6 - Math.floor(stage / 8)),
    spare: Math.max(2, 4 - Math.floor(stage / 8)),
    drain: 2.4 + stage * 0.06,
  };
}

/** Human-like sealers used to check a room is fair: they take a moment to read the frost between patches. */
export const HUMAN_SEALERS: PilotOpts[] = [1, 2, 3, 4].map((seed) => ({ think: 1.3, misread: 0.12, seed }));

function layout(stage: number, attempt: number): MungStage {
  const sh = shape(stage);
  const rng = mulberry(81700 + stage * 61 + attempt * 7919);
  const cells: number[] = [];
  while (cells.length < sh.drafts) {
    const i = Math.floor(rng() * COLS * ROWS);
    // keep drafts a little apart so each one's frost peak is its own (not always: two can still sit close)
    if (cells.every((j) => Math.abs((j % COLS) - (i % COLS)) + Math.abs(Math.floor(j / COLS) - Math.floor(i / COLS)) >= 2)) cells.push(i);
  }
  const drafts: Draft[] = cells.map((cell, k) => ({
    cell,
    strength: 0.7 + rng() * 0.5,
    at: k < sh.drafts - sh.late ? 0 : 4 + k * 3 + rng() * 4,
  }));
  return { stage, drafts, spread: sh.spread, shades: sh.shades, paper: sh.drafts + sh.spare, drain: sh.drain, par: 0 };
}

/** Lays drafts out until the frost can be read: human-like sealers reading the shades must all win. */
export function buildStage(stage: number): MungStage {
  for (let attempt = 0; attempt < 120; attempt++) {
    const st = layout(stage, attempt);
    if (HUMAN_SEALERS.filter((o) => pilot(st, o).won).length < 3) continue;
    const best = pilot(st, { mode: "true" });
    st.par = Math.ceil(best.t);
    return st;
  }
  throw new Error(`mungpungji-seal stage ${stage + 1}: no readable room`);
}

export const MUNG_STAGES: MungStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
