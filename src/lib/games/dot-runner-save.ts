import { DOT_RUNNER_GROUND, DOT_RUNNER_HEIGHT, DOT_RUNNER_PLAYER_SIZE, DOT_RUNNER_WIDTH, type DotRunnerEntity, type DotRunnerState } from "./dot-runner";

export const DOT_RUNNER_SAVE_KEY = "oiyo:dot-runner-state:v1";
export interface DotRunnerSaveV1 { version: 1; state: DotRunnerState; savedAtEpochMs: number }
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

function parseEntities(value: unknown, kind: "obstacle" | "item"): DotRunnerEntity[] | null {
  if (!Array.isArray(value) || value.length > 32) return null;
  const parsed: DotRunnerEntity[] = [];
  for (const entity of value) {
    if (!record(entity) || !finite(entity.x) || entity.x < -100 || entity.x > DOT_RUNNER_WIDTH || !finite(entity.y) || entity.y < 0 || entity.y > DOT_RUNNER_HEIGHT ||
      !finite(entity.w) || !finite(entity.h) || !finite(entity.speed) || entity.speed < 0 || entity.speed > 8) return null;
    const expectedW = kind === "obstacle" ? 20 : 15;
    const geometryInvalid = kind === "item"
      ? entity.h !== 15 || entity.y < 240 || entity.y > 315
      : entity.h < 20 || entity.h > 60 || entity.y !== DOT_RUNNER_HEIGHT - DOT_RUNNER_GROUND - entity.h;
    if (entity.w !== expectedW || geometryInvalid) return null;
    parsed.push({ x: entity.x, y: entity.y, w: entity.w, h: entity.h, speed: entity.speed });
  }
  return parsed;
}

export function parseDotRunnerSave(raw: string | null, nowEpochMs = Date.now()): DotRunnerSaveV1 | null {
  if (!raw || !Number.isFinite(nowEpochMs)) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!record(value) || value.version !== 1 || !record(value.state) || !Number.isInteger(value.savedAtEpochMs) || (value.savedAtEpochMs as number) < 0 || (value.savedAtEpochMs as number) > nowEpochMs + 300_000) return null;
    const state = value.state;
    const obstacles = parseEntities(state.obstacles, "obstacle");
    const items = parseEntities(state.items, "item");
    if (state.status !== "playing" || !obstacles || !items || !finite(state.playerY) || state.playerY < 0 || state.playerY > DOT_RUNNER_HEIGHT - DOT_RUNNER_PLAYER_SIZE ||
      !finite(state.velocityY) || state.velocityY < -11 || state.velocityY > 12 || typeof state.jumping !== "boolean" || !finite(state.elapsedFrames) || state.elapsedFrames < 0 || state.elapsedFrames > 60 * 60 * 24 * 7 ||
      !Number.isInteger(state.coins) || (state.coins as number) < 0 || (state.coins as number) > 100_000 || !Number.isInteger(state.score) || !Number.isInteger(state.rngState) || (state.rngState as number) < 0 || (state.rngState as number) > 0xffff_ffff) return null;
    const expectedScore = Math.floor(((state.elapsedFrames as number) + 1e-9) / 5) + (state.coins as number) * 10;
    const floorY = DOT_RUNNER_HEIGHT - DOT_RUNNER_GROUND - DOT_RUNNER_PLAYER_SIZE;
    if (state.score !== expectedScore || (!state.jumping && (state.velocityY !== 0 || state.playerY !== floorY))) return null;
    return { version: 1, savedAtEpochMs: value.savedAtEpochMs as number, state: { playerY: state.playerY, velocityY: state.velocityY, jumping: state.jumping, obstacles, items, score: state.score as number, coins: state.coins as number, elapsedFrames: state.elapsedFrames, rngState: state.rngState as number, status: "playing" } };
  } catch { return null; }
}

export function loadDotRunnerSave(now = Date.now(), storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage): DotRunnerSaveV1 | null {
  if (!storage) return null;
  try { return parseDotRunnerSave(storage.getItem(DOT_RUNNER_SAVE_KEY), now); } catch { return null; }
}
export function storeDotRunnerSave(state: DotRunnerState, savedAtEpochMs = Date.now(), storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void {
  if (!storage || state.status !== "playing") return;
  try { storage.setItem(DOT_RUNNER_SAVE_KEY, JSON.stringify({ version: 1, state, savedAtEpochMs })); } catch { /* best effort */ }
}
export function clearDotRunnerSave(storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void {
  try { storage?.removeItem(DOT_RUNNER_SAVE_KEY); } catch { /* best effort */ }
}
