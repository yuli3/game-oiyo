/**
 * Icicle Knock (고드름 따기) — knock the icicles off the eaves before they fall on someone.
 *
 * Icicles grow along the eaves of a hanok lane. Once one is long enough to break off, tap it to knock it
 * down; left too long it breaks off by itself. Either way it takes a moment to hit the ground, and if a
 * neighbour is walking underneath right then, they get bonked. Knock each icicle down while the path
 * below it is clear: a safe knock scores, a bonk costs two, an icicle that falls on its own scores
 * nothing. People stroll along the lane at their own pace, so look where they will be, not where they are.
 *
 * Pure and deterministic: growth and walkers are seeded per stage.
 */

export const ICICLE_SLUG = "icicle-knock";
export const STAGE_COUNT = 30;
export const LANES = 5;
export const LANE_W = 72; // px; the lane is 360 px wide
export const DROP = 0.45; // s from breaking off to hitting the ground
export const BREAK = 1; // grown share at which an icicle can be knocked off
export const SNAP = 1.6; // grown share at which it snaps off by itself
export const WALKER_W = 26; // px: a walker is hit if within this of the lane's middle at impact

export interface Walker { at: number; from: number; speed: number } // enters at x = from (0 or 360) at time `at`, px/s (signed)
export interface IcicleStage {
  stage: number;
  grow: number[]; // growth per second (share of BREAK) for each lane's icicles
  regrow: number; // s before a new icicle starts where one fell
  walkers: Walker[];
  length: number; // s of play
  need: number;
  par: number;
}

export interface Eaves {
  stage: IcicleStage;
  t: number;
  size: number[]; // grown share of each lane's icicle (0 while regrowing)
  wait: number[]; // s left before a lane regrows
  falling: Array<{ lane: number; hitAt: number; knocked: boolean }>;
  knocked: number;
  bonks: number;
  snapped: number;
  over: boolean;
  won: boolean;
}

export const laneX = (lane: number) => (lane + 0.5) * LANE_W;

export function walkerX(w: Walker, t: number): number | null {
  if (t < w.at) return null;
  const x = w.from + w.speed * (t - w.at);
  return x < -20 || x > LANES * LANE_W + 20 ? null : x;
}

/** Whether anyone is under a lane at time t. */
export function occupied(stage: IcicleStage, lane: number, t: number): boolean {
  const cx = laneX(lane);
  return stage.walkers.some((w) => {
    const x = walkerX(w, t);
    return x !== null && Math.abs(x - cx) <= WALKER_W;
  });
}

export function score(e: Eaves): number {
  return e.knocked - 2 * e.bonks;
}

export function newEaves(stage: IcicleStage): Eaves {
  return { stage, t: 0, size: stage.grow.map(() => 0.2), wait: stage.grow.map(() => 0), falling: [], knocked: 0, bonks: 0, snapped: 0, over: false, won: false };
}

export type KnockResult = "knocked" | "too-small" | null;

export function knock(e: Eaves, lane: number): KnockResult {
  if (e.over || e.wait[lane] > 0) return null;
  if (e.size[lane] < BREAK) return "too-small";
  e.size[lane] = 0;
  e.wait[lane] = e.stage.regrow;
  e.falling.push({ lane, hitAt: e.t + DROP, knocked: true });
  return "knocked";
}

export interface EavesEvents { landed: Array<{ lane: number; bonk: boolean; knocked: boolean }>; snapped: number[]; end: boolean }

export function stepEaves(e: Eaves, dt: number): EavesEvents {
  const ev: EavesEvents = { landed: [], snapped: [], end: false };
  if (e.over) return ev;
  e.t += dt;
  for (let l = 0; l < LANES; l++) {
    if (e.wait[l] > 0) {
      e.wait[l] = Math.max(0, e.wait[l] - dt);
      continue;
    }
    e.size[l] += e.stage.grow[l] * dt;
    if (e.size[l] >= SNAP) {
      e.size[l] = 0;
      e.wait[l] = e.stage.regrow;
      e.falling.push({ lane: l, hitAt: e.t + DROP, knocked: false });
      e.snapped++;
      ev.snapped.push(l);
    }
  }
  e.falling = e.falling.filter((f) => {
    if (e.t < f.hitAt) return true;
    const bonk = occupied(e.stage, f.lane, f.hitAt);
    if (bonk) e.bonks++;
    else if (f.knocked) e.knocked++;
    ev.landed.push({ lane: f.lane, bonk, knocked: f.knocked });
    return false;
  });
  if (e.t >= e.stage.length && e.falling.length === 0) {
    e.over = true;
    e.won = score(e) >= e.stage.need;
    ev.end = true;
  }
  return ev;
}

