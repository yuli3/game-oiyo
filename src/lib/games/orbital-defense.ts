export type TurretType = "laser" | "plasma" | "missile";

export interface TurretSpec {
  name: string;
  cost: number;
  range: number;
  fireRate: number; // shots per second
  damage: number;
  upgradeCost: number;
  color: number;
}

export const TURRET_SPECS: Record<TurretType, TurretSpec> = {
  laser: {
    name: "Laser Sentinel",
    cost: 50,
    range: 4.5,
    fireRate: 1.5,
    damage: 15,
    upgradeCost: 40,
    color: 0x38bdf8,
  },
  plasma: {
    name: "Plasma Cannon",
    cost: 80,
    range: 6.0,
    fireRate: 0.8,
    damage: 35,
    upgradeCost: 65,
    color: 0xa855f7,
  },
  missile: {
    name: "Orbital Missile",
    cost: 120,
    range: 8.0,
    fireRate: 0.5,
    damage: 75,
    upgradeCost: 95,
    color: 0xf59e0b,
  },
};

export interface OrbitSlot {
  orbitIndex: number; // 0 (Low: r=3.0), 1 (Mid: r=5.0), 2 (High: r=7.0)
  slotIndex: number;
  angle: number; // in radians
  radius: number;
  turretId: string | null;
}

export interface Turret {
  id: string;
  orbitIndex: number;
  slotIndex: number;
  type: TurretType;
  level: number;
  range: number;
  damage: number;
  fireRate: number;
  lastFired: number; // timestamp in seconds
  angle: number;
  radius: number;
}

export type EnemyType = "scout" | "cruiser" | "dreadnought";

export interface Enemy {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  z: number;
  hp: number;
  maxHp: number;
  speed: number;
  reward: number;
  radius: number;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  z: number;
  targetId: string;
  damage: number;
  speed: number;
  color: number;
}

export interface OrbitalDefenseState {
  planetHealth: number;
  maxPlanetHealth: number;
  gold: number;
  score: number;
  wave: number;
  isWaveActive: boolean;
  isGameOver: boolean;
  slots: OrbitSlot[];
  turrets: Turret[];
  enemies: Enemy[];
  projectiles: Projectile[];
  time: number;
}

export const ORBIT_CONFIG = [
  { radius: 3.0, slotCount: 4 }, // Low orbit
  { radius: 5.0, slotCount: 6 }, // Mid orbit
  { radius: 7.0, slotCount: 8 }, // High orbit
];

export const PLANET_RADIUS = 1.5;

export function createOrbitSlots(): OrbitSlot[] {
  const slots: OrbitSlot[] = [];
  ORBIT_CONFIG.forEach((cfg, oIdx) => {
    for (let sIdx = 0; sIdx < cfg.slotCount; sIdx++) {
      const angle = (sIdx / cfg.slotCount) * Math.PI * 2;
      slots.push({
        orbitIndex: oIdx,
        slotIndex: sIdx,
        angle,
        radius: cfg.radius,
        turretId: null,
      });
    }
  });
  return slots;
}

export function createInitialState(): OrbitalDefenseState {
  return {
    planetHealth: 100,
    maxPlanetHealth: 100,
    gold: 150,
    score: 0,
    wave: 1,
    isWaveActive: false,
    isGameOver: false,
    slots: createOrbitSlots(),
    turrets: [],
    enemies: [],
    projectiles: [],
    time: 0,
  };
}

