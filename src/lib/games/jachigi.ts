/**
 * 자치기 (Jachigi Stick Bat) — an OIYO original take on the Korean winter-field stick game.
 * A short stick lies across a little hole. Tap once to flick it up with the long stick; tap again
 * while it tumbles in the air to whack it away. When you hit it decides the shot: hit it low on the
 * way up for a fast line drive, high near the top for a long lob. The other team's kids stand out in
 * the field and catch anything that flies low past them, and later fields add a wind, a persimmon
 * branch that knocks lobs down and a frozen ditch that stops a rolling stick. Add up the distance
 * of three swings, measured in "ja" (lengths of the long stick), to beat the stage's mark.
 */

export const JACHIGI_SLUG = "jachigi";
export const STAGE_COUNT = 30;
export const FIELD_W = 360;
export const FIELD_H = 560;
export const GROUND = 470; // screen y of the ground at the batter
export const BAT_X = 40;
export const JA = 30; // px per ja (the long stick's length)
export const GRAVITY = 900;
export const FLICK_V = 380; // the flick sends the short stick up at this speed
export const REACH_LO = 14; // the long stick reaches from this height above the ground...
export const REACH_HI = 86; // ...to this one
export const SWEET = 46; // best height to hit
export const SWINGS = 3;
export const CATCH_H = 58; // a fielder catches anything below this height as it passes
export const CATCH_W = 14;
export const PX_PER_M = 1; // world x is in px: the field scrolls with the stick

export interface Branch { x0: number; x1: number; h: number }
export interface JachigiLevel {
  stage: number;
  goal: number; // ja needed over three swings
  fielders: number[]; // x of each fielder (px from the batter)
  wind: number; // px/s² along the field (+ helps)
  branch: Branch | null;
  ditch: number | null; // x where a frozen ditch stops a rolling stick
  bestT: number; // seconds after the flick of the steadiest good hit
}

export type SwingPhase = "rest" | "up" | "flight" | "roll" | "landed";
export type Outcome = "none" | "whiff" | "caught" | "branch" | "ditch" | "ok";

export interface Stick { x: number; h: number; vx: number; vh: number; spin: number }

export interface Jachigi {
  level: JachigiLevel;
  time: number;
  swing: number; // 0-based index of the current swing
  phase: SwingPhase;
  phaseT: number;
  stick: Stick;
  hitH: number; // height it was hit at
  bounced: boolean;
  lastOutcome: Outcome;
  distances: number[]; // ja per finished swing
  total: number;
  over: boolean;
  won: boolean;
  wait: number; // pause after a swing ends
}

function freshStick(): Stick {
  return { x: BAT_X + 10, h: 0, vx: 0, vh: 0, spin: 0 };
}

function fieldersFor(stage: number): number[] {
  const n = Math.min(4, 1 + Math.floor(stage / 6));
  const xs: number[] = [];
  for (let k = 0; k < n; k++) xs.push(Math.round(170 + k * (140 + stage * 2) + ((stage * 37 + k * 53) % 40)));
  return xs;
}

export function buildLevel(stage: number): JachigiLevel {
  const band = Math.floor(stage / 5);
  const wind = band >= 2 ? ((stage % 2 ? -1 : 1) * (24 + (stage - 10) * 2.5)) : 0;
  const branch = band >= 3 ? { x0: 130 + (stage % 3) * 30, x1: 250 + (stage % 3) * 40, h: 150 - Math.min(30, (stage - 15) * 2) } : null;
  const ditch = band >= 4 ? 380 + (stage % 4) * 40 : null;
  const level: JachigiLevel = { stage, goal: 0, fielders: fieldersFor(stage), wind, branch, ditch, bestT: 0 };
  const r = robustSwing(level);
  // the mark asks for three swings close to the steady best, closer as the stages climb
  level.goal = Math.floor(r.ja * SWINGS * Math.min(0.9, 0.55 + stage * 0.012));
  level.bestT = r.t;
  return level;
}

