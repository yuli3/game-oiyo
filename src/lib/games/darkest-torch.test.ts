import { describe, expect, it } from "vitest";
import {
  createInitialDarkestTorchState,
  executeHeroSkill,
  getTorchLightTier,
  ignitePackTorch,
  swapHeroRanks,
} from "./darkest-torch";

describe("darkest-torch engine", () => {
  it("classifies torchlight tiers and relights pack torches to reduce party stress", () => {
    let state = createInitialDarkestTorchState(101);
    expect(getTorchLightTier(state.torch)).toBe("radiant");

    state = { ...state, torch: 40 };
    expect(getTorchLightTier(state.torch)).toBe("shadowy");

    state = ignitePackTorch(state);
    expect(state.torch).toBe(70);
    expect(state.torchesInPack).toBe(2);
  });

  it("swaps hero party ranks and executes tactical skills with enemy AI counterattacks", () => {
    let state = createInitialDarkestTorchState(202);
    state = swapHeroRanks(state, 1, 2);
    expect(state.heroes[0]?.id).toBe("highwayman");

    state = executeHeroSkill(state, "point-blank");
    expect(state.score).toBeGreaterThan(0);
    expect(state.zoomCurveScale).toBeGreaterThan(1.0);
  });

  it("clears all 3 dungeon rooms and defeats the Necromancer Lord boss", () => {
    let state = createInitialDarkestTorchState(303);

    for (let i = 0; i < 24 && state.status === "playing"; i += 1) {
      if (state.heroes.some((h) => h.hp < 24)) {
        state = executeHeroSkill(state, "divine-comfort");
      } else if (state.torch < 40 && state.torchesInPack > 0) {
        state = ignitePackTorch(state);
      } else {
        state = executeHeroSkill(state, i % 2 === 0 ? "smite" : "plague-grenade");
      }
    }

    expect(state.status).toBe("won");
    expect(state.enemies.length).toBe(0);
  });
});
