/**
 * Spatial Memory contracts.
 *
 * Markers sit on a sphere around the player. A sequence of them lights up, then
 * the space goes dark and the sequence must be reproduced — but some markers are
 * behind the camera, so recalling *where* is part of the task. That is the whole
 * reason this game is 3D: flatten it and it becomes an ordinary memory game.
 *
 * Everything here is pure and deterministic. The 3D layer only renders what these
 * functions decide, so the rules stay testable without a WebGL context — which
 * matters because a rAF/WebGL scene cannot be verified in a headless preview.
 *
 * Related: the psychology behind it is our own content (Atkinson–Shiffrin,
 * `education-psychology-ch8`), which is what this game cross-links to.
 */

export interface SpatialLevel {
  /** How many markers exist in the space. */
  markers: number;
  /** How many of them light up, in order. */
  sequence: number;
  /** Milliseconds each marker stays lit during playback. */
  showMs: number;
  /**
   * Fraction of the sphere the markers occupy, 0..1. At 1 they wrap fully
   * behind the player, so the view must be rotated to find them all.
   */
  spread: number;
}

/** Difficulty is data so it can be tuned and tested without touching the scene. */
export const SPATIAL_MEMORY_CURVE: readonly SpatialLevel[] = [
  { markers: 6, sequence: 3, showMs: 700, spread: 0.45 },
  { markers: 8, sequence: 4, showMs: 640, spread: 0.6 },
  { markers: 10, sequence: 5, showMs: 580, spread: 0.75 },
  { markers: 12, sequence: 6, showMs: 520, spread: 0.9 },
  { markers: 14, sequence: 7, showMs: 460, spread: 1 },
  { markers: 16, sequence: 8, showMs: 400, spread: 1 },
] as const;

export const MAX_SPATIAL_LEVEL = SPATIAL_MEMORY_CURVE.length;

export function spatialDifficulty(level: number): SpatialLevel {
  const index = Math.min(Math.max(Math.floor(level), 1), MAX_SPATIAL_LEVEL) - 1;
  return SPATIAL_MEMORY_CURVE[index];
}

export interface MarkerPosition {
  x: number;
  y: number;
  z: number;
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * Fibonacci sphere placement: markers stay evenly spaced at any count, so no
 * two ever overlap into an ambiguous target. `spread` compresses the band
 * toward the front, which is what makes early levels playable without rotating.
 */
export function markerPositions(level: number, radius = 5): MarkerPosition[] {
  const { markers, spread } = spatialDifficulty(level);
  const positions: MarkerPosition[] = [];
  for (let i = 0; i < markers; i += 1) {
    // y from +1 to -1, then scaled toward the equator so markers stay reachable.
    const t = markers === 1 ? 0 : i / (markers - 1);
    const y = (1 - 2 * t) * 0.85;
    const ringRadius = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = GOLDEN_ANGLE * i * spread;
    positions.push({
      x: Math.cos(theta) * ringRadius * radius,
      y: y * radius,
      z: Math.sin(theta) * ringRadius * radius,
    });
  }
  return positions;
}

/** Mulberry32 — small, deterministic, and good enough for picking markers. */
function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The sequence to reproduce. The same marker may repeat, but never twice in a
 * row — a double-flash on one marker is indistinguishable from a single one.
 */
export function generateSequence(level: number, seed: number): number[] {
  const { markers, sequence } = spatialDifficulty(level);
  const next = rng(seed);
  const result: number[] = [];
  while (result.length < sequence) {
    const pick = Math.floor(next() * markers) % markers;
    if (result[result.length - 1] === pick) continue;
    result.push(pick);
  }
  return result;
}

export type StepResult = "correct" | "wrong" | "complete";

/** Judges one selection against the expected sequence. */
export function judgeStep(
  sequence: readonly number[],
  step: number,
  selected: number,
): StepResult {
  if (sequence[step] !== selected) return "wrong";
  return step + 1 >= sequence.length ? "complete" : "correct";
}

/**
 * Longer sequences are worth disproportionately more, because recall difficulty
 * grows faster than length does.
 */
export function scoreForRound(level: number, streak: number): number {
  const { sequence } = spatialDifficulty(level);
  return sequence * sequence * 10 + streak * 25;
}

/** Total milliseconds the playback of one round takes, used for the timer copy. */
export function playbackMilliseconds(level: number): number {
  const { sequence, showMs } = spatialDifficulty(level);
  return sequence * showMs;
}

export function nextLevel(level: number, cleared: boolean): number {
  if (!cleared) return Math.min(Math.max(level, 1), MAX_SPATIAL_LEVEL);
  return Math.min(level + 1, MAX_SPATIAL_LEVEL);
}

export function spatialRecordExtra(level: number, streak: number): string {
  return `L${Math.max(1, Math.floor(level))}S${Math.max(0, Math.floor(streak))}`;
}

export function levelFromSpatialRecord(extra: string | undefined): number {
  const match = /^L(\d+)/.exec(extra ?? "");
  if (!match) return 1;
  return Math.min(Math.max(Number(match[1]), 1), MAX_SPATIAL_LEVEL);
}

/**
 * Keyboard access: markers are ordered so that Tab/arrow cycling walks them in a
 * stable, predictable order rather than in scene-graph order. Without this the
 * game is unplayable without a mouse.
 */
export function keyboardOrder(level: number): number[] {
  const positions = markerPositions(level);
  return positions
    .map((position, index) => ({ index, position }))
    .sort((a, b) => {
      // Top to bottom, then left to right — how a reader scans a space.
      if (Math.abs(a.position.y - b.position.y) > 0.001) return b.position.y - a.position.y;
      return a.position.x - b.position.x;
    })
    .map((entry) => entry.index);
}
