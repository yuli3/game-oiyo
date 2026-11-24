/**
 * 하프파이프 (Snow Halfpipe) — an OIYO original snowboard halfpipe game.
 * The rider swings from wall to wall of a snow halfpipe. Tap as you cross the flat bottom to pump
 * and gain speed; a tap anywhere else is a bobble that costs speed. Fly out above the lip, hold to
 * spin and let go to stop: land with the board straight (any whole number of half turns, within 30°)
 * and the spin scores, land crooked and you wipe out, losing the hit and most of your speed.
 * More air means more time to spin. Every pipe's mark comes from an autopilot that pumps every pass
 * and spins as much as each air allows.
 */

export const PIPE_SLUG = "snow-halfpipe";
export const STAGE_COUNT = 30;
export const FIELD_W = 360;
export const FIELD_H = 560;
export const GRAVITY = 900;
export const SPIN_RATE = 640; // degrees per second while holding
export const LAND_TOL = 30; // degrees either side of a half turn
export const BOTTOM = 0.22; // share of the half-width counted as the flat bottom for pumping

export interface Pipe {
  stage: number;
  half: number; // half-width (px)
  depth: number; // wall height (px)
  friction: number; // speed lost per second, as a share
  pump: number; // speed added by a pump (px/s)
  hits: number; // airs per run
  goal: number;
  par: number;
}

export interface Rider {
  pipe: Pipe;
  time: number;
  x: number; // across the pipe, -half..half
  v: number; // dx/dt along the bottom (px/s, signed)
  air: boolean;
  y: number; // height above the lip while airborne
  vy: number;
  side: number; // which wall we are flying off (-1 or 1)
  spin: number; // degrees spun this air
  spinning: boolean;
  pumped: boolean; // pumped on this pass through the bottom
  hit: number; // airs done
  score: number;
  peak: number;
  lastHit: { points: number; spin: number; clean: boolean; height: number } | null;
  crashes: number;
  over: boolean;
  won: boolean;
}

export function newRider(pipe: Pipe): Rider {
  // drop in from the left lip
  return { pipe, time: 0, x: -pipe.half, v: 60, air: false, y: 0, vy: 0, side: -1, spin: 0, spinning: false, pumped: false, hit: 0, score: 0, peak: 0, lastHit: null, crashes: 0, over: false, won: false };
}

/** Height of the pipe wall at x (0 at the bottom, depth at the lips). */
export function wallY(p: Pipe, x: number): number {
  const u = Math.min(1, Math.abs(x) / p.half);
  return p.depth * Math.pow(u, 2.2);
}
function slope(p: Pipe, x: number): number {
  const u = Math.min(1, Math.abs(x) / p.half);
  return Math.sign(x) * (p.depth * 2.2 * Math.pow(u, 1.2)) / p.half;
}

export type TapResult = "pump" | "bobble" | "spin" | null;

/** A tap or press: pumps in the bottom, starts a spin in the air. */
export function press(r: Rider): TapResult {
  if (r.over) return null;
  if (r.air) {
    r.spinning = true;
    return "spin";
  }
  if (Math.abs(r.x) < r.pipe.half * BOTTOM) {
    if (r.pumped) return null;
    r.pumped = true;
    r.v += Math.sign(r.v || 1) * r.pipe.pump;
    return "pump";
  }
  r.v *= 0.9;
  return "bobble";
}

/** Letting go stops the spin. */
export function letGo(r: Rider): void {
  r.spinning = false;
}

export interface RiderEvents { launch: boolean; land: null | { clean: boolean; points: number; spin: number }; done: boolean }

export function landedClean(spin: number): boolean {
  const off = spin % 180;
  return off <= LAND_TOL || off >= 180 - LAND_TOL;
}

export function pointsFor(spin: number, peak: number): number {
  const halves = Math.round(spin / 180);
  return halves * 5 + Math.floor(peak / 12);
}

