/**
 * Number Boom (숫자 폭발) — an OIYO original 30-minute incremental (2026-11-24).
 *
 * A one-minute run, thirty runs, and the number goes from one to astronomical. Each run is a chain of machines:
 * the first makes coins every second, and every machine after it multiplies what flows through it. Spend coins on
 * upgrades — the first machine adds, the others multiply, and every level costs more than the last — and tap the
 * button for a little extra while you wait. Reach the run's target before the minute is up. Thirty runs of a
 * minute each: the whole game is about half an hour, and the last targets run past thirty zeros.
 *
 * Pure and deterministic: every chain of machines is seeded per stage.
 */

export const BOOM_SLUG = "number-boom";
export const STAGE_COUNT = 30;
export const RUN_SECONDS = 60;
export const TAP_SHARE = 0.06; // a tap gives this share of a second's output (at least a tenth of the first machine's level)

/** base: coins/s per level (the first machine); step: a later machine at level L multiplies the flow by 1 + step × L. */
export interface Machine { base: number; step: number; cost: number; growth: number }
export interface BoomStage {
  stage: number;
  machines: Machine[];
  start: number; // coins at the start
  target: number;
  par: number; // seconds a sharp player needs
}

export interface Run {
  stage: BoomStage;
  levels: number[];
  coins: number;
  t: number;
  taps: number;
  peak: number; // the most coins held at once (what the target is measured against)
  over: boolean;
  won: boolean;
}

export const newRun = (stage: BoomStage): Run => ({ stage, levels: stage.machines.map((_, i) => (i === 0 ? 1 : 0)), coins: stage.start, t: 0, taps: 0, peak: stage.start, over: false, won: false });

/** Coins per second for these levels: the first machine's output times every multiplier after it. */
export function rateOf(st: BoomStage, levels: number[]): number {
  let r = st.machines[0].base * levels[0];
  for (let i = 1; i < st.machines.length; i++) r *= 1 + st.machines[i].step * levels[i];
  return r;
}

export const rate = (r: Run) => rateOf(r.stage, r.levels);
export const costOf = (st: BoomStage, i: number, level: number) => st.machines[i].cost * Math.pow(st.machines[i].growth, level);
export const cost = (r: Run, i: number) => costOf(r.stage, i, r.levels[i]);

/** Buys the next level of a machine if it can be afforded. */
export function buy(r: Run, i: number): boolean {
  if (r.over || i < 0 || i >= r.levels.length) return false;
  const c = cost(r, i);
  if (r.coins < c) return false;
  r.coins -= c;
  r.levels[i]++;
  check(r);
  return true;
}

export function tap(r: Run): number {
  if (r.over) return 0;
  const g = Math.max(r.stage.machines[0].base * 0.1, rate(r) * TAP_SHARE);
  r.coins += g;
  r.taps++;
  check(r);
  return g;
}

function check(r: Run): void {
  r.peak = Math.max(r.peak, r.coins);
  if (r.coins >= r.stage.target) {
    r.over = true;
    r.won = true;
  }
}

export function step(r: Run, dt: number): void {
  if (r.over) return;
  r.t += dt;
  r.coins += rate(r) * dt;
  check(r);
  if (!r.over && r.t >= RUN_SECONDS) r.over = true;
}

export function starsFor(r: Run): number {
  if (!r.won) return 0;
  if (r.t <= r.stage.par * 1.1) return 3;
  if (r.t <= (r.stage.par + RUN_SECONDS) / 2) return 2;
  return 1;
}

const UNITS: Array<[number, Record<string, string>]> = [
  [1e32, { ko: "구", en: "", ja: "溝", zh: "沟", fr: "", es: "" }],
  [1e28, { ko: "양", en: "", ja: "穣", zh: "穰", fr: "", es: "" }],
  [1e24, { ko: "자", en: "Sp", ja: "秭", zh: "秭", fr: "Sp", es: "Sp" }],
  [1e20, { ko: "해", en: "Qi", ja: "垓", zh: "垓", fr: "Qi", es: "Qi" }],
  [1e16, { ko: "경", en: "Qa", ja: "京", zh: "京", fr: "Qa", es: "Qa" }],
  [1e12, { ko: "조", en: "T", ja: "兆", zh: "兆", fr: "T", es: "T" }],
  [1e8, { ko: "억", en: "", ja: "億", zh: "亿", fr: "", es: "" }],
  [1e4, { ko: "만", en: "", ja: "万", zh: "万", fr: "", es: "" }],
];
const WEST: Array<[number, string]> = [[1e33, "Dc"], [1e30, "No"], [1e27, "Oc"], [1e24, "Sp"], [1e21, "Sx"], [1e18, "Qi"], [1e15, "Qa"], [1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]];

