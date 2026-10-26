/**
 * High-performance 2D Spatial Hash Grid for high-density mob/projectile collision queries.
 * Converts O(N^2) pairwise distance checks into O(1) bucket lookups.
 */

export interface SpatialEntity {
  id: string | number;
  x: number;
  y: number;
}

export class SpatialHashGrid<T extends SpatialEntity> {
  private cellSize: number;
  private invCellSize: number;
  private cells: Map<string, T[]> = new Map();
  private entityCellMap: Map<string | number, string> = new Map();

  constructor(cellSize: number = 64) {
    this.cellSize = Math.max(1, cellSize);
    this.invCellSize = 1 / this.cellSize;
  }

  private getKey(cellX: number, cellY: number): string {
    return `${cellX}:${cellY}`;
  }

  private getCellCoords(x: number, y: number): [number, number] {
    return [Math.floor(x * this.invCellSize), Math.floor(y * this.invCellSize)];
  }

  public clear(): void {
    this.cells.clear();
    this.entityCellMap.clear();
  }

  public insert(entity: T): void {
    const [cx, cy] = this.getCellCoords(entity.x, entity.y);
    const key = this.getKey(cx, cy);

    let list = this.cells.get(key);
    if (!list) {
      list = [];
      this.cells.set(key, list);
    }
    list.push(entity);
    this.entityCellMap.set(entity.id, key);
  }

  public remove(id: string | number): boolean {
    const key = this.entityCellMap.get(id);
    if (!key) return false;

    this.entityCellMap.delete(id);
    const list = this.cells.get(key);
    if (!list) return false;

    const idx = list.findIndex((e) => e.id === id);
    if (idx !== -1) {
      list.splice(idx, 1);
      if (list.length === 0) {
        this.cells.delete(key);
      }
      return true;
    }
    return false;
  }

  public queryRadius(x: number, y: number, radius: number): T[] {
    const rSq = radius * radius;
    const minCx = Math.floor((x - radius) * this.invCellSize);
    const maxCx = Math.floor((x + radius) * this.invCellSize);
    const minCy = Math.floor((y - radius) * this.invCellSize);
    const maxCy = Math.floor((y + radius) * this.invCellSize);

    const result: T[] = [];

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const key = this.getKey(cx, cy);
        const list = this.cells.get(key);
        if (!list) continue;

        for (let i = 0; i < list.length; i++) {
          const e = list[i];
          const dx = e.x - x;
          const dy = e.y - y;
          if (dx * dx + dy * dy <= rSq) {
            result.push(e);
          }
        }
      }
    }

    return result;
  }

  public queryBox(minX: number, minY: number, maxX: number, maxY: number): T[] {
    const minCx = Math.floor(minX * this.invCellSize);
    const maxCx = Math.floor(maxX * this.invCellSize);
    const minCy = Math.floor(minY * this.invCellSize);
    const maxCy = Math.floor(maxY * this.invCellSize);

    const result: T[] = [];

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const key = this.getKey(cx, cy);
        const list = this.cells.get(key);
        if (!list) continue;

        for (let i = 0; i < list.length; i++) {
          const e = list[i];
          if (e.x >= minX && e.x <= maxX && e.y >= minY && e.y <= maxY) {
            result.push(e);
          }
        }
      }
    }

    return result;
  }

  public getCellCount(): number {
    return this.cells.size;
  }

  public getTotalEntities(): number {
    return this.entityCellMap.size;
  }
}
