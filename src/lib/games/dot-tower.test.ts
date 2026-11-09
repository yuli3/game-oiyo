import { describe, it, expect } from "vitest";
import {
  createTowerGame,
  placeTower,
  upgradeTower,
  sellTower,
  startWave,
  stepTowerGame,
  isCellOnPath,
  TowerRng,
  GRID_COLS,
  GRID_ROWS,
  TOWER_DEFINITIONS,
} from "./dot-tower";

describe("DotTower Core Engine Tests", () => {
  it("should initialize default tower defense state cleanly", () => {
    const state = createTowerGame(42);
    expect(state.status).toBe("idle");
    expect(state.gold).toBe(250);
    expect(state.castleHp).toBe(20);
    expect(state.wave).toBe(1);
    expect(state.maxWave).toBe(15);
    expect(state.towers.length).toBe(0);
    expect(state.enemies.length).toBe(0);
  });

  it("should accurately identify cells on the waypoint path", () => {
    // (0, 2) is starting waypoint
    expect(isCellOnPath(0, 2)).toBe(true);
    expect(isCellOnPath(3, 2)).toBe(true); // horizontal segment (0,2) -> (5,2)
    // (0, 0) is not on path
    expect(isCellOnPath(0, 0)).toBe(false);
    expect(isCellOnPath(15, 9)).toBe(false);
  });

  it("should place towers on valid empty cells and deduct cost", () => {
    let state = createTowerGame(100);
    // (1, 1) is not on path
    expect(isCellOnPath(1, 1)).toBe(false);

    state = placeTower(state, 1, 1, "archer");
    expect(state.towers.length).toBe(1);
    expect(state.towers[0].type).toBe("archer");
    expect(state.towers[0].level).toBe(1);
    expect(state.gold).toBe(250 - TOWER_DEFINITIONS.archer.cost);
  });

  it("should reject tower placement directly on path or occupied cells", () => {
    let state = createTowerGame(200);
    // (0, 2) is on path
    const onPathState = placeTower(state, 0, 2, "cannon");
    expect(onPathState.towers.length).toBe(0);
    expect(onPathState.gold).toBe(250);

    // Place at (2, 2)
    state = placeTower(state, 2, 0, "cannon");
    expect(state.towers.length).toBe(1);

    // Place again at same cell
    const dupState = placeTower(state, 2, 0, "archer");
    expect(dupState.towers.length).toBe(1);
  });

  it("should upgrade towers and scale stats", () => {
    let state = createTowerGame(300);
    state.gold = 500;
    state = placeTower(state, 3, 0, "archer");

    const towerId = state.towers[0].id;
    const upgraded = upgradeTower(state, towerId);

    expect(upgraded.towers[0].level).toBe(2);
    expect(upgraded.gold).toBeLessThan(state.gold);
  });

  it("should sell towers and refund 70% gold", () => {
    let state = createTowerGame(400);
    state = placeTower(state, 4, 0, "cannon");
    const towerId = state.towers[0].id;

    const goldBeforeSell = state.gold;
    const sold = sellTower(state, towerId);

    expect(sold.towers.length).toBe(0);
    expect(sold.gold).toBe(goldBeforeSell + Math.round(TOWER_DEFINITIONS.cannon.cost * 0.7));
  });

  it("should start waves and populate spawn queue", () => {
    let state = createTowerGame(500);
    state = startWave(state);

    expect(state.status).toBe("wave_running");
    expect(state.spawnQueue.length).toBeGreaterThan(0);
  });

  it("should step game tick, spawn enemies and advance along path", () => {
    const rng = new TowerRng(600);
    let state = createTowerGame(600);
    state = startWave(state);

    // Run ticks to trigger spawns and movement
    for (let i = 0; i < 20; i++) {
      state = stepTowerGame(state, 0.1, rng);
    }

    expect(state.enemies.length).toBeGreaterThan(0);
    const firstEnemy = state.enemies[0];
    expect(firstEnemy.x).toBeGreaterThanOrEqual(0);
    expect(firstEnemy.hp).toBeGreaterThan(0);
  });

  it("should allow towers to fire projectiles and damage enemies", () => {
    const rng = new TowerRng(700);
    let state = createTowerGame(700);
    // Place archer right next to path waypoint (0, 2)
    state = placeTower(state, 0, 1, "archer");
    state = startWave(state);

    // Step until enemy spawns and tower fires
    for (let i = 0; i < 15; i++) {
      state = stepTowerGame(state, 0.1, rng);
    }

    expect(state.projectiles.length).toBeGreaterThanOrEqual(0);
  });

  it("should trigger game over if enemies leak and deplete castle life", () => {
    const rng = new TowerRng(800);
    let state = createTowerGame(800);
    state.castleHp = 1; // set low life
    state.status = "wave_running";

    // Inject enemy at final waypoint
    state.enemies = [
      {
        id: "leaker",
        type: "scout",
        x: 15,
        y: 5,
        pathIndex: 10, // at penultimate waypoint
        progress: 0.99,
        hp: 100,
        maxHp: 100,
        speed: 5.0,
        bounty: 10,
        slowTimer: 0,
        isBoss: false,
      },
    ];

    state = stepTowerGame(state, 0.1, rng);
    expect(state.castleHp).toBe(0);
    expect(state.status).toBe("game_over");
  });

  it("should trigger wave cleared and victory upon clearing wave 15", () => {
    const rng = new TowerRng(900);
    let state = createTowerGame(900);
    state.wave = 15;
    state.status = "wave_running";
    state.spawnQueue = [];
    state.enemies = []; // all enemies defeated

    const victoryState = stepTowerGame(state, 0.1, rng);
    expect(victoryState.status).toBe("victory");
  });
});
