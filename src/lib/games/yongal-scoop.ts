/**
 * Yongal Scoop (용알뜨기) — scoop the moon out of the village well on Daeboreum dawn.
 *
 * On the morning of Jeongwol Daeboreum, people hurried to be first at the well: the first water drawn
 * that day was the "dragon's egg" (용알), and the full moon shining in it meant a lucky year. Look down
 * the well: the gourd dipper swings back and forth on its rope above the water, and the moon's reflection
 * drifts on the surface. Tap to let the rope go. The dipper keeps its swing as it falls, so let go early
 * enough that it lands right on the moon. A splash sets the water rippling and the moon wobbles until it
 * settles. Scoop enough moons before the sky turns light.
 *
 * Pure and deterministic: every well is seeded per stage.
 */

export const YONGAL_SLUG = "yongal-scoop";
export const STAGE_COUNT = 30;
export const CENTER = 180; // px: the well's middle on the 360 px field
export const WELL_R = 150; // px: water radius
export const RIPPLE_WOBBLE = 26; // px the moon is pushed about by a fresh splash

export interface YongalStage {
  stage: number;
  swingAmp: number; // px
  swingPeriod: number; // s
  fall: number; // s from letting go to touching the water
  moonR: number; // px: the moon's reflection catches a dipper landing within this
  moonAmp: number; // px the moon drifts either side
  moonPeriod: number; // s
  ripple: number; // s for the water to settle (and the dipper to come back up)
  time: number; // s until dawn
  need: number;
  par: number;
}

export interface Well {
  stage: YongalStage;
  t: number;
  ready: boolean;
  readyAt: number;
  splashAt: number; // when the last dipper hit the water (−∞ before)
  dropAt: number; // when the dipper was let go (−1 while hanging)
  dropX: number; // where it will land
  scooped: number;
  missed: number;
  over: boolean;
  won: boolean;
}

export function swingX(st: YongalStage, t: number): number {
  return CENTER + st.swingAmp * Math.sin((2 * Math.PI * t) / st.swingPeriod);
}
export function swingV(st: YongalStage, t: number): number {
  return st.swingAmp * ((2 * Math.PI) / st.swingPeriod) * Math.cos((2 * Math.PI * t) / st.swingPeriod);
}

/** Where the moon's reflection sits at time t, wobbled by ripples from the last splash. */
export function moonX(w: Well, t: number): number {
  const st = w.stage;
  const calm = CENTER + st.moonAmp * Math.sin((2 * Math.PI * t) / st.moonPeriod + st.stage);
  const since = t - w.splashAt;
  if (since < 0 || since >= st.ripple) return calm;
  const k = 1 - since / st.ripple;
  return calm + RIPPLE_WOBBLE * k * Math.sin(since * 14);
}

/** Where the dipper lands if let go at time t: it carries its swing while it falls. */
export function landingX(st: YongalStage, t: number): number {
  const x = swingX(st, t) + swingV(st, t) * st.fall;
  return Math.max(CENTER - WELL_R, Math.min(CENTER + WELL_R, x));
}

export function newWell(stage: YongalStage): Well {
  return { stage, t: 0, ready: true, readyAt: 0, splashAt: -1e9, dropAt: -1, dropX: 0, scooped: 0, missed: 0, over: false, won: false };
}

export function drop(w: Well): boolean {
  if (w.over || !w.ready) return false;
  w.ready = false;
  w.dropAt = w.t;
  w.dropX = landingX(w.stage, w.t);
  return true;
}

export interface WellEvents { landed: null | { x: number; moon: boolean }; end: boolean }

export function stepWell(w: Well, dt: number): WellEvents {
  const ev: WellEvents = { landed: null, end: false };
  if (w.over) return ev;
  w.t += dt;
  if (w.dropAt >= 0 && w.t >= w.dropAt + w.stage.fall) {
    const hitT = w.dropAt + w.stage.fall;
    const moon = Math.abs(w.dropX - moonX(w, hitT)) <= w.stage.moonR;
    if (moon) w.scooped++;
    else w.missed++;
    ev.landed = { x: w.dropX, moon };
    w.splashAt = hitT;
    w.dropAt = -1;
    w.readyAt = hitT + w.stage.ripple;
  }
  if (!w.ready && w.dropAt < 0 && w.t >= w.readyAt) w.ready = true;
  if (w.scooped >= w.stage.need) {
    w.over = true;
    w.won = true;
    ev.end = true;
  } else if (w.t >= w.stage.time && w.dropAt < 0) {
    w.over = true;
    w.won = false;
    ev.end = true;
  }
  return ev;
}

