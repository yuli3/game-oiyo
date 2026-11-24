/**
 * Ogokbap Sort (오곡밥 담기) — five grains, five bowls, sorted before they land.
 *
 * On Jeongwol Daeboreum, Koreans eat ogokbap, rice cooked with five grains. Here the grains for it pour
 * down from the sacks and must each land in its own bowl: rice, barley, millet, black beans and red
 * beans. Touch a falling grain and drag it sideways over its bowl; it keeps falling as you drag. A grain
 * in the wrong bowl spoils that bowl's count. You can hold only one at a time, and later the sacks pour
 * faster and the bowls swap places. Sort enough before the sacks are empty.
 *
 * Pure and deterministic: each stage's pour is seeded, and bowl orders are dealt with Fisher–Yates.
 */

export const OGOK_SLUG = "ogokbap-sort";
export const STAGE_COUNT = 30;
export const FIELD_W = 360;
export const BOWL_Y = 470; // grains land at this height
export const BOWLS = 5;
export const BOWL_W = FIELD_W / BOWLS;
export const GRAB_R = 34; // px: how close a touch must be to grab a grain

export interface Grain { kind: number; x: number; at: number; speed: number } // spawns at the top at time `at`
export interface OgokStage {
  stage: number;
  order: number[]; // order[b] = the grain kind bowl b takes
  grains: Grain[];
  need: number;
  par: number;
}

export interface Pour {
  stage: OgokStage;
  t: number;
  x: number[]; // current x per grain
  y: number[]; // current y (-1 not yet poured)
  state: Array<"waiting" | "falling" | "landed">;
  held: number; // grain index being dragged, or -1
  right: number;
  wrong: number;
  over: boolean;
  won: boolean;
}

export const bowlAt = (x: number) => Math.max(0, Math.min(BOWLS - 1, Math.floor(x / BOWL_W)));
export const bowlCentre = (b: number) => (b + 0.5) * BOWL_W;

export function newPour(stage: OgokStage): Pour {
  return {
    stage,
    t: 0,
    x: stage.grains.map((g) => g.x),
    y: stage.grains.map(() => -1),
    state: stage.grains.map(() => "waiting"),
    held: -1,
    right: 0,
    wrong: 0,
    over: false,
    won: false,
  };
}

/** Touch at (x, y): grabs the nearest falling grain within reach. Returns its index or −1. */
export function grab(p: Pour, x: number, y: number): number {
  if (p.over) return -1;
  let best = -1;
  let bd = GRAB_R;
  for (let i = 0; i < p.stage.grains.length; i++) {
    if (p.state[i] !== "falling") continue;
    const d = Math.hypot(p.x[i] - x, p.y[i] - y);
    if (d <= bd) {
      bd = d;
      best = i;
    }
  }
  p.held = best;
  return best;
}

/** Moves the held grain to x (the finger's x). */
export function dragTo(p: Pour, x: number): void {
  if (p.held >= 0 && p.state[p.held] === "falling") p.x[p.held] = Math.max(8, Math.min(FIELD_W - 8, x));
}

export function letGo(p: Pour): void {
  p.held = -1;
}

export interface PourEvents { landed: Array<{ i: number; right: boolean }>; end: boolean }

export function stepPour(p: Pour, dt: number): PourEvents {
  const ev: PourEvents = { landed: [], end: false };
  if (p.over) return ev;
  p.t += dt;
  const gs = p.stage.grains;
  for (let i = 0; i < gs.length; i++) {
    if (p.state[i] === "waiting" && p.t >= gs[i].at) {
      p.state[i] = "falling";
      p.y[i] = 0;
    }
    if (p.state[i] !== "falling") continue;
    p.y[i] += gs[i].speed * dt;
    if (p.y[i] >= BOWL_Y) {
      p.y[i] = BOWL_Y;
      p.state[i] = "landed";
      if (p.held === i) p.held = -1;
      const right = p.stage.order[bowlAt(p.x[i])] === gs[i].kind;
      if (right) p.right++;
      else p.wrong++;
      ev.landed.push({ i, right });
    }
  }
  if (p.state.every((s) => s === "landed")) {
    p.over = true;
    p.won = p.right - p.wrong >= p.stage.need;
    ev.end = true;
  }
  return ev;
}

