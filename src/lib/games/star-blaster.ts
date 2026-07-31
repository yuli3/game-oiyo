export const STAR_BLASTER_WIDTH = 360;
export const STAR_BLASTER_HEIGHT = 540;
export const STAR_BLASTER_STEP_SECONDS = 1 / 60;

export type StarBlasterPhase = "playing" | "upgrade" | "boss" | "victory" | "over";
export type StarBlasterWeapon = "pulse" | "scatter" | "arc";
export type StarBlasterEnemyKind = "drifter" | "swooper" | "bulwark" | "warden";
export type StarBlasterUpgradeId =
  | "pulse-overdrive"
  | "scatter-array"
  | "arc-coil"
  | "hull-repair"
  | "score-multiplier";

export interface StarBlasterBullet {
  id: number;
  x: number;
  y: number;
  velocityX: number;
  damage: number;
  weapon: StarBlasterWeapon;
}

export interface StarBlasterEnemy {
  id: number;
  x: number;
  y: number;
  radius: number;
  velocityX: number;
  velocityY: number;
  hue: number;
  kind: StarBlasterEnemyKind;
  hp: number;
  maxHp: number;
  ageTicks: number;
}

export interface StarBlasterBoss {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  phase: 1 | 2 | 3;
  ageTicks: number;
}

export interface StarBlasterRunStats {
  kills: number;
  damageTaken: number;
  weaponKills: Record<StarBlasterWeapon, number>;
}

export interface StarBlasterEvent {
  type: "shot" | "enemy-hit" | "enemy-destroyed" | "player-hit" | "wave-changed" | "upgrade-ready" | "upgrade-chosen" | "boss-start" | "boss-hit" | "boss-phase" | "victory" | "game-over";
  x?: number;
  y?: number;
  hue?: number;
}

export interface StarBlasterState {
  version: 1;
  seed: number;
  rngState: number;
  tick: number;
  phase: StarBlasterPhase;
  shipX: number;
  targetX: number;
  bullets: StarBlasterBullet[];
  enemies: StarBlasterEnemy[];
  boss: StarBlasterBoss | null;
  score: number;
  lives: number;
  wave: number;
  waveTick: number;
  weapon: StarBlasterWeapon;
  weaponLevels: Record<StarBlasterWeapon, number>;
  scoreMultiplier: number;
  pendingUpgrades: StarBlasterUpgradeId[];
  shotCooldownTicks: number;
  spawnCooldownTicks: number;
  nextEntityId: number;
  events: StarBlasterEvent[];
  stats: StarBlasterRunStats;
}

export interface StarBlasterInput {
  targetX?: number;
}

const SHIP_Y = STAR_BLASTER_HEIGHT - 44;
const SHIP_HALF_WIDTH = 14;
const BULLET_SPEED_PER_SECOND = 480;
const SHOT_INTERVAL_TICKS = 11;
export const STAR_BLASTER_WAVE_TICKS = 20 * 60;
export const STAR_BLASTER_MAX_ENEMIES = 60;
export const STAR_BLASTER_MAX_BULLETS = 160;

function normalizedSeed(seed: number): number {
  if (!Number.isFinite(seed)) return 0x6d2b79f5;
  const value = Math.trunc(seed) >>> 0;
  return value || 0x6d2b79f5;
}

function nextRandom(state: StarBlasterState): number {
  state.rngState = (Math.imul(state.rngState, 1664525) + 1013904223) >>> 0;
  return state.rngState / 0x1_0000_0000;
}

function clampTarget(targetX: number): number {
  return Math.max(18, Math.min(STAR_BLASTER_WIDTH - 18, targetX));
}

function spawnGapTicks(wave: number): number {
  return Math.max(22, Math.round((900 - wave * 55) / (1000 / 60)));
}

function enemyKindForWave(state: StarBlasterState): StarBlasterEnemyKind {
  const roll = nextRandom(state);
  if (state.wave >= 2 && roll < 0.08) return "warden";
  if (state.wave >= 3 && roll < 0.3) return "bulwark";
  if (state.wave >= 2 && roll < 0.58) return "swooper";
  return "drifter";
}

