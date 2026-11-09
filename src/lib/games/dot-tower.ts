/**
 * DotTower - Retro Pixel Tower Defense & Minimal Wave Strategy Engine
 *
 * Core mechanics:
 * - 16x10 Grid battlefield with a winding path from spawn to castle
 * - 4 Tower Archetypes: Archer (rapid single target), Cannon (splash AOE), Frost (slow aura), Tesla (chain lightning)
 * - 3 Upgrade Tiers per tower (Damage, Range, Attack Rate, Special Effects)
 * - 15 Procedural waves of scaling monsters (Scout, Brute, Ghost, Golem, Wave 15 Shadow Dragon Boss)
 * - Gold economy & 20 Castle Life points
 * - Deterministic PRNG with Xorshift32
 */

export type TowerType = "archer" | "cannon" | "frost" | "tesla";

export interface TowerDefinition {
  type: TowerType;
  nameKey: string;
  names: Record<string, string>;
  cost: number;
  baseRange: number; // in grid cells
  baseDamage: number;
  baseFireRate: number; // attacks per second
  splashRadius: number; // 0 for single target, >0 for AOE
  slowFactor: number; // 0.0 = no slow, 0.4 = 40% slow
  chainCount: number; // 1 = single, 3 = chain lightning
  color: string;
}

export const TOWER_DEFINITIONS: Record<TowerType, TowerDefinition> = {
  archer: {
    type: "archer",
    nameKey: "archer",
    names: { ko: "궁수 타워", en: "Archer Tower", ja: "弓兵の塔", zh: "弓手箭塔", fr: "Tour d'Archer", es: "Torre de Arqueros" },
    cost: 100,
    baseRange: 2.8,
    baseDamage: 12,
    baseFireRate: 1.5,
    splashRadius: 0,
    slowFactor: 0,
    chainCount: 1,
    color: "#22c55e",
  },
  cannon: {
    type: "cannon",
    nameKey: "cannon",
    names: { ko: "대포 타워", en: "Cannon Tower", ja: "大砲の塔", zh: "重炮塔", fr: "Tour à Canon", es: "Torre de Cañón" },
    cost: 150,
    baseRange: 2.3,
    baseDamage: 35,
    baseFireRate: 0.6,
    splashRadius: 1.2,
    slowFactor: 0,
    chainCount: 1,
    color: "#ef4444",
  },
  frost: {
    type: "frost",
    nameKey: "frost",
    names: { ko: "서리 타워", en: "Frost Tower", ja: "氷結の塔", zh: "寒冰塔", fr: "Tour de Givre", es: "Torre de Escarcha" },
    cost: 125,
    baseRange: 2.2,
    baseDamage: 8,
    baseFireRate: 1.0,
    splashRadius: 0.8,
    slowFactor: 0.45,
    chainCount: 1,
    color: "#38bdf8",
  },
  tesla: {
    type: "tesla",
    nameKey: "tesla",
    names: { ko: "테슬라 타워", en: "Tesla Tower", ja: "雷電の塔", zh: "特斯拉电塔", fr: "Tour Tesla", es: "Torre Tesla" },
    cost: 200,
    baseRange: 2.5,
    baseDamage: 24,
    baseFireRate: 0.9,
    splashRadius: 0,
    slowFactor: 0,
    chainCount: 3,
    color: "#eab308",
  },
};

export interface GridCoord {
  x: number;
  y: number;
}

export const GRID_COLS = 16;
export const GRID_ROWS = 10;

// Fixed winding S-curve pathway from left to right castle
export const PATH_WAYPOINTS: GridCoord[] = [
  { x: 0, y: 2 },
  { x: 5, y: 2 },
  { x: 5, y: 6 },
  { x: 2, y: 6 },
  { x: 2, y: 8 },
  { x: 10, y: 8 },
  { x: 10, y: 4 },
  { x: 7, y: 4 },
  { x: 7, y: 1 },
  { x: 14, y: 1 },
  { x: 14, y: 5 },
  { x: 15, y: 5 },
];

export interface TowerInstance {
  id: string;
  type: TowerType;
  x: number;
  y: number;
  level: number; // 1, 2, 3
  cooldown: number; // seconds until next attack
  targetId: string | null;
}

export type EnemyType = "scout" | "brute" | "ghost" | "golem" | "dragon_boss";

export interface EnemyInstance {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  pathIndex: number;
  progress: number; // 0.0 to 1.0 along current waypoint segment
  hp: number;
  maxHp: number;
  speed: number; // grid cells per second
  bounty: number; // Gold awarded on death
  slowTimer: number; // seconds remaining slowed
  isBoss: boolean;
}

export interface Projectile {
  id: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  progress: number; // 0 to 1
  damage: number;
  splashRadius: number;
  slowFactor: number;
  chainCount: number;
  color: string;
}

