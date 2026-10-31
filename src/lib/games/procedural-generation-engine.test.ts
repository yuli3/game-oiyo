import { describe, it, expect } from "vitest";
import {
  DeterministicPRNG,
  WaveFunctionCollapse2D,
  BinarySpacePartitionDungeon,
  type WfcTileRule,
} from "./procedural-generation-engine";

describe("Procedural Generation Engine", () => {
  it("generates deterministic pseudo-random sequences given the same seed", () => {
    const prngA = new DeterministicPRNG(12345);
    const prngB = new DeterministicPRNG(12345);

    const seqA = [prngA.next(), prngA.nextInt(1, 100), prngA.nextRange(-10, 10)];
    const seqB = [prngB.next(), prngB.nextInt(1, 100), prngB.nextRange(-10, 10)];

    expect(seqA).toEqual(seqB);
  });

  it("collapses 2D WFC grid satisfying socket adjacency constraints", () => {
    // 3가지 타일: 풀밭(G), 바다(S), 해안선(C)
    const tiles: WfcTileRule[] = [
      { id: 0, name: "Sea", weight: 3, sockets: ["S", "S", "S", "S"] },
      { id: 1, name: "Coast", weight: 2, sockets: ["S", "G", "S", "S"] },
      { id: 2, name: "Grass", weight: 4, sockets: ["G", "G", "G", "G"] },
    ];

    const wfc = new WaveFunctionCollapse2D(4, 4, tiles, 999);
    const result = wfc.generate(10);

    expect(result.width).toBe(4);
    expect(result.height).toBe(4);
    expect(result.tiles.length).toBe(16);
    expect(result.success).toBe(true);
  });

  it("generates connected dungeon with rooms and corridors using BSP", () => {
    const bsp = new BinarySpacePartitionDungeon(30, 30, 6, 888);
    const dungeon = bsp.generate();

    expect(dungeon.width).toBe(30);
    expect(dungeon.height).toBe(30);
    expect(dungeon.rooms.length).toBeGreaterThanOrEqual(2);
    expect(dungeon.corridors.length).toBeGreaterThanOrEqual(1);

    // 방 바닥(1)과 복도(2)가 유효하게 뚫려 있는지 확인
    let floorCount = 0;
    let corridorCount = 0;
    for (let y = 0; y < dungeon.height; y++) {
      for (let x = 0; x < dungeon.width; x++) {
        if (dungeon.grid[y][x] === 1) floorCount++;
        if (dungeon.grid[y][x] === 2) corridorCount++;
      }
    }

    expect(floorCount).toBeGreaterThan(20);
    expect(corridorCount).toBeGreaterThan(5);
  });
});