export function stepRider(r: Rider, dt: number): RiderEvents {
  const ev: RiderEvents = { launch: false, land: null, done: false };
  if (r.over) return ev;
  const p = r.pipe;
  const n = Math.max(1, Math.ceil(dt / (1 / 480)));
  const h = dt / n;
  for (let k = 0; k < n && !r.over; k++) {
    r.time += h;
    if (r.air) {
      r.vy -= GRAVITY * h;
      r.y += r.vy * h;
      r.peak = Math.max(r.peak, r.y);
      if (r.spinning) r.spin += SPIN_RATE * h;
      if (r.y <= 0 && r.vy < 0) {
        // back into the pipe on the same wall, heading down
        r.air = false;
        r.y = 0;
        const clean = landedClean(r.spin);
        const speed = Math.abs(r.vy);
        const pts = clean ? pointsFor(r.spin, r.peak) : 0;
        r.score += pts;
        r.hit++;
        r.lastHit = { points: pts, spin: r.spin, clean, height: r.peak };
        if (!clean) r.crashes++;
        r.v = -r.side * speed * (clean ? 0.97 : 0.35);
        r.x = r.side * (p.half - 0.5);
        r.spinning = false;
        ev.land = { clean, points: pts, spin: r.spin };
        if (r.hit >= p.hits) {
          r.over = true;
          r.won = r.score >= p.goal;
          ev.done = true;
        }
      }
      continue;
    }
    // along the pipe: gravity down the wall, a little friction
    const s = slope(p, r.x);
    const a = (-GRAVITY * s) / (1 + s * s);
    r.v += a * h;
    r.v *= 1 - p.friction * h;
    const px = r.x;
    r.x += (r.v * h) / Math.sqrt(1 + s * s);
    if (Math.sign(px) !== Math.sign(r.x) || px === 0) r.pumped = false; // a new pass through the bottom
    if (Math.abs(r.x) >= p.half) {
      // out over the lip: the speed along the wall becomes height
      r.side = Math.sign(r.x);
      r.x = r.side * p.half;
      r.vy = Math.abs(r.v);
      if (r.vy < 40) {
        // not enough speed to leave the pipe: slide back down
        r.v = -r.v;
        continue;
      }
      r.air = true;
      r.y = 0;
      r.peak = 0;
      r.spin = 0;
      ev.launch = true;
    }
  }
  return ev;
}

export function starsFor(r: Rider): number {
  if (!r.won) return 0;
  if (r.score >= r.pipe.goal * 1.12) return 3;
  if (r.score >= r.pipe.goal * 1.05) return 2;
  return 1;
}

/** Seconds of air from a launch at vy (up and back down to the lip). */
export const airTime = (vy: number) => (2 * vy) / GRAVITY;

/**
 * Autopilot: pumps on every pass through the bottom (`pumpMiss` = share of passes it forgets), and in
 * the air spins the most half turns that fit (`greed` extra half turns, `stopErr` degrees of sloppiness
 * in when it lets go).
 */
export function pilot(pipe: Pipe, opts: { pumpMiss?: number; greed?: number; stopErr?: number; seed?: number; halvesOnly?: boolean } = {}): Rider {
  const { pumpMiss = 0, greed = 0, stopErr = 0, seed = 1 } = opts;
  const r = newRider(pipe);
  let s = seed >>> 0;
  const rng = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const dt = 1 / 60;
  let target = 0;
  let wantPump = true;
  let decided = false;
  while (!r.over && r.time < 300) {
    if (!r.air) {
      decided = false;
      if (!r.pumped && Math.abs(r.x) < pipe.half * 0.08) {
        if (wantPump) press(r);
        wantPump = rng() >= pumpMiss;
      }
    } else {
      if (!decided) {
        decided = true;
        // the whole air lasts 2 vy / g; leave a little time to stop, then pick whole half turns
        const t = airTime(r.vy) - 0.12;
        const halves = Math.max(0, Math.floor((t * SPIN_RATE) / 180)) + greed;
        target = halves * 180 + (rng() - 0.5) * 2 * stopErr;
        if (halves > 0) press(r);
      }
      if (r.spinning && r.spin >= target) letGo(r);
    }
    stepRider(r, dt);
  }
  return r;
}

function shape(stage: number) {
  return {
    half: 140,
    depth: 150 + Math.min(60, stage * 2),
    friction: 0.05 + stage * 0.002,
    pump: Math.max(55, 85 - stage * 0.8),
    hits: 5 + Math.floor(stage / 6),
    frac: Math.min(0.88, 0.6 + stage * 0.01),
  };
}

export function buildPipe(stage: number): Pipe {
  const sh = shape(stage);
  const pipe: Pipe = { stage, half: sh.half, depth: sh.depth, friction: sh.friction, pump: sh.pump, hits: sh.hits, goal: 0, par: 0 };
  pipe.par = pilot(pipe).score;
  pipe.goal = Math.max(5, Math.round(pipe.par * sh.frac));
  return pipe;
}

export const PIPES: Pipe[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildPipe(i));
