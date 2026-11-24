/**
 * Beaver Chop (비버 도끼질) — an OIYO original chop-and-dodge reflex game (2026-11-25).
 *
 * A beaver chops a tall tree from the bottom. Tap left or right: the beaver hops to that side and bites off the
 * bottom log, and the tree drops a log. Branches stick out of some logs; walk into one, or let one drop on your
 * head, and you lose a heart (the branch snaps off); every 20 logs a lost heart comes back. Every bite tops up the
 * clock, which drains faster and faster.
 * Chop the logs the stage asks for before the clock runs dry.
 *
 * Pure and deterministic: every tree's branches are seeded per stage, never one on each side back to back (that
 * would leave nowhere to stand).
 */

export const CHOP_SLUG = "beaver-chop";
export const STAGE_COUNT = 30;
export const HEARTS = 3;
export const CLOCK_MAX = 6;
export const BITE_TIME = 0.32; // seconds a bite puts back on the clock
export const HEAL_EVERY = 20; // logs per heart back

export type Side = -1 | 1; // left, right
export type Branch = -1 | 0 | 1; // left, none, right

export interface ChopStage {
  stage: number;
  branches: Branch[]; // from the bottom log up; branches[0] is the log at the beaver's height
  target: number; // logs to chop
  drain: number; // clock seconds lost per second at the start
  ramp: number; // extra drain per log chopped
}

export interface Tree {
  stage: ChopStage;
  at: number; // index of the bottom log in branches
  side: Side;
  clock: number;
  t: number;
  chopped: number;
  hearts: number;
  hits: number;
  snapped: Set<number>; // logs whose branch has been knocked off
  over: boolean;
  won: boolean;
}

export const newTree = (stage: ChopStage): Tree => ({ stage, at: 0, side: -1, clock: CLOCK_MAX * 0.6, t: 0, chopped: 0, hearts: HEARTS, hits: 0, snapped: new Set(), over: false, won: false });

/** The branch on a log above the bottom one (0 = bottom), with snapped branches gone. */
export function branchAt(tr: Tree, up: number): Branch {
  const i = tr.at + up;
  if (i >= tr.stage.branches.length || tr.snapped.has(i)) return 0;
  return tr.stage.branches[i];
}

export type ChopEvent = "chop" | "bonk" | null;

/** Hops to a side and bites the bottom log. */
export function chop(tr: Tree, side: Side): ChopEvent[] {
  if (tr.over) return [];
  const ev: ChopEvent[] = [];
  tr.side = side;
  // walking into a branch at your height
  if (branchAt(tr, 0) === side) {
    tr.snapped.add(tr.at);
    bonk(tr, ev);
    if (tr.over) return ev;
  }
  tr.at++;
  tr.chopped++;
  tr.clock = Math.min(CLOCK_MAX, tr.clock + BITE_TIME);
  if (tr.chopped % HEAL_EVERY === 0 && tr.hearts < HEARTS) tr.hearts++;
  ev.push("chop");
  // the tree drops: a branch on the new bottom log on your side lands on you
  if (branchAt(tr, 0) === side) {
    tr.snapped.add(tr.at);
    bonk(tr, ev);
  }
  if (!tr.over && tr.chopped >= tr.stage.target) {
    tr.over = true;
    tr.won = true;
  }
  return ev;
}

function bonk(tr: Tree, ev: ChopEvent[]) {
  tr.hearts--;
  tr.hits++;
  ev.push("bonk");
  if (tr.hearts <= 0) tr.over = true;
}

export function step(tr: Tree, dt: number): void {
  if (tr.over) return;
  tr.t += dt;
  tr.clock -= (tr.stage.drain + tr.stage.ramp * tr.chopped) * dt;
  if (tr.clock <= 0) {
    tr.clock = 0;
    tr.over = true;
  }
}