export type GameStatus = "idle" | "wave_running" | "wave_cleared" | "game_over" | "victory";

export interface TowerDefenseState {
  status: GameStatus;
  gold: number;
  castleHp: number;
  maxCastleHp: number;
  wave: number;
  maxWave: number;
  towers: TowerInstance[];
  enemies: EnemyInstance[];
  projectiles: Projectile[];
  selectedCell: GridCoord | null;
  spawnQueue: { type: EnemyType; delay: number }[];
  spawnTimer: number;
  speedMultiplier: number; // 1 or 2
  totalKills: number;
  logMessage: string;
}

export class TowerRng {
  private s: number;
  constructor(seed = 987654321) {
    this.s = (seed ^ 0x6d2b79f5) | 1;
  }
  next(): number {
    this.s ^= this.s << 13;
    this.s ^= this.s >>> 17;
    this.s ^= this.s << 5;
    return (this.s >>> 0) / 4294967296;
  }
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

/**
 * Check if a cell coordinate is on the path.
 */
export function isCellOnPath(x: number, y: number): boolean {
  for (let i = 0; i < PATH_WAYPOINTS.length - 1; i++) {
    const a = PATH_WAYPOINTS[i];
    const b = PATH_WAYPOINTS[i + 1];
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x, b.x);
    const minY = Math.min(a.y, b.y);
    const maxY = Math.max(a.y, b.y);

    if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
      return true;
    }
  }
  return false;
}

export function createTowerGame(seed = 12345): TowerDefenseState {
  return {
    status: "idle",
    gold: 250,
    castleHp: 20,
    maxCastleHp: 20,
    wave: 1,
    maxWave: 15,
    towers: [],
    enemies: [],
    projectiles: [],
    selectedCell: null,
    spawnQueue: [],
    spawnTimer: 0,
    speedMultiplier: 1,
    totalKills: 0,
    logMessage: "원하는 위치를 클릭하여 타워를 배치하고 웨이브를 시작하세요!",
  };
}

/**
 * Place a new tower on an empty grid cell.
 */
export function placeTower(state: TowerDefenseState, x: number, y: number, type: TowerType): TowerDefenseState {
  if (x < 0 || x >= GRID_COLS || y < 0 || y >= GRID_ROWS) return state;
  if (isCellOnPath(x, y)) return state;

  // Check if cell already occupied
  if (state.towers.some((t) => t.x === x && t.y === y)) return state;

  const def = TOWER_DEFINITIONS[type];
  if (state.gold < def.cost) return state;

  const newTower: TowerInstance = {
    id: `tower_${x}_${y}_${Date.now()}`,
    type,
    x,
    y,
    level: 1,
    cooldown: 0,
    targetId: null,
  };

  return {
    ...state,
    gold: state.gold - def.cost,
    towers: [...state.towers, newTower],
    selectedCell: { x, y },
    logMessage: `[${def.names.ko || def.names.en}] 배치 완료 (-${def.cost}G)`,
  };
}

/**
 * Upgrade an existing tower.
 */
export function upgradeTower(state: TowerDefenseState, towerId: string): TowerDefenseState {
  const tower = state.towers.find((t) => t.id === towerId);
  if (!tower || tower.level >= 3) return state;

  const def = TOWER_DEFINITIONS[tower.type];
  const upgradeCost = Math.round(def.cost * (tower.level === 1 ? 1.2 : 1.8));

  if (state.gold < upgradeCost) return state;

  return {
    ...state,
    gold: state.gold - upgradeCost,
    towers: state.towers.map((t) => (t.id === towerId ? { ...t, level: t.level + 1 } : t)),
    logMessage: `[${def.names.ko || def.names.en}] Lv.${tower.level + 1} 강화 완료 (-${upgradeCost}G)`,
  };
}

/**
 * Sell an existing tower for 70% refund.
 */
export function sellTower(state: TowerDefenseState, towerId: string): TowerDefenseState {
  const tower = state.towers.find((t) => t.id === towerId);
  if (!tower) return state;

  const def = TOWER_DEFINITIONS[tower.type];
  const totalCost = def.cost + (tower.level > 1 ? def.cost * 1.2 : 0) + (tower.level > 2 ? def.cost * 1.8 : 0);
  const refund = Math.round(totalCost * 0.7);

  return {
    ...state,
    gold: state.gold + refund,
    towers: state.towers.filter((t) => t.id !== towerId),
    selectedCell: null,
    logMessage: `[${def.names.ko || def.names.en}] 판매 완료 (+${refund}G)`,
  };
}

/**
 * Prepare and start next wave.
 */
