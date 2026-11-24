/**
 * Gulp Hole (꿀꺽 구멍) — an OIYO original swallow-and-grow game (2026-11-25).
 *
 * A little hole opens in the park. Steer it around and anything small enough drops in — flowers first, then cones and
 * bins, benches and bikes, and once it has grown, trees, cars and the ice-cream kiosk. Everything you swallow makes
 * the hole wider. Fill the meter before the clock runs out; the quicker, the more stars.
 *
 * Pure and deterministic: every park is seeded per stage.
 */

export const HOLE_SLUG = "gulp-hole";
export const STAGE_COUNT = 30;
export const MAP_TOP = 100;
export const MAP_H = 420;
export const W = 360;
export const START_R = 12;
export const SPEED = 95; // px per second

export interface ThingKind { r: number; points: number }
/** flower, cone, bin, bench, bush, bike, tree, car, van, kiosk */
export const THINGS: ThingKind[] = [
  { r: 4, points: 1 },
  { r: 5, points: 2 },
  { r: 7, points: 4 },
  { r: 9, points: 6 },
  { r: 10, points: 8 },
  { r: 12, points: 12 },
  { r: 16, points: 20 },
  { r: 20, points: 35 },
  { r: 26, points: 60 },
  { r: 32, points: 100 },
];
export const THING_NAMES = ["flower", "cone", "bin", "bench", "bush", "bike", "tree", "car", "van", "kiosk"] as const;

export interface Thing { kind: number; x: number; y: number }
export interface HoleStage {
  stage: number;
  things: Thing[];
  goal: number; // points to fill the meter
  limit: number; // seconds
  par: number; // seconds a quick player needs
}

export interface Park {
  stage: HoleStage;
  x: number;
  y: number;
  r: number;
  eaten: boolean[];
  points: number;
  t: number;
  tx: number; // where the hole is heading
  ty: number;
  over: boolean;
  won: boolean;
}

export const radiusFor = (points: number) => START_R + 2.2 * Math.sqrt(points);

export function newPark(stage: HoleStage): Park {
  return { stage, x: W / 2, y: MAP_TOP + MAP_H - 40, r: START_R, eaten: stage.things.map(() => false), points: 0, t: 0, tx: W / 2, ty: MAP_TOP + MAP_H - 40, over: false, won: false };
}

/** Whether the hole, as it is now, can swallow this thing (if it were over it). */
export const fits = (p: Park, k: number) => THINGS[k].r <= p.r * 0.85;

export function steer(p: Park, x: number, y: number): void {
  p.tx = Math.max(0, Math.min(W, x));
  p.ty = Math.max(MAP_TOP, Math.min(MAP_TOP + MAP_H, y));
}

/** Moves the hole and swallows what it can; returns the things swallowed this step. */
export function step(p: Park, dt: number): number[] {
  if (p.over) return [];
  p.t += dt;
  const dx = p.tx - p.x;
  const dy = p.ty - p.y;
  const d = Math.hypot(dx, dy);
  const move = Math.min(d, SPEED * dt);
  if (d > 0.01) {
    p.x += (dx / d) * move;
    p.y += (dy / d) * move;
  }
  const got: number[] = [];
  p.stage.things.forEach((th, i) => {
    if (p.eaten[i] || !fits(p, th.kind)) return;
    if (Math.hypot(th.x - p.x, th.y - p.y) < p.r - THINGS[th.kind].r * 0.4) {
      p.eaten[i] = true;
      p.points += THINGS[th.kind].points;
      got.push(i);
    }
  });
  if (got.length) p.r = radiusFor(p.points);
  if (p.points >= p.stage.goal) {
    p.over = true;
    p.won = true;
  } else if (p.t >= p.stage.limit) p.over = true;
  return got;
}

