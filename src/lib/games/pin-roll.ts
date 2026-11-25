/**
 * Pin Roll (핀 롤) — an OIYO original flick bowling game (2026-11-25).
 *
 * A short toy bowling lane, ten pins at the far end and, further on, rubber posts in the way. Put your finger where the
 * ball should start, flick it up the lane: the flick sets the direction and the speed. Two rolls a frame; knock down
 * the stage's pins over its frames. A strike (all ten with the first roll) scores a bonus.
 *
 * Pure and deterministic: fixed time steps, every stage's posts seeded per stage. Field px, y pointing down.
 */

export const PIN_SLUG = "pin-roll";
export const STAGE_COUNT = 30;
export const LANE_L = 110;
export const LANE_R = 250;
export const FOUL = 470; // where the ball starts
export const BACK = 112; // the back of the pin deck
export const BALL_R = 12;
export const PIN_R = 7;
export const POST_R = 9;
export const HEAD_Y = 190; // the head pin
export const MIN_SPEED = 260;
export const MAX_SPEED = 760;
export const DT = 1 / 240;
export const STRIKE_BONUS = 5;
export const SPARE_BONUS = 2;

/** The ten pins: head pin nearest the bowler, four rows. */
export const PIN_SPOTS: Array<[number, number]> = (() => {
  const out: Array<[number, number]> = [];
  const cx = (LANE_L + LANE_R) / 2;
  for (let row = 0; row < 4; row++) for (let k = 0; k <= row; k++) out.push([cx + (k - row / 2) * 24, HEAD_Y - row * 22]);
  return out;
})();

export interface PinStage {
  stage: number;
  frames: number;
  posts: Array<[number, number]>;
  need: number;
  par: number;
}

interface Body { x: number; y: number; vx: number; vy: number; r: number; m: number; f: number }
export interface Pin extends Body { standing: boolean; hit: boolean; sx: number; sy: number }

export interface Alley {
  stage: PinStage;
  frame: number; // 0-based
  roll: 0 | 1;
  ball: (Body & { gutter: boolean }) | null;
  pins: Pin[];
  score: number;
  knocked: number; // pins down this frame so far
  strikes: number;
  log: number[]; // pins per roll
  over: boolean;
  won: boolean;
}

const freshPins = (): Pin[] => PIN_SPOTS.map(([x, y]) => ({ x, y, vx: 0, vy: 0, r: PIN_R, m: 1, f: 380, standing: true, hit: false, sx: x, sy: y }));

export function newAlley(stage: PinStage): Alley {
  return { stage, frame: 0, roll: 0, ball: null, pins: freshPins(), score: 0, knocked: 0, strikes: 0, log: [], over: false, won: false };
}

/** Rolls the ball from x0 at `angle` (radians off straight up the lane, right is positive) and `speed` px/s. */
export function roll(a: Alley, x0: number, angle: number, speed: number): boolean {
  if (a.over || a.ball) return false;
  const x = Math.max(LANE_L + BALL_R, Math.min(LANE_R - BALL_R, x0));
  const s = Math.max(MIN_SPEED, Math.min(MAX_SPEED, speed));
  a.ball = { x, y: FOUL, vx: Math.sin(angle) * s, vy: -Math.cos(angle) * s, r: BALL_R, m: 6, f: 30, gutter: false };
  return true;
}

function collide(p: Body, q: Body): boolean {
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  const d = Math.hypot(dx, dy);
  const min = p.r + q.r;
  if (d >= min || d === 0) return false;
  const nx = dx / d;
  const ny = dy / d;
  const push = min - d;
  const tm = p.m + q.m;
  p.x -= nx * push * (q.m / tm);
  p.y -= ny * push * (q.m / tm);
  q.x += nx * push * (p.m / tm);
  q.y += ny * push * (p.m / tm);
  const rel = (p.vx - q.vx) * nx + (p.vy - q.vy) * ny;
  if (rel <= 0) return true;
  const j = (1.85 * rel) / tm; // a little short of perfectly elastic
  p.vx -= j * q.m * nx;
  p.vy -= j * q.m * ny;
  q.vx += j * p.m * nx;
  q.vy += j * p.m * ny;
  return true;
}

