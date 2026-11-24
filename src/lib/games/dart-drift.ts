/**
 * Dart Drift (흔들 다트) — an OIYO original timing darts game (2026-11-25).
 *
 * The aiming ring sways over the board on its own; tap to throw when it passes over a good spot. The middle scores 50,
 * the ring round it 25; the board's twenty numbers count once, three times on the thin inner ring and twice on the
 * outer one. Reach the stage's score with your darts.
 *
 * Pure and deterministic: every stage's sway is seeded per stage. Field px, y pointing down.
 */

export const DART_SLUG = "dart-drift";
export const STAGE_COUNT = 30;
export const CX = 180;
export const CY = 250;
export const R = 140;
export const FLIGHT = 0.15; // seconds from the tap to the dart landing (it lands where the ring was at the tap)
/** Numbers clockwise from the top. */
export const SECTORS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
export const BULL = 0.06; // radius fractions
export const OUTER_BULL = 0.13;
export const TREBLE = [0.56, 0.64];
export const DOUBLE = [0.92, 1];

export interface DartStage {
  stage: number;
  darts: number;
  amp: [number, number]; // sway half-widths (px)
  rate: [number, number]; // sway speeds (radians per second)
  phase: [number, number];
  centre: [number, number]; // where the sway is centred (px)
  need: number;
  par: number;
}

export interface Oche {
  stage: DartStage;
  t: number;
  thrown: number;
  hits: Array<{ x: number; y: number; points: number }>;
  total: number;
  over: boolean;
  won: boolean;
}

export const newOche = (stage: DartStage): Oche => ({ stage, t: 0, thrown: 0, hits: [], total: 0, over: false, won: false });

/** Where the aiming ring is at time t. */
export function reticle(st: DartStage, t: number): { x: number; y: number } {
  return { x: st.centre[0] + st.amp[0] * Math.sin(st.rate[0] * t + st.phase[0]), y: st.centre[1] + st.amp[1] * Math.sin(st.rate[1] * t + st.phase[1]) };
}

/** Points for a dart landing at (x, y). */
export function pointsAt(x: number, y: number): number {
  const dx = x - CX;
  const dy = y - CY;
  const d = Math.hypot(dx, dy) / R;
  if (d > DOUBLE[1]) return 0;
  if (d < BULL) return 50;
  if (d < OUTER_BULL) return 25;
  // angle clockwise from the top; each sector spans 18°, centred on its number
  const ang = (Math.atan2(dx, -dy) * 180) / Math.PI;
  const k = Math.floor((((ang + 9) % 360) + 360) % 360 / 18);
  const n = SECTORS[k];
  if (d >= TREBLE[0] && d < TREBLE[1]) return n * 3;
  if (d >= DOUBLE[0]) return n * 2;
  return n;
}

/** Throws a dart where the ring is now, scattered by (sx, sy) px. */
export function throwDart(o: Oche, sx = 0, sy = 0): number | null {
  if (o.over || o.thrown >= o.stage.darts) return null;
  const p = reticle(o.stage, o.t);
  const x = p.x + sx;
  const y = p.y + sy;
  const pts = pointsAt(x, y);
  o.hits.push({ x, y, points: pts });
  o.total += pts;
  o.thrown++;
  if (o.thrown >= o.stage.darts) {
    o.over = true;
    o.won = o.total >= o.stage.need;
  }
  return pts;
}

export function step(o: Oche, dt: number): void {
  if (!o.over) o.t += dt;
}

