/**
 * Odd Commute (이상한 출근길) — an OIYO original anomaly-spotting loop (2026-11-24).
 *
 * The morning train has stopped making sense: you walk from one car into the next, and it is the same car again.
 * Learn the car — the passengers, the posters, the straps and the clock. Then, car after car: if anything has
 * changed, turn back the way you came; if nothing has, go on to the next car. Every right call is one stop
 * closer to your station; one wrong call and you are back at the first stop. Reach your station before the
 * line runs out of cars.
 *
 * Pure and deterministic: every car, every change and the order they come in are seeded per stage.
 */

export const COMMUTE_SLUG = "odd-commute";
export const STAGE_COUNT = 30;

export const KINDS = ["passenger", "poster", "strap", "window", "clock", "bag", "light", "sign"] as const;
export type Kind = (typeof KINDS)[number];
export const CHANGES = ["gone", "extra", "colour", "size", "flip", "move"] as const;
export type Change = (typeof CHANGES)[number];

/** One thing in the car: where it is (field px of a 360 × 300 car), its size, colour and look. */
export interface Thing { kind: Kind; x: number; y: number; w: number; h: number; colour: number; look: number; flip: boolean }
export interface Anomaly { thing: number; change: Change; dx: number; scale: number; colour: number; salience: number }
export interface CommuteStage {
  stage: number;
  car: Thing[];
  /** per car in order: null for an ordinary car, or what has changed */
  cars: Array<Anomaly | null>;
  need: number; // right calls in a row to reach the station
}

export const PALETTE = ["#e03131", "#1971c2", "#2f9e44", "#f08c00", "#7048e8", "#0c8599", "#d6336c", "#495057"];

/** The car as seen with an anomaly (or unchanged). */
export function carWith(st: CommuteStage, a: Anomaly | null): Thing[] {
  const things = st.car.map((t) => ({ ...t }));
  if (!a) return things;
  const t = things[a.thing];
  if (a.change === "gone") things.splice(a.thing, 1);
  else if (a.change === "extra") things.push({ ...t, x: t.x + a.dx });
  else if (a.change === "colour") t.colour = a.colour;
  else if (a.change === "size") {
    t.w = Math.round(t.w * a.scale);
    t.h = Math.round(t.h * a.scale);
  } else if (a.change === "flip") t.flip = !t.flip;
  else if (a.change === "move") t.x += a.dx;
  return things;
}

export interface Ride {
  stage: CommuteStage;
  car: number; // index into stage.cars of the car you are in
  streak: number;
  wrong: number;
  over: boolean;
  won: boolean;
}

export function newRide(stage: CommuteStage): Ride {
  return { stage, car: 0, streak: 0, wrong: 0, over: false, won: false };
}

export const current = (r: Ride) => r.stage.cars[r.car] ?? null;

/** Your call on this car: "back" if something changed, "on" if not. Returns whether it was right. */
export function decide(r: Ride, call: "back" | "on"): boolean | null {
  if (r.over) return null;
  const odd = current(r) !== null;
  const right = (call === "back") === odd;
  if (right) r.streak++;
  else {
    r.streak = 0;
    r.wrong++;
  }
  r.car++;
  if (r.streak >= r.stage.need) {
    r.over = true;
    r.won = true;
  } else if (r.car >= r.stage.cars.length) r.over = true;
  return right;
}

