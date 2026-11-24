/**
 * Hoop Flick (골대 플릭) — an OIYO original flick-to-shoot basketball game (2026-11-25).
 *
 * A ball sits somewhere on the court; flick it toward the hoop. The flick sets the throw: its direction is the launch
 * direction and its length the speed. The ball flies under gravity, bounces off the rim and the backboard, and scores
 * when it drops down through the ring: two points, three for a clean swish. Later hoops slide from side to side.
 * Score the stage's points with the balls you have.
 *
 * Pure and deterministic: every stage's spots and hoop motion are seeded per stage. Field px, y pointing down.
 */

export const HOOP_SLUG = "hoop-flick";
export const STAGE_COUNT = 30;
export const GRAVITY = 1000;
export const BALL = 12;
export const RIM = 27; // half width of the ring (rim points at hx ± RIM)
export const RIM_R = 3;
export const BOARD_GAP = 32; // backboard x distance from the hoop centre (on the side away from the ball)
export const BOARD_TOP = 74; // backboard reaches this far above the ring
export const MAX_SPEED = 950;
export const FLIGHT_MAX = 3.2;

export interface Shot { x: number; y: number }
export interface HoopStage {
  stage: number;
  shots: Shot[]; // where each ball starts
  hx: number; // hoop centre at rest
  hy: number;
  amp: number; // how far the hoop slides either way
  rate: number; // radians per second of its slide
  need: number; // points to clear
  par: number; // points for three stars
}

export interface Court {
  stage: HoopStage;
  t: number; // stage clock (the hoop slides on it)
  shot: number; // the ball in play
  ball: { x: number; y: number; vx: number; vy: number } | null; // null: waiting for a flick
  touched: boolean; // the flying ball has touched rim or board
  flight: number;
  points: number;
  makes: number;
  swishes: number;
  over: boolean;
  won: boolean;
}

export const newCourt = (stage: HoopStage): Court => ({ stage, t: 0, shot: 0, ball: null, touched: false, flight: 0, points: 0, makes: 0, swishes: 0, over: false, won: false });

export const hoopX = (st: HoopStage, t: number) => st.hx + st.amp * Math.sin(st.rate * t);
/** The backboard stands on the far side of the hoop from where the ball starts. */
export const boardSide = (st: HoopStage, shot: number) => (st.shots[shot].x < st.hx ? 1 : -1);

/** Throws the ball in play with a velocity (px/s, y down); the speed is capped. */
export function flick(c: Court, vx: number, vy: number): boolean {
  if (c.over || c.ball || c.shot >= c.stage.shots.length) return false;
  const sp = Math.hypot(vx, vy);
  const k = sp > MAX_SPEED ? MAX_SPEED / sp : 1;
  const s = c.stage.shots[c.shot];
  c.ball = { x: s.x, y: s.y, vx: vx * k, vy: vy * k };
  c.touched = false;
  c.flight = 0;
  return true;
}

export type HoopEvent = "swish" | "score" | "rim" | "miss" | null;

function bounceOffPoint(b: { x: number; y: number; vx: number; vy: number }, px: number, py: number, r: number): boolean {
  const dx = b.x - px;
  const dy = b.y - py;
  const d = Math.hypot(dx, dy);
  if (d >= BALL + r || d === 0) return false;
  const nx = dx / d;
  const ny = dy / d;
  const vn = b.vx * nx + b.vy * ny;
  if (vn < 0) {
    b.vx -= 1.55 * vn * nx;
    b.vy -= 1.55 * vn * ny;
  }
  b.x = px + nx * (BALL + r);
  b.y = py + ny * (BALL + r);
  return true;
}

export function step(c: Court, dt: number): HoopEvent[] {
  const ev: HoopEvent[] = [];
  if (c.over) return ev;
  c.t += dt;
  const b = c.ball;
  if (!b) return ev;
  const st = c.stage;
  const sub = 4;
  for (let k = 0; k < sub; k++) {
    const h = dt / sub;
    const py = b.y;
    b.vy += GRAVITY * h;
    b.x += b.vx * h;
    b.y += b.vy * h;
    const hx = hoopX(st, c.t);
    // down through the ring
    if (py < st.hy && b.y >= st.hy && b.vy > 0 && Math.abs(b.x - hx) < RIM - 2) {
      const clean = !c.touched;
      c.points += clean ? 3 : 2;
      c.makes++;
      if (clean) c.swishes++;
      ev.push(clean ? "swish" : "score");
      c.ball = null;
      break;
    }
    let hit = bounceOffPoint(b, hx - RIM, st.hy, RIM_R) || bounceOffPoint(b, hx + RIM, st.hy, RIM_R);
    // the backboard: a thin upright on the far side
    const bx = hx + boardSide(st, c.shot) * BOARD_GAP;
    if (b.y > st.hy - BOARD_TOP - BALL && b.y < st.hy + 10 + BALL && Math.abs(b.x - bx) < BALL + 2) {
      const cy = Math.min(Math.max(b.y, st.hy - BOARD_TOP), st.hy + 10);
      hit = bounceOffPoint(b, bx, cy, 2) || hit;
    }
    if (hit && !c.touched) {
      c.touched = true;
      ev.push("rim");
    }
  }
  if (c.ball) {
    c.flight += dt;
    if (c.ball.y > 620 || c.ball.x < -60 || c.ball.x > 420 || c.flight > FLIGHT_MAX) {
      c.ball = null;
      ev.push("miss");
    }
  }
  if (!c.ball && ev.some((e) => e === "swish" || e === "score" || e === "miss")) {
    c.shot++;
    if (c.points >= st.need && c.shot >= st.shots.length) {
      c.over = true;
      c.won = true;
    } else if (c.shot >= st.shots.length) {
      c.over = true;
      c.won = c.points >= st.need;
    }
  }
  return ev;
}

