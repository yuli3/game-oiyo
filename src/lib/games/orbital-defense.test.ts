import { describe, it, expect } from "vitest";
import {
  createInitialState,
  buildTurret,
  upgradeTurret,
  startWave,
  tickGame,
  TURRET_SPECS,
} from "./orbital-defense";

describe("Orbital Defense Game Logic", () => {
  it("initializes game state with proper defaults", () => {
    const state = createInitialState();
    expect(state.planetHealth).toBe(100);
    expect(state.gold).toBe(150);
    expect(state.wave).toBe(1);
    expect(state.isGameOver).toBe(false);
    expect(state.slots.length).toBe(4 + 6 + 8); // 18 slots across 3 orbits
    expect(state.turrets).toHaveLength(0);
  });

  it("builds a laser turret when gold is sufficient", () => {
    const state = createInitialState();
    const success = buildTurret(state, 0, 0, "laser");
    expect(success).toBe(true);
    expect(state.turrets).toHaveLength(1);
    expect(state.turrets[0].type).toBe("laser");
    expect(state.gold).toBe(150 - TURRET_SPECS.laser.cost);
    expect(state.slots[0].turretId).toBe(state.turrets[0].id);
  });

  it("fails to build turret on an already occupied slot", () => {
    const state = createInitialState();
    buildTurret(state, 0, 0, "laser");
    const duplicate = buildTurret(state, 0, 0, "plasma");
    expect(duplicate).toBe(false);
    expect(state.turrets).toHaveLength(1);
  });

  it("fails to build turret when gold is insufficient", () => {
    const state = createInitialState();
    state.gold = 20; // Laser costs 50
    const success = buildTurret(state, 0, 0, "laser");
    expect(success).toBe(false);
    expect(state.turrets).toHaveLength(0);
  });

  it("upgrades an existing turret enhancing its attributes", () => {
    const state = createInitialState();
    buildTurret(state, 0, 0, "laser");
    const turretId = state.turrets[0].id;
    const initialDamage = state.turrets[0].damage;

    state.gold = 100;
    const upgraded = upgradeTurret(state, turretId);
    expect(upgraded).toBe(true);
    expect(state.turrets[0].level).toBe(2);
    expect(state.turrets[0].damage).toBeGreaterThan(initialDamage);
  });

  it("starts wave and advances enemy positions towards planet", () => {
    const state = createInitialState();
    startWave(state);
    expect(state.isWaveActive).toBe(true);
    expect(state.enemies.length).toBeGreaterThan(0);

    const initialDistance = Math.hypot(
      state.enemies[0].x,
      state.enemies[0].y,
      state.enemies[0].z
    );

    tickGame(state, 1.0); // 1 second step
    const movedDistance = Math.hypot(
      state.enemies[0].x,
      state.enemies[0].y,
      state.enemies[0].z
    );
    expect(movedDistance).toBeLessThan(initialDistance);
  });

  it("turret targets and damages enemy, awarding gold on kill", () => {
    const state = createInitialState();
    buildTurret(state, 0, 0, "laser"); // Turret at r=3.0, angle=0 => (3, 0, 0)
    state.isWaveActive = true;
    state.enemies = [
      {
        id: "target-1",
        type: "scout",
        x: 4.0,
        y: 0,
        z: 0,
        hp: 10,
        maxHp: 10,
        speed: 0.1,
        reward: 15,
        radius: 0.35,
      },
    ];

    const initialGold = state.gold;
    // Step forward so turret fires and projectile travels to target
    for (let i = 0; i < 20; i++) {
      tickGame(state, 0.05);
    }

    expect(state.enemies.find((e) => e.id === "target-1")).toBeUndefined();
    expect(state.gold).toBeGreaterThan(initialGold);
  });

  it("triggers game over when planet health reaches 0", () => {
    const state = createInitialState();
    state.planetHealth = 5;
    state.enemies = [
      {
        id: "deadly-enemy",
        type: "cruiser",
        x: 1.4, // within PLANET_RADIUS 1.5
        y: 0,
        z: 0,
        hp: 50,
        maxHp: 50,
        speed: 1,
        reward: 10,
        radius: 0.5,
      },
    ];

    tickGame(state, 0.1);
    expect(state.planetHealth).toBe(0);
    expect(state.isGameOver).toBe(true);
  });
});