/** A big number, short: 만·억·조·경·해·자 in Korean, Chinese and Japanese, K·M·B·T… elsewhere. */
export function shortNumber(v: number, locale = "en"): string {
  if (!Number.isFinite(v)) return "∞";
  const east = locale === "ko" || locale === "ja" || locale === "zh";
  const table = east ? UNITS.map(([d, u]) => [d, u[locale]] as [number, string]) : WEST;
  for (const [d, u] of table) if (v >= d) return `${(v / d).toFixed(v / d >= 100 ? 0 : v / d >= 10 ? 1 : 2)}${u}`;
  return v >= 100 ? Math.floor(v).toString() : v.toFixed(v >= 10 ? 1 : 2);
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

/** The upgrade that adds most coins per second for every coin it costs. */
export function bestBuy(r: Run): number {
  let best = -1;
  let score = -Infinity;
  const now = rate(r);
  for (let i = 0; i < r.levels.length; i++) {
    const c = cost(r, i);
    const lv = r.levels.slice();
    lv[i]++;
    const s = (rateOf(r.stage, lv) - now) / c;
    if (s > score) {
      score = s;
      best = i;
    }
  }
  return best;
}

export interface PlayerOpts {
  /** seconds between looks at the shop */
  look?: number;
  /** taps a second while waiting */
  taps?: number;
  seed?: number;
  /** "best" buys the best value; "first" only ever upgrades the first machine; "dear" saves for the dearest; "random" buys at random; "none" only taps */
  mode?: "best" | "first" | "dear" | "random" | "none";
}

export function pilot(stage: BoomStage, opts: PlayerOpts = {}): Run {
  const { look = 0.25, taps = 5, seed = 1, mode = "best" } = opts;
  const rng = mulberry(seed * 1913 + 3);
  const r = newRun(stage);
  const dt = 1 / 20;
  let nextLook = look;
  let nextTap = 0;
  while (!r.over) {
    if (taps > 0 && r.t >= nextTap) {
      tap(r);
      nextTap = r.t + (1 / taps) * (0.8 + rng() * 0.4);
    }
    if (r.t >= nextLook) {
      // buy what this player buys, as many as can be afforded, then look away
      for (let guard = 0; guard < 50 && !r.over; guard++) {
        let pick = -1;
        if (mode === "best") pick = bestBuy(r);
        else if (mode === "first") pick = 0;
        else if (mode === "dear") pick = r.levels.length - 1;
        else if (mode === "random") pick = shuffle(r.levels.map((_, i) => i), rng)[0];
        if (pick < 0 || !buy(r, pick)) break;
      }
      nextLook = r.t + look * (0.75 + rng() * 0.5);
    }
    step(r, dt);
  }
  return r;
}

function shape(stage: number) {
  return { machines: Math.min(6, 2 + Math.floor(stage / 6)), power: 1 + stage * 0.07 };
}

/** Human-like players used to set the target: they look at the shop every second or so and tap about four times a second. */
export const HUMAN_PLAYERS: PlayerOpts[] = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => ({ look: 1.1, taps: 4, seed }));

function layout(stage: number, attempt: number): BoomStage {
  const sh = shape(stage);
  const rng = mulberry(241000 + stage * 163 + attempt * 7919);
  // every run starts in a bigger currency: the numbers climb from hundreds to twenty-odd zeros over the thirty runs
  const scale = Math.pow(10, Math.floor(stage * 0.75));
  const boost = 1 + attempt * 0.08; // a re-roll that still lets lazy play through gets stronger multipliers
  const machines: Machine[] = [];
  for (let i = 0; i < sh.machines; i++) {
    if (i === 0) machines.push({ base: Math.round(1 + stage * 0.5) * scale, step: 0, cost: (8 + stage * 2) * scale, growth: 1.22 + rng() * 0.06 });
    else
      machines.push({
        base: 0,
        // later stages: bigger multiplier steps, longer chains
        // machines differ a lot in value for money: some are bargains, some are traps
        step: +((0.22 * sh.power * (0.5 + rng())) * boost).toFixed(3),
        cost: Math.round(40 * Math.pow(6, i - 1) * (0.5 + rng() * 2)) * scale,
        growth: +(1.45 + i * 0.12 + rng() * 0.1).toFixed(3),
      });
  }
  return { stage, machines, start: 10 * scale, target: Infinity, par: RUN_SECONDS };
}

/** What careless play reaches in a minute: one machine only, saving for the dearest, buying at random, only tapping. */
const careless = (st: BoomStage) =>
  Math.max(
    pilot(st, { mode: "first", look: 1, taps: 4 }).peak,
    pilot(st, { mode: "dear", look: 1, taps: 4 }).peak,
    pilot(st, { mode: "none", taps: 4 }).peak,
    ...[1, 2, 3].map((seed) => pilot(st, { mode: "random", look: 1, taps: 4, seed }).peak),
  );

/** Sets the target between what careless play and what most human-like players reach in the minute. */
export function buildStage(stage: number): BoomStage {
  for (let attempt = 0; attempt < 120; attempt++) {
    const st = layout(stage, attempt);
    const finals = HUMAN_PLAYERS.map((o) => pilot(st, o).peak).sort((a, b) => a - b);
    const lazy = careless(st);
    // most human-like players must clear it with room to spare, and careless play must fall well short
    if (lazy * 1.1 > finals[1] * 0.82) continue;
    const target = Number((finals[1] * 0.82).toPrecision(2));
    st.target = target;
    st.par = Math.ceil(pilot({ ...st }).t);
    return st;
  }
  throw new Error(`number-boom stage ${stage + 1}: no fair chain`);
}

export const BOOM_STAGES: BoomStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