export function starsFor(e: Eaves): number {
  if (!e.won) return 0;
  if (e.bonks === 0 && score(e) >= e.stage.need + 3) return 3;
  if (score(e) >= e.stage.need + 1) return 2;
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
  /** s between seeing and tapping */
  react?: number;
  /** s between two taps */
  tapGap?: number;
  /** "read" checks where walkers will be; "eager" knocks as soon as it can; "never" never taps */
  mode?: "read" | "eager" | "never";
}

/**
 * Autopilot: among the icicles that can be knocked, taps the one closest to snapping whose lane will be
 * clear when it lands (allowing for the reaction time), one tap at a time.
 */
export function pilot(stage: IcicleStage, opts: PilotOpts = {}): Eaves {
  const { react = 0.1, tapGap = 0.2, mode = "read" } = opts;
  const e = newEaves(stage);
  const dt = 1 / 60;
  let ready = 0;
  const planned: Array<{ lane: number; at: number }> = [];
  while (!e.over && e.t < 900) {
    for (let k = planned.length - 1; k >= 0; k--) {
      if (planned[k].at <= e.t) {
        knock(e, planned[k].lane);
        planned.splice(k, 1);
      }
    }
    if (mode !== "never" && e.t >= ready) {
      let pick = -1;
      let best = -1;
      for (let l = 0; l < LANES; l++) {
        if (e.wait[l] > 0 || e.size[l] < BREAK || planned.some((p) => p.lane === l)) continue;
        const hit = e.t + react + DROP;
        // it must still be there to knock, and the lane must be clear (with a little room) when it lands
        const left = (SNAP - e.size[l]) / stage.grow[l];
        if (left < react) continue;
        if (mode === "read" && (occupied(stage, l, hit) || occupied(stage, l, hit - 0.08) || occupied(stage, l, hit + 0.08))) continue;
        if (e.size[l] > best) {
          best = e.size[l];
          pick = l;
        }
      }
      if (pick >= 0) {
        planned.push({ lane: pick, at: e.t + react });
        ready = e.t + react + tapGap;
      }
    }
    stepEaves(e, dt);
  }
  return e;
}

function shape(stage: number) {
  return {
    grow: 0.22 + stage * 0.006,
    regrow: Math.max(0.6, 1.4 - stage * 0.02),
    walkEvery: Math.max(1, 2.2 - stage * 0.04),
    walkSpeed: 55 + stage * 1.6,
    length: 40 + stage * 0.6,
  };
}

export function buildStage(stage: number): IcicleStage {
  const sh = shape(stage);
  const rng = mulberry(12100 + stage * 53);
  const grow = Array.from({ length: LANES }, () => sh.grow * (0.75 + rng() * 0.5));
  const walkers: Walker[] = [];
  let t = 0.5;
  while (t < sh.length) {
    const right = rng() < 0.5;
    const speed = sh.walkSpeed * (0.6 + rng() * 0.8) * (right ? 1 : -1);
    walkers.push({ at: t, from: right ? -20 : LANES * LANE_W + 20, speed });
    t += sh.walkEvery * (0.5 + rng());
  }
  const st: IcicleStage = { stage, grow, regrow: sh.regrow, walkers, length: sh.length, need: 0, par: 0 };
  st.par = score(pilot(st));
  // the mark: the worst of three human-paced players (seeing to tapping 0.3–0.45 s), less a little room
  const human = [0.28, 0.33, 0.38, 0.42, 0.46].map((react) => score(pilot(st, { react, tapGap: 0.32 }))).sort((a, b) => a - b);
  st.need = Math.max(4, Math.floor(human[1] * 0.85));
  return st;
}

export const ICICLE_STAGES: IcicleStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
