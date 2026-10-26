import { describe, expect, it } from "vitest";
import {
  computeSlotTemperatureC,
  constructFrostBuilding,
  createInitialFrostpunkRingState,
  enactFrostLaw,
  stepFrostpunkHour,
  toggleGeneratorOverdrive,
  upgradeSteamGenerator,
} from "./frostpunk-ring";

describe("frostpunk-ring engine", () => {
  it("computes concentric heat ring temperatures from generator level and overdrive", () => {
    const ring1Base = computeSlotTemperatureC(-30, 1, true, 1, false, "bunkhouse");
    const ring3Base = computeSlotTemperatureC(-30, 3, true, 1, false, "bunkhouse");
    const ring3Upgraded = computeSlotTemperatureC(-30, 3, true, 3, true, "bunkhouse");

    expect(ring1Base).toBeGreaterThan(ring3Base);
    expect(ring3Upgraded).toBeGreaterThan(ring3Base + 25);
  });

  it("constructs radial buildings, upgrades the generator, and enacts laws", () => {
    let state = createInitialFrostpunkRingState(42);
    state = constructFrostBuilding(state, "r1-s1", "coal-thumper");
    expect(state.slots.find((s) => s.id === "r1-s1")?.building).toBe("coal-thumper");

    state = upgradeSteamGenerator(state);
    expect(state.generatorLevel).toBe(2);

    state = enactFrostLaw(state, "overdrive-couplings");
    expect(state.laws["overdrive-couplings"].enacted).toBe(true);
  });

  it("survives the 6-day Great Whiteout when coal supply and generator levels are maintained", () => {
    let state = createInitialFrostpunkRingState(99);
    state = constructFrostBuilding(state, "r1-s1", "coal-thumper");
    state = constructFrostBuilding(state, "r1-s3", "coal-thumper");
    state = upgradeSteamGenerator(state);
    state = toggleGeneratorOverdrive(state);
    state = toggleGeneratorOverdrive(state); // keep stress safe

    for (let i = 0; i < 36 && state.status === "playing"; i += 1) {
      state = stepFrostpunkHour(state, 4);
    }

    expect(state.status).toBe("won");
    expect(state.lastEvent).toBe("whiteout-survived");
  });
});
