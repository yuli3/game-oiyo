/**
 * Screw Jam (나사 풀기) — an OIYO original screw-sorting puzzle (2026-11-24).
 *
 * Wooden plates are screwed down on top of one another. Tap a screw to take it out — but only if no plate above
 * covers it. Each screw goes into a box of its own colour waiting at the top; a full box of three is carted off and
 * the next one slides in. A screw with no box of its colour waiting goes into the spare tray, and when the tray is
 * full you are stuck. When a plate's last screw comes out, the plate drops away and the screws under it come free.
 * Empty the board.
 *
 * Pure and deterministic: every board and its line of boxes are seeded per stage.
 */

export const SCREW_SLUG = "screw-jam";
export const STAGE_COUNT = 30;
export const BOX_SIZE = 3;
export const ACTIVE_BOXES = 2;

export interface Plate { x: number; y: number; w: number; h: number; layer: number }
export interface Screw { x: number; y: number; plate: number; colour: number }
export interface ScrewStage {
  stage: number;
  plates: Plate[];
  screws: Screw[];
  boxes: number[]; // box colours in the order they arrive
  tray: number; // spare tray size
  colours: number;
  best: number; // the fewest tray places a full answer needs
}

export interface Bench {
  stage: ScrewStage;
  out: boolean[]; // screws taken out
  fallen: boolean[]; // plates dropped
  active: Array<{ colour: number; filled: number } | null>; // boxes waiting
  nextBox: number;
  tray: number[]; // colours in the spare tray
  most: number; // the most screws the tray has held at once
  moves: number;
  over: boolean;
  won: boolean;
}

export function newBench(stage: ScrewStage): Bench {
  const b: Bench = { stage, out: stage.screws.map(() => false), fallen: stage.plates.map(() => false), active: [], nextBox: 0, tray: [], most: 0, moves: 0, over: false, won: false };
  for (let k = 0; k < ACTIVE_BOXES; k++) b.active.push(takeBox(b));
  return b;
}

function takeBox(b: Bench): { colour: number; filled: number } | null {
  if (b.nextBox >= b.stage.boxes.length) return null;
  return { colour: b.stage.boxes[b.nextBox++], filled: 0 };
}

const covers = (p: Plate, s: Screw) => s.x > p.x - 4 && s.x < p.x + p.w + 4 && s.y > p.y - 4 && s.y < p.y + p.h + 4;

/** Whether a plate above (not fallen) covers this screw. */
export function blocked(b: Bench, i: number): boolean {
  const s = b.stage.screws[i];
  const own = b.stage.plates[s.plate];
  return b.stage.plates.some((p, k) => !b.fallen[k] && k !== s.plate && p.layer > own.layer && covers(p, s));
}

export const free = (b: Bench, i: number) => !b.out[i] && !blocked(b, i);

/** Moves screws from the tray into a box of their colour while there is room. */
function settle(b: Bench): void {
  let moved = true;
  while (moved) {
    moved = false;
    for (let k = 0; k < b.active.length; k++) {
      const box = b.active[k];
      if (!box) continue;
      const t = b.tray.indexOf(box.colour);
      if (t >= 0 && box.filled < BOX_SIZE) {
        b.tray.splice(t, 1);
        box.filled++;
        moved = true;
      }
      if (box.filled >= BOX_SIZE) {
        b.active[k] = takeBox(b);
        moved = true;
      }
    }
  }
}

export type UnscrewResult = "boxed" | "tray" | "stuck" | null;

export function unscrew(b: Bench, i: number): UnscrewResult {
  if (b.over || i < 0 || i >= b.out.length || b.out[i]) return null;
  if (blocked(b, i)) return "stuck";
  const s = b.stage.screws[i];
  b.out[i] = true;
  b.moves++;
  let result: UnscrewResult = "tray";
  const box = b.active.find((x) => x && x.colour === s.colour && x.filled < BOX_SIZE);
  if (box) {
    box.filled++;
    result = "boxed";
  } else {
    b.tray.push(s.colour);
    b.most = Math.max(b.most, b.tray.length);
  }
  // a plate with no screws left drops away
  const p = s.plate;
  if (b.stage.screws.every((x, k) => x.plate !== p || b.out[k])) b.fallen[p] = true;
  settle(b);
  if (b.out.every(Boolean) && b.tray.length === 0) {
    b.over = true;
    b.won = true;
  } else if (b.tray.length > b.stage.tray) {
    b.over = true;
  } else if (!b.out.some((_, k) => free(b, k))) b.over = true;
  return result;
}

