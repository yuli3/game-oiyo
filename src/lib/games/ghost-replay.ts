/**
 * Universal Ghost Replay & Personal Best (PB) Trajectory Engine.
 * Allows action, runner, and arcade games to record, compress, interpolate,
 * and compete against local PB ghost runs without re-running full physics loops.
 */

export interface GhostFrame<TPose> {
  tick: number;
  pose: TPose;
}

export type GhostScoreMode = "higher-better" | "lower-better";

export interface GhostEnvelope<TPose> {
  version: 1;
  game: string;
  score: number;
  seed?: number;
  durationMs: number;
  sampleIntervalTicks: number;
  frames: GhostFrame<TPose>[];
  achievedAt: string;
}

export type GhostStorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const GHOST_STORAGE_PREFIX = "oiyo:ghost-replay:v1:";

export function ghostStorageKey(game: string): string {
  return `${GHOST_STORAGE_PREFIX}${game}`;
}

export function isGhostEnvelope<T>(value: unknown, game?: string): value is GhostEnvelope<T> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const env = value as Partial<GhostEnvelope<T>>;
  if (env.version !== 1) return false;
  if (typeof env.game !== "string" || !env.game || (game && env.game !== game)) return false;
  if (typeof env.score !== "number" || !Number.isFinite(env.score)) return false;
  if (typeof env.durationMs !== "number" || env.durationMs < 0) return false;
  if (!Number.isInteger(env.sampleIntervalTicks) || (env.sampleIntervalTicks ?? 0) <= 0) return false;
  if (!Array.isArray(env.frames)) return false;
  if (typeof env.achievedAt !== "string" || Number.isNaN(Date.parse(env.achievedAt))) return false;

  let prevTick = -1;
  for (const frame of env.frames) {
    if (!frame || typeof frame !== "object" || !Number.isInteger(frame.tick) || frame.tick < prevTick) {
      return false;
    }
    prevTick = frame.tick;
  }
  return true;
}

export function createGhostEnvelope<TPose>(args: {
  game: string;
  score: number;
  seed?: number;
  durationMs: number;
  sampleIntervalTicks?: number;
  frames: GhostFrame<TPose>[];
  achievedAt?: string;
}): GhostEnvelope<TPose> {
  return {
    version: 1,
    game: args.game,
    score: args.score,
    seed: args.seed,
    durationMs: args.durationMs,
    sampleIntervalTicks: args.sampleIntervalTicks ?? 5,
    frames: args.frames.map((f) => ({ tick: f.tick, pose: f.pose })),
    achievedAt: args.achievedAt ?? new Date().toISOString(),
  };
}

/**
 * Evaluates whether an incoming ghost score beats the current record.
 */
export function isBetterGhostScore(
  candidate: number,
  baseline: number | null | undefined,
  mode: GhostScoreMode = "higher-better"
): boolean {
  if (baseline == null || Number.isNaN(baseline)) return true;
  return mode === "higher-better" ? candidate > baseline : candidate < baseline;
}

/**
 * Loads the saved ghost PB for the given game.
 */
export function loadGhostPB<TPose>(
  game: string,
  storage?: GhostStorageLike
): GhostEnvelope<TPose> | null {
  try {
    const store =
      storage ??
      (typeof window !== "undefined"
        ? window.localStorage
        : typeof localStorage !== "undefined"
          ? localStorage
          : undefined);
    if (!store) return null;
    const raw = store.getItem(ghostStorageKey(game));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isGhostEnvelope<TPose>(parsed, game) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Records a candidate ghost run, updating storage only if it qualifies as a new PB.
 */
export function recordGhostPB<TPose>(
  candidate: GhostEnvelope<TPose>,
  mode: GhostScoreMode = "higher-better",
  storage?: GhostStorageLike
): { isNewPB: boolean; pb: GhostEnvelope<TPose> } {
  const store =
    storage ??
    (typeof window !== "undefined"
      ? window.localStorage
      : typeof localStorage !== "undefined"
        ? localStorage
        : undefined);
  const current = loadGhostPB<TPose>(candidate.game, store);

  if (!current || isBetterGhostScore(candidate.score, current.score, mode)) {
    try {
      store?.setItem(ghostStorageKey(candidate.game), JSON.stringify(candidate));
    } catch {
      /* storage quota protection */
    }
    return { isNewPB: true, pb: candidate };
  }

  return { isNewPB: false, pb: current };
}

/**
 * Clears the stored ghost PB for a game.
 */
export function clearGhostPB(game: string, storage?: GhostStorageLike): void {
  try {
    const store =
      storage ??
      (typeof window !== "undefined"
        ? window.localStorage
        : typeof localStorage !== "undefined"
          ? localStorage
          : undefined);
    store?.removeItem(ghostStorageKey(game));
  } catch {
    /* best effort */
  }
}

/**
 * Samples a pose from the ghost trajectory at `currentTick`.
 * If an optional `interpolate` function is provided, smoothly blends between
 * nearest keyframes; otherwise returns the nearest preceding pose.
 */
export function sampleGhostPose<TPose>(
  frames: readonly GhostFrame<TPose>[],
  currentTick: number,
  interpolate?: (a: TPose, b: TPose, progress: number) => TPose
): TPose | null {
  if (frames.length === 0) return null;
  if (currentTick <= frames[0].tick) return frames[0].pose;
  if (currentTick >= frames[frames.length - 1].tick) {
    return frames[frames.length - 1].pose;
  }

  // Binary search for surrounding keyframes
  let low = 0;
  let high = frames.length - 1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    const midTick = frames[mid].tick;

    if (midTick === currentTick) {
      return frames[mid].pose;
    }
    if (midTick < currentTick) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  // high is floor frame, low is ceil frame
  const floorFrame = frames[high];
  const ceilFrame = frames[low];

  if (!ceilFrame) return floorFrame.pose;
  if (!floorFrame) return ceilFrame.pose;

  if (!interpolate) return floorFrame.pose;

  const tickSpan = ceilFrame.tick - floorFrame.tick;
  if (tickSpan <= 0) return floorFrame.pose;

  const progress = (currentTick - floorFrame.tick) / tickSpan;
  return interpolate(floorFrame.pose, ceilFrame.pose, progress);
}
