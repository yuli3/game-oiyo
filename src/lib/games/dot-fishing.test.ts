import { describe, it, expect } from "vitest";
import {
  FISH_CATALOG,
  ROD_UPGRADES,
  BOAT_UPGRADES,
  FishingRng,
  createFishingGame,
  getAvailableZones,
  startCast,
  triggerBite,
  hookFish,
  stepReelingTick,
  setFishingZone,
  buyRodUpgrade,
  buyBoatUpgrade,
} from "./dot-fishing";

describe("DotFishing Core Engine Tests", () => {
  it("should have exactly 30 unique fish catalog definitions across 4 zones", () => {
    expect(FISH_CATALOG.length).toBe(30);

    const ids = new Set(FISH_CATALOG.map((f) => f.id));
    expect(ids.size).toBe(30);

    const zones = new Set(FISH_CATALOG.map((f) => f.zone));
    expect(zones.has("shallow")).toBe(true);
    expect(zones.has("coral")).toBe(true);
    expect(zones.has("deep")).toBe(true);
    expect(zones.has("abyss")).toBe(true);
  });

  it("should initialize default fishing game state cleanly", () => {
    const state = createFishingGame(42);
    expect(state.status).toBe("idle");
    expect(state.zone).toBe("shallow");
    expect(state.gold).toBe(50);
    expect(state.rodLevel).toBe(1);
    expect(state.boatLevel).toBe(1);
    expect(Object.keys(state.encyclopedia).length).toBe(0);
  });

  it("should start casting and set status to waiting", () => {
    const rng = new FishingRng(100);
    const state = createFishingGame(100);
    const casted = startCast(state, rng);

    expect(casted.status).toBe("waiting");
    expect(casted.biteAlertTimer).toBeGreaterThanOrEqual(1500);
    expect(casted.distance).toBe(100);
  });

  it("should trigger a fish bite with valid zone fish and size", () => {
    const rng = new FishingRng(200);
    let state = createFishingGame(200);
    state = startCast(state, rng);

    const bit = triggerBite(state, rng);
    expect(bit.status).toBe("biting");
    expect(bit.activeFish).not.toBeNull();
    expect(bit.activeFish?.fish.zone).toBe("shallow");
    expect(bit.activeFish?.size).toBeGreaterThanOrEqual(bit.activeFish!.fish.minSize);
    expect(bit.activeFish?.size).toBeLessThanOrEqual(bit.activeFish!.fish.maxSize);
  });

  it("should successfully hook fish into reeling phase", () => {
    const rng = new FishingRng(300);
    let state = createFishingGame(300);
    state = startCast(state, rng);
    state = triggerBite(state, rng);

    const hooked = hookFish(state);
    expect(hooked.status).toBe("reeling");
    expect(hooked.lineTension).toBe(35);
    expect(hooked.distance).toBe(100);
  });

  it("should increase tension and reduce distance when player reels", () => {
    const rng = new FishingRng(400);
    let state = createFishingGame(400);
    state = startCast(state, rng);
    state = triggerBite(state, rng);
    state = hookFish(state);

    const prevDist = state.distance;
    const prevTension = state.lineTension;

    // Reel for 1.0 second
    const nextState = stepReelingTick(state, 1.0, true, rng);
    expect(nextState.lineTension).toBeGreaterThan(prevTension);
    expect(nextState.distance).toBeLessThan(prevDist);
  });

  it("should release tension when player is not reeling", () => {
    const rng = new FishingRng(500);
    let state = createFishingGame(500);
    state = startCast(state, rng);
    state = triggerBite(state, rng);
    state = hookFish(state);

    // Initial tension is 35. Without reeling, tension should drop towards 10.
    const nextState = stepReelingTick(state, 0.5, false, rng);
    expect(nextState.lineTension).toBeLessThan(35);
  });

  it("should snap line when tension exceeds 100", () => {
    const rng = new FishingRng(600);
    let state = createFishingGame(600);
    state = startCast(state, rng);
    state = triggerBite(state, rng);
    state = hookFish(state);

    // Force tension high
    state.lineTension = 98;
    const snapped = stepReelingTick(state, 0.5, true, rng);

    expect(snapped.status).toBe("snapped");
    expect(snapped.activeFish).toBeNull();
  });

  it("should successfully catch fish when distance reaches 0 and register in encyclopedia", () => {
    const rng = new FishingRng(700);
    let state = createFishingGame(700);
    state = startCast(state, rng);
    state = triggerBite(state, rng);
    state = hookFish(state);

    // Set distance close to 0
    state.distance = 1;
    const caught = stepReelingTick(state, 1.0, true, rng);

    expect(caught.status).toBe("caught");
    expect(caught.lastCaught).not.toBeNull();
    expect(caught.gold).toBeGreaterThan(50);
    expect(caught.totalCatches).toBe(1);

    const caughtId = caught.lastCaught!.fish.id;
    expect(caught.encyclopedia[caughtId]).toBeDefined();
    expect(caught.encyclopedia[caughtId].count).toBe(1);
    expect(caught.encyclopedia[caughtId].maxSize).toBe(caught.lastCaught!.size);
  });

  it("should handle rod upgrades and deduct gold correctly", () => {
    let state = createFishingGame(800);
    state.gold = 300;

    const upgraded = buyRodUpgrade(state);
    expect(upgraded.rodLevel).toBe(2);
    expect(upgraded.gold).toBe(50); // 300 - 250
  });

  it("should handle boat upgrades, unlocking new zones", () => {
    let state = createFishingGame(900);
    state.gold = 600;

    expect(getAvailableZones(state.boatLevel)).toEqual(["shallow"]);

    const upgraded = buyBoatUpgrade(state);
    expect(upgraded.boatLevel).toBe(2);
    expect(upgraded.gold).toBe(100); // 600 - 500
    expect(upgraded.zone).toBe("coral");
    expect(getAvailableZones(upgraded.boatLevel)).toEqual(["shallow", "coral"]);
  });

  it("should trigger victory when 30 unique species are caught or gold reaches 10,000", () => {
    const rng = new FishingRng(1000);
    let state = createFishingGame(1000);
    state = startCast(state, rng);
    state = triggerBite(state, rng);
    state = hookFish(state);

    state.distance = 1;
    state.gold = 9990; // Catching any fish pushes gold > 10,000

    const victoryState = stepReelingTick(state, 1.0, true, rng);
    expect(victoryState.status).toBe("victory");
  });
});
