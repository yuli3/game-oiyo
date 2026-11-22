import { describe, expect, it } from "vitest";
import { createStarterCity, placeCell, simulateCity, upgradeCell, type CityState } from "./isometric-city";
import { CITY_GOALS, CITY_GOAL_COUNT, cityGoalMet, cityGoalValue, cityGoalText } from "./isometric-city-goals";

describe("isometric city goals", () => {
  it("ships 30 goals whose repeated metrics only go up", () => {
    expect(CITY_GOAL_COUNT).toBe(30);
    const last = new Map<string, number>();
    for (const goal of CITY_GOALS) {
      expect(goal.target).toBeGreaterThan(last.get(goal.metric) ?? 0);
      last.set(goal.metric, goal.target);
    }
  });

  it("starts with goal 1 open on the starter city", () => {
    const city = createStarterCity();
    expect(cityGoalMet(city, 0)).toBe(false);
    expect(cityGoalValue(city, "powerPlants")).toBe(1);
    expect(cityGoalValue(city, "parkLevels")).toBe(3);
  });

  it("can reach the last goal on the 18x18 map with a plain build plan", () => {
    let city: CityState = { ...createStarterCity(), funds: 10_000_000 };
    const kinds = ["residential", "residential", "commercial"] as const;
    let k = 0;
    for (let z = 0; z < 18; z += 1) {
      for (let x = 0; x < 18; x += 1) {
        const kind = (x * 7 + z * 3) % 23 === 0 ? "power" : (x + z) % 9 === 0 ? "park" : (x + 2 * z) % 13 === 0 ? "civic" : kinds[k++ % 3];
        const placed = placeCell(city, kind, x, z);
        if (placed.ok) city = placed.state;
      }
    }
    for (let round = 0; round < 2; round += 1) {
      for (const cell of city.cells) {
        if (cell.kind === "grass" || cell.kind === "road") continue;
        const up = upgradeCell(city, cell.x, cell.z);
        if (up.ok) city = up.state;
      }
    }
    city = { ...city, speed: 4 };
    for (let i = 0; i < 2_000; i += 1) city = simulateCity(city, 1);
    const unmet = CITY_GOALS.map((_, index) => index).filter((index) => !cityGoalMet(city, index));
    expect(unmet).toEqual([]);
  });

  it("has labels in every locale and falls back to English", () => {
    for (const locale of ["ko", "en", "ja", "zh", "fr", "es"]) {
      const text = cityGoalText(locale);
      expect(text.metric("population").length).toBeGreaterThan(0);
      expect(text.reached(3)).toContain("3");
    }
    expect(cityGoalText("xx").goal).toBe("City goal");
  });
});
