/**
 * Cheese Factory Tycoon (#154) - Core Simulation Engine
 *
 * Integrates Web-Unity Engine systems:
 * 1. ArchetypeEcsWorld (engine-v5): SoA memory-cache friendly entity tracking for mass milk/curd/cheese items
 * 2. computeSteeringBoids2D (engine-v5): Multi-agent collision-avoiding transport robots (AGVs)
 * 3. Monte Carlo automated economic & balance audit
 */

import {
  ArchetypeEcsWorld,
  EcsComponentFlag,
  computeSteeringBoids2D,
  type BoidAgent2D,
} from './engine-v5';

export type CheeseVariety =
  | 'mozzarella'
  | 'cheddar'
  | 'gouda'
  | 'parmigiano'
  | 'roquefort';

export interface CheeseVarietyDef {
  readonly id: CheeseVariety;
  readonly name: string;
  readonly requiredTechLevel: number;
  readonly baseMilkCost: number;
  readonly targetAgingTime: number; // in seconds
  readonly idealTemp: number; // Celsius
  readonly basePrice: number;
  readonly color: string;
}

export const CHEESE_VARIETIES: Record<CheeseVariety, CheeseVarietyDef> = {
  mozzarella: {
    id: 'mozzarella',
    name: 'Fresh Mozzarella',
    requiredTechLevel: 1,
    baseMilkCost: 15,
    targetAgingTime: 4,
    idealTemp: 18,
    basePrice: 38,
    color: '#f8fafc',
  },
  cheddar: {
    id: 'cheddar',
    name: 'Aged Farmhouse Cheddar',
    requiredTechLevel: 2,
    baseMilkCost: 30,
    targetAgingTime: 10,
    idealTemp: 12,
    basePrice: 85,
    color: '#fbbf24',
  },
  gouda: {
    id: 'gouda',
    name: 'Red Wax Gouda',
    requiredTechLevel: 3,
    baseMilkCost: 50,
    targetAgingTime: 16,
    idealTemp: 14,
    basePrice: 150,
    color: '#f97316',
  },
  roquefort: {
    id: 'roquefort',
    name: 'Cave Roquefort Blue',
    requiredTechLevel: 4,
    baseMilkCost: 80,
    targetAgingTime: 22,
    idealTemp: 9,
    basePrice: 260,
    color: '#38bdf8',
  },
  parmigiano: {
    id: 'parmigiano',
    name: 'Parmigiano-Reggiano Wheel',
    requiredTechLevel: 5,
    baseMilkCost: 120,
    targetAgingTime: 30,
    idealTemp: 15,
    basePrice: 450,
    color: '#eab308',
  },
};

export type StationType =
  | 'milk_silo'
  | 'pasteurizer'
  | 'curd_vat'
  | 'press_mold'
  | 'salting'
  | 'aging_cellar'
  | 'shipping';

export interface FactoryStation {
  readonly id: StationType;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  level: number;
  capacity: number;
  processSpeedMultiplier: number;
}

export interface TransportBot extends BoidAgent2D {
  targetStationIndex: number;
  carryingItemEntityId: number; // -1 if empty
  battery: number; // 0..100
}

export interface FactoryUpgrade {
  readonly id: string;
  readonly name: string;
  readonly cost: number;
  readonly effect: string;
  purchased: boolean;
}

export interface CheeseFactoryGameState {
  cash: number;
  milkInventory: number;
  maxMilkCapacity: number;
  cellarTemp: number; // degrees C
  targetCellarTemp: number;
  techLevel: number;
  selectedVariety: CheeseVariety;
  totalCheesesShipped: number;
  totalRevenueEarned: number;
  simulationTime: number;
  isPaused: boolean;
  ecsWorld: ArchetypeEcsWorld;
  stations: FactoryStation[];
  bots: TransportBot[];
  upgrades: FactoryUpgrade[];
  recentLogs: string[];
}

