/**
 * Stack Tower's deterministic block-drop rules.
 *
 * A block slides back and forth; dropping it keeps only the part that
 * overlaps the block below (a dead-centre "perfect" keeps the width and
 * builds a combo instead of shaving it). Movement is authored in `frameScale`
 * units so it stays speed-consistent across refresh rates — the caller
 * supplies `deltaScale`, this module has no notion of real time at all.
 */

export interface Block {
  x: number;
  w: number;
  hue: number;
}

export const BLOCK_HEIGHT = 26;
export const BASE_WIDTH = 150;
export const PERFECT_EPSILON = 4;
export const PERFECT_REWARD = 6;
export const MAX_SPEED = 7.5;
export const SPEED_STEP = 0.09;
export const START_SPEED = 2.6;
export const START_HUE = 210;
export const FIRST_MOVING_HUE = 234;
export const HUE_STEP = 24;

export interface TowerState {
  stack: Block[];
  cur: Block;
  dir: number;
  speed: number;
  combo: number;
}

export function createTowerState(fieldWidth: number): TowerState {
  return {
    stack: [{ x: (fieldWidth - BASE_WIDTH) / 2, w: BASE_WIDTH, hue: START_HUE }],
    cur: { x: 0, w: BASE_WIDTH, hue: FIRST_MOVING_HUE },
    dir: 1,
    speed: START_SPEED,
    combo: 0,
  };
}

/** One movement step for the sliding block; bounces off both field edges. */
export function stepBlock(
  cur: Block,
  dir: number,
  speed: number,
  deltaScale: number,
  fieldWidth: number,
): { block: Block; dir: number } {
  let x = cur.x + dir * speed * deltaScale;
  let nextDir = dir;
  if (x <= 0) {
    x = 0;
    nextDir = 1;
  }
  if (x + cur.w >= fieldWidth) {
    x = fieldWidth - cur.w;
    nextDir = -1;
  }
  return { block: { ...cur, x }, dir: nextDir };
}

export type DropOutcome =
  | { kind: "miss" }
  | { kind: "landed"; block: Block; perfect: boolean; combo: number };

/**
 * Resolves a drop against the block it lands on. A non-perfect landing keeps
 * only the geometric overlap; a perfect one (within `PERFECT_EPSILON` of
 * dead-centre) keeps the moving block's own width, regrown toward
 * `BASE_WIDTH` by `PERFECT_REWARD`, and extends the combo.
 */
export function dropOnto(cur: Block, prev: Block, comboBefore: number): DropOutcome {
  const left = Math.max(cur.x, prev.x);
  const right = Math.min(cur.x + cur.w, prev.x + prev.w);
  const overlap = right - left;
  if (overlap <= 0) return { kind: "miss" };

  const perfect = Math.abs(cur.x - prev.x) <= PERFECT_EPSILON;
  if (perfect) {
    return {
      kind: "landed",
      block: { x: prev.x, w: Math.min(BASE_WIDTH, prev.w + PERFECT_REWARD), hue: cur.hue },
      perfect: true,
      combo: comboBefore + 1,
    };
  }
  return { kind: "landed", block: { x: left, w: overlap, hue: cur.hue }, perfect: false, combo: 0 };
}

/**
 * Builds the next moving block after a landing: it enters from whichever
 * side the tower is currently sliding away from, and the field speeds up a
 * notch (capped at `MAX_SPEED`) so later towers demand tighter timing.
 */
export function spawnNextBlock(
  landedWidth: number,
  landedHue: number,
  dir: number,
  speed: number,
  fieldWidth: number,
): { block: Block; dir: number; speed: number } {
  const nextHue = (landedHue + HUE_STEP) % 360;
  const fromLeft = dir < 0;
  return {
    block: { x: fromLeft ? 0 : fieldWidth - landedWidth, w: landedWidth, hue: nextHue },
    dir: fromLeft ? 1 : -1,
    speed: Math.min(MAX_SPEED, speed + SPEED_STEP),
  };
}

/** Camera stays put until the tower passes the halfway mark, then follows it up. */
export function cameraOffset(stackLength: number, viewportHeight: number): number {
  const towerTop = stackLength * BLOCK_HEIGHT;
  return Math.max(0, towerTop - (viewportHeight - 160));
}
