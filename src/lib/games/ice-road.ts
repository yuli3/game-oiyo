/**
 * Ice Road (얼음길 운전) — drive a truck across a frozen lake: not too fast, not too slow.
 *
 * A heavy truck pushes a wave along under the ice. When the truck's speed matches the speed of that
 * wave, the wave piles up under the wheels and the ice starts to crack. That speed depends on how deep
 * the water is, so every stretch of the road has its own danger band. Hold to step on the gas, let go
 * to brake. Cruise either under the band or over it, and when you must cross it, cross it quickly.
 * Pressure ridges (얼음 둑) must be taken slowly, and the clock is running, so crawling is no answer.
 *
 * Pure and deterministic: the road is seeded per stage.
 */

export const ICE_ROAD_SLUG = "ice-road";
export const STAGE_COUNT = 30;
export const VMAX = 26; // m/s
export const ACCEL = 6; // m/s² while holding
export const BRAKE = 11; // m/s² while released
export const STRESS_RATE = 0.55; // per s at the very middle of a band
export const STRESS_HEAL = 0.1; // per s outside every band
export const RIDGE_SLACK = 1.5; // m/s over a ridge's limit still gets over it

export interface Stretch { from: number; to: number; wave: number; width: number } // band: |v - wave| < width
export interface Ridge { at: number; limit: number }
export interface IceRoadStage {
  stage: number;
  length: number; // m
  stretches: Stretch[];
  ridges: Ridge[];
  timeLimit: number; // s
  par: number; // s
}

export interface Drive {
  stage: IceRoadStage;
  t: number;
  x: number;
  v: number;
  stress: number;
  over: boolean;
  won: boolean;
  fail: "" | "crack" | "ridge" | "time";
  ridgeIdx: number;
}

export function stretchAt(stage: IceRoadStage, x: number): Stretch {
  for (const s of stage.stretches) if (x < s.to) return s;
  return stage.stretches[stage.stretches.length - 1];
}

/** 0 outside the band, up to 1 at its middle. */
export function bandLoad(s: Stretch, v: number): number {
  const d = Math.abs(v - s.wave) / s.width;
  return d >= 1 ? 0 : 1 - d * d;
}

export function newDrive(stage: IceRoadStage): Drive {
  return { stage, t: 0, x: 0, v: 0, stress: 0, over: false, won: false, fail: "", ridgeIdx: 0 };
}

export interface DriveEvents { ridge: boolean; end: boolean; cracking: boolean }

export function stepDrive(d: Drive, gas: boolean, dt: number): DriveEvents {
  const ev: DriveEvents = { ridge: false, end: false, cracking: false };
  if (d.over) return ev;
  d.t += dt;
  d.v = Math.max(0, Math.min(VMAX, d.v + (gas ? ACCEL : -BRAKE) * dt));
  d.x += d.v * dt;
  const load = bandLoad(stretchAt(d.stage, d.x), d.v);
  if (load > 0) {
    d.stress += STRESS_RATE * load * dt;
    ev.cracking = true;
  } else d.stress = Math.max(0, d.stress - STRESS_HEAL * dt);
  const r = d.stage.ridges[d.ridgeIdx];
  if (r && d.x >= r.at) {
    d.ridgeIdx++;
    ev.ridge = true;
    if (d.v > r.limit + RIDGE_SLACK) return finish(d, false, "ridge", ev);
  }
  if (d.stress >= 1) return finish(d, false, "crack", ev);
  if (d.x >= d.stage.length) return finish(d, true, "", ev);
  if (d.t >= d.stage.timeLimit) return finish(d, false, "time", ev);
  return ev;
}

function finish(d: Drive, won: boolean, fail: Drive["fail"], ev: DriveEvents): DriveEvents {
  d.over = true;
  d.won = won;
  d.fail = fail;
  ev.end = true;
  return ev;
}

