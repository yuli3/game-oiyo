import { describe, expect, it } from "vitest";
import {
  auditVillageEconomyBalance,
  buyBoosterPack,
  createInitialStacklandsState,
  getFullStack,
  sellCardForCoins,
  stackCardOn,
  stepVillageSeconds,
} from "./stacklands-village";

describe("stacklands-village engine", () => {
  it("initializes state with fundamental village cards", () => {
    const state = createInitialStacklandsState(42);
    expect(state.cards.length).toBeGreaterThanOrEqual(5);
    expect(state.cards.some((c) => c.type === "villager")).toBe(true);
    expect(state.moon).toBe(1);
    expect(state.status).toBe("playing");
  });

  it("handles card stacking and recipe crafting progression", () => {
    let state = createInitialStacklandsState(42);
    // Stack Villager onto Berry Bush
    state = stackCardOn(state, "v-1", "b-1");
    const stack = getFullStack(state.cards, "b-1");
    expect(stack.length).toBe(2);

    // Step time forward to finish berry foraging
    state = stepVillageSeconds(state, 3.0);
    expect(state.cards.some((c) => c.type === "berry")).toBe(true);
    expect(state.score).toBeGreaterThan(0);
  });

  it("buys booster packs and sells surplus resources for coins", () => {
    let state = createInitialStacklandsState(42);
    state = buyBoosterPack(state);
    expect(state.coins).toBe(5);
    expect(state.cards.length).toBe(7);

    // Sell a berry
    const berry = state.cards.find((c) => c.type === "berry");
    if (berry) {
      state = sellCardForCoins(state, berry.id);
      expect(state.coins).toBe(6);
    }
  });

  it("runs Monte Carlo balance audit to verify foraging sustainability", () => {
    const balance = auditVillageEconomyBalance();
    expect(balance.winRate).toBeGreaterThan(0.9);
  });
});
