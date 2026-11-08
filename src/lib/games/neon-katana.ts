/**
 * @file neon-katana.ts
 * @description Cyberpunk Katana Parry & Blade-Dash Action Engine.
 * Pure deterministic game state, parry timing windows, wave scaling,
 * combo multipliers, and Monte Carlo balance simulation.
 */

export type ParryRating = "perfect" | "guard" | "miss";

export interface Projectile {
  id: string;
  type: "bullet" | "laser" | "shuriken" | "heavy";
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  radius: number;
  damage: number;
  spawnTime: number;
  targetTime: number; // exact time it reaches player hit-zone
  reflected?: boolean;
}

export interface EnemyDrone {
  id: string;
  type: "scout" | "sniper" | "assault" | "slicer";
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  hp: number;
  maxHp: number;
  attackCooldown: number;
  attackInterval: number;
  burstCount?: number;
  destroyed?: boolean;
}

export interface NeonKatanaConfig {
  perfectWindowMs: number; // e.g. 130ms
  guardWindowMs: number;   // e.g. 260ms
  maxHp: number;
  dashGaugeMax: number;
  baseBulletSpeed: number;
}

export const DEFAULT_KATANA_CONFIG: NeonKatanaConfig = {
  perfectWindowMs: 140,
  guardWindowMs: 280,
  maxHp: 5,
  dashGaugeMax: 100,
  baseBulletSpeed: 280, // px per sec
};

export interface SlashEffect {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  duration: number;
  createdAt: number;
}

export interface GameState {
  time: number; // total seconds elapsed
  wave: number;
  hp: number;
  maxHp: number;
  score: number;
  combo: number;
  maxCombo: number;
  gauge: number; // 0..100
  isGameOver: boolean;
  isBulletTime: boolean;
  bulletTimeRemaining: number;
  lastParryRating: ParryRating | null;
  lastParryTime: number;
  playerPos: { x: number; y: number };
  projectiles: Projectile[];
  enemies: EnemyDrone[];
  slashEffects: SlashEffect[];
  stats: {
    perfects: number;
    guards: number;
    misses: number;
    slashes: number;
    reflectedHits: number;
  };
}

export function createInitialKatanaState(config: NeonKatanaConfig = DEFAULT_KATANA_CONFIG): GameState {
  return {
    time: 0,
    wave: 1,
    hp: config.maxHp,
    maxHp: config.maxHp,
    score: 0,
    combo: 0,
    maxCombo: 0,
    gauge: 0,
    isGameOver: false,
    isBulletTime: false,
    bulletTimeRemaining: 0,
    lastParryRating: null,
    lastParryTime: 0,
    playerPos: { x: 300, y: 400 }, // center of 600x500 canvas
    projectiles: [],
    enemies: [],
    slashEffects: [],
    stats: {
      perfects: 0,
      guards: 0,
      misses: 0,
      slashes: 0,
      reflectedHits: 0,
    },
  };
}

/**
 * Spawns an incoming enemy drone based on current wave.
 */
export function spawnWaveEnemy(state: GameState, idSuffix: string = ""): EnemyDrone {
  const types: Array<EnemyDrone["type"]> = ["scout", "scout", "assault"];
  if (state.wave >= 2) types.push("sniper");
  if (state.wave >= 3) types.push("slicer");

  const chosenType = types[Math.floor(Math.random() * types.length)] ?? "scout";
  const angle = Math.random() * Math.PI * 2;
  const spawnDist = 320; // spawn in circle around player

  const x = state.playerPos.x + Math.cos(angle) * spawnDist;
  const y = state.playerPos.y + Math.sin(angle) * spawnDist;

  const drone: EnemyDrone = {
    id: `drone-${chosenType}-${Date.now()}-${idSuffix}`,
    type: chosenType,
    x,
    y,
    targetX: state.playerPos.x + Math.cos(angle) * 160,
    targetY: state.playerPos.y + Math.sin(angle) * 160,
    hp: chosenType === "assault" ? 3 : chosenType === "sniper" ? 2 : 1,
    maxHp: chosenType === "assault" ? 3 : chosenType === "sniper" ? 2 : 1,
    attackCooldown: 0.8 + Math.random() * 1.2,
    attackInterval: chosenType === "assault" ? 2.5 : chosenType === "sniper" ? 3.0 : 2.0,
  };

  return drone;
}

/**
 * Creates a projectile targeted from enemy to player.
 */