export const INITIAL_FACTORY_STATIONS: FactoryStation[] = [
  {
    id: 'milk_silo',
    name: 'Alpine Milk Silo',
    x: 40,
    y: 120,
    width: 60,
    height: 70,
    level: 1,
    capacity: 500,
    processSpeedMultiplier: 1.0,
  },
  {
    id: 'pasteurizer',
    name: 'Thermal Pasteurizer',
    x: 130,
    y: 120,
    width: 60,
    height: 70,
    level: 1,
    capacity: 4,
    processSpeedMultiplier: 1.0,
  },
  {
    id: 'curd_vat',
    name: 'Curd Coagulation Vat',
    x: 220,
    y: 120,
    width: 65,
    height: 70,
    level: 1,
    capacity: 4,
    processSpeedMultiplier: 1.0,
  },
  {
    id: 'press_mold',
    name: 'Hydraulic Cheese Press',
    x: 315,
    y: 120,
    width: 60,
    height: 70,
    level: 1,
    capacity: 4,
    processSpeedMultiplier: 1.0,
  },
  {
    id: 'salting',
    name: 'Brine Bath Basin',
    x: 405,
    y: 120,
    width: 60,
    height: 70,
    level: 1,
    capacity: 4,
    processSpeedMultiplier: 1.0,
  },
  {
    id: 'aging_cellar',
    name: 'Alpine Aging Cellar',
    x: 495,
    y: 120,
    width: 80,
    height: 90,
    level: 1,
    capacity: 12,
    processSpeedMultiplier: 1.0,
  },
  {
    id: 'shipping',
    name: 'Gourmet Shipping Bay',
    x: 605,
    y: 120,
    width: 65,
    height: 70,
    level: 1,
    capacity: 8,
    processSpeedMultiplier: 1.0,
  },
];

export const INITIAL_UPGRADES: FactoryUpgrade[] = [
  {
    id: 'milk_pipeline',
    name: 'High-Volume Pasture Tanker',
    cost: 120,
    effect: 'Increases milk silo refill rate by 100%',
    purchased: false,
  },
  {
    id: 'automated_agv_1',
    name: 'Autonomous AGV Transport Bot #3',
    cost: 250,
    effect: 'Adds a 3rd autonomous transport robot with boids navigation',
    purchased: false,
  },
  {
    id: 'precision_chiller',
    name: 'Cryo-Precision Cellar Chiller',
    cost: 400,
    effect: 'Maintains ideal curing temperature with 0% decay',
    purchased: false,
  },
  {
    id: 'artisan_appellation',
    name: 'AOP Artisan Swiss Certification',
    cost: 800,
    effect: 'Permanently increases all cheese selling prices by 35%',
    purchased: false,
  },
];

/**
 * Entity tag packing for Cheese Item in ArchetypeEcsWorld:
 * tag = (stageIndex & 0x0F) | ((varietyIndex & 0x0F) << 4) | ((qualityPercent & 0xFF) << 8)
 */
export function packCheeseTag(stageIndex: number, varietyIndex: number, quality: number): number {
  const s = Math.max(0, Math.min(15, stageIndex));
  const v = Math.max(0, Math.min(15, varietyIndex));
  const q = Math.max(0, Math.min(255, Math.floor(quality)));
  return s | (v << 4) | (q << 8);
}

export function unpackCheeseTag(tag: number): {
  stageIndex: number;
  varietyIndex: number;
  quality: number;
} {
  return {
    stageIndex: tag & 0x0f,
    varietyIndex: (tag >> 4) & 0x0f,
    quality: (tag >> 8) & 0xff,
  };
}

const VARIETY_INDEX_MAP: CheeseVariety[] = [
  'mozzarella',
  'cheddar',
  'gouda',
  'roquefort',
  'parmigiano',
];

