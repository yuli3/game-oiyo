/**
 * Bounce Down (통통 내려가기) — an OIYO original drop-through-the-tower game (2026-11-25).
 *
 * A jelly ball bounces in place on a tall candy tower. Each floor is a ring of twelve slices with a gap in it; turn
 * the tower and when the gap comes under the ball, it drops through to the next floor. Some slices are sour (red):
 * bounce on one and you lose a heart. Reach the bottom before the clock runs out.
 *
 * Pure and deterministic: every tower's gaps and sour slices are seeded per stage.
 */

export const BOUNCE_SLUG = "bounce-down";
export const STAGE_COUNT = 30;
export const SLICES = 12;
export const PERIOD = 0.55; // seconds between bounces
export const TURN_SPEED = 16; // slices per second the tower turns at most
export const HEARTS = 3;

export interface Floor { gap: number; width: number; sour: number[] }
export interface BounceStage {
  stage: number;
  floors: Floor[];
  limit: number;
  par: number;
}

export interface Tower {
  stage: BounceStage;
  angle: number; // how far the tower has turned, in slices
  turn: number; // −1, 0 or 1: the way it is being turned
  target: number | null; // a slice to turn to (taps and drags set this)
  floor: number; // the floor the ball is on
  clock: number; // time to the next bounce
  t: number;
  hearts: number;
  over: boolean;
  won: boolean;
}

export const newTower = (stage: BounceStage): Tower => ({ stage, angle: 0, turn: 0, target: null, floor: 0, clock: PERIOD, t: 0, hearts: HEARTS, over: false, won: false });

const mod = (a: number, n: number) => ((a % n) + n) % n;
/** The slice under the ball. */
export const under = (tw: Tower) => Math.floor(mod(tw.angle, SLICES));
export const isGap = (f: Floor, s: number) => mod(s - f.gap, SLICES) < f.width;

/** Turns the tower by an amount (a drag). */
export function twist(tw: Tower, slices: number): void {
  if (tw.over) return;
  tw.angle += slices;
  tw.target = null;
}

/** Holds the tower turning one way (−1, 0, 1), for keys. */
export function hold(tw: Tower, dir: number): void {
  if (tw.over) return;
  tw.turn = Math.sign(dir);
  tw.target = null;
}

/** Turns the tower toward a slice at full speed (the shortest way). */
export function aim(tw: Tower, slice: number): void {
  if (tw.over) return;
  tw.target = slice;
  tw.turn = 0;
}

export type BounceEvent = "drop" | "sour" | "bounce" | null;

export function step(tw: Tower, dt: number): BounceEvent {
  if (tw.over) return null;
  tw.t += dt;
  if (tw.target !== null) {
    const want = tw.target + 0.5;
    const d = mod(want - mod(tw.angle, SLICES) + SLICES / 2, SLICES) - SLICES / 2;
    const move = Math.sign(d) * Math.min(Math.abs(d), TURN_SPEED * dt);
    tw.angle += move;
    if (Math.abs(d) < 0.05) tw.target = null;
  } else if (tw.turn) tw.angle += tw.turn * TURN_SPEED * dt;
  let ev: BounceEvent = null;
  tw.clock -= dt;
  if (tw.clock <= 0) {
    tw.clock += PERIOD;
    const f = tw.stage.floors[tw.floor];
    const s = under(tw);
    if (isGap(f, s)) {
      tw.floor++;
      ev = "drop";
      if (tw.floor >= tw.stage.floors.length) {
        tw.over = true;
        tw.won = true;
        return ev;
      }
    } else if (f.sour.includes(s)) {
      tw.hearts--;
      ev = "sour";
      if (tw.hearts <= 0) {
        tw.over = true;
        return ev;
      }
    } else ev = "bounce";
  }
  if (tw.t >= tw.stage.limit) tw.over = true;
  return ev;
}

