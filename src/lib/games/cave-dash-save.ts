import {
  CAVE_GAP,
  CAVE_HEIGHT,
  CAVE_SHIP_RADIUS,
  CAVE_WALL_WIDTH,
  CAVE_WIDTH,
  type CaveDashState,
} from "./cave-dash";

export const CAVE_DASH_SAVE_KEY = "oiyo:cave-dash-state:v1";

export interface CaveDashSaveV1 {
  version: 1;
  state: CaveDashState;
  savedAtEpochMs: number;
}

type CaveDashStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

export function parseCaveDashSave(raw: string | null, nowEpochMs = Date.now()): CaveDashSaveV1 | null {
  if (!raw || !Number.isFinite(nowEpochMs)) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.version !== 1 || !isRecord(value.state)) return null;
    if (!Number.isInteger(value.savedAtEpochMs) || (value.savedAtEpochMs as number) < 0 || (value.savedAtEpochMs as number) > nowEpochMs + 300_000) return null;
    const state = value.state;
    if (state.status !== "playing" || !finite(state.y) || state.y < CAVE_SHIP_RADIUS || state.y > CAVE_HEIGHT - CAVE_SHIP_RADIUS) return null;
    if (!finite(state.vy) || state.vy < -8 || state.vy > 20) return null;
    if (!Number.isInteger(state.score) || (state.score as number) < 0 || (state.score as number) > 10_000) return null;
    if (!finite(state.elapsedFrames) || state.elapsedFrames < 0 || state.elapsedFrames > 60 * 60 * 24 * 7) return null;
    if (!Number.isInteger(state.rngState) || (state.rngState as number) < 0 || (state.rngState as number) > 0xffff_ffff) return null;
    if (!finite(state.spawnDistance) || state.spawnDistance < 0 || state.spawnDistance > 200) return null;
    if (!finite(state.speed) || Math.abs(state.speed - (2.4 + (state.score as number) * 0.12)) > 0.121) return null;
    if (!Array.isArray(state.walls) || state.walls.length > 8) return null;
    const walls = state.walls.map((wall) => {
      if (!isRecord(wall) || !finite(wall.x) || wall.x < -CAVE_WALL_WIDTH - 4 || wall.x > CAVE_WIDTH ||
        !finite(wall.gapY) || wall.gapY < 70 || wall.gapY > CAVE_HEIGHT - 70 - CAVE_GAP || typeof wall.passed !== "boolean") return null;
      return { x: wall.x, gapY: wall.gapY, passed: wall.passed };
    });
    if (walls.some((wall) => wall === null)) return null;
    const parsed: CaveDashState = {
      y: state.y,
      vy: state.vy,
      walls: walls as CaveDashState["walls"],
      spawnDistance: state.spawnDistance,
      score: state.score as number,
      speed: state.speed,
      elapsedFrames: state.elapsedFrames,
      rngState: state.rngState as number,
      status: "playing",
    };
    return { version: 1, state: parsed, savedAtEpochMs: value.savedAtEpochMs as number };
  } catch {
    return null;
  }
}

export function loadCaveDashSave(nowEpochMs = Date.now(), storage: CaveDashStorage | undefined = typeof localStorage === "undefined" ? undefined : localStorage): CaveDashSaveV1 | null {
  if (!storage) return null;
  try { return parseCaveDashSave(storage.getItem(CAVE_DASH_SAVE_KEY), nowEpochMs); } catch { return null; }
}

export function storeCaveDashSave(state: CaveDashState, savedAtEpochMs = Date.now(), storage: CaveDashStorage | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void {
  if (!storage || state.status !== "playing") return;
  try { storage.setItem(CAVE_DASH_SAVE_KEY, JSON.stringify({ version: 1, state, savedAtEpochMs })); } catch { /* best effort */ }
}

export function clearCaveDashSave(storage: CaveDashStorage | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void {
  if (!storage) return;
  try { storage.removeItem(CAVE_DASH_SAVE_KEY); } catch { /* best effort */ }
}
