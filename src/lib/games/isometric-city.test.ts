import { describe, expect, it } from "vitest";
import {
  BUILD_COST,
  GRID_SIZE,
  citySummary,
  connectedRoadCount,
  createMobilityRoutes,
  createStarterCity,
  findRoadPath,
  formatClock,
  getCell,
  jumpToTime,
  parseCitySave,
  placeCell,
  serializeCity,
  simulateCity,
  upgradeCell,
} from "./isometric-city";

describe("isometric city grid and placement", () => {
  it("creates a connected starter city with working utilities", () => {
    const city = createStarterCity();
    const summary = citySummary(city);
    expect(city.cells).toHaveLength(GRID_SIZE * GRID_SIZE);
    expect(summary.roadCells).toBeGreaterThan(80);
    expect(summary.connectedRoadCells).toBe(summary.roadCells);
    expect(summary.populationCapacity).toBeGreaterThan(city.population);
    expect(summary.powerCapacity).toBeGreaterThan(summary.powerDemand);
    expect(summary.jobs).toBeGreaterThan(0);
  });

  it("requires building frontage and charges only valid placement", () => {
    const city = createStarterCity();
    const isolated = placeCell(city, "residential", 0, 0);
    expect(isolated.ok).toBe(false);
    expect(isolated.reason).toBe("needs-road");
    expect(isolated.state).toBe(city);

    const placed = placeCell(city, "residential", 2, 1);
    expect(placed.ok).toBe(true);
    expect(placed.state.funds).toBe(city.funds - BUILD_COST.residential);
    expect(getCell(placed.state, 2, 1)?.kind).toBe("residential");

    const occupied = placeCell(placed.state, "park", 2, 1);
    expect(occupied.ok).toBe(false);
    expect(occupied.state).toBe(placed.state);
  });

  it("supports upgrades, max level and recoverable bulldozing", () => {
    const city = createStarterCity();
    const first = upgradeCell(city, 4, 2);
    const second = upgradeCell(first.state, 4, 2);
    const blocked = upgradeCell(second.state, 4, 2);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(getCell(second.state, 4, 2)?.level).toBe(3);
    expect(blocked.reason).toBe("max-level");

    const bulldozed = placeCell(second.state, "bulldoze", 4, 2);
    expect(bulldozed.ok).toBe(true);
    expect(bulldozed.cost).toBeLessThan(0);
    expect(getCell(bulldozed.state, 4, 2)?.kind).toBe("grass");
  });
});

describe("isometric city mobility", () => {
  it("finds deterministic cardinal road paths", () => {
    const city = createStarterCity();
    const path = findRoadPath(city, { x: 0, z: 3 }, { x: 17, z: 13 });
    expect(path[0]).toEqual({ x: 0, z: 3 });
    expect(path.at(-1)).toEqual({ x: 17, z: 13 });
    expect(path.length).toBeGreaterThan(20);
    for (let i = 1; i < path.length; i += 1) {
      const distance = Math.abs(path[i].x - path[i - 1].x) + Math.abs(path[i].z - path[i - 1].z);
      expect(distance).toBe(1);
      expect(getCell(city, path[i].x, path[i].z)?.kind).toBe("road");
    }
  });

  it("rebuilds dense routes from the live connected network", () => {
    const city = createStarterCity();
    const routes = createMobilityRoutes(city, 80, 2026);
    expect(routes).toHaveLength(80);
    expect(routes.every((route) => route.length >= 8)).toBe(true);

    const cut = placeCell(city, "bulldoze", 8, 8).state;
    expect(connectedRoadCount(cut)).toBeLessThanOrEqual(citySummary(city).roadCells - 1);
    expect(createMobilityRoutes(cut, 20, 2026).length).toBeGreaterThan(0);
  });
});

describe("isometric city simulation and persistence", () => {
  it("advances the clock, population and treasury from live city capacity", () => {
    const city = createStarterCity();
    const next = simulateCity(city, 12);
    expect(next.minuteOfDay).toBeGreaterThan(city.minuteOfDay);
    expect(next.population).not.toBe(city.population);
    expect(next.funds).toBeGreaterThan(city.funds);
    expect(formatClock(jumpToTime(city, 22 * 60 + 5)).text).toBe("22:05");
  });

  it("round-trips valid local saves and rejects untrusted shapes", () => {
    const city = createStarterCity();
    expect(parseCitySave(serializeCity(city))).toEqual(city);
    expect(parseCitySave("{")).toBeNull();
    expect(parseCitySave(JSON.stringify({ ...city, version: 99 }))).toBeNull();
    expect(parseCitySave(JSON.stringify({ ...city, funds: Number.NaN }))).toBeNull();
    expect(parseCitySave(JSON.stringify({ ...city, cells: city.cells.slice(1) }))).toBeNull();
    const poisoned = { ...city, cells: city.cells.map((cell, i) => i === 0 ? { ...cell, kind: "casino" } : cell) };
    expect(parseCitySave(JSON.stringify(poisoned))).toBeNull();
  });
});
