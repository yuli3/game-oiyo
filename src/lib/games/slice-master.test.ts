import { describe, expect, it } from "vitest";
import {
  createSliceMasterLevel,
  getKnifeBladeTip,
  stepSliceMaster,
  tapFlipKnife,
} from "./slice-master";

describe("Slice Master 3D Core Mechanics", () => {
  it("initializes a valid level layout with knife, sliceable objects, and finish target", () => {
    const game = createSliceMasterLevel(1);
    expect(game.knife.x).toBe(100);
    expect(game.status).toBe("stuck");
    expect(game.obstacles.length).toBeGreaterThan(10);

    const finish = game.obstacles.find((o) => o.type === "finish_target");
    expect(finish).toBeDefined();
    expect(finish?.points).toBe(1000);
  });

  it("applies jump and angular flip on tap", () => {
    const game = createSliceMasterLevel(1);
    const flipped = tapFlipKnife(game);

    expect(flipped.status).toBe("flying");
    expect(flipped.knife.vy).toBeLessThan(0);
    expect(flipped.knife.angularVelocity).toBeGreaterThan(0);
  });

  it("calculates knife tip coordinates accurately from position and angle", () => {
    const tip = getKnifeBladeTip({
      x: 100,
      y: 200,
      vx: 0,
      vy: 0,
      angle: 0,
      angularVelocity: 0,
      length: 50,
    });
    expect(tip.x).toBe(150);
    expect(tip.y).toBe(200);
  });

  it("slices obstacle, increments score and combo, and triggers hit-stop", () => {
    const game = createSliceMasterLevel(1);
    const flipped = tapFlipKnife(game);

    // Place knife tip right on top of the first fruit
    const firstFruit = flipped.obstacles.find((o) => o.type === "fruit")!;
    flipped.knife.x = firstFruit.x - 20;
    flipped.knife.y = firstFruit.y;
    flipped.knife.angle = 0; // tip at x + length = firstFruit.x - 20 + 54 = firstFruit.x + 34 (inside fruit)

    const stepRes = stepSliceMaster(flipped, 0.016);
    expect(stepRes.slicedObstacles.length).toBe(1);
    expect(stepRes.state.score).toBeGreaterThan(0);
    expect(stepRes.state.combo).toBe(1);
    expect(stepRes.state.hitStopRemaining).toBeGreaterThan(0);
    expect(stepRes.state.obstacles.find((o) => o.id === firstFruit.id)?.sliced).toBe(true);
  });

  it("causes game over when hitting metal hazard", () => {
    const game = createSliceMasterLevel(1);
    const flipped = tapFlipKnife(game);

    const hazard = flipped.obstacles.find((o) => o.type === "metal_hazard");
    if (!hazard) return;

    flipped.knife.x = hazard.x - 25;
    flipped.knife.y = hazard.y + 10;
    flipped.knife.angle = 0;

    const stepRes = stepSliceMaster(flipped, 0.016);
    expect(stepRes.hitHazard).toBe(true);
    expect(stepRes.state.status).toBe("gameover");
  });

  it("completes level upon hitting the finish target", () => {
    const game = createSliceMasterLevel(1);
    const flipped = tapFlipKnife(game);

    const target = flipped.obstacles.find((o) => o.type === "finish_target")!;
    flipped.knife.x = target.x - 10;
    flipped.knife.y = target.y + 10;
    flipped.knife.angle = 0;

    const stepRes = stepSliceMaster(flipped, 0.016);
    expect(stepRes.hitTarget).toBe(true);
    expect(stepRes.state.status).toBe("completed");
  });
});