export function starsFor(p: Park): number {
  if (!p.won) return 0;
  if (p.t <= p.stage.par) return 3;
  if (p.t <= (p.stage.par + p.stage.limit) / 2) return 2;
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

export interface SteerOpts {
  /** seconds between choosing a new target */
  react?: number;
  /** how far off the player's aim lands, in px */
  wobble?: number;
  seed?: number;
  /** "greedy" heads for the best nearby bite; "random" wanders */
  mode?: "greedy" | "random";
  /** play on after the meter fills (to measure what a full run gets) */
  full?: boolean;
}

export function pilot(st: HoleStage, opts: SteerOpts = {}): Park {
  const { react = 0.3, wobble = 8, seed = 1, mode = "greedy", full = false } = opts;
  const rng = mulberry(seed * 2843 + 5);
  const p = newPark(full ? { ...st, goal: Infinity } : st);
  const dt = 1 / 20;
  let next = 0;
  while (!p.over) {
    if (p.t >= next) {
      next = p.t + (mode === "random" ? react * 5 : react) * (0.8 + rng() * 0.4);
      if (mode === "random") steer(p, rng() * W, MAP_TOP + rng() * MAP_H);
      else {
        let best = -1;
        let bestV = -Infinity;
        st.things.forEach((th, i) => {
          if (p.eaten[i] || !fits(p, th.kind)) return;
          const v = THINGS[th.kind].points / (Math.hypot(th.x - p.x, th.y - p.y) + 30);
          if (v > bestV) {
            bestV = v;
            best = i;
          }
        });
        if (best >= 0) steer(p, st.things[best].x + (rng() - 0.5) * wobble, st.things[best].y + (rng() - 0.5) * wobble);
      }
    }
    step(p, dt);
  }
  return p;
}

function shape(stage: number) {
  return {
    count: 90 + stage * 3,
    // weights of each kind: small things everywhere, bigger things more often later
    big: Math.min(1, 0.3 + stage * 0.03),
    goalShare: Math.min(0.9, 0.6 + stage * 0.012), // the meter as a share of everything in the park
    slack: stage < 5 ? 1.7 : stage < 15 ? 1.5 : 1.35, // the clock against the slowest human-like player
  };
}

/** Human-like players: a new target a little under every half second, aim a few pixels off. */
export const HUMAN_STEERERS: SteerOpts[] = [1, 2, 3, 4, 5, 6].map((seed) => ({ react: 0.45, wobble: 12, seed }));

export function layout(stage: number, attempt: number): HoleStage {
  const sh = shape(stage);
  const rng = mulberry(331000 + stage * 223 + attempt * 7919);
  const weights = THINGS.map((_, k) => (k < 5 ? 3 - k * 0.3 : (1.4 - (k - 5) * 0.22) * sh.big));
  const total = weights.reduce((a, b) => a + b, 0);
  const things: Thing[] = [];
  for (let tries = 0; tries < sh.count * 20 && things.length < sh.count; tries++) {
    let pick = rng() * total;
    let kind = 0;
    while (pick > weights[kind]) pick -= weights[kind++];
    const r = THINGS[kind].r;
    const x = r + rng() * (W - 2 * r);
    const y = MAP_TOP + r + rng() * (MAP_H - 2 * r);
    if (things.some((o) => Math.hypot(o.x - x, o.y - y) < THINGS[o.kind].r + r + 2)) continue;
    things.push({ kind, x: Math.round(x), y: Math.round(y) });
  }
  // small things first in the list, so they draw under the big ones
  const sorted = shuffle(things, rng).sort((a, b) => a.kind - b.kind);
  return { stage, things: sorted, goal: 0, limit: 0, par: 0 };
}

/** Sets the clock from the slowest human-like player, with room to spare; random wandering must run out of time. */
export function buildStage(stage: number): HoleStage {
  const sh = shape(stage);
  for (let attempt = 0; attempt < 200; attempt++) {
    const st = layout(stage, attempt);
    st.goal = Math.round(st.things.reduce((s, t) => s + THINGS[t.kind].points, 0) * sh.goalShare);
    st.limit = 10000;
    const slowest = Math.max(...HUMAN_STEERERS.map((o) => pilot(st, o).t));
    st.limit = Math.ceil(slowest * sh.slack) + 3;
    st.par = Math.ceil(pilot(st, { react: 0.25, wobble: 4, seed: 1 }).t * 1.25);
    if (st.par >= st.limit) continue;
    if ([1, 2, 3].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    return st;
  }
  throw new Error(`gulp-hole stage ${stage + 1}: no fair park`);
}

export const HOLE_STAGES: HoleStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
