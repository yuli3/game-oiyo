import { describe, expect, it } from "vitest";
import {
  buildHexGrid,
  canPlaceStack,
  createInitialHexaSortGame,
  generateHandSlots,
  placeAndResolve,
  resolveStackMerges,
} from "./hexa-sort";

describe("hexa-sort core logic", () => {
  it("builds a 7-slot hexagonal grid with proper neighbor links", () => {
    const grid = buildHexGrid();
    expect(Object.keys(grid)).toHaveLength(7);
    // Center slot 'c' should have all 6 neighbors
    expect(grid["c"].neighbors).toHaveLength(6);
    // Ring slots should have 3 neighbors in a radius 1 hex cluster
    expect(grid["n1"].neighbors.length).toBeGreaterThanOrEqual(3);
  });

  it("generates 3 hand slots with valid tile stacks", () => {
    const hand = generateHandSlots(1, 100);
    expect(hand).toHaveLength(3);
    for (const item of hand) {
      expect(item.stack.length).toBeGreaterThanOrEqual(2);
      expect(item.stack.length).toBeLessThanOrEqual(4);
    }
  });

  it("validates valid and invalid stack placement", () => {
    const game = createInitialHexaSortGame(1, 42);
    expect(canPlaceStack(game, 0, "c")).toBe(true);

    // Invalid hand index
    expect(canPlaceStack(game, 5, "c")).toBe(false);

    // Invalid slot id
    expect(canPlaceStack(game, 0, "invalid-slot")).toBe(false);
  });

  it("transfers matching top tiles between adjacent stacks", () => {
    const game = createInitialHexaSortGame(1, 42);
    // Setup center with 2 blue tiles, neighbor with 3 blue tiles on top
    game.slots["c"].stack = ["red", "blue", "blue"];
    game.slots["n1"].stack = ["yellow", "blue", "blue", "blue"];

    const resolution = resolveStackMerges(game, "c");
    // Neighbor's top blue tiles should move into center
    expect(resolution.cascades.length).toBeGreaterThan(0);
    expect(resolution.nextState.slots["c"].stack).toEqual([
      "red",
      "blue",
      "blue",
      "blue",
      "blue",
      "blue",
    ]);
    expect(resolution.nextState.slots["n1"].stack).toEqual(["yellow"]);
  });

  it("clears 10 matching tiles from a single stack and awards points", () => {
    const game = createInitialHexaSortGame(1, 42);
    // 10 red tiles in center slot
    game.slots["c"].stack = Array(10).fill("red");

    const resolution = resolveStackMerges(game, "c");
    expect(resolution.clears).toHaveLength(1);
    expect(resolution.clears[0]).toEqual({
      slotId: "c",
      color: "red",
      count: 10,
    });
    expect(resolution.nextState.slots["c"].stack).toEqual([]);
    expect(resolution.nextState.completedClears).toBe(1);
    expect(resolution.nextState.score).toBeGreaterThan(0);
  });

  it("executes full placeAndResolve cycle and replenishes hand when empty", () => {
    const game = createInitialHexaSortGame(1, 42);
    const handCount = game.hand.filter(Boolean).length;
    expect(handCount).toBe(3);

    const res1 = placeAndResolve(game, 0, "c");
    expect(res1).not.toBeNull();
    expect(res1?.nextState.slots["c"].stack.length).toBeGreaterThan(0);
    expect(res1?.nextState.hand[0]).toBeNull();
  });
});