export function starsFor(tw: Tower): number {
  if (!tw.won) return 0;
  if (tw.hearts === HEARTS && tw.t <= tw.stage.par) return 3;
  if (tw.hearts >= HEARTS - 1) return 2;
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

export interface SpinnerOpts {
  /** seconds to spot the gap on a new floor */
  react?: number;
  /** chance of turning the long way round */
  slip?: number;
  /** wait for a bounce before turning across sour slices */
  careful?: boolean;
  seed?: number;
  /** "aim" turns to the gap; "random" turns at random */
  mode?: "aim" | "random";
}

export function pilot(st: BounceStage, opts: SpinnerOpts = {}): Tower {
  const { react = 0.3, slip = 0, careful = true, seed = 1, mode = "aim" } = opts;
  const rng = mulberry(seed * 4561 + 47);
  const tw = newTower(st);
  const dt = 1 / 30;
  let seen = -1;
  let wait = 0;
  let flip = 0;
  while (!tw.over) {
    if (mode === "random") {
      if (tw.t >= flip) {
        hold(tw, Math.floor(rng() * 3) - 1);
        flip = tw.t + 0.2 + rng() * 0.8;
      }
    } else if (tw.floor !== seen) {
      seen = tw.floor;
      wait = tw.t + react * (0.8 + rng() * 0.4);
      tw.target = null;
      tw.turn = 0;
    } else if (tw.t >= wait && tw.target === null && !isGap(st.floors[tw.floor], under(tw))) {
      const f = st.floors[tw.floor];
      const goal = f.gap + Math.floor((f.width - 1) / 2);
      // a careful player starts the turn right after a bounce so the ball is in the air while sour slices pass by
      if (!careful || tw.clock > PERIOD * 0.7) {
        if (rng() < slip) {
          // the long way round: turn the other way for a while first
          hold(tw, -Math.sign(mod(goal + 0.5 - mod(tw.angle, SLICES) + SLICES / 2, SLICES) - SLICES / 2) || 1);
          wait = tw.t + 0.4;
        } else aim(tw, goal);
      }
    }
    step(tw, dt);
  }
  return tw;
}

function shape(stage: number) {
  return {
    floors: 8 + Math.floor(stage * 0.8),
    width: stage < 6 ? 2 : 1,
    sour: stage < 3 ? 0 : Math.min(4, 1 + Math.floor((stage - 3) / 7)),
    sourShare: stage < 3 ? 0 : Math.min(0.8, 0.3 + stage * 0.02), // share of floors with sour slices
    slack: stage < 5 ? 2 : stage < 15 ? 1.7 : 1.5,
  };
}

/** Human-like spinners: a third of a second to spot the gap, the long way round one floor in ten. */
export const HUMAN_SPINNERS: SpinnerOpts[] = [1, 2, 3, 4, 5, 6].map((seed) => ({ react: 0.35, slip: 0.1, careful: true, seed }));

export function layout(stage: number, attempt: number): BounceStage {
  const sh = shape(stage);
  const rng = mulberry(411000 + stage * 263 + attempt * 7919);
  const floors: Floor[] = [];
  let prev = 0;
  for (let k = 0; k < sh.floors; k++) {
    // the next gap lands a fair way round from the last one
    const gap = mod(prev + 3 + Math.floor(rng() * (SLICES - 5)), SLICES);
    const sour: number[] = [];
    if (k > 0 && rng() < sh.sourShare)
      for (let tries = 0; tries < 30 && sour.length < sh.sour; tries++) {
        const s = Math.floor(rng() * SLICES);
        // never on the gap or right beside it, nor where the ball lands from the floor above
        if (mod(s - gap, SLICES) < sh.width + 1 || mod(gap - s, SLICES) <= 1 || mod(s - prev, SLICES) < 2 || sour.includes(s)) continue;
        sour.push(s);
      }
    floors.push({ gap, width: sh.width, sour });
    prev = gap;
  }
  return { stage, floors, limit: 0, par: 0 };
}

/** Sets the clock from the slowest human-like spinner, with room to spare; random turning must fall short. */
export function buildStage(stage: number): BounceStage {
  const sh = shape(stage);
  for (let attempt = 0; attempt < 300; attempt++) {
    const st = layout(stage, attempt);
    st.limit = 1000;
    const runs = HUMAN_SPINNERS.map((o) => pilot(st, o));
    if (runs.some((r) => !r.won)) continue;
    const slowest = Math.max(...runs.map((r) => r.t));
    st.limit = Math.ceil(slowest * sh.slack) + 4;
    const quick = pilot(st, { react: 0.25, careful: true, seed: 1 });
    if (!quick.won || quick.hearts < HEARTS) continue;
    st.par = Math.ceil(quick.t * 1.2);
    if ([1, 2, 3].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    return st;
  }
  throw new Error(`bounce-down stage ${stage + 1}: no fair tower`);
}

export const BOUNCE_STAGES: BounceStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
