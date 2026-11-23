/**
 * 곶감 모빌 (Gotgam Mobile) — an OIYO original balance puzzle from a Seollal-eve veranda.
 * Persimmons are drying under the eaves on bamboo rods hung from strings. Drag each persimmon from
 * the basket onto a hook so every rod hangs level: weight × distance must match on both sides.
 * Big persimmons weigh 3, medium 2, small 1. Later rods hang from other rods, some persimmons are
 * already tied on, and magpies sit on hooks you can't use. Every puzzle is built from a real answer.
 */

import { mulberry } from "./pixel-kit";

export const GOTGAM_SLUG = "gotgam-mobile";
export const STAGE_COUNT = 30;

export interface Rod {
  id: number;
  hooks: number[]; // hook positions along the rod (negative = left)
  parent: null | { rod: number; pos: number }; // the hook this rod hangs from
}

export interface Fruit {
  id: number;
  w: number; // 1 small, 2 medium, 3 big
}

export interface GotgamPuzzle {
  stage: number;
  rods: Rod[];
  fruits: Fruit[];
  locked: Record<number, string>; // fruit id -> hook key, tied on from the start
  blocked: string[]; // hook keys with a magpie on them
  answer: Record<number, string>; // fruit id -> hook key
}

export const hookKey = (rod: number, pos: number): string => `${rod}:${pos}`;
export function parseKey(k: string): { rod: number; pos: number } {
  const [r, p] = k.split(":").map(Number);
  return { rod: r, pos: p };
}

/** Hooks a persimmon could go on (not holding a rod, not blocked). */
export function freeHooks(p: GotgamPuzzle): string[] {
  const taken = new Set(p.rods.filter((r) => r.parent).map((r) => hookKey(r.parent!.rod, r.parent!.pos)));
  const out: string[] = [];
  for (const r of p.rods) for (const pos of r.hooks) {
    const k = hookKey(r.id, pos);
    if (!taken.has(k) && !p.blocked.includes(k)) out.push(k);
  }
  return out;
}

/** Torque on each rod (0 = level) for a placement; also the load each rod carries. */
export function torques(p: GotgamPuzzle, place: Record<number, string | null>): { torque: number[]; load: number[] } {
  const load = p.rods.map(() => 0);
  const torque = p.rods.map(() => 0);
  const at = new Map<string, number>();
  for (const f of p.fruits) {
    const k = place[f.id];
    if (k) at.set(k, (at.get(k) ?? 0) + f.w);
  }
  // children before parents: rods are listed parent-first, so walk backwards
  for (let i = p.rods.length - 1; i >= 0; i--) {
    const r = p.rods[i];
    for (const pos of r.hooks) {
      let w = at.get(hookKey(r.id, pos)) ?? 0;
      for (const c of p.rods) if (c.parent && c.parent.rod === r.id && c.parent.pos === pos) w += load[c.id];
      load[r.id] += w;
      torque[r.id] += w * pos;
    }
  }
  return { torque, load };
}

function shape(stage: number): { rods: Rod[]; n: number; maxW: number; locks: number; birds: number } {
  const main = (hooks: number[]): Rod => ({ id: 0, hooks, parent: null });
  if (stage < 5) return { rods: [main([-3, -2, -1, 1, 2, 3])], n: 2 + Math.floor(stage / 2), maxW: stage < 2 ? 2 : 3, locks: 0, birds: 0 };
  if (stage < 15) return { rods: [main([-3, -2, -1, 1, 2, 3])], n: Math.min(5, 4 + Math.floor((stage - 5) / 4)), maxW: 3, locks: stage >= 8 ? 1 : 0, birds: stage >= 11 ? 1 : 0 };
  if (stage < 25) {
    const side = stage % 2 ? 2 : -2;
    return {
      rods: [main([-3, -2, -1, 1, 2, 3]), { id: 1, hooks: [-2, -1, 1, 2], parent: { rod: 0, pos: side } }],
      n: Math.min(7, 5 + Math.floor((stage - 15) / 4)),
      maxW: 3,
      locks: 1,
      birds: stage >= 20 ? 1 : 0,
    };
  }
  return {
    rods: [main([-3, -2, -1, 1, 2, 3]), { id: 1, hooks: [-2, -1, 1, 2], parent: { rod: 0, pos: -3 } }, { id: 2, hooks: [-2, -1, 1, 2], parent: { rod: 0, pos: 2 } }],
    n: stage < 28 ? 7 : 8,
    maxW: 3,
    locks: 1,
    birds: 1,
  };
}

