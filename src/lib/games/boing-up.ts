/**
 * Boing Up (뽀잉 점프) — an OIYO original bounce-upward climber (2026-11-25).
 *
 * A springy bean bounces up a beanstalk of leaves all by itself; you only steer it left and right (hold and slide, or
 * the arrow keys). Some leaves drift, some wither after one bounce, mushrooms spring it extra high. Reach the top
 * without falling off the bottom of the screen, picking berries on the way.
 *
 * Pure and deterministic: fixed time steps, every stage's beanstalk seeded per stage. x is px across the 360 px
 * field, h is height in px (up).
 */

export const BOING_SLUG = "boing-up";
export const STAGE_COUNT = 30;
export const WIDTH = 360;
export const GRAVITY = 1500;
export const JUMP = 760; // the bounce off a leaf: about 190 px up
export const SPRING = 1.45; // a mushroom's bounce, times a leaf's
export const MAX_VX = 280;
export const STEER = 10; // how quickly the bean turns toward where you steer
export const HALF = 12;
export const LEAF_W = 64;
export const DT = 1 / 120;
export const VIEW = 440; // height of the visible window
export const BELOW = 300; // how far under the highest point reached the window's bottom sits

export type Kind = 0 | 1 | 2 | 3; // leaf, drifting leaf, withering leaf, mushroom
export interface Leaf { x: number; h: number; kind: Kind; amp: number; rate: number }
export interface Berry { x: number; h: number }

export interface BoingStage {
  stage: number;
  leaves: Leaf[];
  berries: Berry[];
  path: number[]; // leaves of the planned climb, in order
  top: number; // height to reach
  par: number; // berries for three stars
}

export interface Climb {
  stage: BoingStage;
  t: number;
  x: number;
  h: number;
  vx: number;
  vh: number;
  target: number;
  floor: number; // the bottom of the window: fall below it and it's over
  withered: boolean[];
  got: boolean[];
  berries: number;
  bounces: number;
  last: number; // the leaf last bounced on
  over: boolean;
  won: boolean;
}

export function newClimb(stage: BoingStage): Climb {
  const s = stage.leaves[0];
  return { stage, t: 0, x: s.x, h: s.h, vx: 0, vh: JUMP, target: s.x, floor: s.h - BELOW, withered: stage.leaves.map(() => false), got: stage.berries.map(() => false), berries: 0, bounces: 0, last: 0, over: false, won: false };
}

/** Where a leaf is at time t (drifting leaves sway side to side). */
export function leafX(l: Leaf, t: number): number {
  return l.kind === 1 ? l.x + l.amp * Math.sin(l.rate * t) : l.x;
}

export type StepEvent = { bounce: number; berry: boolean; wither: number };

export function step(c: Climb): StepEvent {
  const ev: StepEvent = { bounce: -1, berry: false, wither: -1 };
  if (c.over) return ev;
  c.t += DT;
  const want = Math.max(-MAX_VX, Math.min(MAX_VX, (c.target - c.x) * STEER));
  c.vx = want;
  c.x = Math.max(HALF, Math.min(WIDTH - HALF, c.x + c.vx * DT));
  const before = c.h;
  c.vh -= GRAVITY * DT;
  c.h += c.vh * DT;
  if (c.vh < 0) {
    for (let k = 0; k < c.stage.leaves.length; k++) {
      const l = c.stage.leaves[k];
      if (c.withered[k]) continue;
      if (before >= l.h && c.h < l.h && Math.abs(c.x - leafX(l, c.t)) < LEAF_W / 2 + HALF * 0.6) {
        c.h = l.h;
        c.vh = l.kind === 3 ? JUMP * SPRING : JUMP;
        c.bounces++;
        c.last = k;
        ev.bounce = k;
        if (l.kind === 2) {
          c.withered[k] = true;
          ev.wither = k;
        }
        break;
      }
    }
  }
  c.stage.berries.forEach((b, k) => {
    if (c.got[k] || Math.abs(b.x - c.x) > 20 || Math.abs(b.h - c.h) > 22) return;
    c.got[k] = true;
    c.berries++;
    ev.berry = true;
  });
  // the window follows the bean up, never down
  c.floor = Math.max(c.floor, c.h - BELOW);
  if (c.h >= c.stage.top) {
    c.over = true;
    c.won = true;
  } else if (c.h < c.floor - HALF * 2) c.over = true;
  return ev;
}

export function starsFor(c: Climb): number {
  if (!c.won) return 0;
  if (c.berries >= c.stage.par) return 3;
  if (c.berries >= Math.ceil(c.stage.par / 2)) return 2;
  return 1;
}

/** Peak height above a leaf for a bounce of speed v. */
export const reachUp = (v: number) => (v * v) / (2 * GRAVITY);

/**
 * Where to steer: the next leaf of the plan (plan mode), or — like a player — the leaf above it is aiming for: the
 * highest one it can still land on, from what it sees, aiming where that leaf will be when it gets there.
 */
