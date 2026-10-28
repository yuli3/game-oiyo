// Canvas layout for the number-tile table. Pure: the renderer draws these
// boxes and the pointer code hit-tests them, so both read one geometry.

import type { Meld, Tile } from "./tile-rummy";

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Zone = "table" | "loose" | "hand";

export interface TileSpot {
  id: number;
  zone: Zone;
  /** Index into the table, for table tiles. */
  meld: number | null;
  x: number;
  y: number;
}

export type DropTarget =
  | { type: "meld"; index: number; side: "start" | "end" }
  | { type: "new" }
  | { type: "hand" };

export interface LayoutInput {
  width: number;
  table: readonly Meld[];
  loose: readonly Tile[];
  hand: readonly Tile[];
  rivals: number;
  /** Play-canvas floor in CSS pixels. Extra space grows the table, not the hand. */
  minHeight?: number;
}

export interface TableLayout {
  width: number;
  height: number;
  tileW: number;
  tileH: number;
  header: Box;
  pile: Box;
  rivals: Box[];
  tableBox: Box;
  melds: Box[];
  newZone: Box;
  looseBox: Box | null;
  handBox: Box;
  spots: TileSpot[];
}

export const PAD = 10;
const MELD_PAD = 5;
const TILE_GAP = 4;
const MELD_GAP = 8;
const LABEL = 20;
const HEADER = 80;

export function tileSize(width: number): { w: number; h: number } {
  if (width < 360) return { w: 34, h: 46 };
  if (width < 440) return { w: 38, h: 52 };
  return { w: 44, h: 60 };
}

/** Tiles per row inside a box `inner` wide. */
function perRow(inner: number, tileW: number, gap: number): number {
  return Math.max(1, Math.floor((inner + gap) / (tileW + gap)));
}

export function layoutTable(input: LayoutInput): TableLayout {
  const width = Math.max(280, Math.floor(input.width));
  const { w: tileW, h: tileH } = tileSize(width);
  const inner = width - PAD * 2;
  const spots: TileSpot[] = [];

  const header: Box = { x: PAD, y: PAD, w: inner, h: HEADER - PAD };
  const pileW = Math.round(tileW * 1.4);
  const pile: Box = { x: width - PAD - pileW, y: PAD + 4, w: pileW, h: tileH };
  const rivals: Box[] = Array.from({ length: input.rivals }, (_, index) => ({ x: PAD + index * 64, y: PAD, w: 56, h: HEADER - PAD }));

  // Table: melds flow left to right and wrap; a long run wraps inside its box.
  const tableTop = HEADER + LABEL;
  const melds: Box[] = [];
  let x = PAD;
  let y = tableTop;
  let rowH = 0;
  const place = (w: number, h: number): Box => {
    if (x > PAD && x + w > PAD + inner) {
      x = PAD;
      y += rowH + MELD_GAP;
      rowH = 0;
    }
    const box = { x, y, w, h };
    x += w + MELD_GAP;
    rowH = Math.max(rowH, h);
    return box;
  };
  const maxInMeld = perRow(inner - MELD_PAD * 2, tileW, TILE_GAP);
  input.table.forEach((meld, meldIndex) => {
    const count = meld.tiles.length;
    const cols = Math.min(count, maxInMeld);
    const rows = Math.ceil(count / maxInMeld);
    const w = MELD_PAD * 2 + cols * tileW + (cols - 1) * TILE_GAP;
    const h = MELD_PAD * 2 + rows * tileH + (rows - 1) * TILE_GAP;
    const box = place(w, h);
    melds.push(box);
    meld.tiles.forEach((tile, index) => {
      spots.push({
        id: tile.id,
        zone: "table",
        meld: meldIndex,
        x: box.x + MELD_PAD + (index % maxInMeld) * (tileW + TILE_GAP),
        y: box.y + MELD_PAD + Math.floor(index / maxInMeld) * (tileH + TILE_GAP),
      });
    });
  });
  const zoneCols = Math.min(3, maxInMeld);
  const newZone = place(MELD_PAD * 2 + zoneCols * tileW + (zoneCols - 1) * TILE_GAP, MELD_PAD * 2 + tileH);
  const tableBottom = y + rowH;
  const tableBox: Box = { x: PAD, y: tableTop - 4, w: inner, h: tableBottom - tableTop + 8 };

  const flow = (tiles: readonly Tile[], zone: Zone, top: number): Box => {
    const cols = perRow(inner, tileW, TILE_GAP + 1);
    tiles.forEach((tile, index) => {
      spots.push({
        id: tile.id,
        zone,
        meld: null,
        x: PAD + (index % cols) * (tileW + TILE_GAP + 1),
        y: top + Math.floor(index / cols) * (tileH + TILE_GAP + 4),
      });
    });
    const rows = Math.max(1, Math.ceil(tiles.length / cols));
    return { x: PAD, y: top - LABEL, w: inner, h: LABEL + rows * tileH + (rows - 1) * (TILE_GAP + 4) };
  };

  let cursor = tableBottom + 16 + LABEL;
  let looseBox: Box | null = null;
  if (input.loose.length > 0) {
    looseBox = flow(input.loose, "loose", cursor);
    cursor = looseBox.y + looseBox.h + 16 + LABEL;
  }
  // The hand sits lower by its lift height, so a raised tile never clips.
  const handBox = flow(input.hand, "hand", cursor + 12);
  const contentHeight = handBox.y + handBox.h + PAD + 8;
  const extra = Math.max(0, Math.floor(input.minHeight ?? 0) - contentHeight);
  if (extra > 0) {
    tableBox.h += extra;
    if (looseBox) looseBox.y += extra;
    handBox.y += extra;
    for (const spot of spots) {
      if (spot.zone !== "table") spot.y += extra;
    }
  }
  const height = contentHeight + extra;

  return { width, height, tileW, tileH, header, pile, rivals, tableBox, melds, newZone, looseBox, handBox, spots };
}

function inside(box: Box, x: number, y: number, slack = 0): boolean {
  return x >= box.x - slack && x <= box.x + box.w + slack && y >= box.y - slack && y <= box.y + box.h + slack;
}

export function hitTile(layout: TableLayout, x: number, y: number): TileSpot | null {
  // Later spots draw on top, so search from the end.
  for (let index = layout.spots.length - 1; index >= 0; index--) {
    const spot = layout.spots[index];
    if (x >= spot.x && x <= spot.x + layout.tileW && y >= spot.y - 8 && y <= spot.y + layout.tileH) return spot;
  }
  return null;
}

export function hitDrop(layout: TableLayout, x: number, y: number): DropTarget | null {
  for (let index = 0; index < layout.melds.length; index++) {
    const box = layout.melds[index];
    if (inside(box, x, y, 6)) return { type: "meld", index, side: x < box.x + box.w / 2 ? "start" : "end" };
  }
  if (inside(layout.newZone, x, y, 6)) return { type: "new" };
  if (inside(layout.handBox, x, y, 6) || (layout.looseBox && inside(layout.looseBox, x, y, 6))) return { type: "hand" };
  return null;
}