export function createCheeseFactoryGame(initialCash: number = 300): CheeseFactoryGameState {
  const ecs = new ArchetypeEcsWorld(256);

  const bots: TransportBot[] = [
    {
      id: 1,
      x: 100,
      y: 240,
      vx: 0,
      vy: 0,
      maxSpeed: 80,
      radius: 12,
      targetStationIndex: 0,
      carryingItemEntityId: -1,
      battery: 100,
    },
    {
      id: 2,
      x: 350,
      y: 240,
      vx: 0,
      vy: 0,
      maxSpeed: 80,
      radius: 12,
      targetStationIndex: 3,
      carryingItemEntityId: -1,
      battery: 100,
    },
  ];

  return {
    cash: initialCash,
    milkInventory: 200,
    maxMilkCapacity: 500,
    cellarTemp: 18,
    targetCellarTemp: 18,
    techLevel: 1,
    selectedVariety: 'mozzarella',
    totalCheesesShipped: 0,
    totalRevenueEarned: 0,
    simulationTime: 0,
    isPaused: false,
    ecsWorld: ecs,
    stations: INITIAL_FACTORY_STATIONS.map((s) => ({ ...s })),
    bots,
    upgrades: INITIAL_UPGRADES.map((u) => ({ ...u })),
    recentLogs: ['Welcome to Alpine Cheese Factory Tycoon!', 'Select recipe and manage your cellar.'],
  };
}

/**
 * Spawns a new curd/cheese batch from milk silo into processing
 */
export function spawnCheeseBatch(
  state: CheeseFactoryGameState,
  variety: CheeseVariety
): boolean {
  const def = CHEESE_VARIETIES[variety];
  if (!def) return false;
  if (state.milkInventory < def.baseMilkCost) {
    return false;
  }

  const silo = state.stations[0];
  const mask =
    EcsComponentFlag.TRANSFORM |
    EcsComponentFlag.VELOCITY |
    EcsComponentFlag.HEALTH |
    EcsComponentFlag.COLLIDER;

  const entityId = state.ecsWorld.spawn(
    mask,
    silo.x + silo.width / 2,
    silo.y + silo.height / 2,
    0, // Maturity 0%
    8
  );

  if (entityId < 0) return false;

  state.milkInventory -= def.baseMilkCost;
  const varietyIdx = VARIETY_INDEX_MAP.indexOf(variety);
  state.ecsWorld.tag[entityId] = packCheeseTag(0, varietyIdx >= 0 ? varietyIdx : 0, 100);

  return true;
}

/**
 * Step the factory simulation forward by dt seconds
 */
