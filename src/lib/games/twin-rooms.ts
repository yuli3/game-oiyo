/**
 * Twin Rooms (쌍둥이 방) — an OIYO original spot-the-difference puzzle (2026-11-25).
 *
 * Two pictures of the same cosy room hang one above the other, but they aren't quite twins: a few keepsakes are
 * missing, changed colour or turned the other way. Tap a difference in either picture to circle it in both. Find them
 * all before you've tapped wrong five times; one wrong tap still earns three stars.
 *
 * Pure and deterministic: every room is laid out from a seed per stage, with its differences far enough apart that a
 * tap never finds two at once, and each one a change you can actually see.
 */

import { ITEMS } from "./twin-rooms-art";

export const TWIN_SLUG = "twin-rooms";
export const STAGE_COUNT = 30;
export const PANEL_W = 340;
export const PANEL_H = 230;
export const HIT_R = 24; // how close a tap must be to a difference
export const MISSES = 5;
export const ITEM_PX = 30; // items drawn 10 × 10 at scale 3

/** One keepsake in a picture: which item, colourway, mirrored or not, where (panel px, centre). */
export interface Thing { item: number; v: number; flip: boolean; x: number; y: number }

export type Change = "gone" | "colour" | "flip" | "extra";

export interface TwinStage {
  stage: number;
  /** the top picture */
  things: Thing[];
  /** what's different in the bottom picture: a thing changed (index into things), or an extra thing added */
  diffs: Array<{ kind: Change; at: number; extra?: Thing }>;
}

export interface Search {
  stage: TwinStage;
  found: boolean[];
  misses: number;
  taps: number;
  over: boolean;
  won: boolean;
}

export function newSearch(stage: TwinStage): Search {
  return { stage, found: stage.diffs.map(() => false), misses: 0, taps: 0, over: false, won: false };
}

/** Where difference k sits in a picture (panel px). */
export function diffAt(st: TwinStage, k: number): [number, number] {
  const d = st.diffs[k];
  const t = d.kind === "extra" ? (d.extra as Thing) : st.things[d.at];
  return [t.x, t.y];
}

/** The bottom picture: the top one with its differences applied. */
export function bottomThings(st: TwinStage): Thing[] {
  const out: Thing[] = [];
  st.things.forEach((t, i) => {
    const d = st.diffs.find((dd) => dd.kind !== "extra" && dd.at === i);
    if (!d) out.push(t);
    else if (d.kind === "colour") out.push({ ...t, v: 1 - t.v });
    else if (d.kind === "flip") out.push({ ...t, flip: !t.flip });
  });
  for (const d of st.diffs) if (d.kind === "extra" && d.extra) out.push(d.extra);
  return out;
}

/** A tap at (x, y) in panel px (either picture): finds the nearest unfound difference in reach, or misses. */
export function tap(s: Search, x: number, y: number): number {
  if (s.over) return -2;
  s.taps++;
  let best = -1;
  let bestD = HIT_R;
  s.stage.diffs.forEach((_, k) => {
    const [dx, dy] = diffAt(s.stage, k);
    const d = Math.hypot(dx - x, dy - y);
    if (d < bestD) {
      bestD = d;
      best = k;
    }
  });
  if (best >= 0 && s.found[best]) return -3; // already circled: no harm
  if (best < 0) {
    s.misses++;
    if (s.misses >= MISSES) s.over = true;
    return -1;
  }
  s.found[best] = true;
  if (s.found.every(Boolean)) {
    s.over = true;
    s.won = true;
  }
  return best;
}

export function starsFor(s: Search): number {
  if (!s.won) return 0;
  if (s.misses <= 1) return 3;
  if (s.misses <= 3) return 2;
  return 1;
}

/** Whether mirroring an item changes how it looks. */
export const lopsided = (item: number) => ITEMS[item].rows.some((r) => r !== r.split("").reverse().join(""));

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

export interface LookerOpts {
  /** chance of a wrong tap before each find */
  slip?: number;
  seed?: number;
  mode?: "plan" | "human" | "random";
}