export function starsFor(tr: Tree): number {
  if (!tr.won) return 0;
  if (tr.hits === 0) return 3;
  if (tr.hits <= 2) return 2;
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

/** The safe side for the next bite: not into the branch at your height, not under the one about to drop. */
export function safeSide(tr: Tree): Side {
  const here = branchAt(tr, 0);
  const next = branchAt(tr, 1);
  if (next !== 0) return (-next) as Side;
  if (here !== 0) return (-here) as Side;
  return tr.side;
}

export interface ChopperOpts {
  /** seconds per bite (spread ± a quarter) */
  pace?: number;
  /** chance per bite of reading the tree wrong */
  slip?: number;
  seed?: number;
  mode?: "read" | "random";
}

export function pilot(st: ChopStage, opts: ChopperOpts = {}): Tree {
  const { pace = 0.25, slip = 0, seed = 1, mode = "read" } = opts;
  // the player's slips depend on the tree too, so one unlucky seed is not unlucky on every tree
  const mix = st.branches.slice(0, 40).reduce((h, b, i) => (h * 31 + (b + 1) * (i + 7)) >>> 0, st.stage + 1);
  const rng = mulberry(seed * 3989 + 71 + mix);
  const tr = newTree(st);
  const dt = 1 / 60;
  let next = 0.3;
  while (!tr.over) {
    if (tr.t >= next) {
      let side: Side;
      if (mode === "random") side = rng() < 0.5 ? -1 : 1;
      else {
        side = safeSide(tr);
        if (rng() < slip) side = (-side) as Side;
      }
      chop(tr, side);
      next = tr.t + pace * (0.75 + rng() * 0.5);
    }
    step(tr, dt);
  }
  return tr;
}

function shape(stage: number) {
  return {
    target: 30 + stage * 3, // 30 up to 117 logs
    share: Math.min(0.6, 0.3 + stage * 0.012), // logs with a branch
    drain: 0.55 + stage * 0.02,
    ramp: 0.004 + stage * 0.0002,
  };
}

/** Human-like choppers: about four bites a second, a wrong read about one bite in fifty. */
export const HUMAN_CHOPPERS: ChopperOpts[] = [1, 2, 3, 4, 5, 6].map((seed) => ({ pace: 0.27, slip: 0.02, seed }));

export function layout(stage: number, attempt: number): ChopStage {
  const sh = shape(stage);
  const rng = mulberry(461000 + stage * 293 + attempt * 7919);
  const branches: Branch[] = [0, 0, 0];
  while (branches.length < sh.target + 12) {
    const prev = branches[branches.length - 1];
    let b: Branch = rng() < sh.share ? (rng() < 0.5 ? -1 : 1) : 0;
    // never one on each side back to back; after a branch, often a gap
    if (prev !== 0 && b === -prev) b = 0;
    branches.push(b);
  }
  return { stage, branches, target: sh.target, drain: Math.round(sh.drain * 1000) / 1000, ramp: Math.round(sh.ramp * 100000) / 100000 };
}

/** Eases the clock until every human-like chopper finishes in time; random tapping must run out of hearts. */
export function buildStage(stage: number): ChopStage {
  for (let attempt = 0; attempt < 60; attempt++) {
    const st = layout(stage, attempt);
    for (let k = 0; k < 12 && HUMAN_CHOPPERS.some((o) => !pilot(st, o).won); k++) {
      st.drain = Math.round(st.drain * 900) / 1000;
      st.ramp = Math.round(st.ramp * 85000) / 100000;
    }
    if (HUMAN_CHOPPERS.some((o) => !pilot(st, o).won)) continue;
    // then a little more room, for slower hands than these
    st.drain = Math.round(st.drain * 820) / 1000;
    st.ramp = Math.round(st.ramp * 70000) / 100000;
    if (!pilot(st, { pace: 0.2 }).won || starsFor(pilot(st, { pace: 0.2 })) < 3) continue;
    if ([1, 2, 3].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    return st;
  }
  throw new Error(`beaver-chop stage ${stage + 1}: no fair tree`);
}

export const CHOP_STAGES: ChopStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
