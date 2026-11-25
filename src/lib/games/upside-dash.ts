/**
 * Upside Dash (거꾸로 대시) — an OIYO original gravity-flip runner (2026-11-25).
 *
 * A little magnet robot runs along a tunnel on its own, stuck to the floor or the ceiling. Tap and it flips to the
 * other side. Spikes grow from the floor and the ceiling, and saw blades spin in the middle of the tunnel. Reach the
 * end with a heart left; grab the batteries on the way for stars.
 *
 * Pure and deterministic: every stage's tunnel is laid along a flip schedule that clears it (seeded per stage).
 * Field px, y pointing down; x is distance along the tunnel.
 */

export const UPSIDE_SLUG = "upside-dash";
export const STAGE_COUNT = 30;
export const FLOOR = 400; // the robot's centre when on the floor
export const CEIL = 160; // … and on the ceiling
export const MID = (FLOOR + CEIL) / 2;
export const HALF = 12; // the robot's half size
export const FLIP_T = 0.22; // seconds to cross from one side to the other
export const HEARTS = 3;
export const SAFE_T = 1; // seconds of passing through after a hit
export const PLAYER_X = 90; // where the robot is drawn on screen

export type Lane = 0 | 1 | 2; // floor spikes, middle saw, ceiling spikes
export interface Hazard { x: number; w: number; lane: Lane }
export interface Battery { x: number; y: number }

export interface UpsideStage {
  stage: number;
  speed: number; // px per second
  length: number; // px to the end
  hazards: Hazard[];
  batteries: Battery[];
  flips: number[]; // x where the planned run taps
  par: number; // batteries for three stars
}

export interface Run {
  stage: UpsideStage;
  t: number;
  x: number;
  y: number;
  side: 0 | 1; // 0 floor, 1 ceiling (where it is going, while flipping)
  flipping: boolean;
  hearts: number;
  safe: number;
  got: boolean[];
  batteries: number;
  hits: number;
  over: boolean;
  won: boolean;
}

export function newRun(stage: UpsideStage): Run {
  return { stage, t: 0, x: 0, y: FLOOR, side: 0, flipping: false, hearts: HEARTS, safe: 0, got: stage.batteries.map(() => false), batteries: 0, hits: 0, over: false, won: false };
}

/** The vertical band a hazard fills. */
export function band(lane: Lane): [number, number] {
  if (lane === 0) return [FLOOR - 18, FLOOR + 30];
  if (lane === 2) return [CEIL - 30, CEIL + 18];
  return [MID - 22, MID + 22];
}

/** Tap: flip to the other side (not while already flipping). */
export function flip(r: Run): boolean {
  if (r.over || r.flipping) return false;
  r.side = r.side === 0 ? 1 : 0;
  r.flipping = true;
  return true;
}

export type StepEvent = { hit: boolean; battery: boolean; landed: boolean };

export function step(r: Run, dt: number): StepEvent {
  const ev: StepEvent = { hit: false, battery: false, landed: false };
  if (r.over) return ev;
  r.t += dt;
  r.x += r.stage.speed * dt;
  if (r.flipping) {
    const target = r.side === 0 ? FLOOR : CEIL;
    const v = ((FLOOR - CEIL) / FLIP_T) * dt;
    if (Math.abs(target - r.y) <= v) {
      r.y = target;
      r.flipping = false;
      ev.landed = true;
    } else r.y += Math.sign(target - r.y) * v;
  }
  r.safe = Math.max(0, r.safe - dt);
  if (r.safe === 0) {
    for (const h of r.stage.hazards) {
      if (h.x > r.x + HALF || h.x + h.w < r.x - HALF) continue;
      const [y0, y1] = band(h.lane);
      if (r.y + HALF > y0 && r.y - HALF < y1) {
        r.hearts--;
        r.hits++;
        r.safe = SAFE_T;
        ev.hit = true;
        break;
      }
    }
  }
  r.stage.batteries.forEach((b, k) => {
    if (r.got[k] || Math.abs(b.x - r.x) > 16 || Math.abs(b.y - r.y) > 22) return;
    r.got[k] = true;
    r.batteries++;
    ev.battery = true;
  });
  if (r.hearts <= 0) r.over = true;
  else if (r.x >= r.stage.length) {
    r.over = true;
    r.won = true;
  }
  return ev;
}

