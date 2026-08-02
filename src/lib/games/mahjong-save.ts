import type { AiLevel } from "./ai/mahjong";
import type { MahjongPhase, MahjongState } from "./mahjong";

export const MAHJONG_SAVE_KEY = "oiyo:mahjong-state:v1";
export interface MahjongSaveV1 { version: 1; state: MahjongState; level: AiLevel; savedAtEpochMs: number }
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const integer = (value: unknown, min: number, max: number): value is number => Number.isInteger(value) && (value as number) >= min && (value as number) <= max;

function tiles(value: unknown, maxLength: number): number[] | null {
  if (!Array.isArray(value) || value.length > maxLength || !value.every((tile) => integer(tile, 0, 33))) return null;
  return value.slice() as number[];
}

function rows(value: unknown, rowMax: number): number[][] | null {
  if (!Array.isArray(value) || value.length !== 4) return null;
  const parsed = value.map((row) => tiles(row, rowMax));
  return parsed.every(Boolean) ? parsed as number[][] : null;
}

const counts = (values: number[]) => {
  const result = new Array(34).fill(0) as number[];
  for (const value of values) result[value] += 1;
  return result;
};

export function parseMahjongSave(raw: string | null, nowEpochMs = Date.now()): MahjongSaveV1 | null {
  if (!raw || !Number.isFinite(nowEpochMs)) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!record(value) || value.version !== 1 || !record(value.state) || !integer(value.level, 1, 3) ||
      !integer(value.savedAtEpochMs, 0, nowEpochMs + 300_000)) return null;
    const state = value.state;
    const wall = tiles(state.wall, 136);
    const hands = rows(state.hands, 14);
    const discards = rows(state.discards, 84);
    const phase = state.phase as MahjongPhase;
    if (!wall || wall.length !== 136 || !hands || !discards || !["draw", "discard", "ron"].includes(phase) ||
      !integer(state.wallPos, 52, 136) || !integer(state.turn, 0, 3) || !integer(state.rngState, 0, 0xffff_ffff) ||
      !integer(state.turns, 0, 84) || state.winner !== null || state.winType !== null ||
      !(state.drawn === null || integer(state.drawn, 0, 33)) || !(state.lastDiscard === null || integer(state.lastDiscard, 0, 33)) ||
      !(state.lastDiscarder === null || integer(state.lastDiscarder, 0, 3)) || !(state.ronTile === null || integer(state.ronTile, 0, 33)) ||
      !Array.isArray(state.declinedRon) || !state.declinedRon.every((seat) => integer(seat, 0, 3))) return null;

    const wallCounts = counts(wall);
    if (!wallCounts.every((count) => count === 4)) return null;
    const visible = [...hands.flat(), ...discards.flat()];
    if (visible.length !== state.wallPos || counts(wall.slice(0, state.wallPos)).some((count, tile) => count !== counts(visible)[tile])) return null;
    const expectedLength = (seat: number) => phase === "discard" && seat === state.turn ? 14 : 13;
    if (hands.some((hand, seat) => hand.length !== expectedLength(seat))) return null;
    if (phase === "draw" && state.drawn !== null || phase === "discard" && state.drawn === null ||
      phase === "ron" && (state.ronTile === null || state.ronTile !== state.lastDiscard || state.lastDiscarder === null) ||
      phase !== "ron" && state.ronTile !== null) return null;

    return {
      version: 1,
      level: value.level as AiLevel,
      savedAtEpochMs: value.savedAtEpochMs as number,
      state: {
        hands, discards, wall, wallPos: state.wallPos as number, turn: state.turn as number,
        drawn: state.drawn as number | null, phase, lastDiscard: state.lastDiscard as number | null,
        lastDiscarder: state.lastDiscarder as number | null, winner: null, winType: null,
        ronTile: state.ronTile as number | null, declinedRon: (state.declinedRon as number[]).slice(),
        rngState: state.rngState as number, turns: state.turns as number,
      },
    };
  } catch { return null; }
}

export function loadMahjongSave(now = Date.now(), storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage): MahjongSaveV1 | null {
  if (!storage) return null;
  try { return parseMahjongSave(storage.getItem(MAHJONG_SAVE_KEY), now); } catch { return null; }
}

export function storeMahjongSave(state: MahjongState, level: AiLevel, savedAtEpochMs = Date.now(), storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void {
  if (!storage || state.phase === "over") return;
  try { storage.setItem(MAHJONG_SAVE_KEY, JSON.stringify({ version: 1, state, level, savedAtEpochMs })); } catch { /* best effort */ }
}

export function clearMahjongSave(storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void {
  try { storage?.removeItem(MAHJONG_SAVE_KEY); } catch { /* best effort */ }
}