export function newJachigi(stage: number, level: JachigiLevel = LEVELS[stage]): Jachigi {
  return { level, time: 0, swing: 0, phase: "rest", phaseT: 0, stick: freshStick(), hitH: 0, bounced: false, lastOutcome: "none", distances: [], total: 0, over: false, won: false, wait: 0 };
}

/** Launch speed and angle (degrees) for a hit at height h (px above the ground). */
export function hitShot(h: number): { speed: number; angle: number } {
  const q = Math.max(0, 1 - Math.abs(h - SWEET) / 48); // timing quality
  const speed = 240 + 360 * q;
  const angle = 12 + ((h - REACH_LO) / (REACH_HI - REACH_LO)) * 46; // low hits fly flat, high hits lob
  return { speed, angle };
}

export interface JachigiEvents { flick: boolean; hit: boolean; whiff: boolean; land: boolean; caught: boolean; branch: boolean; ditch: boolean; done: Outcome | null }
function noEvents(): JachigiEvents {
  return { flick: false, hit: false, whiff: false, land: false, caught: false, branch: false, ditch: false, done: null };
}

/** A tap: flicks the stick up when it rests, swings at it while it is in the air. */
export function tap(s: Jachigi): JachigiEvents {
  const ev = noEvents();
  if (s.over || s.wait > 0) return ev;
  if (s.phase === "rest") {
    s.phase = "up";
    s.phaseT = 0;
    s.stick.vh = FLICK_V;
    s.stick.spin = 14;
    ev.flick = true;
  } else if (s.phase === "up") {
    const h = s.stick.h;
    if (h < REACH_LO || h > REACH_HI) {
      ev.whiff = true;
      return ev; // the long stick swishes through the air; you may swing again before it lands
    }
    const { speed, angle } = hitShot(h);
    const a = (angle * Math.PI) / 180;
    s.hitH = h;
    s.stick.vx = Math.cos(a) * speed;
    s.stick.vh = Math.sin(a) * speed;
    s.stick.spin = 18 + speed / 30;
    s.phase = "flight";
    s.phaseT = 0;
    s.bounced = false;
    ev.hit = true;
  }
  return ev;
}

function endSwing(s: Jachigi, outcome: Outcome, ev: JachigiEvents): void {
  const ja = outcome === "ok" || outcome === "ditch" || outcome === "branch" ? Math.max(0, Math.round(((s.stick.x - BAT_X) / JA) * 10) / 10) : 0;
  s.distances.push(ja);
  s.total = Math.round((s.total + ja) * 10) / 10;
  s.lastOutcome = outcome;
  s.phase = "landed";
  s.wait = 1.1;
  ev.done = outcome;
  if (s.distances.length >= SWINGS) {
    s.over = true;
    s.won = s.total >= s.level.goal;
  }
}

