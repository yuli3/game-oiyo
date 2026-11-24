/**
 * Rooftop Cats (지붕 위 고양이) — an OIYO original hidden-cat finder (2026-11-24).
 *
 * A row of town rooftops, drawn in pixels: chimneys, water tanks, washing on the line, pots of plants, lit and dark
 * windows. Cats are hiding all over it — curled on a roof, peeking out of a window, the same colour as the bricks they
 * sit on. Tap a cat to find it. A tap on nothing costs a few seconds. Find every cat before the clock runs out; the
 * days run from bright noon to dusk to the lamplit night, when dark cats melt into dark roofs.
 *
 * Pure and deterministic: every scene and every cat is seeded per stage.
 */

export const CATS_SLUG = "rooftop-cats";
export const STAGE_COUNT = 30;
export const SCENE_TOP = 100;
export const SCENE_H = 420;
export const W = 360;
export const MISS_PENALTY = 4;
export const CAT_W = 14;
export const CAT_H = 10;

export type PropKind = "building" | "roof" | "window" | "chimney" | "plant" | "tank" | "cloth" | "ac" | "line";
export interface Prop { kind: PropKind; x: number; y: number; w: number; h: number; colour: string }
export interface Cat { x: number; y: number; colour: string; peek: boolean; host: number; camo: number; scale: number }
export interface CatStage {
  stage: number;
  time: "day" | "dusk" | "night";
  sky: string;
  props: Prop[];
  cats: Cat[];
  limit: number; // seconds on the clock
  par: number; // seconds a quick finder takes
}

export interface Hunt {
  stage: CatStage;
  found: boolean[];
  t: number;
  misses: number;
  over: boolean;
  won: boolean;
}

export const newHunt = (stage: CatStage): Hunt => ({ stage, found: stage.cats.map(() => false), t: 0, misses: 0, over: false, won: false });

export const timeLeft = (h: Hunt) => h.stage.limit - h.t - h.misses * MISS_PENALTY;

/** The cat a tap at (x, y) lands on (−1 none). Covers the cat's box with a little slack for fingers. */
export function catAt(st: CatStage, found: boolean[], x: number, y: number): number {
  let best = -1;
  let bestD = Infinity;
  st.cats.forEach((c, i) => {
    if (found[i]) return;
    const hw = (CAT_W * c.scale) / 2 + 6;
    const hh = ((c.peek ? CAT_H * 0.6 : CAT_H) * c.scale) / 2 + 6;
    const dx = Math.abs(x - c.x);
    const dy = Math.abs(y - c.y);
    if (dx <= hw && dy <= hh && dx + dy < bestD) {
      best = i;
      bestD = dx + dy;
    }
  });
  return best;
}

export type TapResult = "found" | "miss" | null;

export function tap(h: Hunt, x: number, y: number): TapResult {
  if (h.over) return null;
  const i = catAt(h.stage, h.found, x, y);
  if (i < 0) {
    h.misses++;
    if (timeLeft(h) <= 0) h.over = true;
    return "miss";
  }
  h.found[i] = true;
  if (h.found.every(Boolean)) {
    h.over = true;
    h.won = true;
  }
  return "found";
}

export function tick(h: Hunt, dt: number): void {
  if (h.over) return;
  h.t += dt;
  if (timeLeft(h) <= 0) {
    h.over = true;
    h.won = false;
  }
}

