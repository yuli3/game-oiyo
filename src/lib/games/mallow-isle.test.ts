import { describe, expect, it } from "vitest";
import {
  ISLAND_RADIUS,
  MALLOW_ISLE_SAVE_KEY,
  TERRAIN_SIZE,
  cozyScore,
  createDefaultMallowSave,
  createIslandTerrain,
  eraseDecoration,
  explainPlaceDecoration,
  movePlayer,
  parseMallowSave,
  placeDecoration,
  sampleTerrainHeight,
  sculptTerrain,
} from "./mallow-isle";

describe("Mallow Isle terrain", () => {
  it("creates a deterministic island with a raised center and submerged edge", () => {
    const first = createIslandTerrain();
    const second = createIslandTerrain();
    expect(first).toEqual(second);
    expect(first).toHaveLength(TERRAIN_SIZE * TERRAIN_SIZE);
    expect(sampleTerrainHeight(first, 0, 0)).toBeGreaterThan(1);
    expect(sampleTerrainHeight(first, ISLAND_RADIUS + 1, 0)).toBeLessThan(0);
  });

  it("raises and lowers nearby terrain while preserving the shoreline", () => {
    const terrain = createIslandTerrain();
    const before = sampleTerrainHeight(terrain, 0, 0);
    const raised = sculptTerrain(terrain, 0, 0, "raise");
    const lowered = sculptTerrain(raised, 0, 0, "lower");
    expect(sampleTerrainHeight(raised, 0, 0)).toBeGreaterThan(before);
    expect(sampleTerrainHeight(lowered, 0, 0)).toBeLessThan(sampleTerrainHeight(raised, 0, 0));
    expect(sculptTerrain(terrain, ISLAND_RADIUS, 0, "raise")).toBe(terrain);
  });
});

describe("Mallow Isle decorating and movement", () => {
  it("explains full, shoreline and crowded placement without changing decorations", () => {
    const crowded = [{ id: "tree-1", type: "tree" as const, x: 1, z: 1, rotation: 0, variant: 0 }];
    expect(explainPlaceDecoration([], "tree", ISLAND_RADIUS, 0)).toBe("shore");
    expect(explainPlaceDecoration(crowded, "flowers", 1.2, 1.1)).toBe("crowded");
    const packed = Array.from({ length: 72 }, (_, index) => ({ id: `d-${index}`, type: "flowers" as const, x: 0, z: 0, rotation: 0, variant: 0 }));
    expect(explainPlaceDecoration(packed, "tree", 0, 0)).toBe("full");
    expect(explainPlaceDecoration([], "tree", 1, 1)).toBeNull();
  });

  it("places with spacing, erases the nearest item and caps comfort", () => {
    const placed = placeDecoration([], "tree", 1, 1, "tree-1");
    expect(placed).toHaveLength(1);
    expect(placeDecoration(placed, "flowers", 1.2, 1.1, "flowers-1")).toBe(placed);
    expect(eraseDecoration(placed, 1, 1)).toEqual([]);
    expect(cozyScore({ decorations: Array.from({ length: 20 }, (_, index) => ({
      id: `bench-${index}`,
      type: "bench" as const,
      x: 0,
      z: 0,
      rotation: 0,
      variant: 0,
    })), sculpted: 100 })).toBe(100);
  });

  it("moves relative to camera and never leaves the island", () => {
    const moved = movePlayer({ x: 0, z: 0, heading: 0 }, 0, 1, 0, 1);
    expect(moved.z).toBeGreaterThan(0);
    let pose = { x: ISLAND_RADIUS - 1.2, z: 0, heading: 0 };
    for (let index = 0; index < 100; index += 1) pose = movePlayer(pose, 1, 0, 0, 0.1);
    expect(Math.hypot(pose.x, pose.z)).toBeLessThanOrEqual(ISLAND_RADIUS - 1.1 + 0.0001);
  });
});

describe("Mallow Isle save contract", () => {
  it("uses an independent versioned key and rejects malformed saves", () => {
    expect(MALLOW_ISLE_SAVE_KEY).toBe("oiyo:mallow-isle:v1");
    const fallback = parseMallowSave('{"version":1,"heights":[0]}');
    expect(fallback.heights).toHaveLength(TERRAIN_SIZE * TERRAIN_SIZE);
  });

  it("round-trips a valid local save and derives its comfort value", () => {
    const save = createDefaultMallowSave();
    const restored = parseMallowSave(JSON.stringify({ ...save, cozy: 999 }));
    expect(restored.heights).toEqual(save.heights);
    expect(restored.decorations).toEqual(save.decorations);
    expect(restored.cozy).toBe(cozyScore(restored));
  });
});