export function buildTurret(
  state: OrbitalDefenseState,
  orbitIndex: number,
  slotIndex: number,
  type: TurretType
): boolean {
  if (state.isGameOver) return false;
  const spec = TURRET_SPECS[type];
  if (state.gold < spec.cost) return false;

  const slot = state.slots.find(
    (s) => s.orbitIndex === orbitIndex && s.slotIndex === slotIndex
  );
  if (!slot || slot.turretId !== null) return false;

  const turretId = `turret-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  state.gold -= spec.cost;

  const turret: Turret = {
    id: turretId,
    orbitIndex,
    slotIndex,
    type,
    level: 1,
    range: spec.range,
    damage: spec.damage,
    fireRate: spec.fireRate,
    lastFired: 0,
    angle: slot.angle,
    radius: slot.radius,
  };

  slot.turretId = turretId;
  state.turrets.push(turret);
  return true;
}

export function upgradeTurret(state: OrbitalDefenseState, turretId: string): boolean {
  if (state.isGameOver) return false;
  const turret = state.turrets.find((t) => t.id === turretId);
  if (!turret) return false;

  const spec = TURRET_SPECS[turret.type];
  const cost = spec.upgradeCost * turret.level;
  if (state.gold < cost) return false;

  state.gold -= cost;
  turret.level += 1;
  turret.damage = Math.round(turret.damage * 1.35);
  turret.range = Math.min(10, +(turret.range * 1.1).toFixed(1));
  turret.fireRate = +(turret.fireRate * 1.15).toFixed(2);
  return true;
}

export function startWave(state: OrbitalDefenseState): void {
  if (state.isGameOver || state.isWaveActive) return;
  state.isWaveActive = true;
  state.enemies = [];

  const baseCount = 5 + state.wave * 3;
  for (let i = 0; i < baseCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 14 + Math.random() * 6 + (i * 0.8);
    const z = (Math.random() - 0.5) * 3;

    let type: EnemyType = "scout";
    let hp = 30 + state.wave * 10;
    let speed = 1.6 + state.wave * 0.08;
    let reward = 12;

    if (i % 4 === 0 && state.wave >= 2) {
      type = "cruiser";
      hp = 80 + state.wave * 25;
      speed = 1.0 + state.wave * 0.05;
      reward = 25;
    } else if (i === baseCount - 1 && state.wave >= 3) {
      type = "dreadnought";
      hp = 220 + state.wave * 60;
      speed = 0.65;
      reward = 60;
    }

    state.enemies.push({
      id: `enemy-${state.wave}-${i}`,
      type,
      x: distance * Math.cos(angle),
      y: (Math.random() - 0.5) * 2,
      z: distance * Math.sin(angle) + z,
      hp,
      maxHp: hp,
      speed,
      reward,
      radius: type === "dreadnought" ? 0.7 : type === "cruiser" ? 0.5 : 0.35,
    });
  }
}

export function tickGame(state: OrbitalDefenseState, dt: number): void {
  if (state.isGameOver) return;
  state.time += dt;

  // 1. Move enemies toward center (planet at 0, 0, 0)
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];
    const dist = Math.hypot(e.x, e.y, e.z);

    if (dist <= PLANET_RADIUS) {
      // Enemy hit planet
      state.planetHealth = Math.max(0, state.planetHealth - (e.type === "dreadnought" ? 30 : e.type === "cruiser" ? 15 : 8));
      state.enemies.splice(i, 1);
      if (state.planetHealth <= 0) {
        state.isGameOver = true;
        return;
      }
      continue;
    }

    // Normalized direction toward 0,0,0
    const dirX = -e.x / dist;
    const dirY = -e.y / dist;
    const dirZ = -e.z / dist;

    e.x += dirX * e.speed * dt;
    e.y += dirY * e.speed * dt;
    e.z += dirZ * e.speed * dt;
  }

  // 2. Turret Targeting and Firing
  state.turrets.forEach((turret) => {
    // Current turret 3D position
    const tx = turret.radius * Math.cos(turret.angle);
    const ty = 0;
    const tz = turret.radius * Math.sin(turret.angle);

    if (state.time - turret.lastFired < 1 / turret.fireRate) return;

    // Find closest enemy in range
    let bestEnemy: Enemy | null = null;
    let bestDist = turret.range;

    for (const enemy of state.enemies) {
      const d = Math.hypot(enemy.x - tx, enemy.y - ty, enemy.z - tz);
      if (d <= bestDist) {
        bestDist = d;
        bestEnemy = enemy;
      }
    }

    if (bestEnemy) {
      turret.lastFired = state.time;
      const spec = TURRET_SPECS[turret.type];
      state.projectiles.push({
        id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        x: tx,
        y: ty,
        z: tz,
        targetId: bestEnemy.id,
        damage: turret.damage,
        speed: turret.type === "laser" ? 18 : turret.type === "plasma" ? 12 : 9,
        color: spec.color,
      });
    }
  });

  // 3. Move Projectiles and Check Hits
  for (let pIdx = state.projectiles.length - 1; pIdx >= 0; pIdx--) {
    const p = state.projectiles[pIdx];
    const target = state.enemies.find((e) => e.id === p.targetId);

    if (!target) {
      // Target was killed or missing, discard
      state.projectiles.splice(pIdx, 1);
      continue;
    }

    const dx = target.x - p.x;
    const dy = target.y - p.y;
    const dz = target.z - p.z;
    const dist = Math.hypot(dx, dy, dz);

    if (dist <= 0.6) {
      // Hit target
      target.hp -= p.damage;
      state.projectiles.splice(pIdx, 1);

      if (target.hp <= 0) {
        const eIdx = state.enemies.indexOf(target);
        if (eIdx !== -1) {
          state.enemies.splice(eIdx, 1);
          state.gold += target.reward;
          state.score += target.reward * 10;
        }
      }
    } else {
      p.x += (dx / dist) * p.speed * dt;
      p.y += (dy / dist) * p.speed * dt;
      p.z += (dz / dist) * p.speed * dt;
    }
  }

  // 4. Wave Completion Check
  if (state.isWaveActive && state.enemies.length === 0) {
    state.isWaveActive = false;
    state.gold += 30 + state.wave * 15; // Wave completion bonus
    state.score += 200 * state.wave;
    state.wave += 1;
  }
}
