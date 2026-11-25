/**
 * Vine Leap (덩굴 도약) — an OIYO original one-button swing game (2026-11-25).
 *
 * A little monkey leaps off the riverbank. Hold anywhere to grab the nearest vine ahead and swing on it; let go to
 * fly. Swing from vine to vine across the river to the far bank, picking bananas out of the air on the way. Let go at
 * the top of the forward swing to fly far; fall in the river and you lose a heart and start again from the last vine.
 *
 * Pure and deterministic: fixed 1/120 s steps. Every course is built forward from a planned run of grabs and
 * releases (seeded per stage), with each vine and banana placed where that run will be, so it can always be done.
 * Field px, y pointing down; the course scrolls sideways.
 */

export const VINE_SLUG = "vine-leap";
export const STAGE_COUNT = 30;
export const GRAVITY = 900;
export const DT = 1 / 120;
export const REACH = 170; // how far away a vine can be grabbed
export const MONKEY_R = 12;
export const BANANA_R = 22;
export const RIVER = 540; // falling below this is a splash
export const HEARTS = 3;
export const LAUNCH: [number, number, number, number] = [60, 400, 250, -480]; // x, y, vx, vy

export interface VineStage {
  stage: number;
  hooks: Array<[number, number]>;
  bananas: Array<[number, number]>;
  /** crossing this x above the river reaches the far bank */
  goal: number;
  /**
   * the planned run, one entry per vine: hold at t0 and let go at t1 (seconds from the launch), which is how long after
   * the top of the leap the hold came, and the swing's angle past straight down at the let-go
   */
  plan: Array<[number, number, number, number]>;
}

export interface Leap {
  stage: VineStage;
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hook: number; // the vine held, or −1
  len: number;
  lastHook: number; // the last vine grabbed (where a splash starts again)
  got: boolean[];
  bananas: number;
  hearts: number;
  falls: number;
  over: boolean;
  won: boolean;
}

export function newLeap(stage: VineStage): Leap {
  const [x, y, vx, vy] = LAUNCH;
  return { stage, t: 0, x, y, vx, vy, hook: -1, len: 0, lastHook: -1, got: stage.bananas.map(() => false), bananas: 0, hearts: HEARTS, falls: 0, over: false, won: false };
}

/** The vine a hold would grab now: the nearest one ahead within reach (or −1). */
export function vineFor(l: Leap): number {
  let best = -1;
  let bestD = REACH;
  l.stage.hooks.forEach(([hx, hy], k) => {
    if (hx < l.x - 30) return;
    const d = Math.hypot(hx - l.x, hy - l.y);
    if (d < bestD) {
      bestD = d;
      best = k;
    }
  });
  return best;
}

export function hold(l: Leap): boolean {
  if (l.over || l.hook >= 0) return false;
  const k = vineFor(l);
  if (k < 0) return false;
  const [hx, hy] = l.stage.hooks[k];
  l.hook = k;
  l.lastHook = k;
  l.len = Math.max(50, Math.hypot(hx - l.x, hy - l.y));
  return true;
}

export function letGo(l: Leap): boolean {
  if (l.hook < 0) return false;
  l.hook = -1;
  return true;
}

export type StepEvent = { banana: boolean; splash: boolean };

export function step(l: Leap): StepEvent {
  const ev: StepEvent = { banana: false, splash: false };
  if (l.over) return ev;
  l.t += DT;
  l.vy += GRAVITY * DT;
  l.x += l.vx * DT;
  l.y += l.vy * DT;
  if (l.hook >= 0) {
    // the vine holds the monkey at its length: pull back in and drop the outward speed
    const [hx, hy] = l.stage.hooks[l.hook];
    const dx = l.x - hx;
    const dy = l.y - hy;
    const d = Math.hypot(dx, dy);
    if (d > l.len) {
      const nx = dx / d;
      const ny = dy / d;
      l.x = hx + nx * l.len;
      l.y = hy + ny * l.len;
      const out = l.vx * nx + l.vy * ny;
      if (out > 0) {
        l.vx -= out * nx;
        l.vy -= out * ny;
      }
    }
  }
  l.vx *= 0.9998;
  l.vy *= 0.9998;
  l.stage.bananas.forEach(([bx, by], k) => {
    if (l.got[k] || Math.hypot(l.x - bx, l.y - by) > BANANA_R) return;
    l.got[k] = true;
    l.bananas++;
    ev.banana = true;
  });
  if (l.x >= l.stage.goal && l.y < RIVER - 40) {
    l.over = true;
    l.won = true;
  } else if (l.y > RIVER) {
    ev.splash = true;
    splash(l);
  }
  return ev;
}

