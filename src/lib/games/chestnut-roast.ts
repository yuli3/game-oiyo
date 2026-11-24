/**
 * Chestnut Roast (군밤 굽기) — roast them golden, not burnt, at a winter street stall.
 *
 * Raw chestnuts tumble onto an iron pan over the coals, at the rim. The middle of the pan is hottest
 * and the rim coolest. Drag chestnuts around: into the middle to roast fast, out toward the rim to
 * hold them back. When one turns golden, drag it into the paper bag to sell it; leave it and it burns.
 * Bag a raw one and the customer hands it back (it is wasted). Several roast at once, so the trick is
 * to stagger them so they don't all turn golden at the same moment. Sell enough golden chestnuts.
 *
 * Pure and deterministic: arrivals are seeded per stage.
 */

export const CHESTNUT_SLUG = "chestnut-roast";
export const STAGE_COUNT = 30;
export const PAN = { x: 180, y: 250, r: 140 };
export const BAG = { x: 300, y: 470, r: 52 };
export const GRAB_R = 30;
export const GOLD_LO = 1;
export const BURN = 1.5;

export interface Arrival { at: number; angle: number } // arrives at the rim at `angle`
export interface ChestnutStage {
  stage: number;
  cook: number; // doneness per second at full heat
  goldHi: number; // golden from GOLD_LO up to this
  arrivals: Arrival[];
  need: number;
  par: number;
}

export interface Stall {
  stage: ChestnutStage;
  t: number;
  x: number[];
  y: number[];
  d: number[]; // doneness
  state: Array<"waiting" | "pan" | "sold" | "raw" | "burnt">;
  held: number;
  gold: number;
  raw: number;
  burnt: number;
  over: boolean;
  won: boolean;
}

export function heatAt(x: number, y: number): number {
  const u = Math.min(1, Math.hypot(x - PAN.x, y - PAN.y) / PAN.r);
  return 0.3 + 0.7 * (1 - u * u);
}

export function newStall(stage: ChestnutStage): Stall {
  const n = stage.arrivals.length;
  return {
    stage,
    t: 0,
    x: stage.arrivals.map((a) => PAN.x + Math.cos(a.angle) * (PAN.r - 14)),
    y: stage.arrivals.map((a) => PAN.y + Math.sin(a.angle) * (PAN.r - 14)),
    d: new Array(n).fill(0),
    state: new Array(n).fill("waiting"),
    held: -1,
    gold: 0,
    raw: 0,
    burnt: 0,
    over: false,
    won: false,
  };
}

export const golden = (s: Stall, i: number) => s.d[i] >= GOLD_LO && s.d[i] <= s.stage.goldHi;

export function grab(s: Stall, x: number, y: number): number {
  if (s.over) return -1;
  let best = -1;
  let bd = GRAB_R;
  for (let i = 0; i < s.d.length; i++) {
    if (s.state[i] !== "pan") continue;
    const dd = Math.hypot(s.x[i] - x, s.y[i] - y);
    if (dd <= bd) {
      bd = dd;
      best = i;
    }
  }
  s.held = best;
  return best;
}

/** Drags the held chestnut to (x, y): on the pan it stays on the pan; anywhere else it hovers. */
export function dragTo(s: Stall, x: number, y: number): void {
  if (s.held < 0) return;
  s.x[s.held] = x;
  s.y[s.held] = y;
}

export type DropResult = "sold" | "raw" | "moved" | null;

/** Lets go: over the bag it is sold (or handed back raw); elsewhere it drops onto the pan. */
export function drop(s: Stall): DropResult {
  const i = s.held;
  if (i < 0) return null;
  s.held = -1;
  if (Math.hypot(s.x[i] - BAG.x, s.y[i] - BAG.y) <= BAG.r) {
    if (golden(s, i)) {
      s.state[i] = "sold";
      s.gold++;
      return "sold";
    }
    if (s.d[i] < GOLD_LO) {
      s.state[i] = "raw";
      s.raw++;
      return "raw";
    }
  }
  // back onto the pan, inside its rim
  const dx = s.x[i] - PAN.x;
  const dy = s.y[i] - PAN.y;
  const r = Math.hypot(dx, dy);
  const max = PAN.r - 12;
  if (r > max) {
    s.x[i] = PAN.x + (dx / r) * max;
    s.y[i] = PAN.y + (dy / r) * max;
  }
  return "moved";
}

export interface StallEvents { burnt: number[]; end: boolean }

export function stepStall(s: Stall, dt: number): StallEvents {
  const ev: StallEvents = { burnt: [], end: false };
  if (s.over) return ev;
  s.t += dt;
  for (let i = 0; i < s.d.length; i++) {
    if (s.state[i] === "waiting" && s.t >= s.stage.arrivals[i].at) s.state[i] = "pan";
    if (s.state[i] !== "pan") continue;
    // a chestnut held in the air cools a little rather than roasting
    if (s.held !== i) s.d[i] += s.stage.cook * heatAt(s.x[i], s.y[i]) * dt;
    if (s.d[i] > BURN) {
      s.state[i] = "burnt";
      s.burnt++;
      if (s.held === i) s.held = -1;
      ev.burnt.push(i);
    }
  }
  if (s.state.every((x) => x !== "waiting" && x !== "pan")) {
    s.over = true;
    s.won = s.gold >= s.stage.need;
    ev.end = true;
  }
  return ev;
}

