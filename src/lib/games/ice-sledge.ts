/**
 * 얼음썰매 (Ice Sledge Race) — an OIYO original winter race on a frozen stream.
 * Kneel on a little wooden sledge and pole yourself along with two iron-tipped sticks: tap the left
 * half of the screen to push with the left stick, the right half for the right stick. Alternating
 * pushes build speed; pushing one side turns the sledge the other way, so steering is just pushing
 * a little more on one side. Slush slows you, holes in the ice drop you in, straw bundles stop you.
 * Beat the village kids to the far bank. Every stage's par time comes from an autopilot that poles
 * along the clean line, and the kids are always a little slower than that.
 */

import { mulberry } from "./pixel-kit";

export const SLEDGE_SLUG = "ice-sledge";
export const STAGE_COUNT = 30;
export const FIELD_W = 360;
export const FIELD_H = 600;
export const SLED_SCREEN_Y = 470; // where the sledge sits on screen (the stream runs up the screen)
export const VMAX = 260;
export const PUSH_ALT = 44; // speed added by a push after a push on the other side
export const PUSH_SAME = 26; // a second push on the same side bites less
export const TURN = 0.085; // heading change per push (rad); left stick turns right
export const SLED_R = 10;

export type HazardKind = "slush" | "hole" | "straw";
export interface Hazard { kind: HazardKind; x: number; d: number; r: number }
export type Side = "L" | "R";

export interface SledgeLevel {
  stage: number;
  length: number;
  amp: number; // bend of the stream
  wave: number; // wavelength of the bends
  phase: number;
  half: number; // half-width of the ice
  weave: number; // how far the clean line swings across the ice
  hazards: Hazard[];
  rivals: number[]; // each rival's finishing time (s)
  par: number;
}

export interface Sledge {
  level: SledgeLevel;
  time: number;
  x: number;
  d: number; // distance along the stream
  v: number;
  heading: number; // 0 = straight up the stream, + = toward +x
  lastSide: Side | null;
  lastPush: number;
  fallen: number; // seconds left in the water
  bump: number; // cooldown after a knock
  inSlush: boolean;
  falls: number;
  pushes: number;
  finished: boolean;
  won: boolean;
}

/** Centre of the stream at distance d. */
export function centerX(l: Pick<SledgeLevel, "amp" | "wave" | "phase">, d: number): number {
  return FIELD_W / 2 + l.amp * Math.sin(d / l.wave + l.phase) + l.amp * 0.35 * Math.sin(d / (l.wave * 0.43) + l.phase * 2.1);
}

/** The clean line: the route the autopilot (and a good player) takes. */
export function lineX(l: SledgeLevel, d: number): number {
  return centerX(l, d) + l.half * l.weave * Math.sin(d / 270 + l.phase * 3);
}

function spec(stage: number): { length: number; amp: number; half: number; weave: number; slush: number; holes: number; straw: number; rivals: number } {
  const band = Math.floor(stage / 5);
  return {
    length: 2200 + stage * 110,
    amp: Math.min(70, 8 + stage * 2.6),
    half: Math.max(78, 128 - stage * 1.7),
    weave: stage < 8 ? 0 : Math.min(0.5, 0.15 + (stage - 8) * 0.02),
    slush: band >= 1 ? 3 + Math.floor(stage / 3) : 0,
    holes: band >= 2 ? 2 + Math.floor((stage - 10) / 2) : 0,
    straw: stage >= 3 ? 2 + Math.floor(stage / 4) : 0,
    rivals: Math.min(3, 1 + Math.floor(stage / 10)),
  };
}

export function buildLevel(stage: number): SledgeLevel {
  const sp = spec(stage);
  const rng = mulberry(7100 + stage * 61);
  const level: SledgeLevel = {
    stage, length: sp.length, amp: sp.amp, wave: 260 + rng() * 120, phase: rng() * Math.PI * 2, half: sp.half, weave: sp.weave,
    hazards: [], rivals: [], par: 0,
  };
  const place = (kind: HazardKind, count: number, r0: number, r1: number) => {
    let made = 0;
    for (let tries = 0; made < count && tries < count * 80; tries++) {
      const d = 260 + rng() * (level.length - 420);
      const r = r0 + rng() * (r1 - r0);
      const cx = centerX(level, d);
      const x = cx + (rng() * 2 - 1) * (level.half - r - 6);
      // keep the clean line (and a sledge's width either side) open, a little before and after
      let clear = true;
      for (let dd = -50; dd <= 50; dd += 10) if (Math.abs(lineX(level, d + dd) - x) < r + SLED_R + 26) clear = false;
      if (!clear) continue;
      if (level.hazards.some((h) => Math.hypot(h.x - x, h.d - d) < h.r + r + 18)) continue;
      level.hazards.push({ kind, x, d, r });
      made++;
    }
  };
  place("hole", sp.holes, 14, 22);
  place("straw", sp.straw, 11, 14);
  place("slush", sp.slush, 24, 40);
  level.hazards.sort((a, b) => a.d - b.d);
  const run = pilotRun(level, 0, 1);
  level.par = Math.ceil(run.time * 10) / 10;
  const slack = Math.max(1.14, 1.34 - stage * 0.006);
  for (let k = 0; k < sp.rivals; k++) level.rivals.push(Math.round(level.par * (slack + k * 0.05) * 10) / 10);
  return level;
}

export function newSledge(stage: number, level: SledgeLevel = LEVELS[stage]): Sledge {
  return { level, time: 0, x: lineX(level, 0), d: 0, v: 0, heading: 0, lastSide: null, lastPush: -1, fallen: 0, bump: 0, inSlush: false, falls: 0, pushes: 0, finished: false, won: false };
}

