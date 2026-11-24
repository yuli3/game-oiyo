/**
 * Cork Spin (코르크 핀꽂기) — an OIYO original pin-throwing timing game (2026-11-25).
 *
 * A round cork board spins on the wall. Tap to push a pin up into it from below; the pin sticks where the board is
 * at that moment and turns with it. If the pin lands too close to one already there, it bounces off and you lose a
 * heart. Push in every pin to clear the board. Boards spin steadily, speed up and slow down, or swing back and forth.
 *
 * Pure and deterministic: every board's pins and spin are seeded per stage.
 */

export const CORK_SLUG = "cork-spin";
export const STAGE_COUNT = 30;
export const HEARTS = 3;
export const FLIGHT = 0.12; // seconds from the tap to the pin landing
export const COOLDOWN = 0.2; // seconds between throws
export const GAP = 0.22; // radians: closer than this and the pin bounces off (about 12.6°)
const TAU = Math.PI * 2;

export interface CorkStage {
  stage: number;
  pins: number; // pins to push in
  fixed: number[]; // angles (board frame) of pins already there
  speed: number; // radians per second
  wobble: number; // how much the speed swings (0 none)
  wobbleRate: number; // radians per second of the swing
  reverse: number; // seconds between changes of direction (0 never)
  par: number; // seconds a quick player needs (three stars at or under, with every heart)
  limit: number; // seconds before the board is taken down
}

export interface Board {
  stage: CorkStage;
  t: number;
  stuck: number[]; // board-frame angles of the pins in it (fixed ones first)
  flying: number[]; // landing times of pins in the air
  left: number; // pins not yet thrown
  hearts: number;
  cool: number;
  over: boolean;
  won: boolean;
}

const mod = (a: number, n: number) => ((a % n) + n) % n;

/** The board's turn at time t (radians). Pins land at the bottom of the board, world angle 0. */
export function spinAt(st: CorkStage, t: number): number {
  // with reversing, the direction flips every `reverse` seconds; the angle is the integral of the speed
  let base: number;
  if (st.reverse > 0) {
    const k = Math.floor(t / st.reverse);
    const r = t - k * st.reverse;
    // whole half-periods cancel in pairs
    base = (k % 2 === 0 ? r : st.reverse - r) * st.speed;
  } else base = t * st.speed;
  const wob = st.wobble ? (st.wobble / st.wobbleRate) * (1 - Math.cos(st.wobbleRate * t)) : 0;
  return base + wob;
}

/** The board-frame angle a pin landing at time t takes. */
export const landAt = (st: CorkStage, t: number) => mod(-spinAt(st, t), TAU);

const dist = (a: number, b: number) => {
  const d = mod(a - b, TAU);
  return Math.min(d, TAU - d);
};

export const newBoard = (stage: CorkStage): Board => ({ stage, t: 0, stuck: stage.fixed.slice(), flying: [], left: stage.pins, hearts: HEARTS, cool: 0, over: false, won: false });

/** Whether a pin landing at time t would stick. */
export const clearAt = (b: Board, t: number) => b.stuck.every((s) => dist(s, landAt(b.stage, t)) >= GAP);

export function canThrow(b: Board): boolean {
  return !b.over && b.left > 0 && b.cool <= 0;
}

export function shoot(b: Board): boolean {
  if (!canThrow(b)) return false;
  b.left--;
  b.cool = COOLDOWN;
  b.flying.push(b.t + FLIGHT);
  return true;
}

export type CorkEvent = "stuck" | "bounced" | null;

export function step(b: Board, dt: number): CorkEvent[] {
  const ev: CorkEvent[] = [];
  if (b.over) return ev;
  b.t += dt;
  b.cool = Math.max(0, b.cool - dt);
  while (b.flying.length && b.flying[0] <= b.t) {
    const at = b.flying.shift() as number;
    const a = landAt(b.stage, at);
    if (b.stuck.every((s) => dist(s, a) >= GAP)) {
      b.stuck.push(a);
      ev.push("stuck");
    } else {
      b.hearts--;
      b.left++; // the pin falls back into the box
      ev.push("bounced");
      if (b.hearts <= 0) {
        b.over = true;
        return ev;
      }
    }
  }
  if (b.left === 0 && !b.flying.length) {
    b.over = true;
    b.won = true;
  } else if (b.t >= b.stage.limit) b.over = true;
  return ev;
}

