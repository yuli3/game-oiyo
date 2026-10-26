import { describe, it, expect, beforeEach } from 'vitest';
import { SpatialHashGrid, type SpatialEntity } from './spatial-partition';

interface TestMob extends SpatialEntity {
  name: string;
}

describe('SpatialHashGrid', () => {
  let grid: SpatialHashGrid<TestMob>;

  beforeEach(() => {
    grid = new SpatialHashGrid<TestMob>(50);
  });

  it('inserts and tracks total entities', () => {
    grid.insert({ id: 'm1', x: 10, y: 20, name: 'Bat' });
    grid.insert({ id: 'm2', x: 120, y: 150, name: 'Skeleton' });

    expect(grid.getTotalEntities()).toBe(2);
    expect(grid.getCellCount()).toBe(2);
  });

  it('queries entities within radius accurately', () => {
    grid.insert({ id: 'm1', x: 0, y: 0, name: 'Center' });
    grid.insert({ id: 'm2', x: 30, y: 0, name: 'Near' });
    grid.insert({ id: 'm3', x: 100, y: 0, name: 'Far' });

    const results = grid.queryRadius(0, 0, 40);
    expect(results.length).toBe(2);
    const ids = results.map((r) => r.id);
    expect(ids).toContain('m1');
    expect(ids).toContain('m2');
    expect(ids).not.toContain('m3');
  });

  it('queries entities in bounding box', () => {
    grid.insert({ id: 'a', x: 10, y: 10, name: 'Inside' });
    grid.insert({ id: 'b', x: 50, y: 50, name: 'Inside Edge' });
    grid.insert({ id: 'c', x: 60, y: 10, name: 'Outside' });

    const results = grid.queryBox(0, 0, 50, 50);
    expect(results.length).toBe(2);
    expect(results.map((r) => r.id)).toEqual(expect.arrayContaining(['a', 'b']));
  });

  it('removes entity and cleans up empty cell', () => {
    grid.insert({ id: 'x', x: 25, y: 25, name: 'Ghost' });
    expect(grid.getTotalEntities()).toBe(1);

    const removed = grid.remove('x');
    expect(removed).toBe(true);
    expect(grid.getTotalEntities()).toBe(0);
    expect(grid.getCellCount()).toBe(0);
  });

  it('handles clearing all cells and entities', () => {
    for (let i = 0; i < 100; i++) {
      grid.insert({ id: i, x: i * 10, y: i * 10, name: `Mob ${i}` });
    }
    expect(grid.getTotalEntities()).toBe(100);

    grid.clear();
    expect(grid.getTotalEntities()).toBe(0);
    expect(grid.getCellCount()).toBe(0);
    expect(grid.queryRadius(50, 50, 100)).toHaveLength(0);
  });
});