export function starsFor(h: Hunt): number {
  if (!h.won) return 0;
  const used = h.t + h.misses * MISS_PENALTY;
  if (used <= h.stage.par) return 3;
  if (used <= (h.stage.par + h.stage.limit) / 2) return 2;
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

const hex = (r: number, g: number, b: number) => "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
const rgb = (h: string) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
/** Darkens a colour for dusk and night. */
const shade = (h: string, f: number) => {
  const [r, g, b] = rgb(h);
  return hex(r * f, g * f, b * f * (f < 1 ? 1.08 : 1));
};
export function colourDistance(a: string, b: string): number {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
}

const WALLS = ["#c2654b", "#d9a066", "#8a9bb0", "#b8a98e", "#9c6b4e", "#d4c3a3", "#7d8b6a", "#a85d5d"];
const ROOFS = ["#5c3d2e", "#38424f", "#7a2e2e", "#4a5a3a", "#6b4b3a"];
const CLOTHS = ["#e64980", "#4dabf7", "#fab005", "#f8f9fa", "#69db7c"];
const COATS = ["#f08c00", "#212529", "#f8f9fa", "#868e96", "#d9a066", "#5c3d2e"];

function scene(stage: number, rng: () => number): { props: Prop[]; time: CatStage["time"]; sky: string; spots: Array<{ x: number; y: number; host: number; peek: boolean }> } {
  const time: CatStage["time"] = stage < 10 ? "day" : stage < 20 ? "dusk" : "night";
  const f = time === "day" ? 1 : time === "dusk" ? 0.78 : 0.5;
  const sky = time === "day" ? "#a5d8ff" : time === "dusk" ? "#f4a582" : "#1c2541";
  const props: Prop[] = [];
  const spots: Array<{ x: number; y: number; host: number; peek: boolean }> = [];
  // the buildings, side by side, of different heights
  let x = 0;
  while (x < W) {
    const w = Math.min(W - x, 50 + Math.floor(rng() * 50));
    const h = 170 + Math.floor(rng() * 200);
    const y = SCENE_TOP + SCENE_H - h;
    const wall = shade(WALLS[Math.floor(rng() * WALLS.length)], f);
    const b = props.length;
    props.push({ kind: "building", x, y, w, h, colour: wall });
    const roof = shade(ROOFS[Math.floor(rng() * ROOFS.length)], f);
    const r = props.length;
    props.push({ kind: "roof", x: x - 2, y: y - 8, w: w + 4, h: 10, colour: roof });
    // cats sit on the roof edge
    for (let k = 0; k < 2; k++) spots.push({ x: x + 10 + rng() * (w - 20), y: y - 8 - CAT_H / 2 + 1, host: r, peek: false });
    // windows in a grid, some lit
    const cols = Math.max(1, Math.floor((w - 10) / 22));
    const rows = Math.floor((h - 30) / 34);
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < cols; col++) {
        const wx = x + 8 + col * ((w - 16) / cols) + ((w - 16) / cols - 14) / 2;
        const wy = y + 14 + row * 34;
        const lit = time !== "day" && rng() < 0.45;
        const glass = lit ? "#ffe066" : shade("#4c6ef5", f * 0.7);
        const wi = props.length;
        props.push({ kind: "window", x: wx, y: wy, w: 14, h: 18, colour: glass });
        if (rng() < 0.5) spots.push({ x: wx + 7, y: wy + 18 - (CAT_H * 0.6) / 2, host: wi, peek: true });
      }
    // a few things on top: chimney, tank, plants, an AC box, washing
    const extras = 1 + Math.floor(rng() * 3);
    for (let k = 0; k < extras; k++) {
      const pick = rng();
      const ex = x + 6 + rng() * Math.max(1, w - 30);
      if (pick < 0.25) {
        const ci = props.length;
        props.push({ kind: "chimney", x: ex, y: y - 30, w: 14, h: 24, colour: shade("#8f3b2e", f) });
        spots.push({ x: ex + 7, y: y - 30 - CAT_H / 2, host: ci, peek: false });
      } else if (pick < 0.45) {
        const ti = props.length;
        props.push({ kind: "tank", x: ex, y: y - 34, w: 22, h: 26, colour: shade("#adb5bd", f) });
        spots.push({ x: ex + 11, y: y - 34 - CAT_H / 2, host: ti, peek: false });
      } else if (pick < 0.7) {
        const pi = props.length;
        props.push({ kind: "plant", x: ex, y: y - 20, w: 18, h: 14, colour: shade("#2f9e44", f) });
        spots.push({ x: ex + 9, y: y - 20 + 2, host: pi, peek: true });
      } else if (pick < 0.85) {
        const ai = props.length;
        props.push({ kind: "ac", x: ex, y: y + h * 0.4, w: 20, h: 14, colour: shade("#dee2e6", f) });
        spots.push({ x: ex + 10, y: y + h * 0.4 - CAT_H / 2, host: ai, peek: false });
      } else {
        props.push({ kind: "line", x, y: y - 22, w, h: 1, colour: shade("#495057", f) });
        for (let c = 0; c < 3; c++) {
          const cx = x + 6 + c * (w / 3);
          const ci = props.length;
          props.push({ kind: "cloth", x: cx, y: y - 21, w: 12, h: 14, colour: shade(CLOTHS[Math.floor(rng() * CLOTHS.length)], f) });
          if (c === 1) spots.push({ x: cx + 6, y: y - 21 + 14 + CAT_H / 2 - 2, host: ci, peek: false });
        }
      }
    }
    void b;
    x += w;
  }
  return { props, time, sky, spots };
}

export interface FinderOpts {
  /** seconds to spot a plain, easy cat */
  base?: number;
  /** extra seconds a well-hidden cat costs */
  hidden?: number;
  /** chance of tapping the wrong spot on a cat */
  slip?: number;
  seed?: number;
  /** "look" finds the easiest cats first; "random" taps anywhere on the scene */
  mode?: "look" | "random";
}