export function starsFor(s: Stall): number {
  if (!s.won) return 0;
  const n = s.d.length;
  if (s.gold >= n) return 3;
  if (s.gold >= n - 1) return 2;
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
  /** s to notice and start a move */
  react?: number;
  /** px/s the finger drags */
  speed?: number;
  /** "tend" keeps two in the middle and sells; "never" never touches; "centre" heaps all in the middle and sells late; "early" bags them raw */
  mode?: "tend" | "never" | "centre" | "early";
}

/**
 * Autopilot: sells whatever is golden first (the most done first); otherwise keeps two chestnuts
 * roasting in the hot middle, bringing in the most-done of the ones waiting at the rim.
 */
export function pilot(stage: ChestnutStage, opts: PilotOpts = {}): Stall {
  const { react = 0.1, speed = 1000, mode = "tend" } = opts;
  const s = newStall(stage);
  const dt = 1 / 60;
  let busy = 0;
  let task: null | { i: number; x: number; y: number } = null;
  let fx = PAN.x;
  let fy = PAN.y;
  while (!s.over && s.t < 600) {
    if (task) {
      // reach the chestnut, then drag it to the goal
      if (busy > 0) busy -= dt;
      else if (s.held !== task.i) {
        if (s.state[task.i] !== "pan") task = null;
        else grab(s, s.x[task.i], s.y[task.i]);
      } else {
        const dx = task.x - fx;
        const dy = task.y - fy;
        const d = Math.hypot(dx, dy);
        const step = speed * dt;
        if (d <= step) {
          fx = task.x;
          fy = task.y;
          dragTo(s, fx, fy);
          drop(s);
          task = null;
          busy = react;
        } else {
          fx += (dx / d) * step;
          fy += (dy / d) * step;
          dragTo(s, fx, fy);
        }
      }
    } else if (mode !== "never" && (busy -= dt) <= 0) {
      const on = s.state.map((x, i) => (x === "pan" ? i : -1)).filter((i) => i >= 0);
      let pick: null | { i: number; x: number; y: number } = null;
      if (mode === "early") {
        if (on.length) pick = { i: on[0], x: BAG.x, y: BAG.y };
      } else {
        const gold = on.filter((i) => golden(s, i) && (mode === "tend" || s.d[i] >= stage.goldHi - 0.06));
        if (gold.length) {
          gold.sort((a, b) => s.d[b] - s.d[a]);
          pick = { i: gold[0], x: BAG.x, y: BAG.y };
        } else if (mode === "centre") {
          const out = on.filter((i) => Math.hypot(s.x[i] - PAN.x, s.y[i] - PAN.y) > 40);
          if (out.length) pick = { i: out[0], x: PAN.x + (out[0] % 3) * 10 - 10, y: PAN.y };
        } else {
          // keep up to two roasting in the middle; bring in the most-done of the rest
          const inMiddle = on.filter((i) => Math.hypot(s.x[i] - PAN.x, s.y[i] - PAN.y) < 60);
          const waiting = on.filter((i) => Math.hypot(s.x[i] - PAN.x, s.y[i] - PAN.y) >= 60);
          if (waiting.length && inMiddle.length < 2) {
            waiting.sort((a, b) => s.d[b] - s.d[a]);
            const i = waiting[0];
            const taken = inMiddle.map((j) => Math.atan2(s.y[j] - PAN.y, s.x[j] - PAN.x));
            const ang = taken.length ? taken[0] + Math.PI : 0;
            pick = { i, x: PAN.x + Math.cos(ang) * 28, y: PAN.y + Math.sin(ang) * 28 };
          }
        }
      }
      if (pick) {
        task = pick;
        // the trip to the chestnut takes reaction plus travel
        busy = react + Math.hypot(s.x[pick.i] - fx, s.y[pick.i] - fy) / speed;
        fx = s.x[pick.i];
        fy = s.y[pick.i];
      } else busy = 0.05;
    }
    stepStall(s, dt);
  }
  return s;
}

function shape(stage: number) {
  return {
    count: 6 + Math.floor(stage / 2),
    cook: 0.2 + stage * 0.004,
    goldHi: 1.35 - stage * 0.005,
    gap: 3.2 - stage * 0.03,
  };
}

function layout(stage: number, gapScale: number): ChestnutStage {
  const sh = shape(stage);
  const rng = mulberry(11100 + stage * 47);
  const arrivals: Arrival[] = [];
  let t = 0.5;
  for (let k = 0; k < sh.count; k++) {
    arrivals.push({ at: t, angle: rng() * Math.PI * 2 });
    t += sh.gap * gapScale * (0.6 + rng() * 0.8);
  }
  const st: ChestnutStage = { stage, cook: sh.cook, goldHi: sh.goldHi, arrivals, need: Math.max(3, Math.ceil(sh.count * 0.75)), par: 0 };
  return st;
}

export function buildStage(stage: number): ChestnutStage {
  // chestnuts arrive as quickly as the stage asks, but never so quickly that stall keepers who take
  // 0.3–0.5 s to react and drag at 550 px/s fall behind
  const keeps = (st: ChestnutStage) => [0.3, 0.35, 0.4, 0.45, 0.5].every((react) => pilot(st, { react, speed: 550 }).won);
  let scale = 1;
  if (!keeps(layout(stage, 1))) {
    let lo = 1;
    let hi = 3;
    for (let i = 0; i < 12; i++) {
      const mid = (lo + hi) / 2;
      if (keeps(layout(stage, mid))) hi = mid;
      else lo = mid;
    }
    scale = hi;
  }
  const st = layout(stage, scale);
  st.par = pilot(st).gold;
  return st;
}

export const CHESTNUT_STAGES: ChestnutStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