export interface SledgeEvents { push: Side | null; bank: boolean; straw: boolean; slush: boolean; fell: boolean; climbed: boolean; finish: boolean }
function noEvents(): SledgeEvents {
  return { push: null, bank: false, straw: false, slush: false, fell: false, climbed: false, finish: false };
}

/** One push of a stick. Left pushes turn the sledge toward +x, right pushes toward -x. */
export function push(s: Sledge, side: Side): SledgeEvents {
  const ev = noEvents();
  if (s.finished || s.fallen > 0) return ev;
  const alt = s.lastSide !== null && s.lastSide !== side;
  const gap = s.time - s.lastPush;
  let imp = alt || s.lastSide === null ? PUSH_ALT : PUSH_SAME;
  if (gap < 0.12) imp *= 0.4; // frantic tapping slips on the ice
  s.v = Math.min(VMAX, s.v + imp);
  s.heading += (side === "L" ? 1 : -1) * TURN * (alt ? 1 : 1.25);
  s.heading = Math.max(-1.1, Math.min(1.1, s.heading));
  s.lastSide = side;
  s.lastPush = s.time;
  s.pushes++;
  ev.push = side;
  return ev;
}

export function stepSledge(s: Sledge, dt: number): SledgeEvents {
  const ev = noEvents();
  if (s.finished) return ev;
  s.time += dt;
  const l = s.level;
  if (s.fallen > 0) {
    s.fallen -= dt;
    if (s.fallen <= 0) {
      // climb out a little way back, on the clean line
      s.fallen = 0;
      s.d = Math.max(0, s.d - 80);
      s.x = lineX(l, s.d);
      s.v = 0;
      s.heading = 0;
      ev.climbed = true;
    }
    return ev;
  }
  s.bump = Math.max(0, s.bump - dt);
  s.v = Math.max(0, s.v - (10 + 0.9 * s.v) * dt);
  s.heading *= Math.exp(-0.5 * dt);
  s.x += Math.sin(s.heading) * s.v * dt;
  s.d += Math.cos(s.heading) * s.v * dt;
  const cx = centerX(l, s.d);
  if (Math.abs(s.x - cx) > l.half - SLED_R) {
    const side = Math.sign(s.x - cx);
    s.x = cx + side * (l.half - SLED_R);
    if (s.bump <= 0) {
      s.v *= 0.6;
      s.heading = -side * Math.min(0.25, Math.abs(s.heading) * 0.4);
      s.bump = 0.3;
      ev.bank = true;
    }
  }
  let slush = false;
  for (const h of l.hazards) {
    if (h.d > s.d + 60) break;
    if (h.d < s.d - 60) continue;
    const dist = Math.hypot(h.x - s.x, h.d - s.d);
    if (h.kind === "slush" && dist < h.r) slush = true;
    else if (h.kind === "hole" && dist < h.r) {
      s.fallen = 1.6;
      s.falls++;
      s.v = 0;
      ev.fell = true;
      return ev;
    } else if (h.kind === "straw" && dist < h.r + SLED_R && s.bump <= 0) {
      s.v *= 0.35;
      s.heading = Math.sign(s.x - h.x || 1) * 0.35;
      s.bump = 0.35;
      ev.straw = true;
    }
  }
  if (slush) s.v *= Math.exp(-2.2 * dt);
  if (slush && !s.inSlush) ev.slush = true;
  s.inSlush = slush;
  if (s.d >= l.length) {
    s.finished = true;
    s.won = l.rivals.every((t) => s.time < t);
    ev.finish = true;
  }
  return ev;
}

/** Where a rival kid is at a time: a quick start, then an even pace to its finishing time. */
export function rivalD(level: SledgeLevel, k: number, time: number): number {
  const T = level.rivals[k];
  const ramp = 1.2;
  const vt = level.length / (T - ramp / 2);
  const d = time < ramp ? (vt * time * time) / (2 * ramp) : vt * (time - ramp / 2);
  return Math.min(level.length + 40, d);
}

export function starsFor(s: Sledge): number {
  if (!s.won) return 0;
  if (s.time <= s.level.par * 1.08) return 3;
  if (s.time <= s.level.par * 1.18) return 2;
  return 1;
}

/**
 * Autopilot for one frame: aims along the clean line and pushes at `rate` pushes a second,
 * choosing the side that corrects its heading and alternating when on course.
 * `jitter` (0..1) makes the cadence uneven and now and then pushes the wrong side.
 */
export function pilotFrame(s: Sledge, rate: number, jitter: number, rng: () => number): SledgeEvents | null {
  if (s.finished || s.fallen > 0) return null;
  const look = 90;
  const tx = lineX(s.level, s.d + look);
  const want = Math.max(-0.6, Math.min(0.6, Math.atan2(tx - s.x, look)));
  const err = want - s.heading;
  const gap = 1 / (rate * (1 + (rng() - 0.5) * jitter * 0.5));
  if (s.time - s.lastPush < gap) return null;
  let side: Side = err > 0.05 ? "L" : err < -0.05 ? "R" : s.lastSide === "L" ? "R" : "L";
  if (jitter > 0 && rng() < jitter * 0.12) side = side === "L" ? "R" : "L";
  return push(s, side);
}

export function pilotRun(level: SledgeLevel, jitter: number, seed: number, rate = 5): Sledge {
  const s = newSledge(level.stage, level);
  const rng = mulberry(seed);
  const dt = 1 / 60;
  while (!s.finished && s.time < 240) {
    pilotFrame(s, rate, jitter, rng);
    stepSledge(s, dt);
  }
  return s;
}

export const LEVELS: SledgeLevel[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildLevel(i));