export function buildPuzzle(stage: number): GotgamPuzzle {
  const sh = shape(stage);
  const rng = mulberry(9100 + stage * 67);
  for (let attempt = 0; attempt < 400000; attempt++) {
    const fruits: Fruit[] = Array.from({ length: sh.n }, (_, id) => ({ id, w: 1 + Math.floor(rng() * sh.maxW) }));
    const base: GotgamPuzzle = { stage, rods: sh.rods, fruits, locked: {}, blocked: [], answer: {} };
    const hooks = freeHooks(base);
    if (hooks.length < sh.n + sh.birds) throw new Error(`not enough hooks for stage ${stage}`);
    // shuffle hooks and hang the fruits on the first n
    for (let i = hooks.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [hooks[i], hooks[j]] = [hooks[j], hooks[i]];
    }
    const answer: Record<number, string> = {};
    fruits.forEach((f, i) => (answer[f.id] = hooks[i]));
    const { torque, load } = torques(base, answer);
    if (torque.some((t) => t !== 0)) continue;
    if (load.some((l) => l === 0)) continue; // every rod must carry something
    // avoid dull answers where both sides are mirror copies
    const sides = new Set(Object.values(answer).map((k) => Math.sign(parseKey(k).pos)));
    if (sides.size < 2) continue;
    const weights = new Set(fruits.map((f) => f.w));
    if (stage >= 3 && weights.size < 2) continue;
    const blocked = hooks.slice(sh.n, sh.n + sh.birds);
    const locked: Record<number, string> = {};
    for (let k = 0; k < sh.locks; k++) locked[fruits[k].id] = answer[fruits[k].id];
    return { stage, rods: sh.rods, fruits, locked, blocked, answer };
  }
  throw new Error(`no gotgam puzzle for stage ${stage}`);
}

export const PUZZLES: GotgamPuzzle[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildPuzzle(i));

export interface GotgamBoard {
  puzzle: GotgamPuzzle;
  place: Record<number, string | null>;
  moves: number;
}

export function newBoard(p: GotgamPuzzle): GotgamBoard {
  const place: Record<number, string | null> = {};
  for (const f of p.fruits) place[f.id] = p.locked[f.id] ?? null;
  return { puzzle: p, place, moves: 0 };
}

/** Hang fruit `id` on hook `key` (null = back to the basket). A fruit already there swaps back to the basket. */
export function hang(b: GotgamBoard, id: number, key: string | null): boolean {
  const p = b.puzzle;
  if (p.locked[id] !== undefined) return false;
  if (key !== null && !freeHooks(p).includes(key)) return false;
  if (b.place[id] === key) return false;
  if (key !== null) for (const f of p.fruits) if (b.place[f.id] === key) {
    if (p.locked[f.id] !== undefined) return false;
    b.place[f.id] = null;
  }
  b.place[id] = key;
  b.moves++;
  return true;
}

export function solved(b: GotgamBoard): boolean {
  if (b.puzzle.fruits.some((f) => !b.place[f.id])) return false;
  return torques(b.puzzle, b.place).torque.every((t) => t === 0);
}

/** Number of free fruits: hanging each once is the least number of moves. */
export function par(p: GotgamPuzzle): number {
  return p.fruits.filter((f) => p.locked[f.id] === undefined).length;
}

export function starsFor(moves: number, p: GotgamPuzzle): number {
  const n = par(p);
  if (moves <= n + 2) return 3;
  if (moves <= n * 2 + 3) return 2;
  return 1;
}