function spawnEnemy(state: StarBlasterState): StarBlasterEnemy {
  const kind = enemyKindForWave(state);
  const radius = kind === "warden" ? 25 : 12 + nextRandom(state) * 12;
  const hp = kind === "warden" ? 6 : kind === "bulwark" ? 3 : 1;
  return {
    id: state.nextEntityId++,
    x: radius + nextRandom(state) * (STAR_BLASTER_WIDTH - 2 * radius),
    y: -radius,
    radius,
    velocityY: (kind === "warden" ? 34 : kind === "bulwark" ? 42 : 60) + state.wave * 10.8 + nextRandom(state) * 36,
    velocityX: (nextRandom(state) - 0.5) * (kind === "swooper" ? 72 : 24 + state.wave * 4.8),
    hue: kind === "warden" ? 48 : kind === "bulwark" ? 28 : kind === "swooper" ? 326 : 204,
    kind,
    hp,
    maxHp: hp,
    ageTicks: 0,
  };
}

function upgradeOptions(state: StarBlasterState): StarBlasterUpgradeId[] {
  const weaponUpgrades: StarBlasterUpgradeId[] = ["pulse-overdrive", "scatter-array", "arc-coil"];
  const offset = Math.floor(nextRandom(state) * weaponUpgrades.length);
  return [
    weaponUpgrades[offset],
    weaponUpgrades[(offset + 1) % weaponUpgrades.length],
    state.lives < 3 ? "hull-repair" : "score-multiplier",
  ];
}

function fireBullets(state: StarBlasterState): void {
  const level = state.weaponLevels[state.weapon];
  const y = SHIP_Y - 14;
  if (state.weapon === "scatter") {
    const spread = 72 + level * 12;
    for (const velocityX of [-spread, 0, spread]) {
      state.bullets.push({ id: state.nextEntityId++, x: state.shipX, y, velocityX, damage: 1, weapon: "scatter" });
    }
  } else {
    state.bullets.push({
      id: state.nextEntityId++,
      x: state.shipX,
      y,
      velocityX: 0,
      damage: state.weapon === "pulse" && level >= 3 ? 2 : 1,
      weapon: state.weapon,
    });
  }
  if (state.bullets.length > STAR_BLASTER_MAX_BULLETS) {
    state.bullets.splice(0, state.bullets.length - STAR_BLASTER_MAX_BULLETS);
  }
  state.events.push({ type: "shot", x: state.shipX, y });
}

function shotInterval(state: StarBlasterState): number {
  const level = state.weaponLevels[state.weapon];
  if (state.weapon === "scatter") return Math.max(16, 27 - level * 3);
  if (state.weapon === "arc") return Math.max(20, 34 - level * 4);
  return Math.max(6, SHOT_INTERVAL_TICKS - (level - 1) * 2);
}

export function createStarBlasterState(seed: number): StarBlasterState {
  const rngState = normalizedSeed(seed);
  return {
    version: 1,
    seed: rngState,
    rngState,
    tick: 0,
    phase: "playing",
    shipX: STAR_BLASTER_WIDTH / 2,
    targetX: STAR_BLASTER_WIDTH / 2,
    bullets: [],
    enemies: [],
    boss: null,
    score: 0,
    lives: 3,
    wave: 1,
    waveTick: 0,
    weapon: "pulse",
    weaponLevels: { pulse: 1, scatter: 0, arc: 0 },
    scoreMultiplier: 1,
    pendingUpgrades: [],
    shotCooldownTicks: 0,
    spawnCooldownTicks: 0,
    nextEntityId: 1,
    events: [],
    stats: { kills: 0, damageTaken: 0, weaponKills: { pulse: 0, scatter: 0, arc: 0 } },
  };
}

function startBoss(state: StarBlasterState): void {
  state.phase = "boss";
  state.waveTick = 0;
  state.enemies = [];
  state.bullets = [];
  state.boss = { x: STAR_BLASTER_WIDTH / 2, y: 82, hp: 90, maxHp: 90, phase: 1, ageTicks: 0 };
  state.spawnCooldownTicks = 90;
  state.events.push({ type: "boss-start", x: STAR_BLASTER_WIDTH / 2, y: 82, hue: 278 });
}

function destroyEnemy(state: StarBlasterState, enemy: StarBlasterEnemy, weapon: StarBlasterWeapon): void {
  state.score += 10 * state.scoreMultiplier * enemy.maxHp;
  state.stats.kills += 1;
  state.stats.weaponKills[weapon] += 1;
  state.events.push({ type: "enemy-destroyed", x: enemy.x, y: enemy.y, hue: enemy.hue });
}