export function createProjectile(
  enemy: EnemyDrone,
  targetPos: { x: number; y: number },
  currentTime: number,
  wave: number,
  config: NeonKatanaConfig = DEFAULT_KATANA_CONFIG
): Projectile {
  const dx = targetPos.x - enemy.x;
  const dy = targetPos.y - enemy.y;
  const dist = Math.hypot(dx, dy) || 1;

  const speedMultiplier = 1 + (wave - 1) * 0.12;
  let speed = config.baseBulletSpeed * speedMultiplier;
  let type: Projectile["type"] = "bullet";
  let radius = 7;
  let damage = 1;

  if (enemy.type === "sniper") {
    type = "laser";
    speed *= 1.6;
    radius = 5;
    damage = 2;
  } else if (enemy.type === "slicer") {
    type = "shuriken";
    speed *= 0.9;
    radius = 11;
  } else if (enemy.type === "assault") {
    type = "heavy";
    speed *= 1.1;
    radius = 8;
  }

  const travelTime = dist / speed;

  return {
    id: `proj-${currentTime}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    x: enemy.x,
    y: enemy.y,
    vx: (dx / dist) * speed,
    vy: (dy / dist) * speed,
    speed,
    radius,
    damage,
    spawnTime: currentTime,
    targetTime: currentTime + travelTime,
    reflected: false,
  };
}

/**
 * Evaluates parry timing against all nearby incoming projectiles.
 */
export function executeParry(
  state: GameState,
  config: NeonKatanaConfig = DEFAULT_KATANA_CONFIG
): { rating: ParryRating; projectileCount: number; newState: GameState } {
  if (state.isGameOver) return { rating: "miss", projectileCount: 0, newState: state };

  const s = { ...state };
  let bestRating: ParryRating = "miss";
  let parriedCount = 0;

  const now = s.time;
  const newProjectiles: Projectile[] = [];

  for (const p of s.projectiles) {
    if (p.reflected) {
      newProjectiles.push(p);
      continue;
    }

    // Distance to player
    const distToPlayer = Math.hypot(p.x - s.playerPos.x, p.y - s.playerPos.y);
    const timeDeltaMs = Math.abs(p.targetTime - now) * 1000;

    // Is it in the parry radius (< 110px) or within timing window?
    const inHitZone = distToPlayer <= 110 || timeDeltaMs <= config.guardWindowMs;

    if (inHitZone) {
      if (timeDeltaMs <= config.perfectWindowMs) {
        // Perfect parry! Reflect projectile towards nearest enemy
        bestRating = "perfect";
        parriedCount++;
        const nearestEnemy = findNearestEnemy(s.enemies, p.x, p.y);
        let targetX = p.x - p.vx;
        let targetY = p.y - p.vy;

        if (nearestEnemy) {
          targetX = nearestEnemy.x;
          targetY = nearestEnemy.y;
        }

        const dx = targetX - p.x;
        const dy = targetY - p.y;
        const dist = Math.hypot(dx, dy) || 1;
        const reflectSpeed = p.speed * 1.5;

        newProjectiles.push({
          ...p,
          reflected: true,
          vx: (dx / dist) * reflectSpeed,
          vy: (dy / dist) * reflectSpeed,
        });
      } else if (timeDeltaMs <= config.guardWindowMs) {
        // Guard parry: neutralize projectile
        if (bestRating !== "perfect") bestRating = "guard";
        parriedCount++;
        // Not added back to projectiles (neutralized)
      } else {
        newProjectiles.push(p);
      }
    } else {
      newProjectiles.push(p);
    }
  }

  s.projectiles = newProjectiles;
  s.lastParryRating = bestRating;
  s.lastParryTime = now;

  if (bestRating === "perfect") {
    s.combo += 1;
    if (s.combo > s.maxCombo) s.maxCombo = s.combo;
    const comboMult = 1 + Math.min(4.0, (s.combo - 1) * 0.2);
    s.score += Math.round(150 * parriedCount * comboMult);
    s.gauge = Math.min(config.dashGaugeMax, s.gauge + 25 * parriedCount);
    s.stats.perfects += parriedCount;
  } else if (bestRating === "guard") {
    s.combo += 1;
    if (s.combo > s.maxCombo) s.maxCombo = s.combo;
    s.score += 50 * parriedCount;
    s.gauge = Math.min(config.dashGaugeMax, s.gauge + 10 * parriedCount);
    s.stats.guards += parriedCount;
  }

  return { rating: bestRating, projectileCount: parriedCount, newState: s };
}

/**
 * Executes Blade-Dash (일섬) if gauge is full (100).
 * Destroys all visible projectiles and slashes all enemies in dash direction.
 */
export function executeBladeDash(
  state: GameState,
  directionAngle: number = 0,
  config: NeonKatanaConfig = DEFAULT_KATANA_CONFIG
): { executed: boolean; eliminatedEnemies: number; newState: GameState } {
  if (state.gauge < config.dashGaugeMax || state.isGameOver) {
    return { executed: false, eliminatedEnemies: 0, newState: state };
  }

  const s = { ...state };
  s.gauge = 0;
  s.isBulletTime = true;
  s.bulletTimeRemaining = 1.8; // 1.8s slow-motion bullet time
  s.stats.slashes += 1;

  // Slash line across entire screen
  const slashDist = 450;
  const x1 = s.playerPos.x - Math.cos(directionAngle) * (slashDist * 0.5);
  const y1 = s.playerPos.y - Math.sin(directionAngle) * (slashDist * 0.5);
  const x2 = s.playerPos.x + Math.cos(directionAngle) * (slashDist * 0.5);
  const y2 = s.playerPos.y + Math.sin(directionAngle) * (slashDist * 0.5);

  s.slashEffects = [
    ...s.slashEffects,
    {
      id: `slash-${Date.now()}`,
      x1,
      y1,
      x2,
      y2,
      color: "#00f3ff",
      duration: 0.6,
      createdAt: s.time,
    },
  ];

  // Eliminate all enemy projectiles in the line of sight
  s.projectiles = s.projectiles.filter((p) => p.reflected);

  // Eliminate/damage enemies
  let eliminated = 0;
  s.enemies = s.enemies.map((e) => {
    // Slashed
    eliminated++;
    return { ...e, hp: 0, destroyed: true };
  });

  const comboBonus = 1 + s.combo * 0.15;
  s.score += Math.round(500 * eliminated * comboBonus);
  s.combo += eliminated;
  if (s.combo > s.maxCombo) s.maxCombo = s.combo;

  return { executed: true, eliminatedEnemies: eliminated, newState: s };
}

/**
 * Step the game state by delta time (dt in seconds).
 */
export function stepKatanaGame(
  state: GameState,
  dt: number,
  config: NeonKatanaConfig = DEFAULT_KATANA_CONFIG
): GameState {
  if (state.isGameOver) return state;

  const s = { ...state };
  const effectiveDt = s.isBulletTime ? dt * 0.25 : dt;
  s.time += effectiveDt;

  // Handle bullet-time countdown
  if (s.isBulletTime) {
    s.bulletTimeRemaining -= dt;
    if (s.bulletTimeRemaining <= 0) {
      s.isBulletTime = false;
      s.bulletTimeRemaining = 0;
    }
  }

  // Wave advancement (every 18 seconds or score thresholds)
  const targetWave = 1 + Math.floor(s.time / 18);
  if (targetWave > s.wave) {
    s.wave = targetWave;
    // wave clear bonus
    s.score += s.wave * 250;
    if (s.hp < s.maxHp) s.hp += 1; // heal 1 on wave clear
  }

  // Update slash effects
  s.slashEffects = s.slashEffects.filter((eff) => s.time - eff.createdAt < eff.duration);

  // Update enemies and spawn bullets
  const updatedEnemies: EnemyDrone[] = [];
  const spawnedProjectiles: Projectile[] = [];

  for (const enemy of s.enemies) {
    if (enemy.destroyed || enemy.hp <= 0) continue;

    const e = { ...enemy };
    // Move towards target pos
    const dtx = e.targetX - e.x;
    const dty = e.targetY - e.y;
    const moveDist = Math.hypot(dtx, dty);
    if (moveDist > 2) {
      e.x += (dtx / moveDist) * 45 * effectiveDt;
      e.y += (dty / moveDist) * 45 * effectiveDt;
    }

    e.attackCooldown -= effectiveDt;
    if (e.attackCooldown <= 0) {
      spawnedProjectiles.push(createProjectile(e, s.playerPos, s.time, s.wave, config));
      e.attackCooldown = e.attackInterval * (0.8 + Math.random() * 0.4);
    }

    updatedEnemies.push(e);
  }

  // Spawn new enemies if count < 2 + wave
  const maxEnemies = Math.min(7, 2 + s.wave);
  if (updatedEnemies.length < maxEnemies && Math.random() < effectiveDt * 1.5) {
    updatedEnemies.push(spawnWaveEnemy(s, String(updatedEnemies.length)));
  }
  s.enemies = updatedEnemies;

  // Update projectiles
  const updatedProjectiles: Projectile[] = [];
  for (const p of [...s.projectiles, ...spawnedProjectiles]) {
    const nextP = {
      ...p,
      x: p.x + p.vx * effectiveDt,
      y: p.y + p.vy * effectiveDt,
    };

    if (nextP.reflected) {
      // Check collision with enemies
      let hitEnemy = false;
      for (const enemy of s.enemies) {
        if (enemy.hp <= 0) continue;
        const d = Math.hypot(nextP.x - enemy.x, nextP.y - enemy.y);
        if (d < 24) {
          enemy.hp -= 2;
          hitEnemy = true;
          s.score += 200;
          s.stats.reflectedHits += 1;
          if (enemy.hp <= 0) {
            enemy.destroyed = true;
            s.score += 300;
          }
          break;
        }
      }
      if (!hitEnemy && nextP.x > -50 && nextP.x < 650 && nextP.y > -50 && nextP.y < 550) {
        updatedProjectiles.push(nextP);
      }
    } else {
      // Incoming bullet towards player
      const distToPlayer = Math.hypot(nextP.x - s.playerPos.x, nextP.y - s.playerPos.y);
      if (distToPlayer <= nextP.radius + 12) {
        // Player hit!
        s.hp -= nextP.damage;
        s.combo = 0;
        s.stats.misses += 1;
        s.lastParryRating = "miss";
        if (s.hp <= 0) {
          s.hp = 0;
          s.isGameOver = true;
        }
      } else if (nextP.x > -80 && nextP.x < 680 && nextP.y > -80 && nextP.y < 580) {
        updatedProjectiles.push(nextP);
      }
    }
  }
  s.projectiles = updatedProjectiles;

  return s;
}

function findNearestEnemy(enemies: EnemyDrone[], x: number, y: number): EnemyDrone | null {
  let nearest: EnemyDrone | null = null;
  let minDist = Infinity;
  for (const e of enemies) {
    if (e.hp <= 0 || e.destroyed) continue;
    const d = Math.hypot(e.x - x, e.y - y);
    if (d < minDist) {
      minDist = d;
      nearest = e;
    }
  }
  return nearest;
}

/**
 * Monte Carlo balance audit to test sustainability, score distribution,
 * and parry mechanics across different player skill tiers.
 */
export interface MonteCarloResult {
  trials: number;
  avgScore: number;
  avgWavesSurvived: number;
  avgCombos: number;
  survivalRateAtWave3: number;
}

export function runNeonKatanaMonteCarloAudit(
  trials: number = 30,
  playerSkill: "novice" | "adept" | "master" = "adept",
  seed: number = 1337
): MonteCarloResult {
  let rng = seed;
  const nextRandom = () => {
    rng = (rng * 1664525 + 1013904223) >>> 0;
    return rng / 4294967296;
  };

  const perfectProb = playerSkill === "master" ? 0.95 : playerSkill === "adept" ? 0.65 : 0.35;
  const guardProb = playerSkill === "master" ? 0.04 : playerSkill === "adept" ? 0.22 : 0.30;

  let totalScore = 0;
  let totalWaves = 0;
  let totalCombos = 0;
  let reachedWave3 = 0;

  for (let t = 0; t < trials; t++) {
    let state = createInitialKatanaState();
    // Simulate initial enemy
    state.enemies.push(spawnWaveEnemy(state, `mc-${t}`));

    const maxSteps = 1200; // max ~20 seconds of gameplay (60fps simulation)
    const dt = 1 / 60;

    for (let step = 0; step < maxSteps; step++) {
      if (state.isGameOver) break;

      // Check if incoming projectile is close
      for (const p of state.projectiles) {
        if (p.reflected) continue;
        const dist = Math.hypot(p.x - state.playerPos.x, p.y - state.playerPos.y);
        if (dist <= 100) {
          const roll = nextRandom();
          if (roll < perfectProb) {
            // Simulated perfect parry
            p.targetTime = state.time; // perfect alignment
            const res = executeParry(state);
            state = res.newState;
          } else if (roll < perfectProb + guardProb) {
            p.targetTime = state.time + 0.18; // guard alignment
            const res = executeParry(state);
            state = res.newState;
          }
          break;
        }
      }

      // Check blade dash
      if (state.gauge >= 100) {
        const res = executeBladeDash(state, nextRandom() * Math.PI * 2);
        state = res.newState;
      }

      state = stepKatanaGame(state, dt);
    }

    totalScore += state.score;
    totalWaves += state.wave;
    totalCombos += state.maxCombo;
    if (state.wave >= 3) reachedWave3++;
  }

  return {
    trials,
    avgScore: Math.round(totalScore / trials),
    avgWavesSurvived: Number((totalWaves / trials).toFixed(2)),
    avgCombos: Math.round(totalCombos / trials),
    survivalRateAtWave3: Number(((reachedWave3 / trials) * 100).toFixed(1)),
  };
}