export function stepCheeseFactory(
  state: CheeseFactoryGameState,
  dtSeconds: number
): {
  shippedCount: number;
  revenueGained: number;
} {
  if (state.isPaused || dtSeconds <= 0) {
    return { shippedCount: 0, revenueGained: 0 };
  }

  const dt = Math.min(0.2, dtSeconds);
  state.simulationTime += dt;

  // 1. Natural milk delivery tanker trickle
  const hasTankerUpgrade = state.upgrades.some((u) => u.id === 'milk_pipeline' && u.purchased);
  const milkDeliveryRate = hasTankerUpgrade ? 16 : 8; // units per second
  state.milkInventory = Math.min(
    state.maxMilkCapacity,
    state.milkInventory + milkDeliveryRate * dt
  );

  // 2. Cellar temperature thermal inertia step
  const tempDiff = state.targetCellarTemp - state.cellarTemp;
  state.cellarTemp += tempDiff * dt * 0.5;

  let totalShipped = 0;
  let totalRevenue = 0;

  const hasAopBonus = state.upgrades.some(
    (u) => u.id === 'artisan_appellation' && u.purchased
  );
  const priceMultiplier = hasAopBonus ? 1.35 : 1.0;

  // 3. Process ECS cheese entities through stations
  const entitiesToDestroy: number[] = [];

  state.ecsWorld.query(EcsComponentFlag.TRANSFORM | EcsComponentFlag.HEALTH, (eId) => {
    const rawTag = state.ecsWorld.tag[eId];
    const { stageIndex, varietyIndex, quality } = unpackCheeseTag(rawTag);
    const variety = VARIETY_INDEX_MAP[varietyIndex] || 'mozzarella';
    const def = CHEESE_VARIETIES[variety];

    const currentStation = state.stations[stageIndex];
    if (!currentStation) return;

    // Advance item along station or mature
    if (stageIndex === 5) {
      // Aging Cellar stage: maturity progresses based on cellar temp match
      const tempDelta = Math.abs(state.cellarTemp - def.idealTemp);
      const tempEfficiency = Math.max(0.4, 1.0 - tempDelta * 0.08);
      const agingRate = (100 / Math.max(1, def.targetAgingTime)) * tempEfficiency;

      state.ecsWorld.hp[eId] += agingRate * dt;

      // Conveyor visual slight drift across cellar
      state.ecsWorld.x[eId] =
        currentStation.x + 10 + (state.ecsWorld.hp[eId] / 100) * (currentStation.width - 20);

      if (state.ecsWorld.hp[eId] >= 100) {
        // Matured! Advance to Shipping Bay
        state.ecsWorld.hp[eId] = 100;
        state.ecsWorld.tag[eId] = packCheeseTag(6, varietyIndex, quality);
        state.ecsWorld.x[eId] = state.stations[6].x + state.stations[6].width / 2;
        state.ecsWorld.y[eId] = state.stations[6].y + state.stations[6].height / 2;
      }
    } else if (stageIndex === 6) {
      // Shipping Bay: sell immediately
      const unitValue = Math.floor(def.basePrice * (quality / 100) * priceMultiplier);
      state.cash += unitValue;
      state.totalRevenueEarned += unitValue;
      state.totalCheesesShipped += 1;
      totalRevenue += unitValue;
      totalShipped += 1;
      entitiesToDestroy.push(eId);
    } else {
      // Stations 0..4 (Milk Silo -> Pasteurizer -> Curd Vat -> Press Mold -> Salting)
      // Progress from left station to right station smoothly
      const nextStation = state.stations[stageIndex + 1];
      const targetX = nextStation.x + nextStation.width / 2;
      const targetY = nextStation.y + nextStation.height / 2;

      const speed = 45 * currentStation.processSpeedMultiplier;
      const dx = targetX - state.ecsWorld.x[eId];
      const dy = targetY - state.ecsWorld.y[eId];
      const dist = Math.hypot(dx, dy);

      if (dist < 8) {
        // Arrived at next station
        state.ecsWorld.tag[eId] = packCheeseTag(stageIndex + 1, varietyIndex, quality);
        state.ecsWorld.x[eId] = targetX;
        state.ecsWorld.y[eId] = targetY;
      } else {
        state.ecsWorld.x[eId] += (dx / dist) * speed * dt;
        state.ecsWorld.y[eId] += (dy / dist) * speed * dt;
      }
    }
  });

  for (const destroyId of entitiesToDestroy) {
    state.ecsWorld.destroy(destroyId);
  }

  // 4. Autonomous AGV Transport Bots (Steering Boids)
  const stationWaypoints = state.stations.map((s) => ({
    x: s.x + s.width / 2,
    y: s.y + s.height + 40,
  }));

  for (let i = 0; i < state.bots.length; i++) {
    const bot = state.bots[i];
    const targetWaypoint = stationWaypoints[bot.targetStationIndex % stationWaypoints.length];

    // Compute boids steering against other bots
    const steer = computeSteeringBoids2D(bot, state.bots, targetWaypoint.x, targetWaypoint.y, {
      separation: 2.5,
      alignment: 0.6,
      cohesion: 0.4,
      goalSeek: 1.8,
    });

    bot.vx = steer.vx;
    bot.vy = steer.vy;
    bot.x += bot.vx * dt;
    bot.y += bot.vy * dt;

    // Cycle through station inspection waypoints
    const distToGoal = Math.hypot(bot.x - targetWaypoint.x, bot.y - targetWaypoint.y);
    if (distToGoal < 20) {
      bot.targetStationIndex = (bot.targetStationIndex + 1) % stationWaypoints.length;
    }
  }

  return {
    shippedCount: totalShipped,
    revenueGained: totalRevenue,
  };
}