export function starsFor(o: Oche): number {
  if (!o.won) return 0;
  if (o.total >= o.stage.par) return 3;
  if (o.total >= Math.ceil((o.stage.need + o.stage.par) / 2)) return 2;
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

function gauss(rng: () => number): number {
  const u = Math.max(1e-9, rng());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

/** Spots worth aiming at: the bull, and the trebles of the big numbers. */
export const TARGETS: Array<{ x: number; y: number; r: number }> = (() => {
  const out = [{ x: CX, y: CY, r: BULL * R }];
  for (const n of [20, 19, 18, 17, 16]) {
    const k = SECTORS.indexOf(n);
    const a = ((k * 18) * Math.PI) / 180;
    const d = ((TREBLE[0] + TREBLE[1]) / 2) * R;
    out.push({ x: CX + Math.sin(a) * d, y: CY - Math.cos(a) * d, r: 4 });
  }
  return out;
})();

export interface ThrowerOpts {
  /** seconds to react (the player taps this long after deciding) */
  react?: number;
  /** spread of the tap's timing (seconds) and of the landing (px) */
  timing?: number;
  scatter?: number;
  /** how close (px) the ring must be predicted to come to a target before the player commits */
  window?: number;
  seed?: number;
  mode?: "aim" | "random";
}

export function pilot(st: DartStage, opts: ThrowerOpts = {}): Oche {
  const { react = 0.25, timing = 0.02, scatter = 2, window = 6, seed = 1, mode = "aim" } = opts;
  const rng = mulberry(seed * 2969 + 103);
  const o = newOche(st);
  const dt = 1 / 120;
  let tapAt = -1;
  let calm = 0.4;
  while (!o.over && o.t < 600) {
    if (mode === "random") {
      if (o.t >= calm) {
        throwDart(o, gauss(rng) * scatter, gauss(rng) * scatter);
        calm = o.t + 0.3 + rng() * 2;
      }
    } else if (tapAt < 0 && o.t >= calm) {
      // will the ring pass over a good spot react seconds from now?
      const d = react * (0.85 + rng() * 0.3);
      const p = reticle(st, o.t + d);
      const hit = TARGETS.find((g) => Math.hypot(p.x - g.x, p.y - g.y) < Math.min(window, g.r + window * 0.5));
      if (hit) tapAt = o.t + d + gauss(rng) * timing;
    }
    if (tapAt >= 0 && o.t >= tapAt) {
      throwDart(o, gauss(rng) * scatter, gauss(rng) * scatter);
      tapAt = -1;
      calm = o.t + 0.5;
    }
    step(o, dt);
  }
  return o;
}

function shape(stage: number) {
  const sway = Math.min(120, 40 + stage * 3);
  return {
    darts: 3 + Math.floor(stage / 5) * 1, // 3 up to 8
    amp: [sway, sway * 0.8] as [number, number],
    speed: 1.2 + stage * 0.04,
    share: stage < 5 ? 0.38 : stage < 15 ? 0.42 : 0.45, // points needed, as a share of the careful player's
  };
}

/** Human-like throwers: a quarter second to react, taps off by a few hundredths, a couple of px of scatter. */
export const HUMAN_THROWERS: ThrowerOpts[] = [1, 2, 3, 4, 5, 6].map((seed) => ({ react: 0.28, timing: 0.025, scatter: 2.5, window: 7, seed }));

export function buildStage(stage: number): DartStage {
  const sh = shape(stage);
  for (let attempt = 0; attempt < 200; attempt++) {
    const rng = mulberry(531000 + stage * 353 + attempt * 7919);
    const rate: [number, number] = [sh.speed * (0.9 + rng() * 0.2), sh.speed * (1.25 + rng() * 0.3)];
    const st: DartStage = {
      stage,
      darts: sh.darts,
      amp: [Math.round(sh.amp[0]), Math.round(sh.amp[1])],
      rate: [Math.round(rate[0] * 1000) / 1000, Math.round(rate[1] * 1000) / 1000],
      phase: [Math.round(rng() * 6283) / 1000, Math.round(rng() * 6283) / 1000],
      centre: [CX + Math.round((rng() * 2 - 1) * 10), CY - 30 + Math.round((rng() * 2 - 1) * 10)],
      need: 0,
      par: 0,
    };
    const careful = pilot(st, { react: 0.22, timing: 0.008, scatter: 1, window: 5 });
    st.need = Math.max(20, Math.round(careful.total * sh.share));
    st.par = Math.max(st.need, Math.round(careful.total * 0.85));
    if (HUMAN_THROWERS.some((o) => !pilot(st, o).won)) continue;
    if (starsFor(pilot(st, { react: 0.22, timing: 0.008, scatter: 1, window: 5 })) < 3) continue;
    if ([1, 2, 3, 4, 5, 6].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    return st;
  }
  throw new Error(`dart-drift stage ${stage + 1}: no fair board`);
}

export const DART_STAGES: DartStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