function slow(b: Body): void {
  const sp = Math.hypot(b.vx, b.vy);
  if (sp === 0) return;
  const ns = Math.max(0, sp - b.f * DT);
  if (ns < 3) {
    b.vx = 0;
    b.vy = 0;
  } else {
    b.vx *= ns / sp;
    b.vy *= ns / sp;
  }
  b.x += b.vx * DT;
  b.y += b.vy * DT;
}

export type RollEvent = { down: number; strike: boolean; spare: boolean; gutter: boolean };

/** One fixed step. Returns a RollEvent when the roll has finished, else null. */
export function step(a: Alley): RollEvent | null {
  const b = a.ball;
  if (!b) return null;
  slow(b);
  if (!b.gutter && (b.x < LANE_L || b.x > LANE_R)) {
    b.gutter = true; // into the gutter: it runs on past the pins
    b.vx = 0;
  }
  const up = a.pins.filter((p) => p.standing);
  for (const p of up) slow(p);
  if (!b.gutter) {
    for (const [px, py] of a.stage.posts) {
      const post: Body = { x: px, y: py, vx: 0, vy: 0, r: POST_R, m: 1e6, f: 0 };
      collide(b, post);
    }
    for (const p of up) if (collide(b, p)) p.hit = true;
  }
  for (let i = 0; i < up.length; i++) {
    for (let j = i + 1; j < up.length; j++) if (collide(up[i], up[j])) up[i].hit = up[j].hit = true;
    for (const [px, py] of a.stage.posts) collide(up[i], { x: px, y: py, vx: 0, vy: 0, r: POST_R, m: 1e6, f: 0 });
  }
  // a pin that has been knocked or pushed off its spot is going down
  for (const p of up) if (Math.hypot(p.x - p.sx, p.y - p.sy) > 3 || p.x < LANE_L || p.x > LANE_R) p.hit = true;
  const ballDone = b.y < BACK - 20 || (b.vx === 0 && b.vy === 0);
  const pinsStill = up.every((p) => (p.vx === 0 && p.vy === 0) || p.y < BACK - 30 || p.x < LANE_L - 20 || p.x > LANE_R + 20);
  if (!ballDone || !pinsStill) return null;
  return finishRoll(a);
}

function finishRoll(a: Alley): RollEvent {
  a.ball = null;
  let down = 0;
  for (const p of a.pins) {
    if (p.standing && p.hit) {
      p.standing = false;
      down++;
    }
    // standing pins are set back on their spots for the next roll
    if (p.standing) {
      p.x = p.sx;
      p.y = p.sy;
      p.vx = 0;
      p.vy = 0;
    }
  }
  a.knocked += down;
  a.log.push(down);
  const ev: RollEvent = { down, strike: false, spare: false, gutter: false };
  let points = down;
  if (a.roll === 0 && a.knocked === 10) {
    ev.strike = true;
    a.strikes++;
    points += STRIKE_BONUS;
  } else if (a.roll === 1 && a.knocked === 10) {
    ev.spare = true;
    points += SPARE_BONUS;
  }
  a.score += points;
  if (a.roll === 0 && !ev.strike) a.roll = 1;
  else {
    a.frame++;
    a.roll = 0;
    a.knocked = 0;
    a.pins = freshPins();
  }
  if (a.frame >= a.stage.frames) {
    a.over = true;
    a.won = a.score >= a.stage.need;
  }
  return ev;
}

/** Runs the roll until it finishes (or 12 s pass). */
export function runRoll(a: Alley): RollEvent {
  for (let n = 0; n < 12 / DT; n++) {
    const ev = step(a);
    if (ev) return ev;
  }
  return finishRoll(a);
}

export function starsFor(a: Alley): number {
  if (!a.won) return 0;
  if (a.score >= a.stage.par) return 3;
  if (a.score >= Math.ceil((a.stage.need + a.stage.par) / 2)) return 2;
  return 1;
}

export function cloneAlley(a: Alley): Alley {
  return { ...a, ball: a.ball ? { ...a.ball } : null, pins: a.pins.map((p) => ({ ...p })), log: a.log.slice() };
}