export function starsFor(r: Ride): number {
  if (!r.won) return 0;
  if (r.wrong === 0) return 3;
  if (r.wrong <= 2) return 2;
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

export interface RiderOpts {
  /** how sharp the rider's eye is (1 = an ordinary careful look) */
  eye?: number;
  /** chance of turning back from an ordinary car out of nerves */
  nerves?: number;
  seed?: number;
  /** "look" judges each car; "on" always goes on; "back" always turns back; "random" flips a coin */
  mode?: "look" | "on" | "back" | "random" | "exact";
}

/** Whether a rider with this eye spots an anomaly: more likely for big, plain changes in a sparse car. */
export function spotChance(st: CommuteStage, a: Anomaly, eye: number): number {
  return Math.max(0, Math.min(0.98, a.salience * eye * (1.25 - st.car.length * 0.012)));
}

export function pilot(stage: CommuteStage, opts: RiderOpts = {}): Ride {
  const { eye = 1, nerves = 0.03, seed = 1, mode = "look" } = opts;
  const rng = mulberry(seed * 7331 + 5);
  const r = newRide(stage);
  while (!r.over) {
    const a = current(r);
    let call: "back" | "on";
    if (mode === "on") call = "on";
    else if (mode === "back") call = "back";
    else if (mode === "random") call = rng() < 0.5 ? "back" : "on";
    else if (mode === "exact") call = a ? "back" : "on";
    else call = a ? (rng() < spotChance(stage, a, eye) ? "back" : "on") : rng() < nerves ? "back" : "on";
    decide(r, call);
  }
  return r;
}

function shape(stage: number) {
  return {
    things: 8 + Math.floor(stage / 2),
    need: 5 + Math.floor(stage / 8),
    odd: 0.45,
    changes: stage < 4 ? 3 : stage < 10 ? 4 : stage < 16 ? 5 : 6, // how many kinds of change can happen
    subtle: Math.min(0.6, stage * 0.02), // how much smaller later changes get
  };
}

const SLOTS: Array<{ kind: Kind; y: number; w: number; h: number }> = [
  { kind: "window", y: 70, w: 64, h: 44 },
  { kind: "poster", y: 40, w: 40, h: 26 },
  { kind: "strap", y: 30, w: 10, h: 30 },
  { kind: "passenger", y: 170, w: 34, h: 70 },
  { kind: "bag", y: 220, w: 26, h: 20 },
  { kind: "light", y: 12, w: 50, h: 8 },
  { kind: "clock", y: 36, w: 22, h: 22 },
  { kind: "sign", y: 110, w: 30, h: 16 },
];

/** Human-like riders used to check a line: an ordinary eye, a little nervy. */
export const HUMAN_RIDERS: RiderOpts[] = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => ({ eye: 1, nerves: 0.03, seed }));

function layout(stage: number, attempt: number): CommuteStage {
  const sh = shape(stage);
  const rng = mulberry(201000 + stage * 137 + attempt * 7919);
  // the car: things spread along its length, each in a slot that suits it
  const car: Thing[] = [];
  const kinds = shuffle(Array.from({ length: sh.things }, (_, k) => SLOTS[k % SLOTS.length]), rng);
  kinds.forEach((slot, k) => {
    const x = 24 + ((k + 0.5) / sh.things) * 312 + (rng() - 0.5) * 12;
    car.push({ kind: slot.kind, x: Math.round(x), y: slot.y + Math.round((rng() - 0.5) * 10), w: slot.w, h: slot.h, colour: Math.floor(rng() * PALETTE.length), look: Math.floor(rng() * 3), flip: false });
  });
  const limit = sh.need * 2 + 8;
  const cars: Array<Anomaly | null> = [null]; // the first car is always the ordinary one, to learn
  const avgArea = car.reduce((s, t) => s + t.w * t.h, 0) / car.length;
  for (let k = 1; k < limit; k++) {
    if (rng() >= sh.odd) {
      cars.push(null);
      continue;
    }
    const thing = Math.floor(rng() * car.length);
    const change = CHANGES[Math.floor(rng() * sh.changes)];
    const base: Record<Change, number> = { gone: 0.95, extra: 0.85, colour: 0.85, size: 0.75, flip: 0.65, move: 0.6 };
    const t = car[thing];
    const big = Math.pow((t.w * t.h) / avgArea, 0.25);
    const scale = 1 + (rng() < 0.5 ? -1 : 1) * (0.5 - sh.subtle * 0.4);
    const dx = (rng() < 0.5 ? -1 : 1) * Math.round(40 - sh.subtle * 30);
    let colour = Math.floor(rng() * PALETTE.length);
    if (colour === t.colour) colour = (colour + 1) % PALETTE.length;
    const salience = Math.min(1, base[change] * big * (change === "size" || change === "move" ? 1 - sh.subtle * 0.5 : 1));
    cars.push({ thing, change, dx, scale, colour, salience });
  }
  return { stage, car, cars, need: sh.need };
}

const longestRun = (cars: Array<Anomaly | null>, odd: boolean) => {
  let best = 0;
  let run = 0;
  for (const c of cars.slice(1)) {
    run = (c !== null) === odd ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
};

/** Lays out a line until always going on, always turning back and coin flips fail, and most human-like riders get there. */
export function buildStage(stage: number): CommuteStage {
  for (let attempt = 0; attempt < 400; attempt++) {
    const st = layout(stage, attempt);
    if (longestRun(st.cars, false) >= st.need - 1 || longestRun(st.cars, true) >= st.need - 1) continue;
    if ([1, 2, 3, 4].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    if (HUMAN_RIDERS.filter((o) => pilot(st, o).won).length < 6) continue;
    return st;
  }
  throw new Error(`odd-commute stage ${stage + 1}: no fair line`);
}

export const COMMUTE_STAGES: CommuteStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