/** Stars from the most screws the tray held at once, against the fewest a full answer needs. */
export function starsFor(b: Bench): number {
  if (!b.won) return 0;
  if (b.most <= b.stage.best) return 3;
  if (b.most <= b.stage.best + 1) return 2;
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

/** Fisher–Yates, the only shuffle used here. */
function shuffle<T>(xs: T[], rng: () => number): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cloneBench(b: Bench): Bench {
  return { ...b, out: b.out.slice(), fallen: b.fallen.slice(), active: b.active.map((x) => (x ? { ...x } : null)), tray: b.tray.slice() };
}

/** A full answer by search (taking the most promising screws first), or null if none is found within the budget. */
export function solve(st: ScrewStage, budget = 20000): number[] | null {
  const seen = new Set<string>();
  let nodes = 0;
  const path: number[] = [];
  const go = (b: Bench): boolean => {
    if (b.won) return true;
    if (b.over || ++nodes > budget) return false;
    const key = b.out.map((x) => (x ? 1 : 0)).join("");
    if (seen.has(key)) return false;
    seen.add(key);
    const freeNow = st.screws.map((_, i) => i).filter((i) => free(b, i)).sort((x, y) => score(b, y) - score(b, x));
    for (const i of freeNow) {
      const nb = cloneBench(b);
      unscrew(nb, i);
      path.push(i);
      if (go(nb)) return true;
      path.pop();
    }
    return false;
  };
  return go(newBench(st)) ? path.slice() : null;
}

export interface FixerOpts {
  /** chance to take some free screw rather than the best one */
  slip?: number;
  seed?: number;
  /** "solve" searches for a full answer; "plan" boxes screws when it can and frees plates; "random" takes any free screw */
  mode?: "solve" | "plan" | "random";
}

/** How good a free screw is to take now: into a waiting box first, then one that drops a plate. */
function score(b: Bench, i: number): number {
  const s = b.stage.screws[i];
  let v = 0;
  if (b.active.some((x) => x && x.colour === s.colour && x.filled < BOX_SIZE)) v += 10;
  const left = b.stage.screws.filter((x, k) => x.plate === s.plate && !b.out[k]).length;
  if (left === 1) v += 3;
  // a colour that is coming soon is less bad to tray
  const soon = b.stage.boxes.slice(b.nextBox, b.nextBox + 2).includes(s.colour);
  if (soon) v += 1;
  return v;
}

export function pilot(st: ScrewStage, opts: FixerOpts = {}): Bench {
  const { slip = 0, seed = 1, mode = "plan" } = opts;
  const rng = mulberry(seed * 3989 + 5);
  const b = newBench(st);
  if (mode === "solve") {
    for (const i of solve({ ...st, tray: st.best }) ?? []) unscrew(b, i);
    return b;
  }
  for (let guard = 0; guard < 500 && !b.over; guard++) {
    const freeNow = st.screws.map((_, i) => i).filter((i) => free(b, i));
    if (!freeNow.length) break;
    let pick: number;
    if (mode === "random" || rng() < slip) pick = shuffle(freeNow, rng)[0];
    else {
      const ranked = shuffle(freeNow, rng).sort((x, y) => score(b, y) - score(b, x));
      pick = ranked[0];
    }
    unscrew(b, pick);
  }
  return b;
}

function shape(stage: number) {
  return {
    plates: 4 + Math.floor(stage / 4),
    colours: Math.min(6, 3 + Math.floor(stage / 7)),
    tray: 4,
  };
}

/** Human-like fixers used to check a board: they go for the obvious screw but slip now and then. */
export const HUMAN_FIXERS: FixerOpts[] = [1, 2, 3, 4, 5, 6].map((seed) => ({ slip: 0.1, seed }));

export function layout(stage: number, attempt: number): ScrewStage | null {
  const sh = shape(stage);
  const rng = mulberry(271000 + stage * 179 + attempt * 7919);
  // plates scattered over the board, each one above the last
  const plates: Plate[] = [];
  for (let k = 0; k < sh.plates; k++) {
    const w = 90 + Math.floor(rng() * 110);
    const h = 60 + Math.floor(rng() * 90);
    plates.push({ x: 20 + Math.floor(rng() * (320 - w)), y: 130 + Math.floor(rng() * (300 - h)), w, h, layer: k });
  }
  // two to four screws in each plate, kept apart
  const screws: Screw[] = [];
  plates.forEach((p, k) => {
    const n = 2 + Math.floor(rng() * 3);
    for (let tries = 0, made = 0; tries < 40 && made < n; tries++) {
      const s = { x: p.x + 14 + rng() * (p.w - 28), y: p.y + 14 + rng() * (p.h - 28), plate: k, colour: -1 };
      if (screws.some((o) => Math.hypot(o.x - s.x, o.y - s.y) < 26)) continue;
      screws.push(s);
      made++;
    }
  });
  // round the count down to whole boxes by dropping screws from plates that keep at least one
  while (screws.length % BOX_SIZE !== 0) {
    const k = screws.findIndex((s) => screws.filter((o) => o.plate === s.plate).length > 1);
    if (k < 0) return null;
    screws.splice(k, 1);
  }
  // colours: whole boxes of each, dealt out at random; the boxes come in a shuffled order
  const st: ScrewStage = { stage, plates, screws, boxes: [], tray: sh.tray, colours: sh.colours, best: sh.tray };
  const nBoxes = screws.length / BOX_SIZE;
  const boxColours = Array.from({ length: nBoxes }, (_, k) => k % sh.colours);
  const dealt = shuffle(boxColours.flatMap((c) => [c, c, c]), rng);
  screws.forEach((s, i) => (s.colour = dealt[i]));
  st.boxes = shuffle(boxColours, rng);
  return st;
}

/** Lays boards out until human-like fixers can empty them and random unscrewing jams the tray. */
export function buildStage(stage: number): ScrewStage {
  for (let attempt = 0; attempt < 2000; attempt++) {
    const st = layout(stage, attempt);
    if (!st) continue;
    // the fewest tray places that still let the board be emptied
    let best = -1;
    for (let cap = 0; cap <= st.tray && best < 0; cap++) if (solve({ ...st, tray: cap })) best = cap;
    if (best < 0) continue;
    st.best = best;
    if (HUMAN_FIXERS.filter((o) => pilot(st, o).won).length < 4) continue;
    if ([1, 2, 3].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    return st;
  }
  throw new Error(`screw-jam stage ${stage + 1}: no fair board`);
}

export const SCREW_STAGES: ScrewStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