export function starsFor(r: Run): number {
  if (!r.won) return 0;
  if (r.hits === 0 && r.batteries >= r.stage.par) return 3;
  if (r.hits <= 1) return 2;
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

function gauss(rng: () => number): number {
  const u = Math.max(1e-9, rng());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

export interface RunnerOpts {
  /** how far ahead (seconds) the player reacts to spikes on its side, and the spread of its timing */
  lead?: number;
  timing?: number;
  seed?: number;
  mode?: "react" | "plan" | "random";
}

const DT = 1 / 120;

/** The x where the next hazard on the lane the robot is on (or is heading for) begins, ahead of x. */
function nextOn(st: UpsideStage, lane: Lane, x: number): Hazard | undefined {
  let best: Hazard | undefined;
  for (const h of st.hazards) if (h.lane === lane && h.x + h.w > x - HALF && (!best || h.x < best.x)) best = h;
  return best;
}

/** Plays a stage. react: flips when spikes on its side come within `lead` seconds and the other side is clear. */
export function pilot(st: UpsideStage, opts: RunnerOpts = {}): Run {
  const { lead = 0.3, timing = 0.04, seed = 1, mode = "react" } = opts;
  const rng = mulberry(seed * 3907 + 13);
  const r = newRun(st);
  let k = 0;
  let tapAt = -1;
  let nextRandom = 0.5;
  while (!r.over) {
    if (mode === "plan") {
      while (k < st.flips.length && r.x >= st.flips[k]) {
        flip(r);
        k++;
      }
    } else if (mode === "random") {
      if (r.t >= nextRandom) {
        flip(r);
        nextRandom = r.t + 0.2 + rng() * 1.6;
      }
    } else if (!r.flipping) {
      if (tapAt < 0) {
        const mine: Lane = r.side === 0 ? 0 : 2;
        const other: Lane = r.side === 0 ? 2 : 0;
        const h = nextOn(st, mine, r.x);
        const here = h && h.x - r.x < st.speed * lead;
        if (here) {
          // only cross if the other side and the middle are clear while crossing
          const crossEnd = r.x + st.speed * (FLIP_T + 0.05);
          const blocked = st.hazards.some((z) => (z.lane === other || z.lane === 1) && z.x < crossEnd + HALF && z.x + z.w > r.x - HALF);
          if (!blocked) tapAt = r.t + Math.max(0, gauss(rng) * timing);
        }
      }
      if (tapAt >= 0 && r.t >= tapAt) {
        flip(r);
        tapAt = -1;
      }
    }
    step(r, DT);
  }
  return r;
}

function shape(stage: number) {
  return {
    speed: 170 + stage * 5, // px/s
    seconds: 16 + Math.floor(stage / 2), // how long the run lasts
    gap: [Math.max(0.85, 1.6 - stage * 0.03), Math.max(1.4, 2.6 - stage * 0.04)] as [number, number], // seconds between flips
    window: Math.max(0.32, 0.6 - stage * 0.01), // seconds the flip can be early or late (each way)
    saws: stage < 4 ? 0 : Math.min(0.6, 0.15 + stage * 0.016), // chance a stretch gets a saw in the middle
  };
}

/** Human-like runners: react about a third of a second ahead, give or take a few hundredths. */
export const HUMAN_RUNNERS: RunnerOpts[] = [1, 2, 3, 4, 5, 6].map((seed) => ({ lead: 0.34, timing: 0.05, seed }));

export function buildStage(stage: number): UpsideStage {
  const sh = shape(stage);
  for (let attempt = 0; attempt < 300; attempt++) {
    const rng = mulberry(591000 + stage * 389 + attempt * 7919);
    const v = sh.speed;
    const length = Math.round(v * sh.seconds);
    const hazards: Hazard[] = [];
    const batteries: Battery[] = [];
    const flips: number[] = [];
    const win = sh.window * v;
    const cross = FLIP_T * v;
    // stretches between flips; on stretch i the robot is on side i % 2 (floor first)
    let x = v * 1.5;
    let side = 0;
    let prevFlip = 0;
    while (x < length - v * 2) {
      const len = v * (sh.gap[0] + rng() * (sh.gap[1] - sh.gap[0]));
      const flipX = Math.round(x + len);
      if (flipX > length - v * 1.5) break;
      // spikes on the side the robot is on, from just after the flip window: they make it flip
      const mineLane: Lane = side === 0 ? 0 : 2;
      const otherLane: Lane = side === 0 ? 2 : 0;
      const spikeFrom = flipX + win + HALF;
      // spikes on the other side up to just before the window: they stop an early flip
      const otherTo = flipX - win - HALF;
      const otherFrom = Math.max(prevFlip + cross + win + HALF, otherTo - v * (0.5 + rng() * 0.6));
      if (otherTo - otherFrom > 20) hazards.push({ x: Math.round(otherFrom), w: Math.round(otherTo - otherFrom), lane: otherLane });
      hazards.push({ x: Math.round(spikeFrom), w: Math.round(Math.min(v * (0.4 + rng() * 0.5), length - spikeFrom - 10)), lane: mineLane });
      // a saw in the middle, well away from any crossing
      if (rng() < sh.saws) {
        const sx = prevFlip + cross + win + 40 + rng() * Math.max(0, flipX - win - 60 - (prevFlip + cross + win + 40));
        if (sx + 36 < flipX - win - HALF) hazards.push({ x: Math.round(sx), w: 36, lane: 1 });
      }
      // batteries along the planned run: one on this stretch, one mid-crossing
      const by = side === 0 ? FLOOR : CEIL;
      batteries.push({ x: Math.round((x + flipX) / 2), y: by });
      batteries.push({ x: flipX, y: MID });
      flips.push(Math.max(0, Math.round(flipX - cross / 2)));
      prevFlip = flipX;
      x = flipX;
      side = 1 - side;
    }
    if (flips.length < 4) continue;
    hazards.sort((a, b) => a.x - b.x);
    const st: UpsideStage = { stage, speed: v, length, hazards, batteries, flips, par: 0 };
    const planned = pilot(st, { mode: "plan" });
    if (!planned.won || planned.hits > 0) continue;
    st.par = Math.max(1, planned.batteries - (stage < 10 ? 2 : 1));
    if (HUMAN_RUNNERS.some((o) => !pilot(st, o).won)) continue;
    if ([1, 2, 3, 4, 5, 6].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    return st;
  }
  throw new Error(`upside-dash stage ${stage + 1}: no fair tunnel`);
}

export const UPSIDE_STAGES: UpsideStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
