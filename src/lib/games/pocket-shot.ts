/**
 * Pocket Shot (포켓 샷) — an OIYO original trick-shot pool puzzle (2026-11-25).
 *
 * A few numbered balls sit on a small pool table. Pull back and let go to strike the white ball: the pull sets the
 * direction and the strength. Sink every numbered ball within the shots. If the white ball drops, it comes back to its
 * spot and the shot is gone.
 *
 * Pure and deterministic: fixed time steps, every stage's layout seeded per stage. Field px, y pointing down.
 */

export const POCKET_SLUG = "pocket-shot";
export const STAGE_COUNT = 30;
export const LEFT = 36;
export const RIGHT = 324;
export const TOP = 96;
export const BOTTOM = 520;
export const BALL_R = 10;
export const CORNER_R = 18; // a ball whose centre comes this close to a corner pocket drops
export const SIDE_R = 16;
export const FRICTION = 200; // px/s² of rolling slow-down
export const CUSHION = 0.8;
export const MIN_POWER = 80;
export const MAX_POWER = 900;
export const DT = 1 / 240;
export const SPOT: [number, number] = [180, 440];

export const POCKETS: Array<{ x: number; y: number; r: number }> = [
  { x: LEFT, y: TOP, r: CORNER_R },
  { x: RIGHT, y: TOP, r: CORNER_R },
  { x: LEFT, y: (TOP + BOTTOM) / 2, r: SIDE_R },
  { x: RIGHT, y: (TOP + BOTTOM) / 2, r: SIDE_R },
  { x: LEFT, y: BOTTOM, r: CORNER_R },
  { x: RIGHT, y: BOTTOM, r: CORNER_R },
];

export interface Ball { x: number; y: number; vx: number; vy: number; down: boolean }

export interface PoolStage {
  stage: number;
  balls: Array<[number, number]>; // the numbered balls
  cue: [number, number];
  shots: number;
  par: number;
}

export interface Table {
  stage: PoolStage;
  cue: Ball;
  balls: Ball[];
  shots: number;
  moving: boolean;
  scratch: boolean; // the last shot dropped the white ball
  over: boolean;
  won: boolean;
}

export function newTable(stage: PoolStage): Table {
  return {
    stage,
    cue: { x: stage.cue[0], y: stage.cue[1], vx: 0, vy: 0, down: false },
    balls: stage.balls.map(([x, y]) => ({ x, y, vx: 0, vy: 0, down: false })),
    shots: 0,
    moving: false,
    scratch: false,
    over: false,
    won: false,
  };
}

const all = (t: Table): Ball[] => [t.cue, ...t.balls];

/** Strikes the white ball at `angle` (radians, 0 = right, y down) with `power` px/s. */
export function strike(t: Table, angle: number, power: number): boolean {
  if (t.over || t.moving) return false;
  const p = Math.max(MIN_POWER, Math.min(MAX_POWER, power));
  t.cue.vx = Math.cos(angle) * p;
  t.cue.vy = Math.sin(angle) * p;
  t.shots++;
  t.moving = true;
  t.scratch = false;
  return true;
}

export type StepEvent = { dropped: number[]; hits: number; cushions: number };

