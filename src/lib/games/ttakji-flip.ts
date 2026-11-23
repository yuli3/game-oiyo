/**
 * 딱지치기 (Ttakji Flip) — an OIYO original take on the Korean folded-paper tile game.
 * Your rival's ttakji lies on the ground. Swipe down and let go: your own ttakji slams down where
 * your finger leaves the screen, as hard as you swiped. Land just inside an edge with enough force
 * and the gust flips the rival's tile over. Land in the middle and nothing happens; swipe too hard
 * and your tile bounces away. Thicker tiles need harder slams, smaller ones better aim, and later
 * ones sit at angles, need two hits, or slide on the icy alley.
 */

import { mulberry } from "./pixel-kit";

export const TTAKJI_SLUG = "ttakji-flip";
export const STAGE_COUNT = 30;
export const FIELD_W = 360;
export const FIELD_H = 560;
export const SPEED_FOR_FULL = 1900; // px/s of swipe that gives power 1
export const OVER = 1.04; // above this the slam bounces off
export const LIFT = 1.7;
export const SWEET = 0.07; // best spot: this far inside the edge, as a share of the tile size
export const REACH = 0.34; // how far from the sweet spot (share of size) the gust still lifts

export interface Tile {
  x: number;
  y: number;
  size: number;
  angle: number;
  weight: number; // lift needed to flip
  hits: number; // flips needed (2 = a thick double-folded ttakji)
  color: number; // drawing only
  slide: number; // px it slides either way on the ice (0 = still)
}

export interface TtakjiLevel {
  stage: number;
  tiles: Tile[];
  slams: number;
}

export type SlamResult = "flip" | "wobble" | "weak" | "miss" | "over";

export interface TtakjiState {
  level: TtakjiLevel;
  index: number; // current rival tile
  hitsLeft: number;
  slamsLeft: number;
  time: number;
  flips: number;
  over: boolean;
  won: boolean;
  history: Array<{ x: number; y: number; power: number; result: SlamResult }>;
}

export function buildLevel(stage: number): TtakjiLevel {
  const rng = mulberry(8800 + stage * 41);
  const band = Math.floor(stage / 5);
  const count = Math.min(4, 1 + Math.floor(stage / 6));
  const tiles: Tile[] = [];
  for (let k = 0; k < count; k++) {
    const size = Math.round(Math.max(46, 78 - stage * 0.9 - k * 2 + rng() * 6));
    const weight = Math.min(1.12, 0.42 + stage * 0.021 + rng() * 0.14);
    tiles.push({
      x: 120 + rng() * 120,
      y: 230 + rng() * 140,
      size,
      angle: band >= 1 ? (rng() - 0.5) * (0.4 + band * 0.12) : 0,
      weight,
      hits: band >= 2 && (k + stage) % 3 === 0 ? 2 : 1,
      color: Math.floor(rng() * 4),
      slide: band >= 4 && (k + stage) % 2 === 0 ? 30 + band * 6 : 0,
    });
  }
  const need = tiles.reduce((s, t) => s + t.hits, 0);
  const spare = Math.max(2, 4 - Math.floor(stage / 10));
  return { stage, tiles, slams: need + spare };
}

export const LEVELS: TtakjiLevel[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildLevel(i));

export function newTtakji(stage: number): TtakjiState {
  const level = LEVELS[stage];
  return { level, index: 0, hitsLeft: level.tiles[0].hits, slamsLeft: level.slams, time: 0, flips: 0, over: false, won: false, history: [] };
}

/** Where a sliding tile is at time t. */
export function tileAt(t: Tile, time: number): { x: number; y: number } {
  return { x: t.x + (t.slide ? Math.sin(time * 1.4) * t.slide : 0), y: t.y };
}

export function powerOf(speed: number): number {
  return Math.max(0, speed / SPEED_FOR_FULL);
}

/** Signed distance from a point to the tile's edge (negative inside). */
export function edgeDistance(t: Tile, cx: number, cy: number, x: number, y: number): number {
  const c = Math.cos(-t.angle);
  const s = Math.sin(-t.angle);
  const lx = (x - cx) * c - (y - cy) * s;
  const ly = (x - cx) * s + (y - cy) * c;
  const h = t.size / 2;
  const dx = Math.max(Math.abs(lx) - h, 0);
  const dy = Math.max(Math.abs(ly) - h, 0);
  if (dx > 0 || dy > 0) return Math.hypot(dx, dy);
  return -(h - Math.max(Math.abs(lx), Math.abs(ly)));
}

/** 0..1 how well a landing spot catches the tile's edge. */
export function edgeFactor(t: Tile, d: number): number {
  return Math.max(0, 1 - Math.abs(d + SWEET * t.size) / (REACH * t.size));
}

export function stepTtakji(s: TtakjiState, dt: number): void {
  if (!s.over) s.time += dt;
}

export function slam(s: TtakjiState, x: number, y: number, power: number): SlamResult | null {
  if (s.over || s.slamsLeft <= 0) return null;
  const t = s.level.tiles[s.index];
  const p = tileAt(t, s.time);
  s.slamsLeft--;
  let result: SlamResult;
  const d = edgeDistance(t, p.x, p.y, x, y);
  const ef = edgeFactor(t, d);
  if (power > OVER) result = "over";
  else if (ef <= 0) result = "miss";
  else if (power * ef * LIFT >= t.weight) {
    s.hitsLeft--;
    result = s.hitsLeft > 0 ? "wobble" : "flip";
  } else result = "weak";
  s.history.push({ x, y, power, result });
  if (result === "flip") {
    s.flips++;
    s.index++;
    if (s.index >= s.level.tiles.length) {
      s.over = true;
      s.won = true;
      return result;
    }
    s.hitsLeft = s.level.tiles[s.index].hits;
  }
  if (s.slamsLeft <= 0) s.over = true;
  return result;
}

/** The best landing spot on the current tile (just inside the edge nearest the player). */
export function aimSpot(s: TtakjiState): { x: number; y: number } {
  const t = s.level.tiles[s.index];
  const p = tileAt(t, s.time);
  const inset = t.size / 2 - SWEET * t.size;
  return { x: p.x - Math.sin(t.angle) * inset, y: p.y + Math.cos(t.angle) * inset };
}

/** Power the autopilot uses: a little more than the least that flips, safely below a bounce. */
export function aimPower(s: TtakjiState): number {
  const t = s.level.tiles[s.index];
  // the middle of the window between just enough and a bounce
  return Math.min(OVER - 0.03, ((t.weight / LIFT) * 1.05 + OVER) / 2);
}

/** Autopilot for the tests: aim error `aim` px and power error ±`push` (share). */
export function playAuto(stage: number, aim: number, push: number, seed: number): TtakjiState {
  const s = newTtakji(stage);
  const rng = mulberry(seed);
  for (let guard = 0; guard < 100 && !s.over; guard++) {
    s.time += 0.9 + rng() * 0.8; // time between slams
    const a = aimSpot(s);
    const ang = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * aim;
    slam(s, a.x + Math.cos(ang) * r, a.y + Math.sin(ang) * r, aimPower(s) * (1 + (rng() - 0.5) * 2 * push));
  }
  return s;
}

export function starsFor(s: TtakjiState): number {
  if (!s.won) return 0;
  const spare = s.slamsLeft;
  if (spare >= Math.max(1, s.level.slams - s.level.tiles.reduce((n, t) => n + t.hits, 0) - 1)) return 3;
  if (spare >= 1) return 2;
  return 1;
}