/** Plays a room: tapping each difference in turn, a human-like looker who taps wrong now and then, or random taps. */
export function pilot(st: TwinStage, opts: LookerOpts = {}): Search {
  const { slip = 0, seed = 1, mode = "plan" } = opts;
  const rng = mulberry(seed * 2017 + 3);
  const s = newSearch(st);
  if (mode === "random") {
    while (!s.over) tap(s, rng() * PANEL_W, rng() * PANEL_H);
    return s;
  }
  const order = st.diffs.map((_, k) => k);
  if (mode === "human") for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  for (const k of order) {
    if (s.over) break;
    // a wrong guess first: somewhere that isn't a difference
    while (mode === "human" && rng() < slip && !s.over) {
      let x = 0;
      let y = 0;
      let g = 0;
      do {
        x = 20 + rng() * (PANEL_W - 40);
        y = 20 + rng() * (PANEL_H - 40);
      } while (st.diffs.some((_, j) => Math.hypot(diffAt(st, j)[0] - x, diffAt(st, j)[1] - y) < HIT_R + 4) && g++ < 50);
      tap(s, x, y);
    }
    const [x, y] = diffAt(st, k);
    // a look a few px off the centre still finds it
    tap(s, x + (rng() * 2 - 1) * (mode === "human" ? 10 : 0), y + (rng() * 2 - 1) * (mode === "human" ? 10 : 0));
  }
  return s;
}

/** Human-like lookers: one wrong tap before about one find in five. */
export const HUMAN_LOOKERS: LookerOpts[] = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => ({ mode: "human", slip: 0.2, seed }));

function shape(stage: number) {
  return {
    things: Math.min(18, 8 + Math.floor(stage / 3)),
    diffs: stage < 3 ? 3 : stage < 10 ? 4 : stage < 20 ? 5 : 6,
    // early on, the changes you can see at a glance (gone, extra); colour and flip come in later
    kinds: (stage < 3 ? ["gone", "extra"] : stage < 10 ? ["gone", "extra", "colour"] : ["gone", "extra", "colour", "flip"]) as Change[],
  };
}

/** Where things can stand: on the shelf line, hanging on the wall, or on the floor (panel px). */
function spot(rng: () => number): [number, number] {
  const r = rng();
  const x = 24 + Math.round(rng() * (PANEL_W - 48));
  if (r < 0.35) return [x, 40 + Math.round(rng() * 30)]; // on the wall
  if (r < 0.6) return [x, 104]; // on the shelf
  return [x, 160 + Math.round(rng() * 46)]; // on the floor
}

export function buildStage(stage: number): TwinStage {
  const sh = shape(stage);
  for (let attempt = 0; attempt < 400; attempt++) {
    const rng = mulberry(741000 + stage * 491 + attempt * 7919);
    const things: Thing[] = [];
    let g = 0;
    while (things.length < sh.things && g++ < 400) {
      const [x, y] = spot(rng);
      if (things.some((t) => Math.hypot(t.x - x, t.y - y) < 40)) continue;
      things.push({ item: Math.floor(rng() * ITEMS.length), v: rng() < 0.5 ? 0 : 1, flip: rng() < 0.5, x, y });
    }
    if (things.length < sh.things) continue;
    const diffs: TwinStage["diffs"] = [];
    const used = new Set<number>();
    g = 0;
    while (diffs.length < sh.diffs && g++ < 400) {
      const kind = sh.kinds[Math.floor(rng() * sh.kinds.length)];
      if (kind === "extra") {
        const [x, y] = spot(rng);
        if (things.some((t) => Math.hypot(t.x - x, t.y - y) < 40)) continue;
        const extra: Thing = { item: Math.floor(rng() * ITEMS.length), v: rng() < 0.5 ? 0 : 1, flip: false, x, y };
        if (diffs.some((d) => d.kind === "extra" && d.extra && Math.hypot(d.extra.x - x, d.extra.y - y) < 40)) continue;
        diffs.push({ kind, at: -1, extra });
        continue;
      }
      const at = Math.floor(rng() * things.length);
      if (used.has(at)) continue;
      if (kind === "flip" && !lopsided(things[at].item)) continue;
      used.add(at);
      diffs.push({ kind, at });
    }
    if (diffs.length < sh.diffs) continue;
    const st: TwinStage = { stage, things, diffs };
    // differences far enough apart that one tap never covers two
    let apart = true;
    for (let a = 0; a < diffs.length && apart; a++) for (let b = a + 1; b < diffs.length; b++) {
      const [ax, ay] = diffAt(st, a);
      const [bx, by] = diffAt(st, b);
      if (Math.hypot(ax - bx, ay - by) < HIT_R * 2 + 8) apart = false;
    }
    if (!apart) continue;
    if (HUMAN_LOOKERS.some((o) => !pilot(st, o).won)) continue;
    if ([1, 2, 3, 4, 5, 6].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    return st;
  }
  throw new Error(`twin-rooms stage ${stage + 1}: no fair room`);
}

export const TWIN_STAGES: TwinStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