/** One fixed step of DT. Returns what happened in it. */
export function step(t: Table): StepEvent {
  const ev: StepEvent = { dropped: [], hits: 0, cushions: 0 };
  if (!t.moving) return ev;
  const bs = all(t);
  for (const b of bs) {
    if (b.down) continue;
    const sp = Math.hypot(b.vx, b.vy);
    if (sp === 0) continue;
    const ns = Math.max(0, sp - FRICTION * DT);
    if (ns < 4) {
      b.vx = 0;
      b.vy = 0;
    } else {
      b.vx *= ns / sp;
      b.vy *= ns / sp;
    }
    b.x += b.vx * DT;
    b.y += b.vy * DT;
  }
  // balls into each other: equal masses, a slightly soft knock
  for (let i = 0; i < bs.length; i++) {
    const a = bs[i];
    if (a.down) continue;
    for (let j = i + 1; j < bs.length; j++) {
      const b = bs[j];
      if (b.down) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d >= 2 * BALL_R || d === 0) continue;
      const nx = dx / d;
      const ny = dy / d;
      const push = (2 * BALL_R - d) / 2;
      a.x -= nx * push;
      a.y -= ny * push;
      b.x += nx * push;
      b.y += ny * push;
      const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      if (rel <= 0) continue;
      const k = rel * 0.97;
      a.vx -= nx * k;
      a.vy -= ny * k;
      b.vx += nx * k;
      b.vy += ny * k;
      ev.hits++;
    }
  }
  for (let i = 0; i < bs.length; i++) {
    const b = bs[i];
    if (b.down) continue;
    if (POCKETS.some((p) => Math.hypot(b.x - p.x, b.y - p.y) < p.r)) {
      b.down = true;
      b.vx = 0;
      b.vy = 0;
      ev.dropped.push(i - 1); // -1 is the white ball
      continue;
    }
    if (b.x < LEFT + BALL_R) {
      b.x = 2 * (LEFT + BALL_R) - b.x;
      b.vx = -b.vx * CUSHION;
      ev.cushions++;
    } else if (b.x > RIGHT - BALL_R) {
      b.x = 2 * (RIGHT - BALL_R) - b.x;
      b.vx = -b.vx * CUSHION;
      ev.cushions++;
    }
    if (b.y < TOP + BALL_R) {
      b.y = 2 * (TOP + BALL_R) - b.y;
      b.vy = -b.vy * CUSHION;
      ev.cushions++;
    } else if (b.y > BOTTOM - BALL_R) {
      b.y = 2 * (BOTTOM - BALL_R) - b.y;
      b.vy = -b.vy * CUSHION;
      ev.cushions++;
    }
  }
  if (ev.dropped.includes(-1)) t.scratch = true;
  if (bs.every((b) => b.down || (b.vx === 0 && b.vy === 0))) settleTable(t);
  return ev;
}

/** Everything has stopped: put the white ball back if it dropped, and see whether the stage is over. */
function settleTable(t: Table): void {
  t.moving = false;
  if (t.cue.down) {
    t.cue.down = false;
    const [sx, sy] = t.stage.cue;
    // back on its spot, or the nearest free place up the table from it
    let y = sy;
    while (t.balls.some((b) => !b.down && Math.hypot(b.x - sx, b.y - y) < 2 * BALL_R + 1)) y -= 2 * BALL_R;
    t.cue.x = sx;
    t.cue.y = Math.max(TOP + BALL_R, y);
  }
  if (t.balls.every((b) => b.down)) {
    t.over = true;
    t.won = true;
  } else if (t.shots >= t.stage.shots) t.over = true;
}

/** Runs the table until everything stops (or 12 s pass). */
export function runOut(t: Table): number {
  let n = 0;
  while (t.moving && n < 12 / DT) {
    step(t);
    n++;
  }
  if (t.moving) settleTable(t);
  return n;
}

export function starsFor(t: Table): number {
  if (!t.won) return 0;
  if (t.shots <= t.stage.par) return 3;
  if (t.shots <= t.stage.par + 1) return 2;
  return 1;
}

export function cloneTable(t: Table): Table {
  return { ...t, cue: { ...t.cue }, balls: t.balls.map((b) => ({ ...b })) };
}

const POWERS = [260, 380, 520, 700];
const NUDGE = 0.006; // radians: a careful player's aim is good to about a third of a degree

