import { mulberry32 } from "./daily";
import {
  generateKurodokoPuzzle,
  type KurodokoDifficulty,
  type KurodokoPuzzle,
} from "./kurodoko";

export const KURODOKO_SAVE_KEY = "oiyo:kurodoko-state:v1";
export type KurodokoMode = "daily" | "free";
export type KurodokoMark = -1 | 0 | 1; // unknown, confirmed white, black

export interface KurodokoSaveV1 {
  version: 1;
  mode: KurodokoMode;
  difficulty: KurodokoDifficulty;
  dailyDate: string;
  seed: number;
  marks: KurodokoMark[][];
  moves: number;
  seconds: number;
  savedAtEpochMs: number;
}

type KurodokoStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

function validCivilDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function puzzleFromKurodokoSave(save: Pick<KurodokoSaveV1, "difficulty" | "seed">): KurodokoPuzzle {
  return generateKurodokoPuzzle(save.difficulty, mulberry32(save.seed)).puzzle;
}

export function parseKurodokoSaveV1(raw: string | null, expectedDailyDate: string, nowEpochMs = Date.now()): KurodokoSaveV1 | null {
  if (!raw || !validCivilDate(expectedDailyDate) || !Number.isFinite(nowEpochMs)) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.version !== 1) return null;
    if (value.mode !== "daily" && value.mode !== "free") return null;
    if (value.difficulty !== "easy" && value.difficulty !== "medium" && value.difficulty !== "hard") return null;
    if (value.mode === "daily" && (value.dailyDate !== expectedDailyDate || value.difficulty !== "medium")) return null;
    if (!validCivilDate(value.dailyDate)) return null;
    if (!Number.isInteger(value.seed) || (value.seed as number) < -0x8000_0000 || (value.seed as number) > 0x7fff_ffff) return null;
    if (!Number.isInteger(value.moves) || (value.moves as number) < 1 || (value.moves as number) > 100_000) return null;
    if (!Number.isInteger(value.seconds) || (value.seconds as number) < 0 || (value.seconds as number) > 604_800) return null;
    if (!Number.isInteger(value.savedAtEpochMs) || (value.savedAtEpochMs as number) < 0 || (value.savedAtEpochMs as number) > nowEpochMs + 300_000) return null;

    const save = value as unknown as KurodokoSaveV1;
    const puzzle = puzzleFromKurodokoSave(save);
    const size = puzzle.length;
    if (!Array.isArray(value.marks) || value.marks.length !== size) return null;
    const marks: KurodokoMark[][] = [];
    for (let row = 0; row < size; row++) {
      const source = value.marks[row];
      if (!Array.isArray(source) || source.length !== size) return null;
      const parsedRow: KurodokoMark[] = [];
      for (let column = 0; column < size; column++) {
        const mark = source[column];
        if (mark !== -1 && mark !== 0 && mark !== 1) return null;
        if (puzzle[row][column] !== null && mark !== 0) return null;
        parsedRow.push(mark);
      }
      marks.push(parsedRow);
    }
    return { ...save, marks };
  } catch {
    return null;
  }
}

export function loadKurodokoSaveV1(expectedDailyDate: string, nowEpochMs = Date.now(), storage: KurodokoStorage | undefined = typeof localStorage === "undefined" ? undefined : localStorage): KurodokoSaveV1 | null {
  if (!storage) return null;
  try { return parseKurodokoSaveV1(storage.getItem(KURODOKO_SAVE_KEY), expectedDailyDate, nowEpochMs); } catch { return null; }
}

export function restoredKurodokoSeconds(save: KurodokoSaveV1, nowEpochMs = Date.now()): number {
  return save.seconds + Math.max(0, Math.floor((nowEpochMs - save.savedAtEpochMs) / 1000));
}

export function storeKurodokoSaveV1(save: Omit<KurodokoSaveV1, "version">, storage: KurodokoStorage | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void {
  if (!storage) return;
  try { storage.setItem(KURODOKO_SAVE_KEY, JSON.stringify({ version: 1, ...save })); } catch { /* best-effort active game */ }
}

export function clearKurodokoSaveV1(storage: KurodokoStorage | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void {
  if (!storage) return;
  try { storage.removeItem(KURODOKO_SAVE_KEY); } catch { /* best-effort active game */ }
}
