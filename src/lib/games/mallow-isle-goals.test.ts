import { describe, expect, it } from "vitest";
import { ISLAND_RADIUS, cozyScore, createDefaultMallowSave, placeDecoration, type MallowIsleSave } from "./mallow-isle";
import { ISLE_GOALS, ISLE_GOAL_COUNT, isleGoalMet, isleGoalText } from "./mallow-isle-goals";

describe("mallow isle goals", () => {
  it("ships 20 goals whose repeated metrics only go up", () => {
    expect(ISLE_GOAL_COUNT).toBe(20);
    const last = new Map<string, number>();
    for (const goal of ISLE_GOALS) {
      expect(goal.target).toBeGreaterThan(last.get(goal.metric) ?? 0);
      last.set(goal.metric, goal.target);
    }
  });

  it("leaves goal 1 open on a fresh island", () => {
    expect(isleGoalMet(createDefaultMallowSave(), 0)).toBe(false);
  });

  it("can reach every goal on the island with a plain placement sweep", () => {
    let save: MallowIsleSave = createDefaultMallowSave();
    const plan = ["tree", "flowers", "flowers", "bench", "tree", "flowers"] as const;
    let k = 0;
    for (let z = -ISLAND_RADIUS; z <= ISLAND_RADIUS; z += 1.25) {
      for (let x = -ISLAND_RADIUS; x <= ISLAND_RADIUS; x += 1.25) {
        const type = plan[k % plan.length];
        const next = placeDecoration(save.decorations, type, x, z, `d${k}`);
        if (next !== save.decorations) k += 1;
        save = { ...save, decorations: next };
      }
    }
    save = { ...save, sculpted: 60 };
    save = { ...save, cozy: cozyScore(save) };
    const unmet = ISLE_GOALS.map((_, index) => index).filter((index) => !isleGoalMet(save, index));
    expect(unmet).toEqual([]);
  });

  it("has labels in every locale", () => {
    for (const locale of ["ko", "en", "ja", "zh", "fr", "es"]) expect(isleGoalText(locale).metric("trees").length).toBeGreaterThan(0);
  });
});