export function stepJachigi(s: Jachigi, dt: number): JachigiEvents {
  const ev = noEvents();
  if (s.over) return ev;
  s.time += dt;
  if (s.wait > 0) {
    s.wait -= dt;
    if (s.wait <= 0) {
      s.wait = 0;
      s.swing++;
      s.phase = "rest";
      s.stick = freshStick();
    }
    return ev;
  }
  const l = s.level;
  const st = s.stick;
  const n = Math.max(1, Math.ceil(dt / (1 / 240)));
  const h = dt / n;
  for (let k = 0; k < n && !s.over && s.phase !== "landed"; k++) {
    s.phaseT += h;
    if (s.phase === "up") {
      st.vh -= GRAVITY * h;
      st.h += st.vh * h;
      if (st.h <= 0) {
        // nobody hit it: it drops back by the hole
        st.h = 0;
        ev.whiff = true;
        endSwing(s, "whiff", ev);
      }
    } else if (s.phase === "flight") {
      const prevX = st.x;
      st.vx += l.wind * h;
      st.vh -= GRAVITY * h;
      st.x += st.vx * h;
      st.h += st.vh * h;
      if (l.branch && !s.bounced && st.vx > 20 && st.x > l.branch.x0 && st.x < l.branch.x1 && st.h > l.branch.h && st.h < l.branch.h + 30) {
        // clipped the persimmon branch: it drops almost straight down
        st.vx *= 0.15;
        st.vh = -60;
        ev.branch = true;
      }
      for (const fx of l.fielders) {
        if (prevX < fx && st.x >= fx && st.h < CATCH_H && st.h > 4 && !s.bounced) {
          ev.caught = true;
          endSwing(s, "caught", ev);
          break;
        }
      }
      if (s.phase === "landed") break;
      if (st.h <= 0) {
        st.h = 0;
        ev.land = true;
        s.bounced = true;
        if (Math.abs(st.vh) > 90) {
          st.vh = -st.vh * 0.25;
          st.vx *= 0.6;
        } else {
          s.phase = "roll";
          st.vh = 0;
        }
      }
      if (l.ditch !== null && prevX < l.ditch && st.x >= l.ditch && st.h <= 2) {
        st.x = l.ditch;
        ev.ditch = true;
        endSwing(s, "ditch", ev);
      }
    } else if (s.phase === "roll") {
      const prevX = st.x;
      st.vx *= Math.exp(-3.2 * h);
      st.x += st.vx * h;
      if (l.ditch !== null && prevX < l.ditch && st.x >= l.ditch) {
        st.x = l.ditch;
        ev.ditch = true;
        endSwing(s, "ditch", ev);
      } else if (Math.abs(st.vx) < 6) {
        endSwing(s, ev.branch ? "branch" : "ok", ev);
      } else {
        // a fielder stops a rolling stick where they stand
        for (const fx of l.fielders) if (prevX < fx && st.x >= fx) { st.x = fx; endSwing(s, "ok", ev); break; }
      }
    }
  }
  return ev;
}

export function starsFor(s: Jachigi): number {
  if (!s.won) return 0;
  if (s.total >= s.level.goal * 1.15) return 3;
  if (s.total >= s.level.goal * 1.07) return 2;
  return 1;
}

// ─── Solver (proves each mark is reachable; used to set the marks) ─────────

/** Distance in ja of one swing hit at time `t` after the flick (0 if it misses or is caught). */
export function swingAt(level: JachigiLevel, t: number): number {
  const s = newJachigi(level.stage, { ...level, goal: 1e9 });
  tap(s);
  const dt = 1 / 240;
  let hitDone = false;
  while (!s.over && s.distances.length === 0) {
    if (!hitDone && s.phaseT >= t && s.phase === "up") {
      tap(s);
      hitDone = true;
    }
    stepJachigi(s, dt);
  }
  return s.distances[0] ?? 0;
}

const STEP = 0.005;
const TIMES = Array.from({ length: 170 }, (_, i) => 0.02 + i * STEP);

/**
 * The steadiest good hit: the time whose worst result within ±20 ms (a human tap) is longest.
 * Knife-edge shots that only just clear a fielder do not count.
 */
export function robustSwing(level: JachigiLevel): { t: number; ja: number } {
  const d = TIMES.map((t) => swingAt(level, t));
  let best = { t: TIMES[0], ja: 0 };
  for (let i = 4; i < d.length - 4; i++) {
    let worst = Infinity;
    for (let k = -4; k <= 4; k++) worst = Math.min(worst, d[i + k]);
    if (worst > best.ja) best = { t: TIMES[i], ja: worst };
  }
  return best;
}

/** Three swings, each tapped at the given offsets (s) from the steady best moment. */
export function playOffsets(level: JachigiLevel, offsets: number[]): number {
  return offsets.reduce((sum, e) => sum + swingAt(level, Math.max(0.02, level.bestT + e)), 0);
}

/** A player who always waits for the top of the flick (the obvious timing). */
export function apexTotal(level: JachigiLevel): number {
  return swingAt(level, FLICK_V / GRAVITY) * SWINGS;
}

export const LEVELS: JachigiLevel[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildLevel(i));
