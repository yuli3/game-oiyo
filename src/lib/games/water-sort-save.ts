import {
  WATER_SORT_CAPACITY,
  WATER_SORT_COLOR_COUNT,
  WATER_SORT_TUBE_COUNT,
  createWaterSort,
  legalWaterSortMoves,
  moveWaterSort,
  type WaterSortDifficulty,
  type WaterSortState,
} from "./water-sort";

export const WATER_SORT_SAVE_KEY = "oiyo:water-sort-state:v1";
export type WaterSortAssist = "none" | "hint" | "undo";
export interface WaterSortSaveV1 { version: 1; state: WaterSortState; undo: WaterSortState[]; elapsedSeconds: number; assist: WaterSortAssist; savedAtEpochMs: number }
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const integer = (value: unknown, min: number, max: number): value is number => Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function parseState(value: unknown): WaterSortState | null {
  if (!record(value) || !Array.isArray(value.tubes) || value.tubes.length !== WATER_SORT_TUBE_COUNT ||
    !integer(value.seed, 0, 0xffff_ffff) || !["easy", "medium", "hard"].includes(value.difficulty as string) ||
    !integer(value.rngState, 0, 0xffff_ffff) || !integer(value.moves, 0, 10_000) || value.status !== "playing") return null;
  const tubes: number[][] = [];
  const counts = new Array(WATER_SORT_COLOR_COUNT).fill(0) as number[];
  for (const tube of value.tubes) {
    if (!Array.isArray(tube) || tube.length > WATER_SORT_CAPACITY || !tube.every((color) => integer(color, 0, WATER_SORT_COLOR_COUNT - 1))) return null;
    const cloned = tube.slice() as number[];
    for (const color of cloned) counts[color] += 1;
    tubes.push(cloned);
  }
  if (!counts.every((count) => count === WATER_SORT_CAPACITY)) return null;
  const initial = createWaterSort(value.seed as number, value.difficulty as WaterSortDifficulty);
  if (initial.rngState !== value.rngState) return null;
  return { tubes, seed: value.seed as number, difficulty: value.difficulty as WaterSortDifficulty, rngState: value.rngState as number, moves: value.moves as number, status: "playing" };
}

function isSingleTransition(from: WaterSortState, to: WaterSortState): boolean {
  if (from.seed !== to.seed || from.difficulty !== to.difficulty || from.rngState !== to.rngState || to.moves !== from.moves + 1) return false;
  return legalWaterSortMoves(from.tubes).some((move) => same(moveWaterSort(from, move), to));
}

export function parseWaterSortSave(raw: string | null, nowEpochMs = Date.now()): WaterSortSaveV1 | null {
  if (!raw || !Number.isFinite(nowEpochMs)) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!record(value) || value.version !== 1 || !integer(value.elapsedSeconds, 0, 7 * 24 * 60 * 60) ||
      !["none", "hint", "undo"].includes(value.assist as string) || !integer(value.savedAtEpochMs, 0, nowEpochMs + 300_000) ||
      nowEpochMs - (value.savedAtEpochMs as number) > 7 * 24 * 60 * 60 * 1_000 || !Array.isArray(value.undo) || value.undo.length > 50) return null;
    const state = parseState(value.state);
    const undo = value.undo.map(parseState);
    if (!state || undo.some((item) => !item)) return null;
    const history = [...undo as WaterSortState[], state];
    if (history.some((item) => item.seed !== state.seed || item.difficulty !== state.difficulty) ||
      history.some((item, index) => index > 0 && !isSingleTransition(history[index - 1], item))) return null;
    return { version: 1, state, undo: undo as WaterSortState[], elapsedSeconds: value.elapsedSeconds as number, assist: value.assist as WaterSortAssist, savedAtEpochMs: value.savedAtEpochMs as number };
  } catch { return null; }
}

export function loadWaterSortSave(now = Date.now(), storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage): WaterSortSaveV1 | null {
  if (!storage) return null;
  try { return parseWaterSortSave(storage.getItem(WATER_SORT_SAVE_KEY), now); } catch { return null; }
}
export function storeWaterSortSave(state: WaterSortState, undo: WaterSortState[], elapsedSeconds: number, assist: WaterSortAssist, savedAtEpochMs = Date.now(), storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void {
  if (!storage || state.status !== "playing") return;
  try { storage.setItem(WATER_SORT_SAVE_KEY, JSON.stringify({ version: 1, state, undo: undo.slice(-50), elapsedSeconds, assist, savedAtEpochMs })); } catch { /* best effort */ }
}
export function clearWaterSortSave(storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void {
  try { storage?.removeItem(WATER_SORT_SAVE_KEY); } catch { /* best effort */ }
}
