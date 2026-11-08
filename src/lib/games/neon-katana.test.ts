import { describe, it, expect } from "vitest";
import {
  createInitialKatanaState,
  spawnWaveEnemy,
  createProjectile,
  executeParry,
  executeBladeDash,
  stepKatanaGame,
  runNeonKatanaMonteCarloAudit,
} from "./neon-katana";

describe("Neon Katana: Core Mechanics", () => {
  it("initializes with valid state and full HP", () => {
    const state = createInitialKatanaState();
    expect(state.hp).toBe(5);
    expect(state.maxHp).toBe(5);
    expect(state.score).toBe(0);
    expect(state.combo).toBe(0);
    expect(state.gauge).toBe(0);
    expect(state.isGameOver).toBe(false);
    expect(state.playerPos.x).toBe(300);
    expect(state.playerPos.y).toBe(400);
  });

  it("spawns enemies and creates incoming projectiles", () => {
    const state = createInitialKatanaState();
    const enemy = spawnWaveEnemy(state, "test-1");
    expect(enemy.id).toContain("drone");
    expect(enemy.hp).toBeGreaterThan(0);

    const projectile = createProjectile(enemy, state.playerPos, state.time, state.wave);
    expect(projectile.id).toContain("proj");
    expect(projectile.speed).toBeGreaterThan(100);
    expect(projectile.reflected).toBe(false);
  });

  it("triggers perfect parry and reflects bullet when timed within window", () => {
    let state = createInitialKatanaState();
    const enemy = spawnWaveEnemy(state, "parry-target");
    state.enemies.push(enemy);

    // Place a projectile right in the perfect parry window
    const p = createProjectile(enemy, state.playerPos, state.time, state.wave);
    p.x = state.playerPos.x;
    p.y = state.playerPos.y - 40; // close to player
    p.targetTime = state.time + 0.05; // 50ms away (within 140ms perfect window)
    state.projectiles.push(p);

    const res = executeParry(state);
    expect(res.rating).toBe("perfect");
    expect(res.projectileCount).toBe(1);
    expect(res.newState.score).toBeGreaterThanOrEqual(150);
    expect(res.newState.combo).toBe(1);
    expect(res.newState.gauge).toBe(25);
    expect(res.newState.projectiles[0].reflected).toBe(true);
  });

  it("triggers guard parry and neutralizes bullet within guard window", () => {
    let state = createInitialKatanaState();
    const enemy = spawnWaveEnemy(state, "guard-target");
    state.enemies.push(enemy);

    const p = createProjectile(enemy, state.playerPos, state.time, state.wave);
    p.x = state.playerPos.x;
    p.y = state.playerPos.y - 70;
    p.targetTime = state.time + 0.22; // 220ms away (guard window: 140ms ~ 280ms)
    state.projectiles.push(p);

    const res = executeParry(state);
    expect(res.rating).toBe("guard");
    expect(res.newState.score).toBe(50);
    expect(res.newState.combo).toBe(1);
    expect(res.newState.gauge).toBe(10);
    // Bullet was neutralized (removed)
    expect(res.newState.projectiles.length).toBe(0);
  });

  it("handles player damage and game over when hit by unparried projectile", () => {
    let state = createInitialKatanaState();
    state.hp = 1; // set low HP

    const enemy = spawnWaveEnemy(state, "fatal");
    const p = createProjectile(enemy, state.playerPos, state.time, state.wave);
    p.x = state.playerPos.x;
    p.y = state.playerPos.y; // direct impact
    state.projectiles.push(p);

    state = stepKatanaGame(state, 0.016);
    expect(state.hp).toBe(0);
    expect(state.isGameOver).toBe(true);
    expect(state.stats.misses).toBe(1);
  });

  it("executes Blade Dash (일섬) when gauge reaches 100", () => {
    let state = createInitialKatanaState();
    state.gauge = 100;
    state.enemies.push(spawnWaveEnemy(state, "dash-victim-1"));
    state.enemies.push(spawnWaveEnemy(state, "dash-victim-2"));

    const res = executeBladeDash(state, 0);
    expect(res.executed).toBe(true);
    expect(res.eliminatedEnemies).toBe(2);
    expect(res.newState.gauge).toBe(0);
    expect(res.newState.isBulletTime).toBe(true);
    expect(res.newState.slashEffects.length).toBe(1);
    expect(res.newState.score).toBeGreaterThan(500);
  });

  it("passes Monte Carlo balance audit for Adept and Master skill tiers", () => {
    const adeptResult = runNeonKatanaMonteCarloAudit(20, "adept", 42);
    expect(adeptResult.trials).toBe(20);
    expect(adeptResult.avgScore).toBeGreaterThan(0);
    expect(adeptResult.avgWavesSurvived).toBeGreaterThanOrEqual(1.0);

    const masterResult = runNeonKatanaMonteCarloAudit(20, "master", 42);
    expect(masterResult.avgScore).toBeGreaterThan(adeptResult.avgScore);
  });
});