/**
 * Advances exactly one 60 Hz simulation tick. The function mutates and returns
 * the supplied state so the Canvas adapter can reuse arrays without React
 * allocations. A seed plus the same input stream always produces the same state.
 */
export function stepStarBlaster(
  state: StarBlasterState,
  input: StarBlasterInput = {},
): StarBlasterState {
  if (state.phase !== "playing" && state.phase !== "boss") return state;
  state.events = [];
  state.tick += 1;
  state.waveTick += 1;

  if (input.targetX !== undefined && Number.isFinite(input.targetX)) {
    state.targetX = clampTarget(input.targetX);
  }
  state.shipX += (state.targetX - state.shipX) * 0.25;
  state.shipX = clampTarget(state.shipX);

  if (state.phase === "playing" && state.waveTick >= STAR_BLASTER_WAVE_TICKS) {
    if (state.wave < 3) {
      state.phase = "upgrade";
      state.pendingUpgrades = upgradeOptions(state);
      state.enemies = [];
      state.bullets = [];
      state.events.push({ type: "upgrade-ready" });
    } else {
      startBoss(state);
    }
    return state;
  }

  if (state.shotCooldownTicks <= 0) {
    fireBullets(state);
    state.shotCooldownTicks = shotInterval(state);
  } else {
    state.shotCooldownTicks -= 1;
  }

  if (state.spawnCooldownTicks <= 0 && state.enemies.length < STAR_BLASTER_MAX_ENEMIES) {
    state.enemies.push(spawnEnemy(state));
    state.spawnCooldownTicks = spawnGapTicks(state.wave);
  } else {
    state.spawnCooldownTicks -= 1;
  }

  state.bullets = state.bullets.filter((bullet) => {
    bullet.y -= BULLET_SPEED_PER_SECOND * STAR_BLASTER_STEP_SECONDS;
    bullet.x += bullet.velocityX * STAR_BLASTER_STEP_SECONDS;
    return bullet.y > -12 && bullet.x > -16 && bullet.x < STAR_BLASTER_WIDTH + 16;
  });

  if (state.phase === "boss" && state.boss) {
    const boss = state.boss;
    boss.ageTicks += 1;
    boss.x = STAR_BLASTER_WIDTH / 2 + Math.sin(boss.ageTicks / 75) * 112;
    const bulletIndex = state.bullets.findIndex((bullet) =>
      (bullet.x - boss.x) ** 2 + (bullet.y - boss.y) ** 2 < 38 ** 2,
    );
    if (bulletIndex >= 0) {
      const bullet = state.bullets.splice(bulletIndex, 1)[0];
      boss.hp = Math.max(0, boss.hp - bullet.damage);
      state.events.push({ type: "boss-hit", x: boss.x, y: boss.y, hue: 278 });
      const nextPhase: 1 | 2 | 3 = boss.hp <= boss.maxHp / 3 ? 3 : boss.hp <= boss.maxHp * 2 / 3 ? 2 : 1;
      if (nextPhase !== boss.phase) {
        boss.phase = nextPhase;
        state.events.push({ type: "boss-phase", x: boss.x, y: boss.y, hue: nextPhase === 3 ? 0 : 278 });
      }
      if (boss.hp <= 0) {
        state.score += 1_000 * state.scoreMultiplier;
        state.phase = "victory";
        state.enemies = [];
        state.bullets = [];
        state.events.push({ type: "victory", x: boss.x, y: boss.y, hue: 48 });
        return state;
      }
    }
  }

  const survivingEnemies: StarBlasterEnemy[] = [];
  let damage = 0;
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) {
      destroyEnemy(state, enemy, state.weapon);
      continue;
    }
    enemy.ageTicks += 1;
    enemy.y += enemy.velocityY * STAR_BLASTER_STEP_SECONDS;
    enemy.x += enemy.velocityX * STAR_BLASTER_STEP_SECONDS;
    if (enemy.kind === "swooper") enemy.x += Math.sin(enemy.ageTicks / 14) * 1.4;
    if (enemy.x < enemy.radius) {
      enemy.x = enemy.radius;
      enemy.velocityX = Math.abs(enemy.velocityX);
    } else if (enemy.x > STAR_BLASTER_WIDTH - enemy.radius) {
      enemy.x = STAR_BLASTER_WIDTH - enemy.radius;
      enemy.velocityX = -Math.abs(enemy.velocityX);
    }

    const bulletIndex = state.bullets.findIndex((bullet) =>
      (bullet.x - enemy.x) ** 2 + (bullet.y - enemy.y) ** 2 < (enemy.radius + 4) ** 2,
    );
    if (bulletIndex >= 0) {
      const bullet = state.bullets.splice(bulletIndex, 1)[0];
      enemy.hp -= bullet.damage;
      state.events.push({ type: "enemy-hit", x: enemy.x, y: enemy.y, hue: enemy.hue });
      if (bullet.weapon === "arc") {
        const chained = state.enemies
          .filter((candidate) => candidate.id !== enemy.id && candidate.hp > 0)
          .sort((a, b) => ((a.x - enemy.x) ** 2 + (a.y - enemy.y) ** 2) - ((b.x - enemy.x) ** 2 + (b.y - enemy.y) ** 2))[0];
        if (chained) chained.hp -= 1;
      }
      if (enemy.hp <= 0) {
        destroyEnemy(state, enemy, bullet.weapon);
        continue;
      }
    }

    const collidesWithShip = enemy.y + enemy.radius >= SHIP_Y - 10
      && Math.abs(enemy.x - state.shipX) < enemy.radius + SHIP_HALF_WIDTH + 2;
    if (collidesWithShip || enemy.y - enemy.radius > STAR_BLASTER_HEIGHT) {
      // Preserve the original game's frame-level damage gate: simultaneous
      // contacts are one damage event, not an instant multi-life loss.
      damage = 1;
      state.events.push({ type: "player-hit", x: enemy.x, y: enemy.y, hue: 0 });
      continue;
    }
    survivingEnemies.push(enemy);
  }
  state.enemies = survivingEnemies;

  if (damage > 0) {
    state.lives = Math.max(0, state.lives - damage);
    state.stats.damageTaken += damage;
  }
  if (state.lives <= 0) {
    state.phase = "over";
    state.events.push({ type: "game-over" });
  }
  return state;
}