export function starsFor(c: Court): number {
  if (!c.won) return 0;
  if (c.points >= c.stage.par) return 3;
  if (c.points >= Math.ceil((c.stage.need + c.stage.par) / 2)) return 2;
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

/** A normal-ish number from two uniforms (Box–Muller). */
function gauss(rng: () => number): number {
  const u = Math.max(1e-9, rng());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

/** The flick that drops the ball through the hoop centre from its spot, topping out arc px above the ring, leading a
 *  sliding hoop. */
export function aimFor(st: HoopStage, c: Court, arc = 70): { vx: number; vy: number } {
  const s = st.shots[c.shot];
  const up = s.y - st.hy; // how far the ring is above the ball
  const vy = -Math.sqrt(2 * GRAVITY * (up + arc));
  const tf = -vy / GRAVITY + Math.sqrt((2 * arc) / GRAVITY); // up to the top, then down to the ring
  const tx = hoopX(st, c.t + tf);
  return { vx: (tx - s.x) / tf, vy };
}

/** Turns a throw by deg degrees and scales its speed. */
export function nudge(v: { vx: number; vy: number }, deg: number, scale: number): { vx: number; vy: number } {
  const a = (deg * Math.PI) / 180;
  return { vx: (v.vx * Math.cos(a) - v.vy * Math.sin(a)) * scale, vy: (v.vx * Math.sin(a) + v.vy * Math.cos(a)) * scale };
}

export interface ShooterOpts {
  /** seconds to line up a shot */
  react?: number;
  /** spread of the launch angle (degrees) and of the speed (fraction) */
  aimSpread?: number;
  powerSpread?: number;
  seed?: number;
  mode?: "aim" | "random";
}

export function pilot(st: HoopStage, opts: ShooterOpts = {}): Court {
  const { react = 0.6, aimSpread = 1, powerSpread = 0.012, seed = 1, mode = "aim" } = opts;
  const rng = mulberry(seed * 3769 + 83);
  const c = newCourt(st);
  const dt = 1 / 60;
  let ready = react;
  while (!c.over) {
    if (!c.ball && c.t >= ready) {
      if (mode === "random") {
        const a = (-Math.PI / 2) + (rng() - 0.5) * 1.6;
        const sp = 300 + rng() * 650;
        flick(c, Math.cos(a) * sp, Math.sin(a) * sp);
      } else {
        const v = nudge(aimFor(st, c), gauss(rng) * aimSpread, 1 + gauss(rng) * powerSpread);
        flick(c, v.vx, v.vy);
      }
    }
    const was = c.shot;
    step(c, dt);
    if (c.shot !== was) ready = c.t + react * (0.8 + rng() * 0.4);
  }
  return c;
}

function shape(stage: number) {
  return {
    balls: 5 + Math.floor(stage / 4), // 5 up to 12
    amp: stage < 5 ? 0 : Math.min(45, 15 + (stage - 5) * 2),
    rate: stage < 5 ? 0 : 0.9 + stage * 0.03,
    spread: Math.min(110, 20 + stage * 4), // how much further than 90 px to the side the balls may start
    share: stage < 5 ? 0.4 : stage < 15 ? 0.42 : 0.45, // points needed, as a share of all-swish points
  };
}

/** Human-like shooters: a little over half a second to line up, throws off by about a degree and a half in angle and 1.6% in speed. */
export const HUMAN_SHOOTERS: ShooterOpts[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((seed) => ({ react: 0.6, aimSpread: 1.4, powerSpread: 0.016, seed }));

export function buildStage(stage: number): HoopStage {
  const sh = shape(stage);
  for (let attempt = 0; attempt < 200; attempt++) {
    const rng = mulberry(491000 + stage * 317 + attempt * 7919);
    const hx = 120 + Math.floor(rng() * 120);
    const hy = 150 + Math.floor(rng() * 60);
    const shots: Shot[] = [];
    for (let k = 0; k < sh.balls; k++) {
      // never close under the hoop (the ball would clip the rim on its way up): 90 px or more to one side
      const off = 90 + rng() * sh.spread;
      let side = rng() < 0.5 ? -1 : 1;
      if (hx + side * off < 24 || hx + side * off > 336) side = -side;
      const x = Math.max(24, Math.min(336, hx + side * off));
      shots.push({ x: Math.round(x), y: 430 + Math.floor(rng() * 70) });
    }
    const st: HoopStage = { stage, shots, hx, hy, amp: sh.amp, rate: Math.round(sh.rate * 1000) / 1000, need: Math.ceil(sh.balls * 3 * sh.share), par: 0 };
    const runs = HUMAN_SHOOTERS.map((o) => pilot(st, o));
    if (runs.some((r) => !r.won)) continue;
    const careful = pilot(st, { react: 0.5, aimSpread: 0.4, powerSpread: 0.005 });
    if (!careful.won) continue;
    st.par = Math.max(st.need, careful.points - 3);
    if ([1, 2, 3].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    return st;
  }
  throw new Error(`hoop-flick stage ${stage + 1}: no fair court`);
}

export const HOOP_STAGES: HoopStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