export function startWave(state: TowerDefenseState): TowerDefenseState {
  if (state.status !== "idle" && state.status !== "wave_cleared") return state;

  const wave = state.wave;
  const queue: { type: EnemyType; delay: number }[] = [];

  if (wave === 15) {
    // Final Boss Wave!
    queue.push({ type: "dragon_boss", delay: 0.5 });
    for (let i = 0; i < 8; i++) queue.push({ type: "brute", delay: 1.0 });
    for (let i = 0; i < 12; i++) queue.push({ type: "scout", delay: 0.6 });
  } else {
    // Normal waves
    const scoutCount = 4 + wave * 2;
    const bruteCount = Math.floor(wave / 2);
    const ghostCount = wave >= 5 ? Math.floor((wave - 4) * 1.5) : 0;
    const golemCount = wave >= 8 ? Math.floor((wave - 7) * 1.2) : 0;

    for (let i = 0; i < scoutCount; i++) queue.push({ type: "scout", delay: 0.8 });
    for (let i = 0; i < bruteCount; i++) queue.push({ type: "brute", delay: 1.4 });
    for (let i = 0; i < ghostCount; i++) queue.push({ type: "ghost", delay: 1.0 });
    for (let i = 0; i < golemCount; i++) queue.push({ type: "golem", delay: 2.0 });
  }

  return {
    ...state,
    status: "wave_running",
    spawnQueue: queue,
    spawnTimer: 0.5,
    logMessage: `제 ${wave} 웨이브 적군 침공 개시! 방어선을 사수하세요!`,
  };
}

/**
 * Main game tick update loop.
 */
