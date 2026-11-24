/**
 * Yeontan Relay (연탄 나르기) — pass coal briquettes hand to hand up a steep alley to warm a home for winter.
 *
 * Every winter, volunteers line the narrow stairways of hillside neighbourhoods and pass yeontan (coal
 * briquettes) up from the truck, hand to hand, to the shed of a home that still heats with them. You run the
 * line: tap a volunteer to pass their briquette to the next one up. Each person needs a moment after
 * catching to turn and get a grip (the light turns green), and a moment after passing before they can catch
 * again. Pass too early and the briquette slips and breaks; hold it too long and their arms give out. Keep
 * the whole line moving and fill the shed before the truck has to leave.
 *
 * Pure and deterministic: lines and deliveries are seeded per stage.
 */

export const YEONTAN_SLUG = "yeontan-relay";
export const STAGE_COUNT = 30;
export const FLIGHT = 0.25; // s a briquette is in the air between two people

export interface Volunteer { turn: number; reset: number; hold: number } // s to get a grip after catching, s before catching again, s they can hold
export interface YeontanStage {
  stage: number;
  line: Volunteer[]; // bottom (0) to top
  arrivals: number[]; // times briquettes are unloaded at the bottom
  time: number; // s until the truck leaves
  need: number;
  par: number;
}

export interface Alley {
  stage: YeontanStage;
  t: number;
  holding: boolean[];
  heldSince: number[];
  readyAt: number[]; // can pass (when holding) / can catch (when empty) from this time
  catches: number[]; // how many each has caught (their grip time varies catch to catch)
  inFlight: Array<{ to: number; at: number }>; // to = line.length means the shed
  pile: number;
  unloaded: number;
  delivered: number;
  broken: number;
  over: boolean;
  won: boolean;
}

/** How long volunteer i needs to get a grip on their k-th catch: their usual time, sometimes quicker, sometimes slower. */
export function gripTime(stage: YeontanStage, i: number, k: number): number {
  const x = Math.sin((k + 1) * 12.9898 + (i + 1) * 78.233 + stage.stage * 3.1) * 43758.5453;
  return stage.line[i].turn * (0.5 + 1.1 * (x - Math.floor(x)));
}

export function newAlley(stage: YeontanStage): Alley {
  const n = stage.line.length;
  return { stage, t: 0, holding: new Array(n).fill(false), heldSince: new Array(n).fill(0), readyAt: new Array(n).fill(0), catches: new Array(n).fill(0), inFlight: [], pile: 0, unloaded: 0, delivered: 0, broken: 0, over: false, won: false };
}

/** Can volunteer i pass right now without fumbling? */
export const gripped = (a: Alley, i: number) => a.holding[i] && a.t >= a.readyAt[i];

/** Is there room for a briquette to fly to i (nothing held or coming, and ready to catch on arrival)? */
export function canReceive(a: Alley, i: number): boolean {
  if (i >= a.stage.line.length) return true; // the shed
  if (a.holding[i] || a.inFlight.some((f) => f.to === i)) return false;
  return a.readyAt[i] <= a.t + FLIGHT;
}

export type PassResult = "passed" | "fumbled" | "blocked" | null;

export function pass(a: Alley, i: number): PassResult {
  if (a.over || i < 0 || i >= a.stage.line.length || !a.holding[i]) return null;
  if (a.t < a.readyAt[i]) {
    // not ready yet: it slips and breaks
    a.holding[i] = false;
    a.broken++;
    a.readyAt[i] = a.t + a.stage.line[i].reset;
    return "fumbled";
  }
  if (!canReceive(a, i + 1)) return "blocked";
  a.holding[i] = false;
  a.readyAt[i] = a.t + a.stage.line[i].reset;
  a.inFlight.push({ to: i + 1, at: a.t + FLIGHT });
  return "passed";
}

export interface AlleyEvents { delivered: number; dropped: number[]; end: boolean }

