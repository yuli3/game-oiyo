import { describe, it, expect } from "vitest";
import {
  createInitialVoxelMazeState,
  movePlayer,
  updateVoxelMaze,
} from "./voxel-maze";

describe("VoxelMaze Engine", () => {
  it("initializes maze with grid, player, keys, and sentinels", () => {
    const state = createInitialVoxelMazeState();
    expect(state.gridSize).toBe(15);
    expect(state.player.gx).toBe(1);
    expect(state.player.gz).toBe(1);
    expect(state.keysCollected).toBe(0);
    expect(state.keysRequired).toBe(2);
    expect(state.isGateOpen).toBe(false);
    expect(state.gameOver).toBe(false);
    expect(state.sentinels.length).toBe(2);
  });

  it("moves player into open corridor and updates coordinates", () => {
    const state = createInitialVoxelMazeState();
    const next = movePlayer(state, "down"); // from (1,1) to (1,2)
    expect(next.player.gx).toBe(1);
    expect(next.player.gz).toBe(2);
  });

  it("blocks player movement when walking into a wall", () => {
    const state = createInitialVoxelMazeState();
    const next = movePlayer(state, "left"); // from (1,1) into border wall (0,1)
    expect(next.player.gx).toBe(1);
    expect(next.player.gz).toBe(1);
  });

  it("collects key and opens gate when all required keys are obtained", () => {
    const state = createInitialVoxelMazeState();
    // Move player onto key at (1, 13)
    state.player.gx = 1;
    state.player.gz = 12;

    const next1 = movePlayer(state, "down"); // into (1, 13)
    expect(next1.keysCollected).toBe(1);
    expect(next1.isGateOpen).toBe(false);

    // Pick up second key at (13, 1)
    next1.player.gx = 12;
    next1.player.gz = 1;
    const next2 = movePlayer(next1, "right"); // into (13, 1)
    expect(next2.keysCollected).toBe(2);
    expect(next2.isGateOpen).toBe(true);
  });

  it("triggers level clear when reaching the exit portal", () => {
    const state = createInitialVoxelMazeState();
    state.isGateOpen = true;
    state.player.gx = 13;
    state.player.gz = 12;

    const next = movePlayer(state, "down"); // onto (13, 13) exit portal
    expect(next.levelCleared).toBe(true);
    expect(next.score).toBeGreaterThan(1000);
  });

  it("triggers timeout game over when timer expires", () => {
    const state = createInitialVoxelMazeState();
    state.timeLeft = 0.01;

    const next = updateVoxelMaze(state, 0.05);
    expect(next.gameOver).toBe(true);
    expect(next.gameOverReason).toBe("timeout");
  });
});
