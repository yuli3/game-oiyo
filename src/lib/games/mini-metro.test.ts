import { describe, expect, it } from "vitest";
import {
  clearLine,
  connectStationToLine,
  createInitialMiniMetroGame,
  stepMiniMetro,
} from "./mini-metro";

describe("Mini Metro Web Core Simulation", () => {
  it("initializes with starter stations, lines, and trains", () => {
    const game = createInitialMiniMetroGame();
    expect(game.stations.length).toBe(3);
    expect(game.lines.length).toBe(3);
    expect(game.lines[0].stationIds.length).toBe(2);
    expect(game.status).toBe("running");
  });

  it("connects a station to a line cleanly without duplicates", () => {
    let game = createInitialMiniMetroGame();
    game = connectStationToLine(game, "line-red", "st-3");
    expect(game.lines[0].stationIds).toEqual(["st-1", "st-2", "st-3"]);

    // Connecting again should not duplicate
    game = connectStationToLine(game, "line-red", "st-3");
    expect(game.lines[0].stationIds.length).toBe(3);
  });

  it("clears line station connections", () => {
    let game = createInitialMiniMetroGame();
    game = clearLine(game, "line-red");
    expect(game.lines[0].stationIds.length).toBe(0);
  });

  it("moves train, delivers passengers, and increments delivery count", () => {
    let game = createInitialMiniMetroGame();
    // Line red connects st-1 (circle) and st-2 (triangle)
    // Board a passenger at st-1 who wants triangle
    game.stations[0].passengers.push("triangle");

    // Advance simulation until train arrives at st-1 to board
    // Train starts at index 0, progress 0.1 moving to st-2 (direction 1)
    // Let's set train at st-1 with passenger already onboard
    game.lines[0].trains[0].passengers.push("triangle");
    game.lines[0].trains[0].currentStationIndex = 0;
    game.lines[0].trains[0].direction = 1;
    game.lines[0].trains[0].progress = 0.99; // almost at st-2

    // Step simulation across arrival
    const { game: nextGame, events } = stepMiniMetro(game, 0.1);

    expect(events.deliveredCount).toBe(1);
    expect(nextGame.passengersDelivered).toBe(1);
    expect(nextGame.lines[0].trains[0].passengers.length).toBe(0);
  });

  it("triggers overcrowding timer when station crowd reaches limit", () => {
    let game = createInitialMiniMetroGame();
    // Fill station 1 with 6 passengers
    game.stations[0].passengers = ["triangle", "triangle", "triangle", "triangle", "triangle", "triangle"];

    const { game: nextGame, events } = stepMiniMetro(game, 1.0);
    expect(events.overcrowdedStationIds).toContain("st-1");
    expect(nextGame.stations[0].overcrowdedTimer).toBeGreaterThan(0);
  });
});