/**
 * Purchases a factory upgrade if affordable
 */
export function buyFactoryUpgrade(
  state: CheeseFactoryGameState,
  upgradeId: string
): boolean {
  const upgrade = state.upgrades.find((u) => u.id === upgradeId);
  if (!upgrade || upgrade.purchased || state.cash < upgrade.cost) {
    return false;
  }

  state.cash -= upgrade.cost;
  upgrade.purchased = true;

  if (upgradeId === 'automated_agv_1') {
    state.bots.push({
      id: state.bots.length + 1,
      x: 200,
      y: 240,
      vx: 0,
      vy: 0,
      maxSpeed: 85,
      radius: 12,
      targetStationIndex: 2,
      carryingItemEntityId: -1,
      battery: 100,
    });
  } else if (upgradeId === 'precision_chiller') {
    state.targetCellarTemp = 12; // Ideal cheddar/gouda average
  }

  return true;
}

/**
 * Upgrades a specific station level
 */
export function upgradeStation(
  state: CheeseFactoryGameState,
  stationId: StationType
): boolean {
  const station = state.stations.find((s) => s.id === stationId);
  if (!station) return false;

  const cost = Math.floor(60 * Math.pow(1.6, station.level - 1));
  if (state.cash < cost) return false;

  state.cash -= cost;
  station.level += 1;
  station.processSpeedMultiplier += 0.35;
  station.capacity += 2;
  return true;
}

/**
 * Sets target cellar temperature
 */
export function setCellarTargetTemp(
  state: CheeseFactoryGameState,
  tempCelsius: number
): void {
  state.targetCellarTemp = Math.max(4, Math.min(25, tempCelsius));
}

/**
 * Monte Carlo Balance and Financial Health Audit
 * Simulates 180 seconds of automated factory operations across diverse recipes.
 * Verifies:
 * 1. Cash never drops below 0 (no bankruptcy).
 * 2. At least 10 cheeses successfully aged and shipped.
 * 3. Final cash > initial cash (profitable ROI).
 */
export function runCheeseFactoryBalanceAudit(
  simulationSeconds: number = 180
): {
  passed: boolean;
  totalShipped: number;
  finalCash: number;
  initialCash: number;
  roi: number;
} {
  const state = createCheeseFactoryGame(300);
  const dt = 0.1;
  const totalTicks = Math.floor(simulationSeconds / dt);

  const recipes: CheeseVariety[] = ['mozzarella', 'cheddar', 'gouda'];
  let recipeIdx = 0;

  for (let tick = 0; tick < totalTicks; tick++) {
    // Attempt spawning a batch every 3 seconds if milk allows
    if (tick % 30 === 0) {
      const variety = recipes[recipeIdx % recipes.length];
      if (spawnCheeseBatch(state, variety)) {
        recipeIdx++;
      }
    }

    // Auto-purchase upgrades when rich
    if (state.cash >= 250 && !state.upgrades[1].purchased) {
      buyFactoryUpgrade(state, 'automated_agv_1');
    }
    if (state.cash >= 120 && !state.upgrades[0].purchased) {
      buyFactoryUpgrade(state, 'milk_pipeline');
    }

    stepCheeseFactory(state, dt);

    if (state.cash < 0) {
      return {
        passed: false,
        totalShipped: state.totalCheesesShipped,
        finalCash: state.cash,
        initialCash: 300,
        roi: state.cash / 300,
      };
    }
  }

  const roi = state.cash / 300;
  const passed = state.totalCheesesShipped >= 10 && roi > 1.2;

  return {
    passed,
    totalShipped: state.totalCheesesShipped,
    finalCash: state.cash,
    initialCash: 300,
    roi,
  };
}
