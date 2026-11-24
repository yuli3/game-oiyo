/**
 * Hwangtae Dry (황태 덕장) — freeze, thaw, again and again: dry the pollack on the winter racks.
 *
 * In the cold mountain valleys of Gangwon-do, pollack hang on wooden racks (덕장) all winter. Frozen by
 * night and thawed by day, over and over, the flesh turns into fluffy golden hwangtae. Each time a fish
 * that was frozen thaws again counts as one cycle. But a warm spell can spoil the fish, and a hard cold
 * snap freezes it white and tough. Each rack has a straw mat: rolled down it shelters the fish and softens
 * the day's swing — which also stops the cycles. Read the forecast, roll the mat down for the bad days and
 * up for the good ones, and reach the season's count before winter ends.
 *
 * Pure and deterministic: the weather is seeded per stage.
 */

export const HWANGTAE_SLUG = "hwangtae-dry";
export const STAGE_COUNT = 30;
export const HOURS_PER_SEC = 6; // game time
export const FREEZE = -4; // °C the fish must fall below to count as frozen
export const THAW = 0.5; // °C a frozen fish must rise above to count a cycle
export const WARM = 4; // °C above which it starts to spoil
export const HARD = -14; // °C below which it starts to freeze white
export const SETTLE = 0.35; // per hour the fish follows the air
export const COVER_MID = -2; // °C a covered rack is pulled toward
export const COVER_KEEP = 0.4; // share of the air's swing a covered rack still feels

export interface Rack { exposure: number } // how much harder the wind hits this rack (1 = sheltered)
export interface HwangtaeStage {
  stage: number;
  days: number;
  mean: number[]; // per day
  amp: number[]; // per day
  racks: Rack[];
  need: number; // cycles on every rack
  par: number;
}

export interface Yard {
  stage: HwangtaeStage;
  h: number; // hours since the season began
  fish: number[];
  frozen: boolean[];
  cycles: number[];
  spoil: number[];
  white: number[];
  covered: boolean[];
  over: boolean;
  won: boolean;
  fail: "" | "spoil" | "white" | "short";
}

/** Air temperature at hour h: the day's mean plus a swing, coldest at 3 am and warmest at 3 pm. */
export function air(st: HwangtaeStage, h: number): number {
  const d = Math.min(st.days - 1, Math.max(0, Math.floor(h / 24)));
  const nd = Math.min(st.days - 1, d + 1);
  const f = (h % 24) / 24;
  // blend toward the next day's mean so the weather turns smoothly
  const mean = st.mean[d] * (1 - f) + st.mean[nd] * f;
  const amp = st.amp[d] * (1 - f) + st.amp[nd] * f;
  return mean - amp * Math.cos((2 * Math.PI * ((h % 24) - 3)) / 24);
}

/** What a rack feels: the open air pushed harder by the wind, or softened under the mat. */
export function felt(st: HwangtaeStage, rack: number, h: number, covered: boolean): number {
  const a = air(st, h);
  if (covered) return COVER_MID + (a - COVER_MID) * COVER_KEEP;
  const e = st.racks[rack].exposure;
  return a < 0 ? a * e : a;
}

export function newYard(stage: HwangtaeStage): Yard {
  const n = stage.racks.length;
  const start = air(stage, 0);
  return {
    stage,
    h: 0,
    fish: new Array(n).fill(start),
    frozen: new Array(n).fill(start < FREEZE),
    cycles: new Array(n).fill(0),
    spoil: new Array(n).fill(0),
    white: new Array(n).fill(0),
    covered: new Array(n).fill(false),
    over: false,
    won: false,
    fail: "",
  };
}

export function toggle(y: Yard, rack: number): void {
  if (!y.over && rack >= 0 && rack < y.covered.length) y.covered[rack] = !y.covered[rack];
}

export const seasonHours = (st: HwangtaeStage) => st.days * 24;

export interface YardEvents { cycled: number[]; end: boolean }

/** Advances by dt seconds of play (HOURS_PER_SEC game hours each), in small hour steps. */
export function stepYard(y: Yard, dt: number): YardEvents {
  const ev: YardEvents = { cycled: [], end: false };
  if (y.over) return ev;
  let left = dt * HOURS_PER_SEC;
  while (left > 1e-9 && !y.over) {
    const dh = Math.min(0.1, left);
    left -= dh;
    y.h += dh;
    for (let r = 0; r < y.fish.length; r++) {
      const t = felt(y.stage, r, y.h, y.covered[r]);
      y.fish[r] += (t - y.fish[r]) * Math.min(1, SETTLE * dh);
      const f = y.fish[r];
      if (f < FREEZE) y.frozen[r] = true;
      else if (y.frozen[r] && f > THAW) {
        y.frozen[r] = false;
        y.cycles[r]++;
        ev.cycled.push(r);
      }
      if (f > WARM) y.spoil[r] += (f - WARM) * 0.05 * dh;
      if (f < HARD) y.white[r] += (HARD - f) * 0.03 * dh;
      if (y.spoil[r] >= 1) return finish(y, false, "spoil", ev);
      if (y.white[r] >= 1) return finish(y, false, "white", ev);
    }
    if (y.cycles.every((c) => c >= y.stage.need)) return finish(y, true, "", ev);
    if (y.h >= seasonHours(y.stage)) return finish(y, false, "short", ev);
  }
  return ev;
}