const XS = [-44, -22, 0, 22, 44];
const ANGLES = [-0.18, -0.12, -0.07, -0.03, 0, 0.03, 0.07, 0.12, 0.18];
const SPEEDS = [620];
const NUDGE = 0.012;

/** The roll a careful player would choose: the one that knocks down the most pins, and still does aimed a hair off. */
export function chooseRoll(a: Alley): { x: number; angle: number; speed: number } {
  let best = { x: (LANE_L + LANE_R) / 2, angle: 0, speed: 600 };
  let bestV = -Infinity;
  const cx = (LANE_L + LANE_R) / 2;
  for (const dx of XS)
    for (const angle of ANGLES)
      for (const speed of SPEEDS) {
        let v = 0;
        for (const da of [0, -NUDGE, NUDGE]) {
          const s = cloneAlley(a);
          roll(s, cx + dx, angle + da, speed);
          const ev = runRoll(s);
          v += ev.down * 10 + (ev.strike ? STRIKE_BONUS * 10 : 0) + (ev.spare ? SPARE_BONUS * 10 : 0);
        }
        if (v > bestV) {
          bestV = v;
          best = { x: cx + dx, angle, speed };
        }
      }
  return best;
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

export interface BowlerOpts {
  /** spread of the start (px), the aim (radians) and the speed (share) */
  place?: number;
  aim?: number;
  speed?: number;
  seed?: number;
  mode?: "aim" | "random";
}

export function pilot(st: PinStage, opts: BowlerOpts = {}): Alley {
  const { place = 0, aim = 0, speed = 0, seed = 1, mode = "aim" } = opts;
  const rng = mulberry(seed * 4241 + 3);
  const a = newAlley(st);
  while (!a.over) {
    if (mode === "random") roll(a, LANE_L + rng() * (LANE_R - LANE_L), (rng() * 2 - 1) * 0.45, MIN_SPEED + rng() * (MAX_SPEED - MIN_SPEED));
    else {
      const c = chooseRoll(a);
      roll(a, c.x + gauss(rng) * place, c.angle + gauss(rng) * aim, c.speed * (1 + gauss(rng) * speed));
    }
    runRoll(a);
  }
  return a;
}

function shape(stage: number) {
  return {
    frames: stage < 5 ? 2 : stage < 15 ? 3 : 4,
    posts: stage < 3 ? 0 : Math.min(5, 1 + Math.floor((stage - 3) / 6)),
    share: stage < 5 ? 0.6 : stage < 15 ? 0.62 : 0.65,
  };
}

/** Human-like bowlers: start within a couple of px, aim within about a degree, speed within ±5 %. */
export const HUMAN_BOWLERS: BowlerOpts[] = [1, 2, 3, 4, 5, 6].map((seed) => ({ place: 2, aim: 0.015, speed: 0.05, seed }));

export function buildStage(stage: number): PinStage {
  const sh = shape(stage);
  for (let attempt = 0; attempt < 200; attempt++) {
    const rng = mulberry(601000 + stage * 397 + attempt * 7919);
    const posts: Array<[number, number]> = [];
    let guard = 0;
    while (posts.length < sh.posts && guard++ < 200) {
      const x = Math.round(LANE_L + 16 + rng() * (LANE_R - LANE_L - 32));
      const y = Math.round(250 + rng() * 150);
      if (posts.some(([px, py]) => Math.hypot(px - x, py - y) < 44)) continue;
      posts.push([x, y]);
    }
    const st: PinStage = { stage, frames: sh.frames, posts, need: 0, par: 0 };
    const careful = pilot(st);
    // posts may make a lane harder, never a wall: the careful bowler still has to get most of the pins
    if (careful.score < st.frames * 7) continue;
    st.need = Math.max(8, Math.round(careful.score * sh.share));
    st.par = Math.max(st.need + 1, Math.floor(careful.score * 0.9));
    if (careful.score < st.par) continue;
    if (HUMAN_BOWLERS.some((o) => !pilot(st, o).won)) continue;
    if ([1, 2, 3, 4, 5, 6].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    return st;
  }
  throw new Error(`pin-roll stage ${stage + 1}: no fair lane`);
}

/** The 30 lanes, built once by scripts/build-pin-roll-stages.ts (building takes a while, too slow for a page). */
export { PIN_STAGES } from "./pin-roll-stages";
