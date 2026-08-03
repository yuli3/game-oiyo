import {
  allLegalPlacements,
  buildDeck,
  CENTER,
  GRID,
  KINGDOM_SIZE,
  TERRAINS,
  type Board,
  type CrownGrid,
  type Square,
  type Terrain,
  type Tile,
} from "./kingdomino";
import type { AiLevel, GameState, Kingdom, Pending, Player, Slot } from "./ai/kingdomino";

export const KINGDOMINO_SAVE_KEY = "oiyo:kingdomino-state:v1";
const TILES_2P = 24;

export interface KingdominoSaveV1 {
  version: 1;
  state: GameState;
  level: AiLevel;
  savedAtEpochMs: number;
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isInt = (value: unknown, min: number, max: number): value is number =>
  Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
const isPlayer = (value: unknown): value is Player => value === "you" || value === "ai";

// buildDeck() is fully deterministic (no randomness), so it doubles as the
// canonical answer key: a saved tile is only genuine if its a/b terrain and
// crown counts match what that id actually produces.
const CANONICAL_DECK = new Map(buildDeck().map((tile) => [tile.id, tile]));

function isValidSquare(value: unknown, expected: Square): boolean {
  return isRecord(value) && value.terrain === expected.terrain && value.crowns === expected.crowns;
}

function isValidTile(value: unknown): value is Tile {
  if (!isRecord(value) || !isInt(value.id, 1, 48)) return false;
  const canonical = CANONICAL_DECK.get(value.id as number);
  return Boolean(canonical) && isValidSquare(value.a, canonical!.a) && isValidSquare(value.b, canonical!.b);
}

function isValidBoard(value: unknown): value is Board {
  if (!Array.isArray(value) || value.length !== GRID) return false;
  for (const row of value) {
    if (!Array.isArray(row) || row.length !== GRID) return false;
    for (const cell of row) {
      if (cell !== null && cell !== "castle" && !TERRAINS.includes(cell as Terrain)) return false;
    }
  }
  const board = value as Board;
  let minR = GRID, maxR = -1, minC = GRID, maxC = -1;
  for (let r = 0; r < GRID; r += 1) {
    for (let c = 0; c < GRID; c += 1) {
      if (board[r][c] === "castle" && !(r === CENTER && c === CENTER)) return false; // exactly one castle, fixed at center
      if (board[r][c] !== null) { minR = Math.min(minR, r); maxR = Math.max(maxR, r); minC = Math.min(minC, c); maxC = Math.max(maxC, c); }
    }
  }
  if (board[CENTER][CENTER] !== "castle") return false;
  if (maxR >= 0 && (maxR - minR >= KINGDOM_SIZE || maxC - minC >= KINGDOM_SIZE)) return false; // kingdom-size cap
  return true;
}

function isValidCrowns(value: unknown, board: Board): value is CrownGrid {
  if (!Array.isArray(value) || value.length !== GRID) return false;
  for (let r = 0; r < GRID; r += 1) {
    const row = value[r];
    if (!Array.isArray(row) || row.length !== GRID) return false;
    for (let c = 0; c < GRID; c += 1) {
      if (!isInt(row[c], 0, 3)) return false;
      if (row[c] > 0 && (board[r][c] === null || board[r][c] === "castle")) return false; // a crown needs terrain under it
    }
  }
  return true;
}

function isValidKingdom(value: unknown): value is Kingdom {
  if (!isRecord(value) || !isValidBoard(value.board)) return false;
  if (!isValidCrowns(value.crowns, value.board as Board)) return false;
  return isInt(value.discarded, 0, TILES_2P);
}

function isValidSlot(value: unknown): value is Slot {
  return isRecord(value) && isValidTile(value.tile) && (value.owner === null || isPlayer(value.owner));
}

function isValidSlotArray(value: unknown, maxLength: number): value is Slot[] {
  return Array.isArray(value) && value.length <= maxLength && value.every(isValidSlot);
}

export function parseKingdominoSave(raw: string | null, now = Date.now()): KingdominoSaveV1 | null {
  if (!raw || !Number.isFinite(now)) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.version !== 1 || !isInt(value.level, 1, 3)) return null;
    if (!isInt(value.savedAtEpochMs, 0, now + 300_000)) return null;
    if (!isRecord(value.state)) return null;
    const state = value.state;

    if (!isValidKingdom(state.you) || !isValidKingdom(state.ai)) return null;

    if (!Array.isArray(state.deck) || state.deck.length !== TILES_2P || !state.deck.every(isValidTile)) return null;
    const deck = state.deck as Tile[];
    if (new Set(deck.map((tile) => tile.id)).size !== TILES_2P) return null; // no duplicate tiles
    if (!isInt(state.deckPos, 0, TILES_2P)) return null;

    if (!isValidSlotArray(state.current, 4) || !isValidSlotArray(state.draft, 4)) return null;
    const current = state.current as Slot[];
    const draft = state.draft as Slot[];
    const deckIds = new Set(deck.map((tile) => tile.id));
    if (![...current, ...draft].every((slot) => deckIds.has(slot.tile.id))) return null; // slots must reference real deck tiles

    if (!isInt(state.curIdx, 0, current.length)) return null;
    if (!Array.isArray(state.claimSeq) || state.claimSeq.length !== 4 || !state.claimSeq.every(isPlayer)) return null;
    if (!isInt(state.claimPos, 0, 4)) return null;
    if (!["setup", "round"].includes(state.phase as string)) return null; // "gameover" is a terminal, non-resumable phase
    if (!isInt(state.round, 1, TILES_2P)) return null;

    const pending = state.pending;
    if (!isRecord(pending)) return null;
    if (pending.kind === "claim") {
      if (!isPlayer(pending.owner) || !Array.isArray(pending.options)) return null;
      const unclaimed = draft.map((slot, index) => (slot.owner === null ? index : -1)).filter((index) => index >= 0);
      if (JSON.stringify([...(pending.options as number[])].sort((a, b) => a - b)) !== JSON.stringify(unclaimed)) return null;
    } else if (pending.kind === "place") {
      if (!isPlayer(pending.owner) || typeof pending.canPlace !== "boolean" || !isValidTile(pending.tile)) return null;
      const slot = current[state.curIdx as number];
      if (!slot || slot.owner !== pending.owner || slot.tile.id !== (pending.tile as Tile).id) return null;
      const legal = allLegalPlacements((state[pending.owner as Player] as Kingdom).board, slot.tile).length > 0;
      if (pending.canPlace !== legal) return null;
    } else {
      return null; // "gameover" pending (or anything else) is not a resumable mid-game state
    }

    return { version: 1, state: state as unknown as GameState, level: value.level as AiLevel, savedAtEpochMs: value.savedAtEpochMs as number };
  } catch {
    return null;
  }
}

export function serializeKingdominoSave(save: Omit<KingdominoSaveV1, "version">): string {
  return JSON.stringify({ version: 1, ...save });
}

export function loadKingdominoSave(now = Date.now(), storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage): KingdominoSaveV1 | null {
  if (!storage) return null;
  try { return parseKingdominoSave(storage.getItem(KINGDOMINO_SAVE_KEY), now); } catch { return null; }
}

export function storeKingdominoSave(save: Omit<KingdominoSaveV1, "version">, storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void {
  if (!storage) return;
  try { storage.setItem(KINGDOMINO_SAVE_KEY, serializeKingdominoSave(save)); } catch { /* best-effort local active state */ }
}

export function clearKingdominoSave(storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage): void {
  if (!storage) return;
  try { storage.removeItem(KINGDOMINO_SAVE_KEY); } catch { /* best-effort local active state */ }
}

export type { Pending };