/** A splash: a heart lost, and a fresh leap from under the last vine grabbed (or the bank). */
function splash(l: Leap): void {
  l.hearts--;
  l.falls++;
  l.hook = -1;
  if (l.hearts <= 0) {
    l.over = true;
    return;
  }
  if (l.lastHook < 0) {
    [l.x, l.y, l.vx, l.vy] = LAUNCH;
  } else {
    const [hx, hy] = l.stage.hooks[l.lastHook];
    [l.x, l.y, l.vx, l.vy] = [hx - 60, hy + 140, 250, -480];
  }
}

export function starsFor(l: Leap): number {
  if (!l.won) return 0;
  return Math.max(1, Math.min(3, l.bananas) - l.falls);
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

export interface SwingerOpts {
  /** how far (s, either way) each hold may be off, after the top of the leap */
  timing?: number;
  /** how far (radians, either way) the swing angle at each let-go may be off */
  angle?: number;
  seed?: number;
  mode?: "plan" | "human" | "random";
}

/** The swing's angle past straight down (forward is positive). */
export const swingAngle = (l: Leap) => (l.hook < 0 ? 0 : Math.atan2(l.x - l.stage.hooks[l.hook][0], l.y - l.stage.hooks[l.hook][1]));

/**
 * Plays a course: the plan's exact moments; a human-like player, who holds a moment after the top of each leap and
 * lets go when the swing looks far enough forward (each a little off); or holding and letting go at random.
 */
export function pilot(st: VineStage, opts: SwingerOpts = {}): Leap {
  const { timing = 0, angle = 0, seed = 1, mode = "plan" } = opts;
  const rng = mulberry(seed * 3001 + 19);
  const l = newLeap(st);
  if (mode === "plan") {
    const acts = st.plan.flatMap(([t0, t1]) => [{ t: t0, down: true }, { t: t1, down: false }]);
    let k = 0;
    let down = false;
    for (let n = 0; n < 40 / DT && !l.over; n++) {
      while (k < acts.length && l.t >= acts[k].t - 1e-9) {
        down = acts[k].down;
        if (!down) letGo(l);
        k++;
      }
      if (down && l.hook < 0) hold(l);
      step(l);
    }
    if (!l.over) l.over = true;
    return l;
  }
  if (mode === "random") {
    let next = 0.2 + rng() * 0.6;
    let down = false;
    for (let n = 0; n < 40 / DT && !l.over; n++) {
      if (l.t >= next) {
        down = !down;
        if (!down) letGo(l);
        next = l.t + (down ? 0.2 + rng() * 1.2 : 0.1 + rng() * 0.8);
      }
      if (down && l.hook < 0) hold(l);
      step(l);
    }
    if (!l.over) l.over = true;
    return l;
  }
  // human-like: watch the leap, hold a moment after its top, let go at a forward angle
  let down = false;
  let falling = 0; // seconds since the top of the current leap
  let wait = -1;
  let release = 0;
  for (let n = 0; n < 40 / DT && !l.over; n++) {
    if (l.hook < 0) {
      falling = l.vy > 0 ? falling + DT : 0;
      if (wait < 0) {
        // the vine to grab next: the one the plan grabs after the last one held
        const next = Math.min(st.plan.length - 1, l.lastHook + 1);
        wait = Math.max(0, st.plan[next][2] + (rng() * 2 - 1) * timing);
      }
      if (!down && l.vy > 0 && falling >= wait) down = true;
      if (down && hold(l)) release = st.plan[Math.min(st.plan.length - 1, l.hook)][3] + (rng() * 2 - 1) * angle;
    } else if (l.vx > 30 && l.vy < 0 && swingAngle(l) >= release) {
      letGo(l);
      down = false;
      wait = -1;
      falling = 0;
    }
    const before = l.falls;
    step(l);
    if (l.falls !== before) {
      down = false;
      wait = -1;
      falling = 0;
    }
  }
  if (!l.over) l.over = true;
  return l;
}

/** Human-like swingers: each hold up to 0.08 s off, each let-go up to 8° (0.14 rad) off. */
export const HUMAN_SWINGERS: SwingerOpts[] = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => ({ mode: "human", timing: 0.08, angle: 0.14, seed }));

function shape(stage: number) {
  return { vines: Math.min(12, 3 + Math.floor(stage / 3)) };
}

