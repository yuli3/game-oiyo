/**
 * DotMiner — Subterranean Pixel Mining & Resource Crafting Engine.
 *
 * Implements:
 * 1. Seeded deterministic PRNG (Xorshift32) for deep subterranean strata generation.
 * 2. Multi-tier depth zones (Surface, Shallow Clay, Dense Stone, Granite, Obsidian, Abyssal Core).
 * 3. Mineral veins (Coal, Copper, Iron, Silver, Gold, Ruby, Diamond, Core Star).
 * 4. Resource loop: Fuel consumption, Cargo capacity, Surface depot refuel & sell.
 * 5. Upgrades (Drill Power, Fuel Tank, Cargo Hull, Armor Plating, Mineral Radar).
 * 6. Environmental hazards: Unstable falling boulders and lava pockets.
 * 7. Victory condition: Extract the Core Star from Depth 150m+ and return safely to the surface.
 */

// ─── 1. DETERMINISTIC PRNG ───────────────────────────────────────────────────

export class MinerRng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0 || 0xdeadbeef;
  }

  next(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return (this.state >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

// ─── 2. WORLD & TILE CONSTANTS ────────────────────────────────────────────────

export const MINER_WORLD_WIDTH = 32;
export const MINER_WORLD_DEPTH = 160;
export const SURFACE_Y = 2; // y <= 2 is surface town / sky

export const enum BlockType {
  Air = 0,
  SurfaceGrass = 1,
  Dirt = 2,
  Clay = 3,
  Stone = 4,
  Granite = 5,
  Obsidian = 6,
  // Minerals
  Coal = 10,
  Copper = 11,
  Iron = 12,
  Silver = 13,
  Gold = 14,
  Ruby = 15,
  Diamond = 16,
  CoreStar = 17,
  // Hazards
  Boulder = 20,
  Lava = 21,
}

export interface OreMeta {
  name: string;
  value: number;
  symbol: string;
  color: string;
}

export const ORE_REGISTRY: Record<number, OreMeta> = {
  [BlockType.Coal]: { name: "Coal Chunk", value: 15, symbol: "C", color: "#5F574F" },
  [BlockType.Copper]: { name: "Copper Ore", value: 35, symbol: "Cu", color: "#AB5236" },
  [BlockType.Iron]: { name: "Iron Ore", value: 80, symbol: "Fe", color: "#C2C3C7" },
  [BlockType.Silver]: { name: "Silver Vein", value: 180, symbol: "Ag", color: "#FFF1E8" },
  [BlockType.Gold]: { name: "Gold Nugget", value: 400, symbol: "Au", color: "#FFEC27" },
  [BlockType.Ruby]: { name: "Ruby Gem", value: 850, symbol: "Ru", color: "#FF004D" },
  [BlockType.Diamond]: { name: "Diamond", value: 1800, symbol: "Di", color: "#29ADFF" },
  [BlockType.CoreStar]: { name: "Ancient Core Star", value: 10000, symbol: "★", color: "#00F0FF" },
};

export interface MinerUpgrades {
  drill: number; // 1 to 5: drill hardness efficiency
  fuel: number; // 1 to 5: max fuel
  cargo: number; // 1 to 5: inventory slots
  hull: number; // 1 to 5: max HP
  radar: number; // 1 to 3: illumination radius
}

export interface CargoItem {
  id: string;
  type: BlockType;
  name: string;
  value: number;
  color: string;
}

export interface MinerState {
  version: 1;
  seed: number;
  x: number;
  y: number;
  fuel: number;
  maxFuel: number;
  hull: number;
  maxHull: number;
  cash: number;
  depthMax: number;
  upgrades: MinerUpgrades;
  cargo: CargoItem[];
  cargoCapacity: number;
  blocks: BlockType[]; // 1D array of size MINER_WORLD_WIDTH * MINER_WORLD_DEPTH
  blockDamage: number[]; // remaining hits before breaking
  status: "mining" | "surface" | "victory" | "gameover";
  message: string;
  turns: number;
  hasCoreStar: boolean;
}

// ─── 3. STRATA & HARDNESS ────────────────────────────────────────────────────

export function getBlockIndex(x: number, y: number): number {
  return y * MINER_WORLD_WIDTH + x;
}

export function isInsideWorld(x: number, y: number): boolean {
  return x >= 0 && x < MINER_WORLD_WIDTH && y >= 0 && y < MINER_WORLD_DEPTH;
}

export function getBlockHardness(type: BlockType): number {
  switch (type) {
    case BlockType.Air:
      return 0;
    case BlockType.SurfaceGrass:
    case BlockType.Dirt:
      return 1;
    case BlockType.Clay:
    case BlockType.Coal:
      return 2;
    case BlockType.Stone:
    case BlockType.Copper:
    case BlockType.Iron:
      return 3;
    case BlockType.Granite:
    case BlockType.Silver:
    case BlockType.Gold:
      return 4;
    case BlockType.Obsidian:
    case BlockType.Ruby:
    case BlockType.Diamond:
    case BlockType.CoreStar:
      return 5;
    case BlockType.Boulder:
      return 999; // Indestructible
    case BlockType.Lava:
      return 999; // Hazard
    default:
      return 1;
  }
}

// ─── 4. PROCEDURAL WORLD GENERATION ──────────────────────────────────────────

export function generateMinerWorld(rng: MinerRng): {
  blocks: BlockType[];
  blockDamage: number[];
} {
  const total = MINER_WORLD_WIDTH * MINER_WORLD_DEPTH;
  const blocks: BlockType[] = new Array(total).fill(BlockType.Dirt);
  const blockDamage: number[] = new Array(total).fill(1);

  // Surface layer
  for (let x = 0; x < MINER_WORLD_WIDTH; x++) {
    // Sky
    blocks[getBlockIndex(x, 0)] = BlockType.Air;
    // Surface ground
    blocks[getBlockIndex(x, 1)] = BlockType.SurfaceGrass;
    // Entrance tunnel in center
    if (x === 15 || x === 16) {
      blocks[getBlockIndex(x, 1)] = BlockType.Air;
      blocks[getBlockIndex(x, 2)] = BlockType.Air;
    }
  }

  // Subterranean strata
  for (let y = 3; y < MINER_WORLD_DEPTH; y++) {
    for (let x = 0; x < MINER_WORLD_WIDTH; x++) {
      const idx = getBlockIndex(x, y);

      let baseBlock = BlockType.Dirt;
      if (y >= 10 && y < 35) {
        baseBlock = rng.next() < 0.6 ? BlockType.Clay : BlockType.Dirt;
      } else if (y >= 35 && y < 75) {
        baseBlock = rng.next() < 0.7 ? BlockType.Stone : BlockType.Clay;
      } else if (y >= 75 && y < 120) {
        baseBlock = rng.next() < 0.75 ? BlockType.Granite : BlockType.Stone;
      } else if (y >= 120) {
        baseBlock = rng.next() < 0.8 ? BlockType.Obsidian : BlockType.Granite;
      }

      blocks[idx] = baseBlock;

      // Rare hazard pockets
      const hazardRoll = rng.next();
      if (y > 15 && hazardRoll < 0.035) {
        blocks[idx] = BlockType.Boulder;
      } else if (y > 50 && hazardRoll < 0.05) {
        blocks[idx] = BlockType.Lava;
      }

      // Natural caverns / empty pockets
      if (y > 12 && rng.next() < 0.06) {
        blocks[idx] = BlockType.Air;
      }
    }
  }

  // Mineral Vein Seeds
  // 1. Coal (y: 5 to 40)
  spawnVeins(rng, blocks, BlockType.Coal, 28, 5, 40, 3, 5);
  // 2. Copper (y: 12 to 55)
  spawnVeins(rng, blocks, BlockType.Copper, 24, 12, 55, 3, 4);
  // 3. Iron (y: 30 to 80)
  spawnVeins(rng, blocks, BlockType.Iron, 20, 30, 80, 2, 4);
  // 4. Silver (y: 50 to 105)
  spawnVeins(rng, blocks, BlockType.Silver, 16, 50, 105, 2, 4);
  // 5. Gold (y: 75 to 135)
  spawnVeins(rng, blocks, BlockType.Gold, 12, 75, 135, 2, 3);
  // 6. Ruby (y: 100 to 150)
  spawnVeins(rng, blocks, BlockType.Ruby, 9, 100, 150, 1, 3);
  // 7. Diamond (y: 125 to 158)
  spawnVeins(rng, blocks, BlockType.Diamond, 6, 125, 158, 1, 2);

  // 8. Legendary Core Star (guaranteed spawn at depth 152 to 156 near center)
  const coreStarX = rng.range(13, 18);
  const coreStarY = rng.range(152, 156);
  blocks[getBlockIndex(coreStarX, coreStarY)] = BlockType.CoreStar;

  // Initialize block damage table
  for (let i = 0; i < total; i++) {
    blockDamage[i] = getBlockHardness(blocks[i]);
  }

  return { blocks, blockDamage };
}

function spawnVeins(
  rng: MinerRng,
  blocks: BlockType[],
  ore: BlockType,
  veinCount: number,
  minY: number,
  maxY: number,
  minSize: number,
  maxSize: number
): void {
  for (let v = 0; v < veinCount; v++) {
    const cx = rng.range(1, MINER_WORLD_WIDTH - 2);
    const cy = rng.range(minY, maxY);
    const size = rng.range(minSize, maxSize);

    for (let s = 0; s < size; s++) {
      const ox = cx + rng.range(-1, 1);
      const oy = cy + rng.range(-1, 1);
      if (isInsideWorld(ox, oy) && oy >= 3) {
        const idx = getBlockIndex(ox, oy);
        if (blocks[idx] !== BlockType.Air && blocks[idx] !== BlockType.Boulder && blocks[idx] !== BlockType.Lava) {
          blocks[idx] = ore;
        }
      }
    }
  }
}

// ─── 5. INITIAL STATE CREATION ────────────────────────────────────────────────

export function createMinerGame(seed: number = Date.now()): MinerState {
  const rng = new MinerRng(seed);
  const { blocks, blockDamage } = generateMinerWorld(rng);

  return {
    version: 1,
    seed,
    x: 15,
    y: 1, // start on surface
    fuel: 100,
    maxFuel: 100,
    hull: 100,
    maxHull: 100,
    cash: 0,
    depthMax: 1,
    upgrades: {
      drill: 1,
      fuel: 1,
      cargo: 1,
      hull: 1,
      radar: 1,
    },
    cargo: [],
    cargoCapacity: 10,
    blocks,
    blockDamage,
    status: "surface",
    message: "Welcome to Dot Miner! Drill deep, gather valuable ores, and bring back the Core Star.",
    turns: 0,
    hasCoreStar: false,
  };
}

// ─── 6. STEP ACTION & LOGIC ──────────────────────────────────────────────────

export type MinerDirection = "up" | "down" | "left" | "right";

export interface MinerStepResult {
  state: MinerState;
  events: {
    moved: boolean;
    drilled: boolean;
    brokeBlock: boolean;
    collectedOre: boolean;
    refueledAtSurface: boolean;
    tookDamage: boolean;
    boulderFell: boolean;
    outOfFuel: boolean;
    victory: boolean;
  };
}

export function stepMiner(
  currentState: MinerState,
  action: { type: "move"; dir: MinerDirection } | { type: "upgrade"; upgradeType: keyof MinerUpgrades }
): MinerStepResult {
  const state: MinerState = {
    ...currentState,
    upgrades: { ...currentState.upgrades },
    cargo: [...currentState.cargo],
    blocks: [...currentState.blocks],
    blockDamage: [...currentState.blockDamage],
  };

  const events = {
    moved: false,
    drilled: false,
    brokeBlock: false,
    collectedOre: false,
    refueledAtSurface: false,
    tookDamage: false,
    boulderFell: false,
    outOfFuel: false,
    victory: false,
  };

  if (state.status === "victory" || state.status === "gameover") {
    return { state, events };
  }

  // Handle upgrade purchase
  if (action.type === "upgrade") {
    const cost = getUpgradeCost(action.upgradeType, state.upgrades[action.upgradeType]);
    if (state.cash >= cost && state.upgrades[action.upgradeType] < getMaxUpgradeLevel(action.upgradeType)) {
      state.cash -= cost;
      state.upgrades[action.upgradeType] += 1;
      applyUpgradeStats(state);
      state.message = `Upgraded ${action.upgradeType.toUpperCase()} to Level ${state.upgrades[action.upgradeType]}!`;
    }
    return { state, events };
  }

  // Handle movement & drilling
  state.turns += 1;

  const delta = getDelta(action.dir);
  const targetX = state.x + delta.x;
  const targetY = state.y + delta.y;

  if (!isInsideWorld(targetX, targetY)) {
    return { state, events };
  }

  const targetIdx = getBlockIndex(targetX, targetY);
  const targetType = state.blocks[targetIdx];

  if (targetType === BlockType.Air) {
    // Free movement
    state.x = targetX;
    state.y = targetY;
    state.fuel = Math.max(0, state.fuel - 0.4);
    events.moved = true;
  } else if (targetType === BlockType.Lava) {
    // Hazard damage
    state.hull -= 25;
    events.tookDamage = true;
    state.message = "WARNING: Touched molten lava! Hull integrity damaged!";
    if (state.hull <= 0) {
      handleDestruction(state, "Miner pod melted in subterranean lava!");
      events.tookDamage = true;
      return { state, events };
    }
  } else if (targetType === BlockType.Boulder) {
    // Solid obstacle
    state.message = "Impassable granite boulder blocks the path.";
  } else {
    // Diggable rock or ore
    events.drilled = true;
    state.fuel = Math.max(0, state.fuel - 1.5);

    // Drill power scales damage per strike
    const drillDamage = state.upgrades.drill;
    state.blockDamage[targetIdx] -= drillDamage;

    if (state.blockDamage[targetIdx] <= 0) {
      // Block shattered!
      events.brokeBlock = true;
      const brokenType = state.blocks[targetIdx];
      state.blocks[targetIdx] = BlockType.Air;

      // Move into cleared space
      state.x = targetX;
      state.y = targetY;
      events.moved = true;

      // Ore collection
      if (ORE_REGISTRY[brokenType]) {
        const meta = ORE_REGISTRY[brokenType];
        if (brokenType === BlockType.CoreStar) {
          state.hasCoreStar = true;
          state.cargo.push({
            id: `ore-${Date.now()}`,
            type: brokenType,
            name: meta.name,
            value: meta.value,
            color: meta.color,
          });
          events.collectedOre = true;
          state.message = "★ AMAZING! You extracted the Ancient Core Star! Return to surface!";
        } else if (state.cargo.length < state.cargoCapacity) {
          state.cargo.push({
            id: `ore-${Date.now()}-${Math.random()}`,
            type: brokenType,
            name: meta.name,
            value: meta.value,
            color: meta.color,
          });
          events.collectedOre = true;
          state.message = `Collected ${meta.name} (Value: $${meta.value})!`;
        } else {
          state.message = `Cargo full! Could not fit ${meta.name}.`;
        }
      }
    }
  }

  // Update max depth
  if (state.y > state.depthMax) {
    state.depthMax = state.y;
  }

  // Check surface arrival
  if (state.y <= SURFACE_Y) {
    state.status = "surface";
    // Check victory condition
    if (state.hasCoreStar) {
      state.status = "victory";
      events.victory = true;
      state.cash += 10000;
      state.message = "★ MISSION ACCOMPLISHED! You delivered the Core Star to the Surface!";
      return { state, events };
    }

    // Auto-refuel & repair
    if (state.fuel < state.maxFuel || state.hull < state.maxHull) {
      state.fuel = state.maxFuel;
      state.hull = state.maxHull;
      events.refueledAtSurface = true;
    }

    // Sell cargo automatically
    if (state.cargo.length > 0) {
      let earned = 0;
      for (const item of state.cargo) {
        earned += item.value;
      }
      state.cash += earned;
      state.cargo = [];
      state.message = `Surface Depot: Sold all minerals for +$${earned}! Fuel and hull restored.`;
    }
  } else {
    state.status = "mining";
  }

  // Check out-of-fuel distress
  if (state.fuel <= 0 && state.y > SURFACE_Y) {
    events.outOfFuel = true;
    handleEmergencyRescue(state);
  }

  // Physics: Boulders fall down if space underneath is air
  simulateBoulderPhysics(state, events);

  return { state, events };
}

function handleEmergencyRescue(state: MinerState): void {
  const penalty = Math.floor(state.cash * 0.3);
  state.cash -= penalty;
  state.cargo = [];
  state.x = 15;
  state.y = 1;
  state.fuel = state.maxFuel;
  state.hull = state.maxHull;
  state.status = "surface";
  state.message = `EMERGENCY RESCUE: Out of fuel deep underground! Paid $${penalty} rescue fee; cargo lost.`;
}

function handleDestruction(state: MinerState, reason: string): void {
  state.status = "gameover";
  state.message = `GAME OVER: ${reason}`;
}

function simulateBoulderPhysics(
  state: MinerState,
  events: MinerStepResult["events"]
): void {
  // Check boulder directly above the player
  const aboveY = state.y - 1;
  if (aboveY >= 0) {
    const aboveIdx = getBlockIndex(state.x, aboveY);
    if (state.blocks[aboveIdx] === BlockType.Boulder) {
      // Boulder falls onto player!
      state.hull -= 40;
      events.tookDamage = true;
      events.boulderFell = true;
      state.message = "CRASH! A falling boulder struck the miner pod!";
      if (state.hull <= 0) {
        handleDestruction(state, "Crushed by an unstable falling boulder!");
      }
    }
  }
}

function getDelta(dir: MinerDirection): { x: number; y: number } {
  switch (dir) {
    case "up":
      return { x: 0, y: -1 };
    case "down":
      return { x: 0, y: 1 };
    case "left":
      return { x: -1, y: 0 };
    case "right":
      return { x: 1, y: 0 };
  }
}

export function getUpgradeCost(type: keyof MinerUpgrades, currentLevel: number): number {
  const baseCosts: Record<keyof MinerUpgrades, number> = {
    drill: 120,
    fuel: 90,
    cargo: 100,
    hull: 80,
    radar: 150,
  };
  return Math.floor(baseCosts[type] * Math.pow(2.1, currentLevel - 1));
}

export function getMaxUpgradeLevel(type: keyof MinerUpgrades): number {
  if (type === "radar") return 3;
  return 5;
}

export function applyUpgradeStats(state: MinerState): void {
  // Fuel
  const fuelValues = [100, 180, 280, 420, 600];
  state.maxFuel = fuelValues[state.upgrades.fuel - 1] ?? 600;

  // Cargo
  const cargoValues = [10, 20, 35, 55, 80];
  state.cargoCapacity = cargoValues[state.upgrades.cargo - 1] ?? 80;

  // Hull
  const hullValues = [100, 160, 240, 350, 500];
  state.maxHull = hullValues[state.upgrades.hull - 1] ?? 500;
}

export interface MinerMonteCarloReport {
  runs: number;
  avgDepthMax: number;
  avgOresCollected: number;
  survivalRate: number;
}

/**
 * Monte Carlo balance simulation audit (`game-balance` skill) for Dot Miner.
 */
export function runDotMinerMonteCarloAudit(
  runs = 20,
  maxSteps = 45,
  baseSeed = 20261110
): MinerMonteCarloReport {
  const dirs: MinerDirection[] = ["down", "down", "left", "right"];
  let totalDepth = 0;
  let totalOres = 0;
  let survived = 0;

  for (let r = 0; r < runs; r++) {
    const rng = new MinerRng(baseSeed + r * 131);
    let state = createMinerGame(baseSeed + r * 131);
    let ores = 0;
    for (let s = 0; s < maxSteps && state.status !== "gameover" && state.status !== "victory"; s++) {
      const dir = state.fuel < 30 ? "up" : dirs[rng.range(0, 3)];
      const res = stepMiner(state, { type: "move", dir });
      state = res.state;
      if (res.events.collectedOre) ores++;
    }
    totalDepth += state.depthMax;
    totalOres += ores;
    if (state.status !== "gameover") survived++;
  }

  return {
    runs,
    avgDepthMax: totalDepth / Math.max(1, runs),
    avgOresCollected: totalOres / Math.max(1, runs),
    survivalRate: survived / Math.max(1, runs),
  };
}