export function starsFor(p: Pour): number {
  if (!p.won) return 0;
  const n = p.stage.grains.length;
  const s = p.right - p.wrong;
  if (s >= n) return 3;
  if (s >= n - 2) return 2;
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
  /** s to notice a grain and put a finger on it (each time ±20 %) */
  react?: number;
  /** px/s the finger can drag */
  speed?: number;
  /** "sort" reads each grain; "never" never touches; "random" drags each to a random bowl */
  mode?: "sort" | "never" | "random";
  seed?: number;
}

/** Autopilot: takes the grain that will land soonest, drags it to its bowl, lets go, takes the next. */
export function pilot(stage: OgokStage, opts: PilotOpts = {}): Pour {
  const { react = 0.1, speed = 1200, mode = "sort", seed = 1 } = opts;
  const rng = mulberry(seed);
  const p = newPour(stage);
  const dt = 1 / 60;
  let busy = 0; // s until the finger reaches the next grain
  let goal = -1;
  let fingerX = FIELD_W / 2;
  while (!p.over && p.t < 600) {
    if (mode !== "never") {
      if (p.held < 0 && (busy -= dt) <= 0) {
        // the falling grain not over its bowl that lands soonest (and can still be reached)
        let pick = -1;
        let soon = Infinity;
        for (let i = 0; i < stage.grains.length; i++) {
          if (p.state[i] !== "falling") continue;
          if (mode === "sort" && stage.order[bowlAt(p.x[i])] === stage.grains[i].kind) continue;
          const left = (BOWL_Y - p.y[i]) / stage.grains[i].speed;
          if (left < soon) {
            soon = left;
            pick = i;
          }
        }
        if (pick >= 0) {
          // reaching it costs the reaction time plus the trip from where the finger was
          const travel = react * (0.8 + rng() * 0.4) + Math.abs(p.x[pick] - fingerX) / speed;
          if (busy < -travel || travel < soon) {
            grab(p, p.x[pick], p.y[pick] + stage.grains[pick].speed * 0);
            if (p.held === pick) {
              fingerX = p.x[pick];
              goal = mode === "random" ? bowlCentre(Math.floor(rng() * BOWLS)) : bowlCentre(stage.order.indexOf(stage.grains[pick].kind));
            }
            busy = travel;
          }
        }
      }
      if (p.held >= 0) {
        // the finger needs the reaction time before it starts dragging
        if (busy > 0) busy -= dt;
        else {
          const dx = goal - fingerX;
          fingerX += Math.sign(dx) * Math.min(Math.abs(dx), speed * dt);
          dragTo(p, fingerX);
          if (Math.abs(goal - fingerX) < 1) {
            letGo(p);
            busy = 0;
          }
        }
      }
    }
    stepPour(p, dt);
  }
  return p;
}

function shape(stage: number) {
  return {
    count: 10 + stage,
    gap: 1.4 - stage * 0.018, // s between grains
    speed: 150 + stage * 5,
    shuffle: stage >= 10,
  };
}

export function buildStage(stage: number): OgokStage {
  const sh = shape(stage);
  const rng = mulberry(10100 + stage * 43);
  const order = [0, 1, 2, 3, 4];
  if (sh.shuffle) {
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
  }
  const grains: Grain[] = [];
  let t = 0.8;
  for (let k = 0; k < sh.count; k++) {
    const kind = Math.floor(rng() * BOWLS);
    // pour it over some other bowl
    let b = Math.floor(rng() * (BOWLS - 1));
    if (b >= order.indexOf(kind)) b++;
    grains.push({ kind, x: bowlCentre(b) + (rng() - 0.5) * BOWL_W * 0.5, at: t, speed: sh.speed * (0.9 + rng() * 0.2) });
    t += sh.gap * (0.7 + rng() * 0.6);
  }
  const st: OgokStage = { stage, order, grains, need: 0, par: 0 };
  st.need = Math.ceil(sh.count * 0.8);
  const p = pilot(st);
  st.par = p.right - p.wrong;
  return st;
}

export const OGOK_STAGES: OgokStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