export function chooseStarBlasterUpgrade(state: StarBlasterState, upgrade: StarBlasterUpgradeId): boolean {
  if (state.phase !== "upgrade" || !state.pendingUpgrades.includes(upgrade)) return false;
  if (upgrade === "hull-repair") state.lives = Math.min(3, state.lives + 1);
  else if (upgrade === "score-multiplier") state.scoreMultiplier = Math.min(3, state.scoreMultiplier + 1);
  else {
    const weapon: StarBlasterWeapon = upgrade === "pulse-overdrive" ? "pulse" : upgrade === "scatter-array" ? "scatter" : "arc";
    state.weapon = weapon;
    state.weaponLevels[weapon] = Math.min(3, Math.max(1, state.weaponLevels[weapon] + 1));
  }
  state.wave += 1;
  state.waveTick = 0;
  state.shotCooldownTicks = 0;
  state.spawnCooldownTicks = 30;
  state.pendingUpgrades = [];
  state.phase = "playing";
  state.events = [{ type: "upgrade-chosen" }, { type: "wave-changed" }];
  return true;
}

export function starBlasterStateFingerprint(state: StarBlasterState): string {
  return JSON.stringify({
    tick: state.tick,
    phase: state.phase,
    rngState: state.rngState,
    shipX: Number(state.shipX.toFixed(6)),
    score: state.score,
    lives: state.lives,
    wave: state.wave,
    waveTick: state.waveTick,
    weapon: state.weapon,
    weaponLevels: state.weaponLevels,
    boss: state.boss && [Number(state.boss.x.toFixed(4)), state.boss.hp, state.boss.phase, state.boss.ageTicks],
    stats: state.stats,
    bullets: state.bullets.map((bullet) => [bullet.id, bullet.weapon, Number(bullet.x.toFixed(4)), Number(bullet.y.toFixed(4)), Number(bullet.velocityX.toFixed(4))]),
    enemies: state.enemies.map((enemy) => [
      enemy.id,
      Number(enemy.x.toFixed(4)),
      Number(enemy.y.toFixed(4)),
      Number(enemy.velocityX.toFixed(4)),
      Number(enemy.velocityY.toFixed(4)),
      enemy.kind,
      enemy.hp,
    ]),
  });
}