/** How long a human might need to spot this cat, before their own luck. */
export function difficulty(c: Cat): number {
  return 1 + c.camo * 2.2 + (c.peek ? 0.8 : 0) + (c.scale < 1 ? 0.6 : 0);
}

export function pilot(st: CatStage, opts: FinderOpts = {}): Hunt {
  const { base = 1.6, hidden = 1.6, slip = 0.08, seed = 1, mode = "look" } = opts;
  const rng = mulberry(seed * 3121 + 17);
  const h = newHunt(st);
  if (mode === "random") {
    for (let guard = 0; guard < 2000 && !h.over; guard++) {
      tick(h, 0.35);
      if (!h.over) tap(h, rng() * W, SCENE_TOP + rng() * SCENE_H);
    }
    return h;
  }
  // the eye goes to the easiest cats first; each takes base + hidden × difficulty, give or take
  const order = st.cats.map((c, i) => ({ i, d: difficulty(c) * (0.7 + rng() * 0.6) })).sort((a, b) => a.d - b.d);
  for (const { i, d } of order) {
    if (h.over) break;
    tick(h, base * 0.5 + hidden * d * 0.5 + rng() * base * 0.5);
    if (h.over) break;
    if (rng() < slip) tap(h, st.cats[i].x + 40, st.cats[i].y + 30 > SCENE_TOP + SCENE_H ? st.cats[i].y - 30 : st.cats[i].y + 30);
    if (!h.over) tap(h, st.cats[i].x, st.cats[i].y);
  }
  return h;
}

function shape(stage: number) {
  return {
    cats: 4 + Math.floor(stage / 3),
    camoChance: Math.min(0.75, 0.15 + stage * 0.022),
    small: Math.min(0.4, stage * 0.015),
  };
}

/** Human-like finders used to set the clock: a couple of seconds a cat, more for well-hidden ones, the odd misplaced tap. */
export const HUMAN_FINDERS: FinderOpts[] = [1, 2, 3, 4, 5, 6].map((seed) => ({ base: 1.6, hidden: 1.6, slip: 0.08, seed }));

function layout(stage: number, attempt: number): CatStage | null {
  const sh = shape(stage);
  const rng = mulberry(311000 + stage * 199 + attempt * 7919);
  const { props, time, sky, spots } = scene(stage, rng);
  const cats: Cat[] = [];
  for (const s of shuffle(spots, rng)) {
    if (cats.length >= sh.cats) break;
    if (s.x < 10 || s.x > W - 10 || s.y < SCENE_TOP + 6) continue;
    if (cats.some((c) => Math.hypot(c.x - s.x, c.y - s.y) < 30)) continue;
    const host = props[s.host];
    // a hidden cat wears its host's colour, nudged a touch; the rest wear an ordinary coat
    const camo = rng() < sh.camoChance;
    const f = time === "day" ? 1 : time === "dusk" ? 0.78 : 0.5;
    let colour: string;
    if (camo) {
      const [r, g, b] = rgb(host.colour);
      const n = 18 + rng() * 14;
      colour = hex(r + (rng() - 0.5) * n, g + (rng() - 0.5) * n, b + (rng() - 0.5) * n);
    } else colour = shade(COATS[Math.floor(rng() * COATS.length)], f);
    const d = colourDistance(colour, host.colour);
    const scale = rng() < sh.small ? 0.8 : 1;
    cats.push({ x: Math.round(s.x), y: Math.round(s.y), colour, peek: s.peek, host: s.host, camo: Math.max(0, Math.min(1, 1 - d / 160)), scale });
  }
  if (cats.length < sh.cats) return null;
  return { stage, time, sky, props, cats, limit: 0, par: 0 };
}

/** Builds a scene, then sets the clock from how long human-like finders take: most make it, random tapping can't. */
export function buildStage(stage: number): CatStage {
  for (let attempt = 0; attempt < 200; attempt++) {
    const st = layout(stage, attempt);
    if (!st) continue;
    st.limit = 10000;
    const times = HUMAN_FINDERS.map((o) => {
      const h = pilot(st, o);
      return h.t + h.misses * MISS_PENALTY;
    }).sort((a, b) => a - b);
    st.limit = Math.ceil(times[3] * 1.3 + 5);
    st.par = Math.ceil(pilot(st, { base: 1.2, hidden: 1.2, slip: 0, seed: 1 }).t * 1.05);
    if (HUMAN_FINDERS.filter((o) => pilot(st, o).won).length < 5) continue;
    if ([1, 2, 3].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    return st;
  }
  throw new Error(`rooftop-cats stage ${stage + 1}: no fair scene`);
}

export const CATS_STAGES: CatStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