export function stepAlley(a: Alley, dt: number): AlleyEvents {
  const ev: AlleyEvents = { delivered: 0, dropped: [], end: false };
  if (a.over) return ev;
  a.t += dt;
  const n = a.stage.line.length;
  while (a.unloaded < a.stage.arrivals.length && a.stage.arrivals[a.unloaded] <= a.t) {
    a.unloaded++;
    a.pile++;
  }
  a.inFlight = a.inFlight.filter((f) => {
    if (a.t < f.at) return true;
    if (f.to >= n) {
      a.delivered++;
      ev.delivered++;
    } else {
      a.holding[f.to] = true;
      a.heldSince[f.to] = f.at;
      a.readyAt[f.to] = f.at + gripTime(a.stage, f.to, a.catches[f.to]++);
    }
    return false;
  });
  // the bottom volunteer picks one up from the truck's pile when free
  if (a.pile > 0 && !a.holding[0] && !a.inFlight.some((f) => f.to === 0) && a.t >= a.readyAt[0]) {
    a.pile--;
    a.holding[0] = true;
    a.heldSince[0] = a.t;
    a.readyAt[0] = a.t + gripTime(a.stage, 0, a.catches[0]++);
  }
  // arms give out
  for (let i = 0; i < n; i++) {
    if (a.holding[i] && a.t - a.heldSince[i] > a.stage.line[i].hold) {
      a.holding[i] = false;
      a.broken++;
      a.readyAt[i] = a.t + a.stage.line[i].reset;
      ev.dropped.push(i);
    }
  }
  if (a.delivered >= a.stage.need) {
    a.over = true;
    a.won = true;
  } else if (a.t >= a.stage.time) {
    a.over = true;
  }
  ev.end = a.over;
  return ev;
}

export function starsFor(a: Alley): number {
  if (!a.won) return 0;
  if (a.broken === 0 && a.t <= a.stage.time * 0.85) return 3;
  if (a.broken <= 2) return 2;
  return 1;
}

function mulberry(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface PilotOpts {
  /** s between two taps */
  gap?: number;
  /** s from a light turning green to noticing it */
  lag?: number;
  /** "line" passes the highest ready briquette with room above; "bottom" works from the bottom up; "spam" taps everyone in turn; "idle" never taps */
  mode?: "line" | "bottom" | "spam" | "idle";
}

export function pilot(stage: YeontanStage, opts: PilotOpts = {}): Alley {
  const { gap = 0.05, lag = 0, mode = "line" } = opts;
  const a = newAlley(stage);
  const dt = 1 / 60;
  let next = 0;
  let spin = 0;
  const n = stage.line.length;
  while (!a.over) {
    if (mode !== "idle" && a.t >= next) {
      let pick = -1;
      if (mode === "spam") {
        pick = spin++ % n;
      } else {
        const order = Array.from({ length: n }, (_, i) => (mode === "line" ? n - 1 - i : i));
        for (const i of order) {
          if (a.holding[i] && a.t >= a.readyAt[i] + lag && canReceive(a, i + 1)) {
            pick = i;
            break;
          }
        }
      }
      if (pick >= 0) {
        pass(a, pick);
        next = a.t + gap;
      }
    }
    stepAlley(a, dt);
  }
  return a;
}

function shape(stage: number) {
  return {
    people: 4 + Math.floor(stage / 6),
    turn: 0.6,
    reset: 0.35,
    hold: Math.max(2.2, 4 - stage * 0.06),
    every: Math.max(0.55, 1.2 - stage * 0.02), // s between briquettes off the truck
    time: 40,
  };
}

/** Human-like line leaders used to set the count: a quarter second between taps, and a beat to notice a green light. */
export const HUMAN_LEADERS: PilotOpts[] = [
  { gap: 0.25, lag: 0.15 },
  { gap: 0.3, lag: 0.2 },
  { gap: 0.35, lag: 0.12 },
];

export function buildStage(stage: number): YeontanStage {
  const sh = shape(stage);
  const rng = mulberry(101900 + stage * 73);
  const line: Volunteer[] = Array.from({ length: sh.people }, () => ({
    turn: sh.turn * (0.7 + rng() * 0.7),
    reset: sh.reset * (0.7 + rng() * 0.7),
    hold: sh.hold * (0.8 + rng() * 0.4),
  }));
  const arrivals: number[] = [];
  for (let t = 0.5; t < sh.time - 2; t += sh.every * (0.6 + rng() * 0.8)) arrivals.push(t);
  const st: YeontanStage = { stage, line, arrivals, time: sh.time, need: 999, par: 0 };
  const human = HUMAN_LEADERS.map((o) => pilot(st, o).delivered);
  st.need = Math.max(5, Math.floor(Math.min(...human) * 0.85));
  st.par = Math.ceil(pilot(st).t);
  return st;
}

export const YEONTAN_STAGES: YeontanStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