/** The shot a careful player would choose: a straight pot of some ball into some pocket, kept if it still works aimed a hair off. */
export function chooseShot(t: Table, robust = true): { angle: number; power: number } {
  let best = { angle: 0, power: 400 };
  let bestV = -Infinity;
  const left = t.balls.filter((b) => !b.down).length;
  const c = t.cue;
  for (const b of t.balls) {
    if (b.down) continue;
    for (const p of POCKETS) {
      // aim a little inside the pocket's mouth, so the ball drops before it can touch a cushion
      const mx = p.x + (p.x < 180 ? 7 : -7);
      const my = p.y === TOP ? p.y + 7 : p.y === BOTTOM ? p.y - 7 : p.y;
      const px = mx - b.x;
      const py = my - b.y;
      const pd = Math.hypot(px, py);
      // the ghost ball: where the white has to be at the moment of contact
      const gx = b.x - (px / pd) * 2 * BALL_R;
      const gy = b.y - (py / pd) * 2 * BALL_R;
      const ax = gx - c.x;
      const ay = gy - c.y;
      const ad = Math.hypot(ax, ay);
      if (ad < 1) continue;
      const cut = (ax * px + ay * py) / (ad * pd);
      if (cut < 0.35) continue; // too thin a cut
      const angle = Math.atan2(ay, ax);
      for (const power of POWERS) {
        let v = 0;
        for (const da of robust ? [0, -NUDGE, NUDGE] : [0]) {
          const s = cloneTable(t);
          strike(s, angle + da, power);
          runOut(s);
          const sunk = left - s.balls.filter((x) => !x.down).length;
          v += sunk * 100 - (s.scratch ? 150 : 0) - power / 100;
        }
        if (v > bestV) {
          bestV = v;
          best = { angle, power };
        }
      }
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

export interface ShooterOpts {
  /** spread of the aim (radians) and of the strength (share) */
  aim?: number;
  power?: number;
  seed?: number;
  mode?: "aim" | "random";
}

export function pilot(st: PoolStage, opts: ShooterOpts = {}): Table {
  const { aim = 0, power = 0, seed = 1, mode = "aim" } = opts;
  const rng = mulberry(seed * 2741 + 17);
  const t = newTable(st);
  while (!t.over) {
    if (mode === "random") strike(t, rng() * Math.PI * 2, MIN_POWER + rng() * (MAX_POWER - MIN_POWER));
    else {
      const s = chooseShot(t);
      strike(t, s.angle + gauss(rng) * aim, s.power * (1 + gauss(rng) * power));
    }
    runOut(t);
  }
  return t;
}

function shape(stage: number) {
  return {
    balls: Math.min(6, 1 + Math.floor((stage + 2) / 5)), // 1 up to 6
    spare: stage < 5 ? 4 : stage < 15 ? 3 : 4, // shots on top of the careful player's
  };
}

/** Human-like players: pick a sensible pot, then aim it within about a degree and hit it within ±6 %. */
export const HUMAN_SHOOTERS: ShooterOpts[] = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => ({ aim: 0.012, power: 0.05, seed }));

export function buildStage(stage: number): PoolStage {
  const sh = shape(stage);
  for (let attempt = 0; attempt < 300; attempt++) {
    const rng = mulberry(561000 + stage * 373 + attempt * 7919);
    const balls: Array<[number, number]> = [];
    const cue: [number, number] = [Math.round(120 + rng() * 120), Math.round(400 + rng() * 80)];
    let guard = 0;
    while (balls.length < sh.balls && guard++ < 500) {
      const x = Math.round(LEFT + 30 + rng() * (RIGHT - LEFT - 60));
      const y = Math.round(TOP + 30 + rng() * (BOTTOM - TOP - 160));
      if (Math.hypot(x - cue[0], y - cue[1]) < 60) continue;
      if (balls.some(([bx, by]) => Math.hypot(bx - x, by - y) < 2 * BALL_R + 16)) continue;
      if (POCKETS.some((p) => Math.hypot(p.x - x, p.y - y) < 40)) continue;
      balls.push([x, y]);
    }
    if (balls.length < sh.balls) continue;
    const st: PoolStage = { stage, balls, cue, shots: 99, par: 99 };
    const careful = pilot(st);
    if (!careful.won) continue;
    // three stars allow one miss once there are three balls or more
    st.par = careful.shots + (sh.balls >= 3 ? 1 : 0);
    st.shots = Math.max(st.par, sh.balls) + sh.spare;
    if (HUMAN_SHOOTERS.some((o) => !pilot(st, o).won)) continue;
    if ([1, 2, 3, 4, 5, 6].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    return st;
  }
  throw new Error(`pocket-shot stage ${stage + 1}: no fair table`);
}

/** The 30 tables, built once by scripts/build-pocket-shot-stages.ts (building takes a minute, too slow for a page). */
export { POOL_STAGES } from "./pocket-shot-stages";