function finish(y: Yard, won: boolean, fail: Yard["fail"], ev: YardEvents): YardEvents {
  y.over = true;
  y.won = won;
  y.fail = fail;
  ev.end = true;
  return ev;
}

export function starsFor(y: Yard): number {
  if (!y.won) return 0;
  const worst = Math.max(...y.spoil, ...y.white);
  const fast = y.h <= seasonHours(y.stage) * 0.8;
  if (worst < 0.35 && fast) return 3;
  if (worst < 0.7 || fast) return 2;
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
  /** game hours between looks at the forecast */
  every?: number;
  /** game hours ahead the forecast is read */
  ahead?: number;
  /** °C of slack kept from the spoil and white lines */
  slack?: number;
  /** "read" follows the forecast; "open" never covers; "shut" keeps every mat down; "late" reacts to the fish, not the forecast */
  mode?: "read" | "open" | "shut" | "late";
}

/**
 * Autopilot: every few hours looks ahead; a rack is covered when the open air ahead would take its fish
 * past the spoil or white line (with some slack), and opened again otherwise.
 */
export function pilot(stage: HwangtaeStage, opts: PilotOpts = {}): Yard {
  const { every = 1, ahead = 10, slack = 1.5, mode = "read" } = opts;
  const y = newYard(stage);
  const dt = 0.1 / HOURS_PER_SEC;
  let look = 0;
  if (mode === "shut") y.covered.fill(true);
  while (!y.over) {
    if ((mode === "read" || mode === "late") && y.h >= look) {
      look = y.h + every;
      for (let r = 0; r < y.covered.length; r++) {
        let hot = -99;
        let cold = 99;
        if (mode === "read") {
          for (let k = 0; k <= ahead; k += 0.5) {
            const t = felt(stage, r, y.h + k, false);
            hot = Math.max(hot, t);
            cold = Math.min(cold, t);
          }
        } else {
          hot = y.fish[r] + 2;
          cold = y.fish[r] - 2;
        }
        const want = hot > WARM + slack || cold < HARD - slack + 2;
        if (want !== y.covered[r]) toggle(y, r);
      }
    }
    stepYard(y, dt);
  }
  return y;
}

function shape(stage: number) {
  return {
    racks: 1 + Math.floor(stage / 10),
    days: 10 + Math.floor(stage * 0.5),
    spells: 0.18 + stage * 0.012, // chance a day starts a warm spell or a cold snap
    amp: 6 + stage * 0.08,
  };
}

/** Human-like yard keepers used to set the count: they check less often and see less far ahead. */
export const HUMAN_KEEPERS: PilotOpts[] = [
  { every: 2, ahead: 7, slack: 1 },
  { every: 2.5, ahead: 6, slack: 1.5 },
  { every: 3, ahead: 8, slack: 1 },
];

function weather(stage: number, attempt: number) {
  const sh = shape(stage);
  const rng = mulberry(71900 + stage * 59 + attempt * 7907);
  const mean: number[] = [];
  const amp: number[] = [];
  let spell = 0;
  let spellLeft = 0;
  for (let d = 0; d < sh.days; d++) {
    if (spellLeft <= 0 && d > 0 && rng() < sh.spells) {
      spell = rng() < 0.5 ? 1 : -1;
      spellLeft = 1 + Math.floor(rng() * 2);
    }
    const base = -4 + (rng() * 2 - 1) * 1.5;
    if (spellLeft > 0) {
      mean.push(spell > 0 ? 4 + rng() * 3 : -14 - rng() * 4);
      spellLeft--;
    } else mean.push(base);
    amp.push(sh.amp * (0.8 + rng() * 0.4));
  }
  const racks: Rack[] = Array.from({ length: sh.racks }, (_, i) => ({ exposure: 1 + i * 0.25 }));
  return { days: sh.days, mean, amp, racks };
}

/**
 * Lays the winter out and sets the count from the human-like keepers; re-rolls a winter that the careful
 * keeper can't finish or that never covering or always covering would get through.
 */
export function buildStage(stage: number): HwangtaeStage {
  let st: HwangtaeStage | null = null;
  for (let attempt = 0; attempt < 80; attempt++) {
    const w = weather(stage, attempt);
    const trial: HwangtaeStage = { stage, ...w, need: 99, par: 0 };
    // how many cycles a human-like keeper gets on the slowest rack by the season's end
    const counts = HUMAN_KEEPERS.map((o) => {
      const y = pilot(trial, o);
      return y.fail === "short" ? Math.min(...y.cycles) : -1;
    });
    if (counts.some((c) => c < 3)) continue;
    trial.need = Math.max(3, Math.floor(Math.min(...counts) * 0.85));
    const best = pilot(trial);
    if (!best.won) continue;
    trial.par = Math.ceil(best.h);
    if (pilot(trial, { mode: "open" }).won || pilot(trial, { mode: "shut" }).won) continue;
    st = trial;
    break;
  }
  if (!st) throw new Error(`hwangtae-dry stage ${stage + 1}: no fair winter`);
  return st;
}

export const HWANGTAE_STAGES: HwangtaeStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
