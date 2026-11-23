/**
 * 세배 줄 서기 (New Year Bow Line-up) — an OIYO original logic puzzle for Seollal morning.
 * The family lines up in a row for the New Year's bow, and everyone has an opinion about where they
 * stand. Read the clues and drag each person into a spot. Every line-up has exactly one answer.
 */

import { mulberry } from "./pixel-kit";

export const SEBAE_SLUG = "sebae-line";
export const FAMILY = 8; // grandpa, grandma, dad, mom, uncle, aunt, sister, little brother

export type Clue =
  | { kind: "pos"; a: number; k: number }
  | { kind: "notPos"; a: number; k: number }
  | { kind: "end"; a: number }
  | { kind: "notEnd"; a: number }
  | { kind: "left"; a: number; b: number }
  | { kind: "adj"; a: number; b: number }
  | { kind: "notAdj"; a: number; b: number }
  | { kind: "dirLeft"; a: number; b: number }
  | { kind: "gap1"; a: number; b: number }
  | { kind: "between"; a: number; b: number; c: number };

export interface Puzzle { index: number; size: number; people: number[]; clues: Clue[]; answer: number[] }

export const STAGE_COUNT = 30;

export function sizeFor(i: number): number {
  if (i < 5) return 4;
  if (i < 10) return 5;
  if (i < 16) return 6;
  if (i < 23) return 7;
  return 8;
}

/** `pos[p]` is the spot (0-based) of person p, or -1 when not placed. */
export function clueStatus(c: Clue, pos: ReadonlyMap<number, number>, size: number): "ok" | "bad" | "open" {
  const get = (p: number) => (pos.has(p) ? pos.get(p)! : -1);
  const a = get(c.a);
  if (a < 0) return "open";
  const ok = (v: boolean) => (v ? "ok" : "bad");
  switch (c.kind) {
    case "pos": return ok(a === c.k);
    case "notPos": return ok(a !== c.k);
    case "end": return ok(a === 0 || a === size - 1);
    case "notEnd": return ok(a !== 0 && a !== size - 1);
    default: break;
  }
  const b = get(c.b);
  if (b < 0) return "open";
  switch (c.kind) {
    case "left": return ok(a < b);
    case "adj": return ok(Math.abs(a - b) === 1);
    case "notAdj": return ok(Math.abs(a - b) !== 1);
    case "dirLeft": return ok(b - a === 1);
    case "gap1": return ok(Math.abs(a - b) === 2);
    case "between": {
      const cc = get(c.c);
      if (cc < 0) return "open";
      return ok((b < a && a < cc) || (cc < a && a < b));
    }
    default: return "open";
  }
}

/** Fast check against a position table: `at(p)` is the spot of person p. */
function check(c: Clue, at: (p: number) => number, size: number): boolean {
  const a = at(c.a);
  switch (c.kind) {
    case "pos": return a === c.k;
    case "notPos": return a !== c.k;
    case "end": return a === 0 || a === size - 1;
    case "notEnd": return a !== 0 && a !== size - 1;
    case "left": return a < at(c.b);
    case "adj": return Math.abs(a - at(c.b)) === 1;
    case "notAdj": return Math.abs(a - at(c.b)) !== 1;
    case "dirLeft": return at(c.b) - a === 1;
    case "gap1": return Math.abs(a - at(c.b)) === 2;
    case "between": {
      const b = at(c.b);
      const cc = at(c.c);
      return (b < a && a < cc) || (cc < a && a < b);
    }
    default: return false;
  }
}

function holds(c: Clue, perm: readonly number[], size: number): boolean {
  return check(c, (p) => perm.indexOf(p), size);
}

function permutations(items: number[]): number[][] {
  if (items.length <= 1) return [items.slice()];
  const out: number[][] = [];
  items.forEach((x, i) => {
    const rest = items.slice(0, i).concat(items.slice(i + 1));
    for (const p of permutations(rest)) out.push([x, ...p]);
  });
  return out;
}

/** Position table for every permutation: table[i * FAMILY + person] = spot. */
function table(perms: number[][]): Int8Array {
  const t = new Int8Array(perms.length * FAMILY).fill(-1);
  perms.forEach((perm, i) => perm.forEach((p, k) => (t[i * FAMILY + p] = k)));
  return t;
}

function mask(c: Clue, t: Int8Array, count: number, size: number): Uint8Array {
  const m = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    const base = i * FAMILY;
    m[i] = check(c, (p) => t[base + p], size) ? 1 : 0;
  }
  return m;
}

function allowedKinds(size: number): Clue["kind"][] {
  const k: Clue["kind"][] = ["end", "left", "adj", "notAdj"];
  if (size >= 5) k.push("dirLeft", "notEnd");
  if (size >= 6) k.push("gap1", "notPos");
  if (size >= 7) k.push("between");
  return k;
}

