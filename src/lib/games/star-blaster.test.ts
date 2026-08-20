import { describe, expect, it } from "vitest";
import {
  STAR_BLASTER_HEIGHT,
  STAR_BLASTER_MAX_BULLETS,
  STAR_BLASTER_MAX_ENEMIES,
  STAR_BLASTER_WAVE_TICKS,
  chooseStarBlasterUpgrade,
  createStarBlasterState,
  starBlasterStateFingerprint,
  stepStarBlaster,
} from "./star-blaster";

describe("Star Blaster deterministic simulation", () => {
  it("replays the same seed and input stream exactly", () => {
    const first = createStarBlasterState(20260731);
    const second = createStarBlasterState(20260731);
    for (let tick = 0; tick < 1_200; tick += 1) {
      const targetX = 180 + Math.sin(tick / 50) * 120;
      stepStarBlaster(first, { targetX });
      stepStarBlaster(second, { targetX });
    }
    expect(starBlasterStateFingerprint(first)).toBe(starBlasterStateFingerprint(second));
  });

  it("keeps distinct seeds on distinct deterministic runs", () => {
    const first = createStarBlasterState(1);
    const second = createStarBlasterState(2);
    for (let tick = 0; tick < 180; tick += 1) {
      stepStarBlaster(first, { targetX: 40 });
      stepStarBlaster(second, { targetX: 40 });
    }
    expect(starBlasterStateFingerprint(first)).not.toBe(starBlasterStateFingerprint(second));
  });

  it("clamps pointer input to the playable area", () => {
    const state = createStarBlasterState(3);
    for (let tick = 0; tick < 60; tick += 1) stepStarBlaster(state, { targetX: -10_000 });
    expect(state.targetX).toBe(18);
    expect(state.shipX).toBeGreaterThanOrEqual(18);
  });

  it("opens a deterministic upgrade phase from simulation ticks", () => {
    const state = createStarBlasterState(4);
    state.spawnCooldownTicks = Number.MAX_SAFE_INTEGER;
    for (let tick = 0; tick < STAR_BLASTER_WAVE_TICKS; tick += 1) stepStarBlaster(state);
    expect(state.phase).toBe("upgrade");
    expect(state.pendingUpgrades).toHaveLength(3);
    expect(new Set(state.pendingUpgrades).size).toBe(3);
  });

  it("allows one bullet to destroy at most one enemy", () => {
    const state = createStarBlasterState(5);
    state.spawnCooldownTicks = Number.MAX_SAFE_INTEGER;
    state.shotCooldownTicks = Number.MAX_SAFE_INTEGER;
    state.bullets = [{ id: 1, x: 180, y: 120, velocityX: 0, damage: 1, weapon: "pulse" }];
    state.enemies = [
      { id: 2, x: 180, y: 112, radius: 12, velocityX: 0, velocityY: 0, hue: 200, kind: "drifter", hp: 1, maxHp: 1, ageTicks: 0 },
      { id: 3, x: 180, y: 112, radius: 12, velocityX: 0, velocityY: 0, hue: 220, kind: "drifter", hp: 1, maxHp: 1, ageTicks: 0 },
    ];
    stepStarBlaster(state);
    expect(state.score).toBe(10);
    expect(state.enemies).toHaveLength(1);
    expect(state.bullets).toHaveLength(0);
  });

  it("ends safely when enemies consume all remaining lives", () => {
    const state = createStarBlasterState(6);
    state.lives = 1;
    state.spawnCooldownTicks = Number.MAX_SAFE_INTEGER;
    state.shotCooldownTicks = Number.MAX_SAFE_INTEGER;
    state.enemies = [{
      id: 2,
      x: 20,
      y: STAR_BLASTER_HEIGHT + 20,
      radius: 12,
      velocityX: 0,
      velocityY: 0,
      hue: 200,
      kind: "drifter",
      hp: 1,
      maxHp: 1,
      ageTicks: 0,
    }];
    stepStarBlaster(state);
    const hit = state.events.find((event) => event.type === "player-hit");
    expect(hit).toMatchObject({ type: "player-hit", hitCause: "escaped", enemyKind: "drifter" });
    expect(state.lives).toBe(0);
    expect(state.phase).toBe("over");
    expect(state.events.at(-1)?.type).toBe("game-over");
  });

  it("coalesces simultaneous contacts into one damage tick", () => {
    const state = createStarBlasterState(7);
    state.spawnCooldownTicks = Number.MAX_SAFE_INTEGER;
    state.shotCooldownTicks = Number.MAX_SAFE_INTEGER;
    state.enemies = [1, 2, 3].map((id) => ({
      id,
      x: 20 + id * 30,
      y: STAR_BLASTER_HEIGHT + 20,
      radius: 12,
      velocityX: 0,
      velocityY: 0,
      hue: 200,
      kind: "drifter" as const,
      hp: 1,
      maxHp: 1,
      ageTicks: 0,
    }));
    stepStarBlaster(state);
    expect(state.lives).toBe(2);
  });

  it("applies only offered upgrades and advances one wave", () => {
    const state = createStarBlasterState(8);
    state.phase = "upgrade";
    state.pendingUpgrades = ["scatter-array", "arc-coil", "score-multiplier"];
    expect(chooseStarBlasterUpgrade(state, "hull-repair")).toBe(false);
    expect(chooseStarBlasterUpgrade(state, "scatter-array")).toBe(true);
    expect(state.weapon).toBe("scatter");
    expect(state.weaponLevels.scatter).toBe(1);
    expect(state.wave).toBe(2);
    expect(state.phase).toBe("playing");
  });

  it("gives the three weapon archetypes distinct projectile patterns", () => {
    const pulse = createStarBlasterState(9);
    pulse.spawnCooldownTicks = Number.MAX_SAFE_INTEGER;
    stepStarBlaster(pulse);
    expect(pulse.bullets).toHaveLength(1);
    expect(pulse.bullets[0].weapon).toBe("pulse");

    const scatter = createStarBlasterState(9);
    scatter.weapon = "scatter";
    scatter.weaponLevels.scatter = 1;
    scatter.spawnCooldownTicks = Number.MAX_SAFE_INTEGER;
    stepStarBlaster(scatter);
    expect(scatter.bullets).toHaveLength(3);
    expect(new Set(scatter.bullets.map((bullet) => bullet.velocityX)).size).toBe(3);

    const arc = createStarBlasterState(9);
    arc.weapon = "arc";
    arc.weaponLevels.arc = 1;
    arc.spawnCooldownTicks = Number.MAX_SAFE_INTEGER;
    stepStarBlaster(arc);
    expect(arc.bullets[0].weapon).toBe("arc");
  });

  it("introduces swoopers, bulwarks, and elite wardens by wave three", () => {
    const kinds = new Set<string>();
    const state = createStarBlasterState(10);
    state.wave = 3;
    for (let tick = 0; tick < 3_000 && kinds.size < 4; tick += 1) {
      stepStarBlaster(state);
      state.enemies.forEach((enemy) => kinds.add(enemy.kind));
      state.enemies = [];
      state.spawnCooldownTicks = 0;
    }
    expect(kinds).toEqual(new Set(["drifter", "swooper", "bulwark", "warden"]));
  });

  it("chains arc damage into the nearest second enemy", () => {
    const state = createStarBlasterState(11);
    state.spawnCooldownTicks = Number.MAX_SAFE_INTEGER;
    state.shotCooldownTicks = Number.MAX_SAFE_INTEGER;
    state.bullets = [{ id: 1, x: 100, y: 108, velocityX: 0, damage: 1, weapon: "arc" }];
    state.enemies = [
      { id: 2, x: 100, y: 100, radius: 12, velocityX: 0, velocityY: 0, hue: 200, kind: "drifter", hp: 1, maxHp: 1, ageTicks: 0 },
      { id: 3, x: 125, y: 100, radius: 12, velocityX: 0, velocityY: 0, hue: 200, kind: "drifter", hp: 2, maxHp: 2, ageTicks: 0 },
      { id: 4, x: 250, y: 100, radius: 12, velocityX: 0, velocityY: 0, hue: 200, kind: "drifter", hp: 2, maxHp: 2, ageTicks: 0 },
    ];
    stepStarBlaster(state);
    expect(state.enemies.find((enemy) => enemy.id === 3)?.hp).toBe(1);
    expect(state.enemies.find((enemy) => enemy.id === 4)?.hp).toBe(2);
  });

  it("starts the Helix Core after the third wave", () => {
    const state = createStarBlasterState(12);
    state.wave = 3;
    state.waveTick = STAR_BLASTER_WAVE_TICKS - 1;
    stepStarBlaster(state);
    expect(state.phase).toBe("boss");
    expect(state.boss).toMatchObject({ hp: 90, maxHp: 90, phase: 1 });
    expect(state.events.at(-1)?.type).toBe("boss-start");
  });

  it("advances the boss through three health phases", () => {
    const state = createStarBlasterState(13);
    state.phase = "boss";
    state.boss = { x: 180, y: 82, hp: 61, maxHp: 90, phase: 1, ageTicks: -1 };
    state.spawnCooldownTicks = Number.MAX_SAFE_INTEGER;
    state.shotCooldownTicks = Number.MAX_SAFE_INTEGER;
    state.bullets = [{ id: 1, x: 180, y: 90, velocityX: 0, damage: 1, weapon: "pulse" }];
    stepStarBlaster(state);
    expect(state.boss?.phase).toBe(2);

    state.boss!.hp = 31;
    state.boss!.ageTicks = -1;
    state.bullets = [{ id: 2, x: 180, y: 90, velocityX: 0, damage: 1, weapon: "pulse" }];
    stepStarBlaster(state);
    expect(state.boss?.phase).toBe(3);
  });

  it("awards victory and a boss bounty when the Helix Core is destroyed", () => {
    const state = createStarBlasterState(14);
    state.phase = "boss";
    state.boss = { x: 180, y: 82, hp: 1, maxHp: 90, phase: 3, ageTicks: -1 };
    state.spawnCooldownTicks = Number.MAX_SAFE_INTEGER;
    state.shotCooldownTicks = Number.MAX_SAFE_INTEGER;
    state.bullets = [{ id: 1, x: 180, y: 90, velocityX: 0, damage: 1, weapon: "pulse" }];
    stepStarBlaster(state);
    expect(state.phase).toBe("victory");
    expect(state.score).toBe(1_000);
    expect(state.events.at(-1)?.type).toBe("victory");
  });

  it("tracks kills by weapon and damage received for the result debrief", () => {
    const state = createStarBlasterState(15);
    state.spawnCooldownTicks = Number.MAX_SAFE_INTEGER;
    state.shotCooldownTicks = Number.MAX_SAFE_INTEGER;
    state.bullets = [{ id: 1, x: 180, y: 120, velocityX: 0, damage: 1, weapon: "scatter" }];
    state.enemies = [{ id: 2, x: 180, y: 112, radius: 12, velocityX: 0, velocityY: 0, hue: 200, kind: "drifter", hp: 1, maxHp: 1, ageTicks: 0 }];
    stepStarBlaster(state);
    expect(state.stats.kills).toBe(1);
    expect(state.stats.weaponKills.scatter).toBe(1);
  });

  it("enforces projectile and enemy performance budgets", () => {
    const bullets = createStarBlasterState(16);
    bullets.weapon = "scatter";
    bullets.weaponLevels.scatter = 1;
    bullets.spawnCooldownTicks = Number.MAX_SAFE_INTEGER;
    bullets.bullets = Array.from({ length: STAR_BLASTER_MAX_BULLETS }, (_, index) => ({
      id: index + 1, x: 20, y: 300, velocityX: 0, damage: 1, weapon: "scatter" as const,
    }));
    stepStarBlaster(bullets);
    expect(bullets.bullets.length).toBeLessThanOrEqual(STAR_BLASTER_MAX_BULLETS);

    const enemies = createStarBlasterState(17);
    enemies.shotCooldownTicks = Number.MAX_SAFE_INTEGER;
    enemies.enemies = Array.from({ length: STAR_BLASTER_MAX_ENEMIES }, (_, index) => ({
      id: index + 1, x: 20 + index, y: 100, radius: 8, velocityX: 0, velocityY: 0, hue: 200,
      kind: "drifter" as const, hp: 1, maxHp: 1, ageTicks: 0,
    }));
    enemies.spawnCooldownTicks = 0;
    stepStarBlaster(enemies);
    expect(enemies.enemies).toHaveLength(STAR_BLASTER_MAX_ENEMIES);
  });
});