export function starsFor(b: Board): number {
  if (!b.won) return 0;
  if (b.hearts === HEARTS && b.t <= b.stage.par) return 3;
  if (b.hearts >= HEARTS - 1) return 2;
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

/** The widest empty arc between pins on the board (radians). */
export function widest(stuck: number[]): number {
  if (stuck.length < 2) return TAU;
  const xs = stuck.map((a) => mod(a, TAU)).sort((a, b) => a - b);
  let w = TAU - xs[xs.length - 1] + xs[0];
  for (let i = 1; i < xs.length; i++) w = Math.max(w, xs[i] - xs[i - 1]);
  return w;
}

export interface ThrowerOpts {
  /** seconds between seeing a gap and the tap landing (spread ± a third) */
  react?: number;
  /** spread of the tap's timing, seconds */
  jitter?: number;
  /** how much clear room (radians) a player wants either side before throwing */
  margin?: number;
  seed?: number;
  /** "watch" waits for a clear spot; "random" taps at random */
  mode?: "watch" | "random";
}

export function pilot(st: CorkStage, opts: ThrowerOpts = {}): Board {
  const { react = 0.25, jitter = 0.03, margin = 0.12, seed = 1, mode = "watch" } = opts;
  const rng = mulberry(seed * 4127 + 61);
  const b = newBoard(st);
  const dt = 1 / 60;
  let tapAt = -1;
  let next = 0.3;
  while (!b.over) {
    if (mode === "random") {
      if (b.t >= next) {
        shoot(b);
        next = b.t + 0.2 + rng() * 0.4;
      }
    } else if (tapAt < 0 && canThrow(b) && !b.flying.length) {
      // the player looks ahead by their reaction time: will the bottom be clear (with room) when the pin lands?
      const delay = react * (0.8 + rng() * 0.4);
      const land = b.t + delay + FLIGHT;
      const a = landAt(st, land);
      // they aim into the wider gaps, so the board fills evenly; on a crowded board they settle for less room
      const m = Math.max(0.015, Math.min(margin * 4, (widest(b.stuck) / 2 - GAP) * 0.6));
      if (b.stuck.every((s) => dist(s, a) >= GAP + m)) tapAt = b.t + delay + (rng() * 2 - 1) * jitter;
    }
    if (tapAt >= 0 && b.t >= tapAt) {
      shoot(b);
      tapAt = -1;
    }
    step(b, dt);
  }
  return b;
}

function shape(stage: number) {
  return {
    pins: stage < 4 ? 7 : 9 + Math.floor((stage - 4) * 0.16), // 7 up to 13
    fixed: stage < 2 ? 0 : stage < 10 ? 1 : 2,
    speed: 1.5 + stage * 0.03, // radians per second
    wobble: stage < 5 ? 0 : Math.min(1.2, 0.5 + (stage - 5) * 0.03),
    reverse: stage < 10 ? 0 : stage % 3 === 1 ? 3.2 - Math.min(1.2, (stage - 10) * 0.06) : 0,
    slack: stage < 5 ? 2.4 : stage < 15 ? 2 : 1.8,
  };
}

/** Human-like throwers: a quarter second to react, taps off by up to a twentieth either way. */
export const HUMAN_THROWERS: ThrowerOpts[] = [1, 2, 3, 4, 5, 6].map((seed) => ({ react: 0.28, jitter: 0.05, margin: 0.1, seed }));

export function buildStage(stage: number): CorkStage {
  const sh = shape(stage);
  for (let attempt = 0; attempt < 300; attempt++) {
    const rng = mulberry(431000 + stage * 277 + attempt * 7919);
    const fixed: number[] = [];
    const spots = shuffle(Array.from({ length: 24 }, (_, k) => (k / 24) * TAU), rng);
    for (const a of spots) if (fixed.length < sh.fixed && fixed.every((f) => dist(f, a) >= TAU / 9)) fixed.push(a);
    const st: CorkStage = {
      stage,
      pins: sh.pins,
      fixed,
      speed: sh.speed * (rng() < 0.5 ? 1 : -1),
      wobble: sh.wobble,
      wobbleRate: 1.2 + rng() * 0.8,
      // a swinging board must swing more than a full turn, so every spot comes round
      reverse: sh.reverse ? Math.max(sh.reverse, (TAU + 1.2) / sh.speed) : 0,
      par: 0,
      limit: 1000,
    };
    const runs = HUMAN_THROWERS.map((o) => pilot(st, o));
    if (runs.some((r) => !r.won)) continue;
    st.limit = Math.ceil(Math.max(...runs.map((r) => r.t)) * sh.slack) + 5;
    const quick = pilot(st, { react: 0.2, jitter: 0.02, margin: 0.12, seed: 1 });
    if (!quick.won || quick.hearts < HEARTS) continue;
    st.par = Math.ceil(quick.t * 1.3) + 1;
    if (stage >= 12 && [1, 2, 3].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    return st;
  }
  throw new Error(`cork-spin stage ${stage + 1}: no fair board`);
}

export const CORK_STAGES: CorkStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
