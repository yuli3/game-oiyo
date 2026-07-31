import {
  BRICK_BREAKER_BOARD,
  brickBreakerDifficulty,
  buildBrickBreakerBricks,
  type BrickBreakerState,
} from "./brick-breaker";

export const BRICK_BREAKER_SAVE_KEY = "oiyo:brick-breaker-state:v1";

export interface BrickBreakerSave {
  version: 1;
  state: BrickBreakerState;
  destroyedBricks: number;
  maxCombo: number;
  savedAtEpochMs: number;
}

type BrickBreakerStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type SerializedState = Omit<BrickBreakerState, "lastHitAt"> & { lastHitAt: number | null };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const finiteIn = (value: unknown, min: number, max: number): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;

function parseState(value: unknown): BrickBreakerState | null {
  if (!isRecord(value) || value.gameOver !== false || typeof value.launched !== "boolean") return null;
  if (!Number.isInteger(value.level) || (value.level as number) < 1 || (value.level as number) > 999) return null;
  if (!Number.isInteger(value.score) || (value.score as number) < 0 || (value.score as number) > 1_000_000_000) return null;
  if (!Number.isInteger(value.lives) || (value.lives as number) < 1 || (value.lives as number) > 3) return null;
  if (!Number.isInteger(value.combo) || (value.combo as number) < 0 || (value.combo as number) > 1_000_000) return null;
  if (!finiteIn(value.elapsedMs, 0, 86_400_000)) return null;
  const difficulty = brickBreakerDifficulty(value.level as number);
  if (value.padW !== difficulty.paddleWidth || !finiteIn(value.padX, difficulty.paddleWidth / 2, BRICK_BREAKER_BOARD.width - difficulty.paddleWidth / 2)) return null;
  if (!finiteIn(value.bx, BRICK_BREAKER_BOARD.ballRadius, BRICK_BREAKER_BOARD.width - BRICK_BREAKER_BOARD.ballRadius)) return null;
  if (!finiteIn(value.by, BRICK_BREAKER_BOARD.ballRadius, BRICK_BREAKER_BOARD.height + BRICK_BREAKER_BOARD.ballRadius)) return null;
  if (!finiteIn(value.vx, -20, 20) || !finiteIn(value.vy, -20, 20) || Math.hypot(value.vx, value.vy) < 0.1) return null;
  if (value.lastHitAt !== null && !finiteIn(value.lastHitAt, 0, value.elapsedMs as number)) return null;
  if (!finiteIn(value.paddleFlashUntil, 0, (value.elapsedMs as number) + 110)) return null;

  const expected = buildBrickBreakerBricks(value.level as number);
  if (!Array.isArray(value.bricks) || value.bricks.length !== expected.length) return null;
  const bricks = [];
  for (let index = 0; index < expected.length; index += 1) {
    const source = value.bricks[index];
    const base = expected[index];
    if (!isRecord(source) || !base || source.x !== base.x || source.y !== base.y || source.w !== base.w ||
      source.maxHits !== base.maxHits || source.hue !== base.hue || !Number.isInteger(source.hits) ||
      (source.hits as number) < 0 || (source.hits as number) > base.maxHits ||
      !finiteIn(source.flashUntil, 0, (value.elapsedMs as number) + 130)) return null;
    bricks.push({ ...base, hits: source.hits as number, flashUntil: source.flashUntil as number });
  }
  if (!bricks.some((brick) => brick.hits > 0)) return null;

  return {
    padX: value.padX as number,
    padW: value.padW as number,
    bx: value.bx as number,
    by: value.by as number,
    vx: value.vx as number,
    vy: value.vy as number,
    bricks,
    score: value.score as number,
    lives: value.lives as number,
    level: value.level as number,
    launched: value.launched,
    combo: value.combo as number,
    lastHitAt: value.lastHitAt === null ? Number.NEGATIVE_INFINITY : value.lastHitAt as number,
    paddleFlashUntil: value.paddleFlashUntil as number,
    elapsedMs: value.elapsedMs as number,
    gameOver: false,
  };
}

export function parseBrickBreakerSave(raw: string | null, nowEpochMs = Date.now()): BrickBreakerSave | null {
  if (!raw || !Number.isFinite(nowEpochMs)) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.version !== 1 || !Number.isInteger(value.destroyedBricks) ||
      (value.destroyedBricks as number) < 0 || !Number.isInteger(value.maxCombo) || (value.maxCombo as number) < 0 ||
      !Number.isInteger(value.savedAtEpochMs) || (value.savedAtEpochMs as number) < 0 ||
      (value.savedAtEpochMs as number) > nowEpochMs + 300_000) return null;
    const state = parseState(value.state);
    if (!state) return null;
    const destroyed = state.bricks.filter((brick) => brick.hits === 0).length;
    if ((value.destroyedBricks as number) < destroyed || (value.maxCombo as number) < state.combo) return null;
    return {
      version: 1,
      state,
      destroyedBricks: value.destroyedBricks as number,
      maxCombo: value.maxCombo as number,
      savedAtEpochMs: value.savedAtEpochMs as number,
    };
  } catch {
    return null;
  }
}

export function serializeBrickBreakerSave(save: Omit<BrickBreakerSave, "version">): string {
  const state: SerializedState = {
    padX: save.state.padX,
    padW: save.state.padW,
    bx: save.state.bx,
    by: save.state.by,
    vx: save.state.vx,
    vy: save.state.vy,
    bricks: save.state.bricks.map((brick) => ({ ...brick })),
    score: save.state.score,
    lives: save.state.lives,
    level: save.state.level,
    launched: save.state.launched,
    combo: save.state.combo,
    lastHitAt: Number.isFinite(save.state.lastHitAt) ? save.state.lastHitAt : null,
    paddleFlashUntil: save.state.paddleFlashUntil,
    elapsedMs: save.state.elapsedMs,
    gameOver: save.state.gameOver,
  };
  return JSON.stringify({ version: 1, ...save, state });
}

export function loadBrickBreakerSave(nowEpochMs = Date.now(), storage: BrickBreakerStorage | undefined = typeof localStorage === "undefined" ? undefined : localStorage): BrickBreakerSave | null {
  if (!storage) return null;
  try { return parseBrickBreakerSave(storage.getItem(BRICK_BREAKER_SAVE_KEY), nowEpochMs); } catch { return null; }
}

export function storeBrickBreakerSave(save: Omit<BrickBreakerSave, "version">, storage: BrickBreakerStorage | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void {
  if (!storage) return;
  try { storage.setItem(BRICK_BREAKER_SAVE_KEY, serializeBrickBreakerSave(save)); } catch { /* best-effort active run */ }
}

export function clearBrickBreakerSave(storage: BrickBreakerStorage | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void {
  if (!storage) return;
  try { storage.removeItem(BRICK_BREAKER_SAVE_KEY); } catch { /* best-effort active run */ }
}
