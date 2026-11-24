/**
 * Crane Count (두루미 세기) — count the winter cranes as their flocks fly over the frozen fields.
 *
 * Every winter, red-crowned and white-naped cranes come down to the fields around Cheorwon, near the border,
 * and volunteers count them for the year's census. A flock crosses the sky for a few seconds and is gone.
 * Count what you can — the birds fly in little family groups, which are easier to count than one big mass —
 * then dial in your number before the next flock. Later flocks mix in white-naped cranes (grey, with a white
 * stripe down the neck) that you must leave out of the count of red-crowned cranes. Get close enough on enough
 * flocks to clear the stage.
 *
 * Pure and deterministic: every flock is seeded per stage.
 */

export const CRANE_SLUG = "crane-count";
export const STAGE_COUNT = 30;
export const SKY_W = 360;
export const SKY_TOP = 70;
export const SKY_H = 330;

export interface Bird { dx: number; dy: number; red: boolean; phase: number } // offset from the flock's centre
export interface Flock { birds: Bird[]; time: number; y: number; dir: 1 | -1 } // seconds on screen, centre height
export interface CraneStage {
  stage: number;
  flocks: Flock[];
  tolerance: number; // share of the true count an answer may be off by (at least 1)
  need: number; // flocks answered within tolerance
}

export const reds = (f: Flock) => f.birds.filter((b) => b.red).length;
export const allowed = (st: CraneStage, f: Flock) => Math.max(1, Math.round(reds(f) * st.tolerance));
export const close = (st: CraneStage, f: Flock, answer: number) => Math.abs(answer - reds(f)) <= allowed(st, f);

/** Where a bird is at time t into its flock's pass (the flock crosses from one side to the other). */
export function birdAt(f: Flock, b: Bird, t: number): { x: number; y: number } {
  const span = SKY_W + 260;
  const p = Math.max(0, Math.min(1, t / f.time));
  const cx = f.dir > 0 ? -130 + span * p : SKY_W + 130 - span * p;
  return { x: cx + b.dx * f.dir, y: f.y + b.dy + Math.sin(t * 2 + b.phase) * 3 };
}

export interface Census {
  stage: CraneStage;
  idx: number;
  phase: "fly" | "answer" | "done";
  t: number;
  answers: number[];
  good: number;
  over: boolean;
  won: boolean;
}

export function newCensus(stage: CraneStage): Census {
  return { stage, idx: 0, phase: "fly", t: 0, answers: [], good: 0, over: false, won: false };
}

export const currentFlock = (c: Census) => c.stage.flocks[Math.min(c.idx, c.stage.flocks.length - 1)];

export function stepCensus(c: Census, dt: number): boolean {
  if (c.over || c.phase !== "fly") return false;
  c.t += dt;
  if (c.t >= currentFlock(c).time) {
    c.phase = "answer";
    return true;
  }
  return false;
}

/** Hands in the number for the flock just seen. */
export function answer(c: Census, n: number): boolean | null {
  if (c.over || c.phase !== "answer") return null;
  const ok = close(c.stage, currentFlock(c), n);
  c.answers.push(n);
  if (ok) c.good++;
  c.idx++;
  c.t = 0;
  if (c.idx >= c.stage.flocks.length) {
    c.over = true;
    c.phase = "done";
    c.won = c.good >= c.stage.need;
  } else c.phase = "fly";
  return ok;
}