/** Free flight from a state for `secs`, returning the path (every step). */
function fly(x: number, y: number, vx: number, vy: number, secs: number): Array<[number, number, number, number]> {
  const out: Array<[number, number, number, number]> = [];
  for (let n = 0; n < secs / DT; n++) {
    vy += GRAVITY * DT;
    x += vx * DT;
    y += vy * DT;
    vx *= 0.9998;
    vy *= 0.9998;
    out.push([x, y, vx, vy]);
  }
  return out;
}

export function buildStage(stage: number): VineStage {
  const sh = shape(stage);
  for (let attempt = 0; attempt < 400; attempt++) {
    const rng = mulberry(721000 + stage * 479 + attempt * 7919);
    const hooks: Array<[number, number]> = [];
    const plan: Array<[number, number, number, number]> = [];
    // run the plan forward, vine by vine, with the same steps a player gets
    const probe: VineStage = { stage, hooks, bananas: [], goal: 1e9, plan };
    const l = newLeap(probe);
    const trail: Array<[number, number, number]> = [];
    let ok = true;
    for (let v = 0; v < sh.vines && ok; v++) {
      // fly over the top of the arc, then grab a vine placed up ahead while coming down
      const apex = Math.max(0, -l.vy / GRAVITY);
      const after = 0.04 + rng() * 0.2;
      const wait = apex + after;
      const path = fly(l.x, l.y, l.vx, l.vy, wait);
      const at = path[path.length - 1];
      const hx = Math.round(at[0] + 60 + rng() * 60);
      const hy = Math.round(Math.max(70, Math.min(330, at[1] - 70 - rng() * 50)));
      if (Math.hypot(hx - at[0], hy - at[1]) > REACH - 15) {
        ok = false;
        break;
      }
      hooks.push([hx, hy]);
      const t0 = l.t + wait;
      while (l.t < t0 - 1e-9) {
        step(l);
        trail.push([l.t, l.x, l.y]);
      }
      if (vineFor(l) !== hooks.length - 1 || !hold(l)) {
        ok = false;
        break;
      }
      // swing past the bottom and let go on the way up, while still climbing forward
      const angle = 0.3 + rng() * 0.4; // radians past straight down
      let t1 = -1;
      for (let n = 0; n < 4 / DT; n++) {
        step(l);
        trail.push([l.t, l.x, l.y]);
        if (l.y > RIVER - 30) break;
        const a = Math.atan2(l.x - hx, l.y - hy);
        if (l.vx > 60 && l.vy < 0 && a >= angle) {
          t1 = l.t;
          break;
        }
      }
      if (t1 < 0 || l.y > RIVER - 60) {
        ok = false;
        break;
      }
      letGo(l);
      plan.push([Math.round(t0 * 1000) / 1000, Math.round(t1 * 1000) / 1000, Math.round(after * 1000) / 1000, Math.round(angle * 1000) / 1000]);
    }
    if (!ok) continue;
    // after the last vine: where the flight comes down is the far bank
    const tail = fly(l.x, l.y, l.vx, l.vy, 3);
    const land = tail.find(([, y, , vy]) => vy > 0 && y > 380);
    if (!land) continue;
    const goal = Math.round(land[0] - 30);
    if (trail.some(([, , y]) => y < 15)) continue; // never off the top of the screen
    // bananas on the planned path, spread out
    const span = trail.filter(([t]) => t > 0.3);
    if (span.length < 120) continue;
    const bananas = [0.25, 0.55, 0.85].map((q) => {
      const p = span[Math.floor(span.length * q)];
      return [Math.round(p[1]), Math.round(p[2])] as [number, number];
    });
    // the plan's grab moments rounded to a millisecond: check it still lands, with every banana
    const st: VineStage = { stage, hooks, bananas, goal, plan };
    const planned = pilot(st);
    if (!planned.won || planned.bananas < 3 || planned.falls > 0) continue;
    if (HUMAN_SWINGERS.filter((o) => pilot(st, o).won).length < 7) continue;
    const randomWins = Array.from({ length: 30 }, (_, k) => k + 1).filter((seed) => pilot(st, { mode: "random", seed }).won).length;
    if (randomWins > (stage < 6 ? 3 : 1)) continue;
    if ([1, 2, 3, 4, 5, 6].some((seed) => pilot(st, { mode: "random", seed }).won)) continue;
    return st;
  }
  throw new Error(`vine-leap stage ${stage + 1}: no fair course`);
}

export const VINE_STAGES: VineStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
