import { describe, expect, it } from "vitest";
import {
  createSliceMasterLevel,
  getKnifeBladeTip,
  stepSliceMaster,
  tapFlipKnife,
} from "./slice-master";
import { buildSliceMetaModifiers, getInitialSliceMetaState, purchaseSliceMetaUpgrade } from "./slice-master-meta";
import { INITIAL_SLICE_QUESTS } from "./slice-master-quests";
import { SLICE_COMMS_LOGS, SLICE_SPEAKERS } from "./slice-master-lore";

describe("Slice Master 3D Core Mechanics & Deepened Systems", () => {
  it("initializes a valid level layout with knife, sliceable objects, and finish target", () => {
    const game = createSliceMasterLevel(1);
    expect(game.knife.x).toBe(100);
    expect(game.status).toBe("stuck");
    expect(game.obstacles.length).toBeGreaterThan(10);
    expect(game.activeCommsLogId).toBe("start");

    const finish = game.obstacles.find((o) => o.type === "finish_target");
    expect(finish).toBeDefined();
    expect(finish?.points).toBe(1000);
  });

  it("spawns mutated targets including golden piñata deterministically", () => {
    const game = createSliceMasterLevel(1);
    const golden = game.obstacles.find((o) => o.mutation === "golden");
    expect(golden).toBeDefined();
    expect(golden?.label).toContain("황금 피냐타");
    expect(golden?.points).toBe(500);

    const diamond = game.obstacles.find((o) => o.mutation === "diamond");
    expect(diamond).toBeDefined();
    expect(diamond?.label).toContain("다이아몬드");
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

  it("slices obstacle, increments score and combo, triggers hit-stop and yields stones", () => {
    const game = createSliceMasterLevel(1);
    const flipped = tapFlipKnife(game);

    // Place knife tip right on top of the first fruit
    const firstFruit = flipped.obstacles.find((o) => o.type === "fruit")!;
    flipped.knife.x = firstFruit.x - 20;
    flipped.knife.y = firstFruit.y;
    flipped.knife.angle = 0;

    const stepRes = stepSliceMaster(flipped, 0.016);
    expect(stepRes.slicedObstacles.length).toBe(1);
    expect(stepRes.state.score).toBeGreaterThan(0);
    expect(stepRes.state.combo).toBe(1);
    expect(stepRes.state.hitStopRemaining).toBeGreaterThan(0);
    expect(stepRes.state.stonesEarned).toBeGreaterThanOrEqual(1);
    expect(stepRes.state.obstacles.find((o) => o.id === firstFruit.id)?.sliced).toBe(true);
  });

  it("detects precision center cut and updates comms log", () => {
    const game = createSliceMasterLevel(1);
    const flipped = tapFlipKnife(game);

    const fruit = flipped.obstacles.find((o) => o.type === "fruit")!;
    flipped.knife.x = fruit.x - 20;
    flipped.knife.vx = 0;
    flipped.knife.vy = -1100 * 0.016; // cancel gravity integration for exact test positioning
    flipped.knife.angularVelocity = 0;
    flipped.knife.y = fruit.y + fruit.height / 2; // Exact center
    flipped.knife.angle = 0;

    const stepRes = stepSliceMaster(flipped, 0.016);
    expect(stepRes.state.perfectCenterCount).toBe(1);
    expect(stepRes.state.activeCommsLogId).toBe("center_cut");
  });

  it("causes game over when hitting metal hazard and triggers failed comms", () => {
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
    expect(stepRes.state.activeCommsLogId).toBe("failed");
  });

  it("completes level upon hitting the finish target with bonus stones and finish comms", () => {
    const game = createSliceMasterLevel(1);
    const flipped = tapFlipKnife(game);

    const target = flipped.obstacles.find((o) => o.type === "finish_target")!;
    flipped.knife.x = target.x - 10;
    flipped.knife.y = target.y + 10;
    flipped.knife.angle = 0;

    const stepRes = stepSliceMaster(flipped, 0.016);
    expect(stepRes.hitTarget).toBe(true);
    expect(stepRes.state.status).toBe("completed");
    expect(stepRes.state.stonesEarned).toBeGreaterThanOrEqual(25);
    expect(stepRes.state.activeCommsLogId).toBe("finish");
  });

  it("verifies meta upgrades purchase and modifier calculation", () => {
    let meta = getInitialSliceMetaState();
    meta.sharpnessStones = 100;

    const purchaseRes = purchaseSliceMetaUpgrade(meta, "keen_edge");
    expect(purchaseRes.success).toBe(true);
    expect(purchaseRes.nextState.upgrades.keen_edge).toBe(1);
    expect(purchaseRes.nextState.sharpnessStones).toBe(70);

    const mods = buildSliceMetaModifiers(purchaseRes.nextState);
    expect(mods.sliceRadiusMultiplier).toBeGreaterThan(1);
  });

  it("verifies initial quests and lore speakers definitions", () => {
    expect(INITIAL_SLICE_QUESTS.length).toBe(4);
    expect(INITIAL_SLICE_QUESTS.some((q) => q.id === "perfect_center")).toBe(true);
    expect(SLICE_SPEAKERS.hanzo).toBeDefined();
    expect(SLICE_COMMS_LOGS.start).toBeDefined();
  });
});
