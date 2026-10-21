// Draft edits for the number-tile table: what the player has laid out this
// turn before pressing Lay. Pure, so drag-and-drop rules are testable.

import { arrangeMeld, validateMeld, type Meld, type RummyState, type Tile } from "./tile-rummy";
import type { DropTarget, TileSpot } from "./tile-rummy-layout";

export interface Draft {
  table: Meld[];
  loose: Tile[];
}

export function unusedHand(state: RummyState, draft: Draft): Tile[] {
  const used = new Set([
    ...draft.table.flatMap((meld) => meld.tiles.map((tile) => tile.id)),
    ...draft.loose.map((tile) => tile.id),
  ]);
  return state.hands[0].filter((tile) => !used.has(tile.id));
}

export function isNewMeld(state: RummyState, meld: Meld): boolean {
  const tableIds = new Set(state.table.flatMap((item) => item.tiles.map((tile) => tile.id)));
  return meld.tiles.every((tile) => !tableIds.has(tile.id));
}

export function pullTile(draft: Draft, meldIndex: number, tileId: number): Draft {
  const meld = draft.table[meldIndex];
  if (!meld) return draft;
  const index = meld.tiles.findIndex((tile) => tile.id === tileId);
  if (index < 0) return draft;
  const restTiles = meld.tiles.filter((tile) => tile.id !== tileId);
  const rest: Meld = { tiles: restTiles, ...(meld.shape ? { shape: meld.shape } : {}) };
  if (restTiles.length >= 3 && validateMeld(rest).ok) {
    return {
      table: draft.table.map((current, currentIndex) => (currentIndex === meldIndex ? rest : current)),
      loose: draft.loose.concat(meld.tiles[index]),
    };
  }
  return {
    table: draft.table.filter((_, currentIndex) => currentIndex !== meldIndex),
    loose: draft.loose.concat(meld.tiles),
  };
}

export function extendMeld(meld: Meld, tile: Tile, side: "start" | "end"): Meld | null {
  const tiles = side === "start" ? [tile, ...meld.tiles] : [...meld.tiles, tile];
  for (const shape of [meld.shape, "group", "run"] as const) {
    if (!shape) continue;
    const candidate: Meld = { tiles, shape };
    if (validateMeld(candidate).ok) return candidate;
  }
  return null;
}

export const meldKey = (meld: Meld) => meld.tiles.map((tile) => tile.id).join("-");

/**
 * The draft after dropping one tile, or null when the drop breaks a rule.
 * Hand and lifted tiles go onto a line end or start a new line together with
 * the current selection; an opened player can drag a table tile back to the
 * lifted row or onto another line.
 */
export function dropDraft(state: RummyState, draft: Draft, from: TileSpot, target: DropTarget, selected: readonly number[]): { draft: Draft; laid: number[] } | null {
  let next = draft;
  if (from.zone === "table") {
    if (!state.opened[0] || from.meld === null) return null;
    if (target.type === "meld" && target.index === from.meld) return null;
    const targetKey = target.type === "meld" ? meldKey(draft.table[target.index]) : null;
    next = pullTile(draft, from.meld, from.id);
    if (target.type === "hand") return { draft: next, laid: [] };
    if (targetKey !== null) {
      const index = next.table.findIndex((meld) => meldKey(meld) === targetKey);
      if (index < 0) return null;
      target = { type: "meld", index, side: target.type === "meld" ? target.side : "end" };
    }
  } else if (target.type === "hand") {
    return null;
  }
  const pool = [...unusedHand(state, next), ...next.loose];
  const tile = pool.find((candidate) => candidate.id === from.id);
  if (!tile) return null;
  if (target.type === "meld") {
    const meld = next.table[target.index];
    if (!meld || (!state.opened[0] && !isNewMeld(state, meld))) return null;
    const extended = extendMeld(meld, tile, target.side);
    if (!extended) return null;
    return {
      draft: { table: next.table.map((current, index) => (index === target.index ? extended : current)), loose: next.loose.filter((item) => item.id !== tile.id) },
      laid: [tile.id],
    };
  }
  if (target.type !== "new") return null;
  const ids = new Set([...selected, tile.id]);
  const tiles = pool.filter((candidate) => ids.has(candidate.id));
  if (tiles.length < 3) return null;
  const meld = arrangeMeld(tiles, "group") ?? arrangeMeld(tiles, "run");
  if (!meld) return null;
  return { draft: { table: next.table.concat(meld), loose: next.loose.filter((item) => !ids.has(item.id)) }, laid: [...ids] };
}