export function starsFor(d: Drive): number {
  if (!d.won) return 0;
  if (d.t <= d.stage.par * 1.06) return 3;
  if (d.t <= d.stage.timeLimit * 0.92) return 2;
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

/** The speed a careful driver aims for on a stretch: just over its band if the truck can, else just under. */
export function cruiseFor(s: Stretch, margin: number): number {
  const over = s.wave + s.width + margin;
  return over <= VMAX - 0.5 ? Math.min(VMAX - 0.5, over + 2) : Math.max(1.5, s.wave - s.width - margin);
}

export interface PilotOpts {
  /** s between the speedometer and the foot */
  lag?: number;
  /** m/s kept clear of a band */
  margin?: number;
  /** "read" follows each stretch; "steady" holds one speed everywhere; "flat" floors it; "crawl" creeps */
  mode?: "read" | "steady" | "flat" | "crawl";
  steady?: number;
  seed?: number;
  /** m/s of wobble in where the driver thinks the band is */
  noise?: number;
}

export function pilot(stage: IceRoadStage, opts: PilotOpts = {}): Drive {
  const { lag = 0.05, margin = 1, mode = "read", steady = 14, seed = 1, noise = 0 } = opts;
  const rng = mulberry(seed);
  const d = newDrive(stage);
  const dt = 1 / 60;
  const hist: number[] = [];
  const lagN = Math.max(0, Math.round(lag / dt));
  let wobble = 0;
  let wobbleAt = 0;
  while (!d.over) {
    hist.push(d.v);
    const seen = hist.length > lagN ? hist[hist.length - 1 - lagN] : 0;
    if (d.t >= wobbleAt) {
      wobble = (rng() * 2 - 1) * noise;
      wobbleAt = d.t + 0.8;
    }
    let target: number;
    if (mode === "flat") target = VMAX;
    else if (mode === "crawl") target = 3;
    else if (mode === "steady") target = steady;
    else target = cruiseFor(stretchAt(stage, d.x + d.v * lag), margin) + wobble;
    // ridges ahead: be at or under the limit when there, braking at a comfortable rate
    for (let k = d.ridgeIdx; k < stage.ridges.length; k++) {
      const r = stage.ridges[k];
      const gap = r.at - d.x - d.v * lag - 1;
      if (gap > 200) break;
      const allow = Math.sqrt(Math.max(0, (r.limit - 0.5) ** 2 + 2 * BRAKE * 0.7 * Math.max(0, gap)));
      target = Math.min(target, allow);
    }
    stepDrive(d, seen < target, dt);
  }
  return d;
}

function shape(stage: number) {
  return {
    length: 420 + stage * 14,
    width: 2.4 + Math.min(1, stage * 0.035),
    ridges: 1 + Math.floor(stage / 6),
    stretch: Math.max(55, 110 - stage * 1.6),
  };
}

export function layout(stage: number, attempt: number): IceRoadStage {
  const sh = shape(stage);
  const rng = mulberry(31700 + stage * 71 + attempt * 7919);
  const stretches: Stretch[] = [];
  let x = 0;
  let wave = 10 + rng() * 17;
  while (x < sh.length) {
    const len = sh.stretch * (0.7 + rng() * 0.6);
    stretches.push({ from: x, to: Math.min(sh.length, x + len), wave, width: sh.width });
    x += len;
    // the depth changes from stretch to stretch, enough that the danger band moves
    let next = wave;
    while (Math.abs(next - wave) < 5) next = 10 + rng() * 17;
    wave = next;
  }
  stretches[stretches.length - 1].to = sh.length;
  const ridges: Ridge[] = [];
  for (let k = 0; k < sh.ridges; k++) {
    const at = sh.length * ((k + 0.6 + rng() * 0.6) / (sh.ridges + 1));
    ridges.push({ at, limit: 5 + rng() * 3 });
  }
  ridges.sort((p, q) => p.at - q.at);
  return { stage, length: sh.length, stretches, ridges, timeLimit: 9999, par: 0 };
}

/** Human-like drivers used to set the clock: they look at the speedometer a beat late and wobble a little. */
export const HUMAN_DRIVERS: PilotOpts[] = [1, 2, 3].map((seed) => ({ lag: 0.2, margin: 1.4, noise: 0.8, seed }));
/** Ways of driving that ignore the ice and must not get across. */
export const CARELESS: PilotOpts[] = [{ mode: "flat", lag: 0.2 }, ...[12, 14, 16, 18, 20].map((steady) => ({ mode: "steady" as const, steady, lag: 0.2 }))];

/**
 * Lays the road out and checks it: the careful driver and the human-like ones must get across, while
 * flooring it or holding any one steady speed must not. Re-rolls the layout until all of that holds.
 */
export function buildStage(stage: number): IceRoadStage {
  let st = layout(stage, 0);
  for (let attempt = 0; attempt < 60; attempt++) {
    st = layout(stage, attempt);
    const par = pilot(st);
    if (!par.won) continue;
    st.par = par.t;
    const human = HUMAN_DRIVERS.map((o) => pilot(st, o));
    if (!human.every((h) => h.won)) continue;
    st.timeLimit = Math.ceil(Math.max(...human.map((h) => h.t)) * 1.12);
    if (CARELESS.some((o) => pilot(st, o).won)) continue;
    return st;
  }
  throw new Error(`ice-road stage ${stage + 1}: no fair layout`);
}

export const ICE_ROAD_STAGES: IceRoadStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