export function steerFor(c: Climb, mode: "plan" | "look"): number {
  const st = c.stage;
  if (mode === "plan") {
    const i = st.path.indexOf(c.last);
    const next = st.path[Math.min(st.path.length - 1, i + 1)];
    const l = st.leaves[next];
    // aim where the leaf will be on the way down onto it
    const land = timeTo(c, l.h);
    return leafX(l, c.t + Math.max(0, land));
  }
  let best = -1;
  let bestScore = -Infinity;
  const peak = c.h + (c.vh > 0 ? reachUp(c.vh) : 0);
  for (let k = 0; k < st.leaves.length; k++) {
    const l = st.leaves[k];
    if (c.withered[k] || k === c.last || l.h > peak - 6 || l.h < c.h - 40 || l.h < c.floor + 10) continue;
    const land = timeTo(c, l.h);
    if (land < 0) continue;
    const dx = Math.abs(leafX(l, c.t + land) - c.x);
    if (dx > MAX_VX * land + LEAF_W / 2) continue;
    // as high as possible, then as near as possible
    const score = l.h - dx * 0.4 - (l.kind === 2 ? 30 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = k;
    }
  }
  if (best < 0) return c.target;
  const l = st.leaves[best];
  return leafX(l, c.t + Math.max(0, timeTo(c, l.h)));
}

/** Seconds until the bean comes down through height h (−1 if it won't). */
function timeTo(c: Climb, h: number): number {
  // h(t) = c.h + vh t − g t²/2 = target, take the falling root
  const a = -GRAVITY / 2;
  const b = c.vh;
  const cc = c.h - h;
  const d = b * b - 4 * a * cc;
  if (d < 0) return -1;
  const t = (-b - Math.sqrt(d)) / (2 * a);
  return t >= 0 ? t : -1;
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

function gauss(rng: () => number): number {
  const u = Math.max(1e-9, rng());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

export interface SteererOpts {
  /** seconds between looks, and how far off (px) the player steers */
  look?: number;
  wobble?: number;
  seed?: number;
  mode?: "plan" | "look" | "random";
}

export function pilot(st: BoingStage, opts: SteererOpts = {}): Climb {
  const { look = 0.12, wobble = 0, seed = 1, mode = "look" } = opts;
  const rng = mulberry(seed * 3221 + 19);
  const c = newClimb(st);
  let nextLook = 0;
  while (!c.over && c.t < 600) {
    if (c.t >= nextLook) {
      if (mode === "random") {
        c.target = rng() * WIDTH;
        nextLook = c.t + 0.3 + rng() * 0.6;
      } else {
        c.target = steerFor(c, mode) + gauss(rng) * wobble;
        nextLook = c.t + (mode === "plan" ? DT : look * (0.8 + rng() * 0.4));
      }
    }
    step(c);
  }
  return c;
}

function shape(stage: number) {
  return {
    leaves: 14 + stage, // leaves on the planned climb
    gap: [70, Math.min(140, 95 + stage * 1.5)] as [number, number], // height between planned leaves
    dx: Math.min(130, 70 + stage * 2.2), // how far across the next planned leaf can be
    drift: stage < 4 ? 0 : Math.min(0.4, 0.1 + stage * 0.01),
    wither: stage < 6 ? 0 : Math.min(0.3, 0.05 + stage * 0.008),
    spring: 0.08,
    extra: stage < 10 ? 0.6 : 0.4, // spare leaves beside the climb
  };
}

/** Human-like steerers: look about every eighth of a second, steering off by a few px. */
export const HUMAN_STEERERS: SteererOpts[] = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => ({ look: 0.14, wobble: 8, seed }));

export function buildStage(stage: number): BoingStage {
  const sh = shape(stage);
  for (let attempt = 0; attempt < 300; attempt++) {
    const rng = mulberry(631000 + stage * 419 + attempt * 7919);
    const leaves: Leaf[] = [{ x: 180, h: 0, kind: 0, amp: 0, rate: 0 }];
    const path = [0];
    const berries: Berry[] = [];
    let x = 180;
    let h = 0;
    for (let k = 1; k <= sh.leaves; k++) {
      const dh = sh.gap[0] + rng() * (sh.gap[1] - sh.gap[0]);
      const nx = Math.max(40, Math.min(WIDTH - 40, x + (rng() * 2 - 1) * sh.dx));
      const u = rng();
      const kind: Kind = k === sh.leaves ? 0 : u < sh.drift ? 1 : u < sh.drift + sh.wither ? 2 : u < sh.drift + sh.wither + sh.spring ? 3 : 0;
      const leaf: Leaf = { x: Math.round(nx), h: Math.round(h + dh), kind, amp: kind === 1 ? Math.round(20 + rng() * 30) : 0, rate: kind === 1 ? Math.round((1 + rng()) * 100) / 100 : 0 };
      leaves.push(leaf);
      path.push(leaves.length - 1);
      // a berry on the way up to it
      berries.push({ x: Math.round((x + nx) / 2), h: Math.round(h + dh * 0.5 + 60) });
      // a spare leaf off to one side now and then
      if (rng() < sh.extra) {
        const sx = nx < 180 ? nx + 70 + rng() * 40 : nx - 70 - rng() * 40;
        leaves.push({ x: Math.round(Math.max(40, Math.min(WIDTH - 40, sx))), h: Math.round(h + dh * (0.3 + rng() * 0.3)), kind: 0, amp: 0, rate: 0 });
      }
      x = nx;
      h += dh;
    }
    const st: BoingStage = { stage, leaves, berries, path, top: Math.round(h + 40), par: 0 };
    const planned = pilot(st, { mode: "plan" });
    if (!planned.won) continue;
    st.par = Math.max(1, planned.berries - (stage < 10 ? 3 : 2));
    if (planned.berries < st.par) continue;
    if (HUMAN_STEERERS.some((o) => !pilot(st, o).won)) continue;
    if ([1, 2, 3, 4, 5, 6].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    return st;
  }
  throw new Error(`boing-up stage ${stage + 1}: no fair beanstalk`);
}

export const BOING_STAGES: BoingStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