export function starsFor(c: Census): number {
  if (!c.won) return 0;
  const exact = c.stage.flocks.filter((f, i) => c.answers[i] === reds(f)).length;
  if (c.good === c.stage.flocks.length && exact >= Math.ceil(c.stage.flocks.length / 2)) return 3;
  if (c.good === c.stage.flocks.length) return 2;
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

export interface CounterOpts {
  /** birds a second this counter can count one by one (red cranes; grey ones among them slow it down) */
  rate?: number;
  /** how far off (share, as a spread) a guess at the uncounted rest tends to be */
  spread?: number;
  /** counts family groups as units it can see at a glance (up to this many birds) */
  glance?: number;
  seed?: number;
  /** "count" counts then estimates the rest; "guess" says a typical number without looking */
  mode?: "count" | "guess" | "exact";
}

/** What a counter with these habits says for a flock. */
export function countFlock(st: CraneStage, f: Flock, opts: CounterOpts, rng: () => number): number {
  const { rate = 4, spread = 0.2, glance = 3, mode = "count" } = opts;
  const n = reds(f);
  if (mode === "exact") return n;
  if (mode === "guess") return Math.round(st.flocks.reduce((s, x) => s + reds(x), 0) / st.flocks.length);
  // glancing at little groups speeds counting; grey birds mixed in slow it down
  const greys = f.birds.length - n;
  const groupBoost = 1 + (glance - 1) * 0.15;
  const effRate = (rate * groupBoost) / (1 + (1.5 * greys) / Math.max(1, f.birds.length));
  const counted = Math.min(n, Math.floor(effRate * f.time * 0.7));
  const rest = n - counted;
  // a guess at the rest: off by a share of it, normally distributed-ish (sum of three uniforms)
  const err = ((rng() + rng() + rng() - 1.5) / 1.5) * spread;
  return Math.max(0, counted + Math.round(rest * (1 + err)));
}

export function pilot(stage: CraneStage, opts: CounterOpts = {}): Census {
  const rng = mulberry((opts.seed ?? 1) * 104729);
  const c = newCensus(stage);
  while (!c.over) {
    while (c.phase === "fly") stepCensus(c, 1 / 30);
    answer(c, countFlock(stage, currentFlock(c), opts, rng));
  }
  return c;
}

function shape(stage: number) {
  return {
    flocks: 4 + Math.floor(stage / 8),
    minBirds: 6 + stage,
    maxBirds: 14 + stage * 2,
    time: Math.max(3.2, 7 - stage * 0.13),
    greys: stage < 6 ? 0 : Math.min(0.45, (stage - 5) * 0.025),
    tolerance: Math.max(0.06, 0.15 - stage * 0.003),
    group: Math.max(2, 6 - Math.floor(stage / 6)),
  };
}

/** Human-like counters used to set the mark: about three birds a second, guessing the rest within a fifth. */
export const HUMAN_COUNTERS: CounterOpts[] = [1, 2, 3, 4, 5, 6].map((seed) => ({ rate: 3, spread: 0.2, glance: 3, seed }));

export function buildStage(stage: number): CraneStage {
  const sh = shape(stage);
  const rng = mulberry(131300 + stage * 97);
  const flocks: Flock[] = Array.from({ length: sh.flocks }, (_, k) => {
    const total = sh.minBirds + Math.floor(rng() * (sh.maxBirds - sh.minBirds + 1));
    const greyCount = Math.round(total * sh.greys * (0.6 + rng() * 0.8));
    const kinds = shuffle([...Array(total - greyCount).fill(true), ...Array(greyCount).fill(false)] as boolean[], rng);
    // family groups of a few birds, loosely in a wide V
    const birds: Bird[] = [];
    let g = 0;
    while (birds.length < total) {
      const size = Math.min(total - birds.length, 2 + Math.floor(rng() * (sh.group - 1)));
      const gx = -110 + (g % 6) * 44 + (rng() - 0.5) * 12;
      const gy = (Math.abs((g % 6) - 2.5) - 1.2) * 22 + Math.floor(g / 6) * 34 + (rng() - 0.5) * 10;
      for (let i = 0; i < size; i++) birds.push({ dx: gx + (i % 3) * 13 + (rng() - 0.5) * 4, dy: gy + Math.floor(i / 3) * 12 + (rng() - 0.5) * 4, red: kinds[birds.length], phase: rng() * 6.28 });
      g++;
    }
    return { birds, time: sh.time * (0.9 + rng() * 0.2), y: SKY_TOP + 110 + (rng() - 0.5) * 80, dir: k % 2 === 0 ? 1 : -1 };
  });
  const st: CraneStage = { stage, flocks, tolerance: sh.tolerance, need: flocks.length };
  const human = HUMAN_COUNTERS.map((o) => pilot(st, o).good).sort((a, b) => a - b);
  st.need = Math.max(2, Math.min(flocks.length - 1, human[1] - 1));
  return st;
}

export const CRANE_STAGES: CraneStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
