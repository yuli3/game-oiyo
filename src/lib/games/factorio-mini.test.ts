import { describe, it, expect } from "vitest";
import {
  createFactorioState,
  placeBuilding,
  rotateSelectedTool,
  stepFactorio,
  applyStageBlueprint,
} from "./factorio-mini";

describe("Factorio Automation Mini Engine", () => {
  it("initializes grid with starter buildings and research lab", () => {
    const state = createFactorioState(0);
    expect(state.gridW).toBe(10);
    expect(state.gridH).toBe(8);
    expect(state.cells[3][8].building).toBe("lab");
    expect(state.cells[2][1].building).toBe("miner");
    expect(state.cells[2][3].building).toBe("smelter");
  });

  it("extracts ore from miner, smelts into plates, and delivers to lab", () => {
    const state = createFactorioState(0);
    // Run simulation for 10 seconds using starter line (Miner -> Belt -> Smelter -> Belts -> Lab)
    let totalDelivered = 0;
    for (let i = 0; i < 100; i++) {
      const res = stepFactorio(state, 0.1);
      totalDelivered += res.deliveredItems.length;
    }
    expect(totalDelivered).toBeGreaterThan(0);
    expect(state.rp).toBeGreaterThan(0);
    expect(state.deliveredCounts.iron_plate).toBeGreaterThan(0);
  });

  it("synthesizes science packs when both iron and copper plates feed into an assembler", () => {
    const state = createFactorioState(2); // Stage 3 has both Iron and Copper feeding into Assembler at (3,3) -> Belt(4,3) -> Lab(5,3)
    for (let i = 0; i < 120; i++) {
      stepFactorio(state, 0.1);
    }
    expect(state.deliveredCounts.science_pack).toBeGreaterThan(0);
    expect(state.rp).toBeGreaterThanOrEqual(65);
  });

  it("supports placing, rotating, and clearing buildings without overwriting the lab", () => {
    const state = createFactorioState(0);
    // Lab at (8, 3) cannot be overwritten
    expect(placeBuilding(state, 8, 3, "belt", 1)).toBe(false);
    expect(state.cells[3][8].building).toBe("lab");

    // Place belt at empty tile (4, 4)
    expect(placeBuilding(state, 4, 4, "belt", 2)).toBe(true);
    expect(state.cells[4][4].building).toBe("belt");
    expect(state.cells[4][4].dir).toBe(2);

    // Rotate tool
    expect(rotateSelectedTool(state)).toBe(2);
  });

  it("applies blueprint expansion and reaches stage clear quota", () => {
    const state = createFactorioState(0);
    applyStageBlueprint(state);
    state.simSpeed = 2;
    for (let i = 0; i < 200; i++) {
      stepFactorio(state, 0.2);
      if (state.isCleared) break;
    }
    expect(state.isCleared).toBe(true);
    expect(state.rp).toBeGreaterThanOrEqual(state.targetRp);
  });
});
