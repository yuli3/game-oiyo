import { describe, expect, it } from "vitest";
import {
  GOODS,
  PORTS,
  STARTING_GOLD,
  canDock,
  cargoUsed,
  createTradeState,
  formatVoyageTime,
  marketQuote,
  nearestPort,
  resolveIslandCollision,
  sailEfficiency,
  stepVessel,
  tradeCargo,
  visitPort,
  voyageScore,
  type VesselState,
} from "./windward-horizons";

const vessel: VesselState = {
  x: 0,
  z: 58,
  heading: Math.PI,
  speed: 0,
  sail: 0.7,
  rudder: 0,
  heel: 0,
};

describe("windward horizons sailing", () => {
  it("makes a broad reach faster than sailing into the wind source", () => {
    expect(sailEfficiency(0, 0)).toBeGreaterThan(sailEfficiency(Math.PI, 0) * 4);
    expect(sailEfficiency(Math.PI / 2, 0)).toBeGreaterThan(0.8);
  });

  it("accelerates, turns and clamps sail input deterministically", () => {
    let next = vessel;
    for (let frame = 0; frame < 120; frame += 1) {
      next = stepVessel(next, { throttle: 1, rudder: 0.8 }, { windHeading: Math.PI, windSpeed: 12 }, 1 / 60);
    }
    expect(next.speed).toBeGreaterThan(1);
    expect(next.heading).not.toBe(vessel.heading);
    expect(next.sail).toBeLessThanOrEqual(1);
    expect(next.heel).toBeLessThan(0);
  });

  it("finds ports and requires a slow approach before docking", () => {
    const found = nearestPort({ x: 3, z: 22 });
    expect(found.port.id).toBe("azurehaven");
    expect(canDock({ ...vessel, x: 0, z: 45, speed: 1 }, PORTS[0])).toBe(true);
    expect(canDock({ ...vessel, x: 0, z: 45, speed: 2 }, PORTS[0])).toBe(false);
  });

  it("pushes a vessel outside an island instead of trapping it", () => {
    const collided = resolveIslandCollision({ ...vessel, x: 0, z: 20, speed: 6 }, PORTS[0]);
    expect(Math.hypot(collided.x - PORTS[0].x, collided.z - PORTS[0].z)).toBeCloseTo(PORTS[0].radius + 4);
    expect(collided.speed).toBeLessThanOrEqual(0.7);
  });
});

describe("windward horizons trading", () => {
  it("creates stable daily markets with meaningful port spreads", () => {
    expect(marketQuote(PORTS[0], 4)).toEqual(marketQuote(PORTS[0], 4));
    expect(marketQuote(PORTS[1], 4).spices).toBeLessThan(marketQuote(PORTS[2], 4).spices);
    expect(marketQuote(PORTS[3], 4).timber).toBeLessThan(marketQuote(PORTS[1], 4).timber);
  });

  it("buys and sells without creating gold or cargo", () => {
    const initial = createTradeState();
    const bought = tradeCargo(initial, "buy", "tea", 100, 2);
    expect(bought.ok).toBe(true);
    expect(bought.state.gold).toBe(STARTING_GOLD - 200);
    expect(bought.state.cargo.tea).toBe(2);
    const sold = tradeCargo(bought.state, "sell", "tea", 130, 2);
    expect(sold.ok).toBe(true);
    expect(sold.state.gold).toBe(STARTING_GOLD + 60);
    expect(sold.state.cargo.tea).toBe(0);
  });

  it("enforces hold capacity, funds and owned quantities", () => {
    const initial = createTradeState();
    expect(tradeCargo(initial, "buy", "timber", 1, 11).reason).toBe("capacity");
    expect(tradeCargo(initial, "buy", "spices", STARTING_GOLD + 1, 1).reason).toBe("gold");
    expect(tradeCargo(initial, "sell", "silk", 200, 1).reason).toBe("cargo");
    expect(cargoUsed({ ...initial.cargo, timber: 2, tea: 3 })).toBe(
      GOODS.timber.volume * 2 + GOODS.tea.volume * 3,
    );
  });

  it("counts first visits and rewards profit, discovery and exploration", () => {
    const initial = createTradeState();
    const visited = visitPort(visitPort(initial, "sunspire"), "sunspire");
    expect(visited.visited).toEqual(["azurehaven", "sunspire"]);
    expect(voyageScore({ ...visited, gold: STARTING_GOLD + 500 }, 2)).toBe(1_220);
  });

  it("formats the voyage clock at boundaries", () => {
    expect(formatVoyageTime(480)).toBe("8:00");
    expect(formatVoyageTime(59.2)).toBe("1:00");
    expect(formatVoyageTime(-5)).toBe("0:00");
  });
});