export function stepTowerGame(state: TowerDefenseState, dt: number, rng: TowerRng): TowerDefenseState {
  if (state.status !== "wave_running") return state;

  const effDt = dt * state.speedMultiplier;
  let gold = state.gold;
  let castleHp = state.castleHp;
  let totalKills = state.totalKills;

  // 1. Spawning
  let spawnQueue = [...state.spawnQueue];
  let spawnTimer = state.spawnTimer - effDt;
  const newEnemies = [...state.enemies];

  if (spawnTimer <= 0 && spawnQueue.length > 0) {
    const nextSpawn = spawnQueue.shift()!;
    spawnTimer = nextSpawn.delay;

    const baseHp =
      nextSpawn.type === "scout"
        ? 35 + state.wave * 12
        : nextSpawn.type === "brute"
        ? 90 + state.wave * 30
        : nextSpawn.type === "ghost"
        ? 60 + state.wave * 18
        : nextSpawn.type === "golem"
        ? 220 + state.wave * 60
        : 1800; // dragon_boss

    const speed =
      nextSpawn.type === "scout"
        ? 1.8
        : nextSpawn.type === "brute"
        ? 0.9
        : nextSpawn.type === "ghost"
        ? 2.2
        : nextSpawn.type === "golem"
        ? 0.7
        : 0.65;

    const bounty =
      nextSpawn.type === "scout"
        ? 8
        : nextSpawn.type === "brute"
        ? 18
        : nextSpawn.type === "ghost"
        ? 14
        : nextSpawn.type === "golem"
        ? 40
        : 500;

    newEnemies.push({
      id: `enemy_${Date.now()}_${rng.next()}`,
      type: nextSpawn.type,
      x: PATH_WAYPOINTS[0].x,
      y: PATH_WAYPOINTS[0].y,
      pathIndex: 0,
      progress: 0,
      hp: baseHp,
      maxHp: baseHp,
      speed,
      bounty,
      slowTimer: 0,
      isBoss: nextSpawn.type === "dragon_boss",
    });
  }

  // 2. Enemy Movement along Waypoints
  const survivingEnemies: EnemyInstance[] = [];
  for (const enemy of newEnemies) {
    const p1 = PATH_WAYPOINTS[enemy.pathIndex];
    const p2 = PATH_WAYPOINTS[enemy.pathIndex + 1];

    if (!p2) {
      // Reached the castle!
      const leakDamage = enemy.isBoss ? 10 : enemy.type === "golem" ? 3 : 1;
      castleHp = Math.max(0, castleHp - leakDamage);
      continue;
    }

    const segDx = p2.x - p1.x;
    const segDy = p2.y - p1.y;
    const segLen = Math.hypot(segDx, segDy) || 1;

    const actualSpeed = enemy.slowTimer > 0 ? enemy.speed * 0.55 : enemy.speed;
    const nextProgress = enemy.progress + (actualSpeed * effDt) / segLen;

    if (nextProgress >= 1.0) {
      // Advance to next waypoint
      const nextIdx = enemy.pathIndex + 1;
      if (nextIdx >= PATH_WAYPOINTS.length - 1) {
        // Reached castle!
        const leakDamage = enemy.isBoss ? 10 : enemy.type === "golem" ? 3 : 1;
        castleHp = Math.max(0, castleHp - leakDamage);
      } else {
        survivingEnemies.push({
          ...enemy,
          pathIndex: nextIdx,
          progress: 0,
          x: p2.x,
          y: p2.y,
          slowTimer: Math.max(0, enemy.slowTimer - effDt),
        });
      }
    } else {
      survivingEnemies.push({
        ...enemy,
        progress: nextProgress,
        x: p1.x + segDx * nextProgress,
        y: p1.y + segDy * nextProgress,
        slowTimer: Math.max(0, enemy.slowTimer - effDt),
      });
    }
  }

  // Check Game Over
  if (castleHp <= 0) {
    return {
      ...state,
      status: "game_over",
      castleHp: 0,
      enemies: survivingEnemies,
      logMessage: "성문이 돌파당했습니다! 방어선이 무너졌습니다.",
    };
  }

  // 3. Tower Targeting and Attacks
  const newProjectiles = [...state.projectiles];
  const updatedTowers = state.towers.map((tower) => {
    let cooldown = tower.cooldown - effDt;
    const def = TOWER_DEFINITIONS[tower.type];
    const range = def.baseRange * (tower.level === 1 ? 1.0 : tower.level === 2 ? 1.25 : 1.55);
    const damage = def.baseDamage * (tower.level === 1 ? 1.0 : tower.level === 2 ? 2.1 : 3.6);
    const fireRate = def.baseFireRate * (tower.level === 3 ? 1.3 : 1.0);

    if (cooldown <= 0) {
      // Find enemies in range
      const inRangeEnemies = survivingEnemies.filter((e) => Math.hypot(e.x - tower.x, e.y - tower.y) <= range);

      if (inRangeEnemies.length > 0) {
        // Target closest to castle (highest pathIndex & progress)
        inRangeEnemies.sort((a, b) => b.pathIndex + b.progress - (a.pathIndex + a.progress));
        const target = inRangeEnemies[0];

        cooldown = 1.0 / fireRate;
        newProjectiles.push({
          id: `proj_${Date.now()}_${rng.next()}`,
          startX: tower.x + 0.5,
          startY: tower.y + 0.5,
          targetX: target.x + 0.5,
          targetY: target.y + 0.5,
          progress: 0,
          damage,
          splashRadius: def.splashRadius,
          slowFactor: def.slowFactor,
          chainCount: def.chainCount,
          color: def.color,
        });

        return { ...tower, cooldown, targetId: target.id };
      }
    }
    return { ...tower, cooldown };
  });

  // 4. Projectile movement and Impact Resolution
  const activeProjectiles: Projectile[] = [];
  for (const proj of newProjectiles) {
    const nextProg = proj.progress + 6.0 * effDt;
    if (nextProg >= 1.0) {
      // Impact!
      for (const enemy of survivingEnemies) {
        const dist = Math.hypot(enemy.x + 0.5 - proj.targetX, enemy.y + 0.5 - proj.targetY);
        const radius = proj.splashRadius > 0 ? proj.splashRadius : 0.6;

        if (dist <= radius) {
          enemy.hp -= proj.damage;
          if (proj.slowFactor > 0) {
            enemy.slowTimer = 2.5; // 2.5s slow
          }
        }
      }
    } else {
      activeProjectiles.push({ ...proj, progress: nextProg });
    }
  }

  // 5. Remove Dead Enemies & Award Bounties
  const remainingEnemies: EnemyInstance[] = [];
  for (const enemy of survivingEnemies) {
    if (enemy.hp <= 0) {
      gold += enemy.bounty;
      totalKills++;
    } else {
      remainingEnemies.push(enemy);
    }
  }

  // 6. Wave Clear / Victory Check
  if (spawnQueue.length === 0 && remainingEnemies.length === 0) {
    if (state.wave >= state.maxWave) {
      return {
        ...state,
        status: "victory",
        gold,
        castleHp,
        wave: state.wave,
        towers: updatedTowers,
        enemies: [],
        projectiles: [],
        totalKills,
        logMessage: "축하합니다! 15웨이브 전설의 그림자 드래곤을 격퇴하고 왕국을 지켜냈습니다!",
      };
    }

    const waveBonus = 50 + state.wave * 15;
    return {
      ...state,
      status: "wave_cleared",
      gold: gold + waveBonus,
      castleHp,
      wave: state.wave + 1,
      towers: updatedTowers,
      enemies: [],
      projectiles: [],
      totalKills,
      logMessage: `제 ${state.wave} 웨이브 클리어! 보너스 +${waveBonus}G 획득. 다음 웨이브를 준비하세요.`,
    };
  }

  return {
    ...state,
    gold,
    castleHp,
    spawnQueue,
    spawnTimer,
    enemies: remainingEnemies,
    towers: updatedTowers,
    projectiles: activeProjectiles,
    totalKills,
  };
}