function trueClues(answer: number[], size: number, index: number): Clue[] {
  const kinds = new Set(allowedKinds(size));
  const out: Clue[] = [];
  const spot = new Map<number, number>();
  answer.forEach((p, i) => spot.set(p, i));
  const people = answer.slice();
  for (const a of people) {
    // pinning someone to a spot gets rarer as the puzzles grow
    if (index < 12 || index % 3 === 0) out.push({ kind: "pos", a, k: spot.get(a)! });
    for (let k = 0; k < size; k++) if (kinds.has("notPos") && k !== spot.get(a)) out.push({ kind: "notPos", a, k });
    if (kinds.has("end")) out.push({ kind: "end", a });
    if (kinds.has("notEnd")) out.push({ kind: "notEnd", a });
    for (const b of people) {
      if (a === b) continue;
      if (kinds.has("left")) out.push({ kind: "left", a, b });
      if (a < b && kinds.has("adj")) out.push({ kind: "adj", a, b });
      if (a < b && kinds.has("notAdj")) out.push({ kind: "notAdj", a, b });
      if (kinds.has("dirLeft")) out.push({ kind: "dirLeft", a, b });
      if (a < b && kinds.has("gap1")) out.push({ kind: "gap1", a, b });
      if (kinds.has("between")) for (const c of people) if (c !== a && c !== b && b < c) out.push({ kind: "between", a, b, c });
    }
  }
  return out.filter((c) => holds(c, answer, size));
}

export function buildPuzzle(index: number): Puzzle {
  const size = sizeFor(index);
  const rand = mulberry(20270209 + index * 4099);
  const shuffle = <T,>(xs: T[]): T[] => {
    const a = xs.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const people = shuffle(Array.from({ length: FAMILY }, (_, i) => i)).slice(0, size).sort((x, y) => x - y);
  const answer = shuffle(people);
  // deal the true clues out kind by kind, so no single kind floods the list
  const byKind = new Map<Clue["kind"], Clue[]>();
  for (const c of shuffle(trueClues(answer, size, index))) {
    const list = byKind.get(c.kind) ?? [];
    list.push(c);
    byKind.set(c.kind, list);
  }
  const weak = shuffle([...byKind.keys()].filter((k) => k !== "pos" && k !== "notPos"));
  const pool: Clue[] = [];
  for (let round = 0; pool.length < 400; round++) {
    let added = false;
    for (const k of weak) {
      const c = byKind.get(k)![round];
      if (c) {
        pool.push(c);
        added = true;
      }
    }
    if (!added) break;
  }
  pool.push(...(byKind.get("notPos") ?? []), ...(byKind.get("pos") ?? []));

  const perms = permutations(people);
  const t = table(perms);
  const n = perms.length;
  const masks = new Map<Clue, Uint8Array>();
  const maskOf = (c: Clue) => {
    let m = masks.get(c);
    if (!m) {
      m = mask(c, t, n, size);
      masks.set(c, m);
    }
    return m;
  };
  let alive = Array.from({ length: n }, (_, i) => i);
  const clues: Clue[] = [];
  for (const strict of [true, false]) {
    for (const c of pool) {
      if (alive.length <= 1) break;
      if (clues.includes(c)) continue;
      const m = maskOf(c);
      const next = alive.filter((i) => m[i] === 1);
      if (next.length === alive.length) continue;
      // early on, skip clues that cut almost nothing, so each clue matters
      if (strict && alive.length > 6 && next.length * 1.1 > alive.length) continue;
      clues.push(c);
      alive = next;
    }
  }
  // drop clues that are not needed
  for (let i = clues.length - 1; i >= 0; i--) {
    const trial = clues.slice(0, i).concat(clues.slice(i + 1)).map(maskOf);
    let count = 0;
    for (let p = 0; p < n && count < 2; p++) if (trial.every((m) => m[p] === 1)) count += 1;
    if (count === 1) clues.splice(i, 1);
  }
  return { index, size, people, clues: shuffle(clues), answer };
}

const cache = new Map<number, Puzzle>();
export function puzzle(index: number): Puzzle {
  let p = cache.get(index);
  if (!p) {
    p = buildPuzzle(index);
    cache.set(index, p);
  }
  return p;
}

export function countSolutions(p: Pick<Puzzle, "people" | "clues" | "size">): number {
  return permutations(p.people).filter((perm) => p.clues.every((c) => holds(c, perm, p.size))).length;
}

/** Slots hold a person id or null. Solved when full and every clue holds. */
export function isSolved(p: Pick<Puzzle, "clues" | "size">, slots: ReadonlyArray<number | null>): boolean {
  if (slots.some((s) => s === null)) return false;
  return p.clues.every((c) => holds(c, slots as number[], p.size));
}

export function positions(slots: ReadonlyArray<number | null>): Map<number, number> {
  const m = new Map<number, number>();
  slots.forEach((p, i) => {
    if (p !== null) m.set(p, i);
  });
  return m;
}

export function starsFor(moves: number, size: number): 1 | 2 | 3 {
  if (moves <= size + 2) return 3;
  if (moves <= size * 2 + 2) return 2;
  return 1;
}

/** Hint: the first spot whose person is wrong or empty, and who belongs there. */
export function hint(p: Puzzle, slots: ReadonlyArray<number | null>): { spot: number; person: number } | null {
  for (let i = 0; i < p.size; i++) if (slots[i] !== p.answer[i]) return { spot: i, person: p.answer[i] };
  return null;
}
