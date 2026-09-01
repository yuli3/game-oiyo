import type { Game2048Direction } from "./game-2048";

/** Renderer-only tile identity. Engine board stays a value grid. */
export interface Visual2048Tile {
  id: number;
  value: number;
  index: number;
  merged: boolean;
  spawned: boolean;
}

function lineIndices(line: number, dir: Game2048Direction): number[] {
  return Array.from({ length: 4 }, (_, j) =>
    dir === "left" ? line * 4 + j
    : dir === "right" ? line * 4 + 3 - j
    : dir === "up" ? j * 4 + line
    : (3 - j) * 4 + line,
  );
}

export function tilesFromBoard(board: readonly (number | null)[], startId = 1): { tiles: Visual2048Tile[]; nextId: number } {
  const tiles: Visual2048Tile[] = [];
  let nextId = startId;
  board.forEach((value, index) => {
    if (value === null) return;
    tiles.push({ id: nextId, value, index, merged: false, spawned: false });
    nextId += 1;
  });
  return { tiles, nextId };
}

export function tilesMatchBoard(tiles: readonly Visual2048Tile[], board: readonly (number | null)[]): boolean {
  const values = Array.from({ length: 16 }, () => null as number | null);
  for (const tile of tiles) {
    if (tile.index < 0 || tile.index > 15 || values[tile.index] !== null) return false;
    values[tile.index] = tile.value;
  }
  return values.every((value, index) => value === board[index]);
}

export function advance2048Tiles(
  prev: readonly Visual2048Tile[],
  nextBoard: readonly (number | null)[],
  direction: Game2048Direction,
  nextId: number,
): { tiles: Visual2048Tile[]; nextId: number } {
  const byIndex = new Map(prev.map((tile) => [tile.index, tile]));
  const slid: Visual2048Tile[] = [];
  for (let line = 0; line < 4; line += 1) {
    const ids = lineIndices(line, direction);
    const incoming = ids.map((index) => byIndex.get(index)).filter((tile): tile is Visual2048Tile => Boolean(tile));
    const merged: Visual2048Tile[] = [];
    for (let j = 0; j < incoming.length; j += 1) {
      const current = incoming[j];
      const neighbor = incoming[j + 1];
      if (neighbor && current.value === neighbor.value) {
        merged.push({ id: current.id, value: current.value * 2, index: 0, merged: true, spawned: false });
        j += 1;
      } else {
        merged.push({ id: current.id, value: current.value, index: 0, merged: false, spawned: false });
      }
    }
    merged.forEach((tile, slot) => {
      slid.push({ ...tile, index: ids[slot] });
    });
  }
  const occupied = new Set(slid.map((tile) => tile.index));
  let id = nextId;
  for (let index = 0; index < 16; index += 1) {
    const value = nextBoard[index];
    if (value === null || occupied.has(index)) continue;
    slid.push({ id, value, index, merged: false, spawned: true });
    id += 1;
  }
  if (!tilesMatchBoard(slid, nextBoard)) return tilesFromBoard(nextBoard, nextId);
  return { tiles: slid, nextId: id };
}
