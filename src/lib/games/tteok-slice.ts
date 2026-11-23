/**
 * 떡국 떡 썰기 (Tteok Slice) — an OIYO original kitchen game for Seollal morning.
 * A long white rice-cake log slides under the knife. Swipe down to cut: the slice is as thick as
 * the log moved since your last cut. Cut slices that match the size on the ruler to fill the
 * family's tteokguk bowls. From stage 6 the slices must be cut on the slant (어슷썰기), later the
 * marks on the log fade away and the log speeds up and slows down as it is pushed along.
 */

import { mulberry } from "./pixel-kit";

export const SLICE_SLUG = "tteok-slice";
export const STAGE_COUNT = 30;
export const FIELD_W = 360;
export const FIELD_H = 520;
export const KNIFE_X = 150;
export const LOG_Y = 300; // centre line of the log
export const LOG_R = 22; // half the log's height
export const HEARTS = 3;
export const SLANT_MIN = 0.3; // radians from upright that count as a slanted cut
export const SLANT_MAX = 1.1;

export interface SliceLevel {
  stage: number;
  thick: number; // target slice thickness in px
  good: number; // ± px that still counts
  perfect: number; // ± px for a perfect slice
  need: number; // good slices to fill the bowls
  length: number; // px of log to cut
  speed: number; // base px per second
  wobble: number; // 0..1 how much the push speed rises and falls
  wobbleRate: number; // radians per second
  phase: number;
  slant: boolean; // must cut on the slant
  marks: boolean; // the log shows pencil marks every `thick` px
}

export type SliceQuality = "perfect" | "good" | "thin" | "thick" | "chunk" | "flat";

export interface Slice {
  thick: number;
  quality: SliceQuality;
  angle: number;
  t: number;
}

export interface SliceState {
  level: SliceLevel;
  time: number;
  fed: number; // px of log past the knife since the last cut
  left: number; // px of log still behind the knife
  hearts: number;
  good: number;
  perfect: number;
  streak: number;
  slices: Slice[];
  over: boolean;
  won: boolean;
  cutAt: number; // time of the last cut (for the knife animation)
}

export function buildLevel(stage: number): SliceLevel {
  const rng = mulberry(6100 + stage * 71);
  const band = Math.floor(stage / 5);
  const thick = Math.round(16 + ((stage * 7) % 5) * 2 + rng() * 3); // 16..27 px, changes stage to stage
  const good = Math.max(4, 7 - stage * 0.1);
  const perfect = Math.max(1.6, good * 0.4);
  const need = Math.min(14, 5 + Math.floor(stage / 3));
  const speed = 30 + stage * 1.2;
  const wobble = band < 2 ? 0 : band < 4 ? 0.3 : 0.5;
  const length = Math.round(need * thick + thick * (band < 2 ? 5 : 4) + 30);
  return {
    stage,
    thick,
    good,
    perfect,
    need,
    length,
    speed,
    wobble,
    wobbleRate: 1.3 + rng() * 0.9 + band * 0.15,
    phase: rng() * Math.PI * 2,
    slant: stage >= 5,
    marks: band < 2 || (band < 3 && stage % 2 === 0),
  };
}

export const LEVELS: SliceLevel[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildLevel(i));

export function newSlice(stage: number): SliceState {
  const level = LEVELS[stage];
  return { level, time: 0, fed: 0, left: level.length, hearts: HEARTS, good: 0, perfect: 0, streak: 0, slices: [], over: false, won: false, cutAt: -1 };
}

export function pushSpeed(l: SliceLevel, t: number): number {
  return l.speed * (1 + l.wobble * Math.sin(t * l.wobbleRate + l.phase));
}

function finish(s: SliceState): void {
  if (s.good >= s.level.need) {
    s.over = true;
    s.won = true;
  } else if (s.hearts <= 0) s.over = true;
}

export function stepSlice(s: SliceState, dt: number): void {
  if (s.over) return;
  const l = s.level;
  s.time += dt;
  const move = Math.min(s.left, pushSpeed(l, s.time) * dt);
  s.fed += move;
  s.left -= move;
  // left far too long, a fat lump breaks off by itself
  if (s.fed > l.thick + l.good * 3 + 6) {
    s.slices.push({ thick: s.fed, quality: "chunk", angle: 0, t: s.time });
    s.fed = 0;
    s.hearts--;
    s.streak = 0;
    finish(s);
    return;
  }
  // the log has run out and what is left can't make a good slice
  if (s.left <= 0 && s.fed < l.thick - l.good) {
    s.over = true;
    s.won = s.good >= l.need;
  }
}

/** The angle of a swipe from upright, in radians (0 = straight down). */
export function swipeAngle(dx: number, dy: number): number {
  return Math.atan2(Math.abs(dx), Math.abs(dy));
}

export function judge(l: SliceLevel, thick: number, angle: number): SliceQuality {
  const off = thick - l.thick;
  if (off < -l.good) return "thin";
  if (off > l.good) return "thick";
  if (l.slant && (angle < SLANT_MIN || angle > SLANT_MAX)) return "flat";
  return Math.abs(off) <= l.perfect ? "perfect" : "good";
}

/** Cut at the knife. `angle` is how far the swipe leaned from upright. */
export function cut(s: SliceState, angle: number): SliceQuality | null {
  if (s.over || s.fed < 2) return null;
  const l = s.level;
  const q = judge(l, s.fed, angle);
  s.slices.push({ thick: s.fed, quality: q, angle, t: s.time });
  s.fed = 0;
  s.cutAt = s.time;
  if (q === "perfect" || q === "good") {
    s.good++;
    if (q === "perfect") s.perfect++;
    s.streak++;
  } else {
    s.streak = 0;
    // a straight cut on a slant stage is served anyway, but doesn't count; wrong sizes cost a heart
    if (q !== "flat") s.hearts--;
  }
  finish(s);
  return q;
}

/**
 * Autopilot for the tests: cut when the log has moved the target thickness, seen `react` seconds
 * late with some jitter.
 */
export function playAuto(stage: number, jitter: number, seed: number): SliceState {
  const s = newSlice(stage);
  const rng = mulberry(seed);
  let delay = (rng() - 0.5) * 2 * jitter;
  for (let i = 0; i < 60 * 240 && !s.over; i++) {
    stepSlice(s, 1 / 60);
    const v = pushSpeed(s.level, s.time);
    // the player reacts to where the log is, so timing error turns into thickness error at the current speed
    if (s.fed >= s.level.thick + delay * v) {
      cut(s, 0.7);
      delay = (rng() - 0.5) * 2 * jitter;
    }
  }
  return s;
}

export function starsFor(s: SliceState): number {
  if (!s.won) return 0;
  if (s.hearts >= HEARTS && s.perfect * 2 >= s.good) return 3;
  if (s.hearts >= 2) return 2;
  return 1;
}
