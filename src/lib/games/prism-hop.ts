/**
 * Prism Hop (프리즘 점프) — an OIYO original colour-gate tap game (2026-11-25).
 *
 * A glass bead hops up a tower of spinning colour rings and sliding colour bars. Each tap gives it a hop; gravity
 * pulls it back. It may only pass through the colour it is: touch any other and it loses a heart (and is safe for a
 * moment). A prism star between gates catches the bead on a ledge, mends a heart and tints the bead the colour of the
 * next gate. Reach the
 * top before the clock runs out.
 *
 * Pure and deterministic: every tower's gates, spins and colours are seeded per stage. Heights are in px upward.
 */

export const PRISM_SLUG = "prism-hop";
export const STAGE_COUNT = 30;
export const HEARTS = 3;
export const GRAVITY = 1100;
export const HOP = 380; // upward speed a tap gives
export const BALL = 9; // radius
export const BAND = 7; // half thickness of a ring or bar
export const SAFE = 1; // seconds safe after a hit
export const SEG = 90; // px width of one bar segment
const TAU = Math.PI * 2;

export interface Gate {
  kind: 0 | 1; // ring, bar
  y: number; // centre height
  r: number; // ring radius (0 for a bar)
  phase: number; // ring angle or bar offset at t = 0
  speed: number; // ring rad/s or bar px/s
  colour: number; // the bead's colour for this gate
}
export interface PrismStage {
  stage: number;
  gates: Gate[];
  ledges: number[]; // ledges[k]: the rest height below gate k; ledges[gates.length] is the top
  limit: number;
}

export interface Hop {
  stage: PrismStage;
  t: number;
  y: number;
  v: number;
  colour: number;
  next: number; // the gate ahead
  hearts: number;
  hits: number;
  safe: number;
  resting: boolean;
  over: boolean;
  won: boolean;
}

export const newHop = (stage: PrismStage): Hop => ({ stage, t: 0, y: stage.ledges[0], v: 0, colour: stage.gates[0].colour, next: 0, hearts: HEARTS, hits: 0, safe: 0, resting: true, over: false, won: false });

const mod = (a: number, n: number) => ((a % n) + n) % n;

/** The colour of a gate's band at height edge ("low" or "high") at time t, under the bead's column. */
export function colourAt(g: Gate, edge: "low" | "high", t: number): number {
  if (g.kind === 1) return Math.floor(mod(g.phase + g.speed * t, SEG * 4) / SEG);
  const theta = g.phase + g.speed * t;
  const dir = edge === "low" ? -Math.PI / 2 : Math.PI / 2;
  return Math.floor(mod(dir - theta, TAU) / (Math.PI / 2));
}

/** The bands of a gate the bead could touch: their heights and edges. */
export function bands(g: Gate): Array<{ y: number; edge: "low" | "high" }> {
  return g.kind === 1 ? [{ y: g.y, edge: "low" }] : [{ y: g.y - g.r, edge: "low" }, { y: g.y + g.r, edge: "high" }];
}

export function tap(h: Hop): boolean {
  if (h.over) return false;
  h.v = HOP;
  h.resting = false;
  return true;
}

export type HopEvent = "hit" | "star" | null;

/** Whether the bead at height y touches a band of a gate in the wrong colour at time t. */
export function clash(g: Gate, y: number, colour: number, t: number): boolean {
  return bands(g).some((b) => Math.abs(y - b.y) < BALL + BAND && colourAt(g, b.edge, t) !== colour);
}

export function step(h: Hop, dt: number): HopEvent[] {
  const ev: HopEvent[] = [];
  if (h.over) return ev;
  const st = h.stage;
  h.t += dt;
  h.safe = Math.max(0, h.safe - dt);
  if (!h.resting) {
    h.v -= GRAVITY * dt;
    h.y += h.v * dt;
  }
  const ledge = st.ledges[h.next];
  if (h.y <= ledge) {
    h.y = ledge;
    h.v = 0;
    h.resting = true;
  }
  // gates near the bead
  for (let k = Math.max(0, h.next - 1); k <= Math.min(st.gates.length - 1, h.next); k++) {
    if (h.safe <= 0 && clash(st.gates[k], h.y, h.colour, h.t)) {
      h.hearts--;
      h.hits++;
      h.safe = SAFE;
      ev.push("hit");
      if (h.hearts <= 0) {
        h.over = true;
        return ev;
      }
    }
  }
  // the prism star on the ledge above the gate
  if (h.y > st.ledges[h.next + 1] + BALL) {
    h.next++;
    h.v = Math.min(h.v, 0); // the star catches the bead, so it settles on the ledge below the next gate
    h.hearts = Math.min(HEARTS, h.hearts + 1); // and mends a heart
    ev.push("star");
    if (h.next >= st.gates.length) {
      h.over = true;
      h.won = true;
      return ev;
    }
    h.colour = st.gates[h.next].colour;
  }
  if (h.t >= st.limit) h.over = true;
  return ev;
}