export function starsFor(w: Well): number {
  if (!w.won) return 0;
  if (w.missed === 0 && w.t <= w.stage.par * 1.25) return 3;
  if (w.missed <= 2) return 2;
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
  /** ± s of slop in when the tap actually lands */
  slop?: number;
  /** how close (share of the moon's radius) the predicted landing must be before tapping */
  aim?: number;
  /** waits for the ripples to settle before trying */
  patient?: boolean;
  seed?: number;
  /** "aim" times the drop; "spam" drops as soon as the dipper is back; "over" drops when the dipper is right above the moon (ignoring its swing); "idle" never drops */
  mode?: "aim" | "spam" | "over" | "idle";
}

export function pilot(stage: YongalStage, opts: PilotOpts = {}): Well {
  const { slop = 0, aim = 0.35, patient = true, seed = 1, mode = "aim" } = opts;
  const rng = mulberry(seed);
  const w = newWell(stage);
  const dt = 1 / 120;
  let tapAt = -1;
  while (!w.over && w.t < 600) {
    if (w.ready && tapAt < 0 && mode !== "idle") {
      if (mode === "spam") tapAt = w.t;
      else if (mode === "over") {
        if (Math.abs(swingX(stage, w.t) - moonX(w, w.t)) < stage.moonR * 0.3) tapAt = w.t;
      } else {
        // pick the best moment in the next swing (a beat ahead, as a player lines it up), then tap at it
        // give or take the slop
        const settled = !patient || w.t - w.splashAt >= stage.ripple * 1.6;
        if (settled) {
          let bestT = -1;
          let bestErr = Infinity;
          for (let tau = w.t + 0.3; tau < w.t + 0.3 + stage.swingPeriod; tau += 1 / 240) {
            const err = Math.abs(landingX(stage, tau) - moonX(w, tau + stage.fall));
            if (err < bestErr) {
              bestErr = err;
              bestT = tau;
            }
          }
          if (bestErr <= stage.moonR * aim) tapAt = bestT + (rng() * 2 - 1) * slop;
        }
      }
    }
    if (tapAt >= 0 && w.t >= tapAt) {
      drop(w);
      tapAt = -1;
    }
    stepWell(w, dt);
  }
  return w;
}

function shape(stage: number) {
  return {
    swingAmp: 95 + stage * 0.6,
    swingPeriod: 2.5 - stage * 0.024,
    fall: 0.3 + stage * 0.005,
    moonR: 36 - stage * 0.25,
    moonAmp: 20 + stage * 1,
    moonPeriod: Math.max(3, 7 - stage * 0.13),
    ripple: 1.1 + stage * 0.02,
    time: 45,
  };
}

/** Human-like scoopers used to set the count: their tap lands up to this far off the moment they meant. */
export const HUMAN_SCOOPERS: PilotOpts[] = [1, 2, 3, 4, 5].map((seed) => ({ slop: 0.07, aim: 0.3, seed }));

export function buildStage(stage: number): YongalStage {
  const sh = shape(stage);
  const st: YongalStage = { stage, ...sh, need: 999, par: 0 };
  const human = HUMAN_SCOOPERS.map((o) => pilot(st, o).scooped).sort((a, b) => a - b);
  st.need = Math.max(3, Math.floor(human[1] * 0.85));
  // dropping blindly as soon as the dipper is back must never be enough
  const blind = pilot(st, { mode: "spam" }).scooped;
  st.need = Math.max(st.need, Math.min(blind + 1, human[1]));
  st.par = Math.ceil(pilot(st).t);
  return st;
}

export const YONGAL_STAGES: YongalStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
