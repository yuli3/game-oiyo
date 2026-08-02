import { describe, expect, it } from "vitest";
import {
  DOT_RUNNER_HEIGHT,
  DOT_RUNNER_GROUND,
  DOT_RUNNER_PLAYER_SIZE,
  createDotRunner,
  jumpDotRunner,
  stepDotRunner,
} from "./dot-runner";

describe("dot runner engine", () => {
  it("replays the same seed and jump schedule byte-for-byte", () => {
    const replay = () => {
      let state = createDotRunner(0x12345678);
      for (let frame = 0; frame < 600 && state.status === "playing"; frame += 1) {
        if ([1, 64, 127, 190, 253, 316, 379, 442, 505].includes(frame)) state = jumpDotRunner(state);
        state = stepDotRunner(state);
      }
      return state;
    };
    expect(replay()).toEqual(replay());
  });

  it("gives one jump impulse, ignores air jumps, and lands", () => {
    const initial = createDotRunner(1);
    const jumped = jumpDotRunner(initial);
    expect(jumped.velocityY).toBe(-10);
    expect(jumpDotRunner(jumped)).toBe(jumped);
    let landed = jumped;
    for (let i = 0; i < 60; i += 1) landed = stepDotRunner(landed);
    expect(landed.playerY).toBe(DOT_RUNNER_HEIGHT - DOT_RUNNER_GROUND - DOT_RUNNER_PLAYER_SIZE);
    expect(landed.jumping).toBe(false);
  });

  it("awards survival score independent of four-frame batching", () => {
    let batched = createDotRunner(9);
    let stepped = createDotRunner(9);
    for (let i = 0; i < 5; i += 1) batched = stepDotRunner(batched, 4);
    for (let i = 0; i < 20; i += 1) stepped = stepDotRunner(stepped, 1);
    expect(batched).toEqual(stepped);
    expect(stepped.score).toBe(4);
  });

  it("collects an item once and adds ten points", () => {
    const state = { ...createDotRunner(2), items: [{ x: 55, y: 330, w: 15, h: 15, speed: 0 }] };
    const next = stepDotRunner(state);
    expect(next.items).toHaveLength(0);
    expect(next.coins).toBe(1);
    expect(next.score).toBe(10);
    expect(stepDotRunner(next).score).toBe(10);
  });

  it("ends on an obstacle collision and freezes terminal state", () => {
    const state = { ...createDotRunner(3), obstacles: [{ x: 55, y: 320, w: 20, h: 30, speed: 0 }] };
    const over = stepDotRunner(state);
    expect(over.status).toBe("over");
    expect(stepDotRunner(over)).toBe(over);
  });

  it("spawns every item within the reachable jump band", () => {
    let state = createDotRunner(0);
    const seen: number[] = [];
    for (let i = 0; i < 20_000 && seen.length < 12; i += 1) {
      state = stepDotRunner({ ...state, obstacles: [], status: "playing" });
      for (const item of state.items) if (!seen.includes(item.y)) seen.push(item.y);
    }
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((y) => y >= 240 && y <= 315)).toBe(true);
  });
});