export function starsFor(h: Hop): number {
  if (!h.won) return 0;
  if (h.hits === 0) return 3;
  if (h.hits <= 1) return 2;
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

// ---------------- players ----------------

/** How a player gets through a gate: wait on the ledge, climb, maybe float in the middle of a ring, climb on. */
export interface Plan { wait: number; float: number }
const CLIMB_V = 40; // a climbing player taps again once the hop has nearly topped out

/** Whether the controller should tap now, following a plan begun at t0 for gate k. */
export function wantsTap(h: Hop, plan: Plan, t0: number): boolean {
  if (h.t < t0 + plan.wait) return false;
  const g = h.stage.gates[h.next];
  const floating = plan.float > 0 && g.kind === 0 && h.y > g.y - 20 && h.t < (h as Hop & { floatUntil?: number }).floatUntil!;
  if (floating) return h.v < 0 && h.y < g.y;
  return h.resting || h.v < CLIMB_V;
}

/** Runs a plan on a copy of the bead (no slips) and says whether it gets past the gate cleanly with timing margin. */
export function planWorks(h: Hop, plan: Plan, margin: number): boolean {
  const st = h.stage;
  const sim: Hop & { floatUntil?: number } = { ...h, stage: st };
  const t0 = sim.t;
  const k = sim.next;
  const g = st.gates[k];
  const dt = 1 / 60;
  let floatStart = -1;
  for (let n = 0; n < 60 * 8; n++) {
    if (floatStart < 0 && g.kind === 0 && sim.y > g.y - 20 && plan.float > 0) floatStart = sim.t;
    sim.floatUntil = floatStart < 0 ? Infinity : floatStart + plan.float;
    if (wantsTap(sim, plan, t0)) {
      sim.v = HOP;
      sim.resting = false;
    }
    sim.t += dt;
    sim.v -= GRAVITY * dt;
    sim.y += sim.v * dt;
    if (sim.y <= st.ledges[k]) {
      sim.y = st.ledges[k];
      sim.v = 0;
      sim.resting = true;
    }
    for (const dtm of [-margin, 0, margin]) if (clash(g, sim.y, sim.colour, sim.t + dtm)) return false;
    if (k > 0 && clash(st.gates[k - 1], sim.y, sim.colour, sim.t)) return false;
    if (sim.y > st.ledges[k + 1] + BALL) return true;
  }
  return false;
}

const WAITS = Array.from({ length: 66 }, (_, i) => i * 0.1);
const FLOATS = [0, 0.3, 0.6, 0.9, 1.2, 1.5, 1.8, 2.1, 2.4, 2.7, 3];

/** The first plan that gets past the gate, trying shorter waits and floats first. */
export function findPlan(h: Hop, margin: number): Plan | null {
  for (const wait of WAITS) for (const float of FLOATS) if (planWorks(h, { wait, float }, margin)) return { wait, float };
  return null;
}

export interface HopperOpts {
  /** seconds to read a gate before choosing when to go */
  react?: number;
  /** each tap lands up to this late (seconds) */
  jitter?: number;
  /** the timing margin the player leaves */
  margin?: number;
  seed?: number;
  mode?: "plan" | "random";
}

export function pilot(st: PrismStage, opts: HopperOpts = {}): Hop {
  const { react = 0.3, jitter = 0.04, margin = 0.06, seed = 1, mode = "plan" } = opts;
  const rng = mulberry(seed * 6011 + 73);
  const h: Hop & { floatUntil?: number } = newHop(st);
  const dt = 1 / 60;
  let gate = -1;
  let plan: Plan | null = null;
  let t0 = 0;
  let floatStart = -1;
  let pending = -1; // a tap the player has decided on, landing at this time
  let nextRandom = 0.3;
  while (!h.over) {
    if (mode === "random") {
      if (h.t >= nextRandom) {
        tap(h);
        nextRandom = h.t + 0.1 + rng() * 0.5;
      }
    } else {
      if (h.next !== gate) {
        // a new gate: look at it for a moment, then pick the first plan that works from then on
        gate = h.next;
        plan = null;
        t0 = h.t + react * (0.8 + rng() * 0.4);
        floatStart = -1;
      }
      if (!plan && h.t >= t0 && h.resting) {
        plan = findPlan(h, margin) ?? { wait: 0, float: 0 };
        t0 = h.t;
      }
      if (plan) {
        const g = st.gates[h.next];
        if (floatStart < 0 && g.kind === 0 && h.y > g.y - 20 && plan.float > 0) floatStart = h.t;
        h.floatUntil = floatStart < 0 ? Infinity : floatStart + plan.float;
        if (pending < 0 && wantsTap(h, plan, t0)) pending = h.t + rng() * jitter;
      }
      if (pending >= 0 && h.t >= pending) {
        tap(h);
        pending = -1;
      }
    }
    step(h, dt);
  }
  return h;
}

function shape(stage: number) {
  return {
    gates: 4 + Math.floor(stage * 0.35), // 4 up to 14
    bars: stage < 4 ? 0 : Math.min(0.45, 0.15 + stage * 0.01), // share of gates that are sliding bars
    ring: 1.8 + stage * 0.03, // rad/s
    bar: 60 + stage * 3, // px/s
    slack: stage < 5 ? 2.5 : stage < 15 ? 2 : 1.7,
  };
}

/** Human-like hoppers: a third of a second to read a gate, taps up to a twentieth late, a little margin. */
export const HUMAN_HOPPERS: HopperOpts[] = [1, 2, 3, 4, 5, 6].map((seed) => ({ react: 0.32, jitter: 0.05, margin: 0.06, seed }));

export function layout(stage: number, attempt: number): PrismStage {
  const sh = shape(stage);
  const rng = mulberry(471000 + stage * 307 + attempt * 7919);
  const gates: Gate[] = [];
  const ledges: number[] = [0];
  let y = 0;
  for (let k = 0; k < sh.gates; k++) {
    const kind: 0 | 1 = k > 0 && rng() < sh.bars ? 1 : 0;
    const r = kind === 0 ? 74 + Math.floor(rng() * 16) : 0;
    const centre = y + 70 + r;
    const dir = rng() < 0.5 ? -1 : 1;
    gates.push({
      kind,
      y: centre,
      r,
      phase: kind === 0 ? Math.floor(rng() * 4) * (Math.PI / 2) + Math.PI / 4 : Math.floor(rng() * SEG * 4),
      speed: dir * (kind === 0 ? sh.ring * (0.85 + rng() * 0.3) : sh.bar * (0.85 + rng() * 0.3)),
      colour: Math.floor(rng() * 4),
    });
    y = centre + r + 70;
    ledges.push(y);
  }
  for (const g of gates) {
    g.phase = Math.round(g.phase * 1000) / 1000;
    g.speed = Math.round(g.speed * 1000) / 1000;
  }
  return { stage, gates, ledges, limit: 1000 };
}

export function buildStage(stage: number): PrismStage {
  const sh = shape(stage);
  for (let attempt = 0; attempt < 100; attempt++) {
    const st = layout(stage, attempt);
    const runs = HUMAN_HOPPERS.map((o) => pilot(st, o));
    if (runs.some((r) => !r.won)) continue;
    st.limit = Math.ceil(Math.max(...runs.map((r) => r.t)) * sh.slack) + 10;
    const careful = pilot(st, { react: 0.25, jitter: 0.02, margin: 0.08 });
    if (!careful.won || starsFor(careful) < 3) continue;
    if ([1, 2, 3, 4, 5, 6].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    return st;
  }
  throw new Error(`prism-hop stage ${stage + 1}: no fair tower`);
}

/** The 30 towers, each worked out the first time it is asked for. */
export const PRISM_STAGES: PrismStage[] = [];
const built: PrismStage[] = [];
for (let i = 0; i < STAGE_COUNT; i++) Object.defineProperty(PRISM_STAGES, i, { enumerable: true, get: () => (built[i] ??= buildStage(i)) });
