/**
 * DotFarm — Cozy Pixel Farming Tycoon & Crop Harvest Engine.
 *
 * Implements:
 * 1. Deterministic weather & growth PRNG (Xorshift32).
 * 2. Grid-based farmland simulation (Grass, Tilled Soil, Watered Soil, Obstacles).
 * 3. 6 unique crop varieties (Turnip, Carrot, Tomato, Strawberry, Golden Melon, Ancient Seed)
 *    with multi-stage growth cycles and regrowable crops.
 * 4. Weather system (Sunny, Rainy auto-watering).
 * 5. Farmer tools & stamina: Hoe, Watering Can, Sickle, Sprinklers.
 * 6. Farm economy: Seed shop, shipping bin produce sales, farm expansion upgrades.
 * 7. Goal / Victory: Cultivate the legendary Ancient Star Fruit and reach $5,000 net worth!
 */

// ─── 1. DETERMINISTIC PRNG ───────────────────────────────────────────────────

export class FarmRng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0 || 0xbeefcafe;
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

// ─── 2. FARMLAND CONSTANTS & TYPES ───────────────────────────────────────────

export const FARM_WIDTH = 14;
export const FARM_HEIGHT = 10;

export const enum FarmTileType {
  Grass = 0,
  TilledDry = 1,
  TilledWatered = 2,
  Weeds = 3,
  Rock = 4,
}

export type CropId = "turnip" | "carrot" | "tomato" | "strawberry" | "golden_melon" | "ancient_fruit";

export interface CropDefinition {
  id: CropId;
  name: string;
  seedCost: number;
  sellPrice: number;
  daysToMature: number;
  regrows: boolean;
  regrowDays: number;
  color: string;
  symbol: string;
}

export const CROP_DEFINITIONS: Record<CropId, CropDefinition> = {
  turnip: {
    id: "turnip",
    name: "Turnip",
    seedCost: 15,
    sellPrice: 35,
    daysToMature: 2,
    regrows: false,
    regrowDays: 0,
    color: "#FFF1E8",
    symbol: "🌱",
  },
  carrot: {
    id: "carrot",
    name: "Carrot",
    seedCost: 25,
    sellPrice: 60,
    daysToMature: 3,
    regrows: false,
    regrowDays: 0,
    color: "#FFA300",
    symbol: "🥕",
  },
  tomato: {
    id: "tomato",
    name: "Tomato",
    seedCost: 45,
    sellPrice: 40,
    daysToMature: 4,
    regrows: true,
    regrowDays: 2,
    color: "#FF004D",
    symbol: "🍅",
  },
  strawberry: {
    id: "strawberry",
    name: "Strawberry",
    seedCost: 70,
    sellPrice: 160,
    daysToMature: 5,
    regrows: false,
    regrowDays: 0,
    color: "#FF77A8",
    symbol: "🍓",
  },
  golden_melon: {
    id: "golden_melon",
    name: "Golden Melon",
    seedCost: 150,
    sellPrice: 450,
    daysToMature: 6,
    regrows: false,
    regrowDays: 0,
    color: "#FFEC27",
    symbol: "🍈",
  },
  ancient_fruit: {
    id: "ancient_fruit",
    name: "Ancient Star Fruit",
    seedCost: 400,
    sellPrice: 1500,
    daysToMature: 8,
    regrows: false,
    regrowDays: 0,
    color: "#00F0FF",
    symbol: "⭐",
  },
};

export interface PlantedCrop {
  cropId: CropId;
  growthDays: number;
  isMature: boolean;
  unwateredDays: number;
}

export type ActiveTool = "hoe" | "can" | "scythe" | "seed";

export interface FarmState {
  version: 1;
  seed: number;
  farmerX: number;
  farmerY: number;
  day: number;
  weather: "sunny" | "rainy";
  energy: number;
  maxEnergy: number;
  money: number;
  tiles: FarmTileType[]; // size FARM_WIDTH * FARM_HEIGHT
  crops: (PlantedCrop | null)[]; // size FARM_WIDTH * FARM_HEIGHT
  sprinklers: boolean[]; // size FARM_WIDTH * FARM_HEIGHT
  selectedTool: ActiveTool;
  selectedSeed: CropId;
  inventory: Record<CropId, { seeds: number; harvested: number }>;
  hasGreenhouse: boolean;
  totalHarvested: number;
  status: "playing" | "victory";
  message: string;
}

// ─── 3. GRID UTILITIES ───────────────────────────────────────────────────────

export function getFarmIndex(x: number, y: number): number {
  return y * FARM_WIDTH + x;
}

export function isInsideFarm(x: number, y: number): boolean {
  return x >= 0 && x < FARM_WIDTH && y >= 0 && y < FARM_HEIGHT;
}

// ─── 4. INITIAL FARM CREATION ────────────────────────────────────────────────

export function createFarmGame(seed: number = Date.now()): FarmState {
  const rng = new FarmRng(seed);
  const total = FARM_WIDTH * FARM_HEIGHT;
  const tiles: FarmTileType[] = new Array(total).fill(FarmTileType.Grass);
  const crops: (PlantedCrop | null)[] = new Array(total).fill(null);
  const sprinklers: boolean[] = new Array(total).fill(false);

  // Scatter a few natural obstacles (weeds and rocks) in the periphery
  for (let y = 0; y < FARM_HEIGHT; y++) {
    for (let x = 0; x < FARM_WIDTH; x++) {
      const idx = getFarmIndex(x, y);
      // Keep center clear for farming
      if (x >= 4 && x <= 9 && y >= 3 && y <= 7) {
        continue;
      }
      const roll = rng.next();
      if (roll < 0.12) {
        tiles[idx] = FarmTileType.Weeds;
      } else if (roll < 0.18) {
        tiles[idx] = FarmTileType.Rock;
      }
    }
  }

  return {
    version: 1,
    seed,
    farmerX: 6,
    farmerY: 5,
    day: 1,
    weather: "sunny",
    energy: 100,
    maxEnergy: 100,
    money: 100, // Starter funds
    tiles,
    crops,
    sprinklers,
    selectedTool: "hoe",
    selectedSeed: "turnip",
    inventory: {
      turnip: { seeds: 5, harvested: 0 },
      carrot: { seeds: 2, harvested: 0 },
      tomato: { seeds: 0, harvested: 0 },
      strawberry: { seeds: 0, harvested: 0 },
      golden_melon: { seeds: 0, harvested: 0 },
      ancient_fruit: { seeds: 0, harvested: 0 },
    },
    hasGreenhouse: false,
    totalHarvested: 0,
    status: "playing",
    message: "Welcome to your pixel farm! Till soil, plant turnip seeds, water them, and rest at night.",
  };
}

// ─── 5. ACTION RESOLUTION ────────────────────────────────────────────────────

export type FarmDirection = "up" | "down" | "left" | "right";

export interface FarmStepResult {
  state: FarmState;
  events: {
    moved: boolean;
    tilled: boolean;
    watered: boolean;
    planted: boolean;
    harvested: boolean;
    clearedObstacle: boolean;
    sleptDay: boolean;
    boughtItem: boolean;
    soldProduce: boolean;
    victory: boolean;
  };
}

export function stepFarmAction(
  currentState: FarmState,
  action:
    | { type: "move"; dir: FarmDirection }
    | { type: "interact" }
    | { type: "select_tool"; tool: ActiveTool }
    | { type: "select_seed"; seed: CropId }
    | { type: "sleep" }
    | { type: "buy_seed"; cropId: CropId; count: number }
    | { type: "buy_sprinkler" }
    | { type: "sell_all" }
): FarmStepResult {
  const state: FarmState = {
    ...currentState,
    tiles: [...currentState.tiles],
    crops: currentState.crops.map((c) => (c ? { ...c } : null)),
    sprinklers: [...currentState.sprinklers],
    inventory: {
      turnip: { ...currentState.inventory.turnip },
      carrot: { ...currentState.inventory.carrot },
      tomato: { ...currentState.inventory.tomato },
      strawberry: { ...currentState.inventory.strawberry },
      golden_melon: { ...currentState.inventory.golden_melon },
      ancient_fruit: { ...currentState.inventory.ancient_fruit },
    },
  };

  const events = {
    moved: false,
    tilled: false,
    watered: false,
    planted: false,
    harvested: false,
    clearedObstacle: false,
    sleptDay: false,
    boughtItem: false,
    soldProduce: false,
    victory: false,
  };

  // Tool / Seed selection
  if (action.type === "select_tool") {
    state.selectedTool = action.tool;
    return { state, events };
  }
  if (action.type === "select_seed") {
    state.selectedSeed = action.seed;
    state.selectedTool = "seed";
    return { state, events };
  }

  // Market: Buy seeds
  if (action.type === "buy_seed") {
    const cropDef = CROP_DEFINITIONS[action.cropId];
    const totalCost = cropDef.seedCost * action.count;
    if (state.money >= totalCost) {
      state.money -= totalCost;
      state.inventory[action.cropId].seeds += action.count;
      events.boughtItem = true;
      state.message = `Purchased ${action.count}x ${cropDef.name} seeds for $${totalCost}.`;
    } else {
      state.message = `Not enough money for ${cropDef.name} seeds! (Requires $${totalCost})`;
    }
    return { state, events };
  }

  // Market: Buy Sprinkler (Costs $250, auto-waters 4 adjacent tiles)
  if (action.type === "buy_sprinkler") {
    const cost = 250;
    if (state.money >= cost) {
      const idx = getFarmIndex(state.farmerX, state.farmerY);
      if (!state.sprinklers[idx] && state.crops[idx] === null) {
        state.money -= cost;
        state.sprinklers[idx] = true;
        events.boughtItem = true;
        state.message = `Installed auto-sprinkler! Adjacent tiles will now be automatically watered each morning.`;
      } else {
        state.message = `Cannot place sprinkler here! Current tile must be empty.`;
      }
    } else {
      state.message = `Sprinkler costs $250! (You have $${state.money})`;
    }
    return { state, events };
  }

  // Market: Sell all harvested crops
  if (action.type === "sell_all") {
    let earned = 0;
    for (const [id, inv] of Object.entries(state.inventory) as [CropId, { seeds: number; harvested: number }][]) {
      if (inv.harvested > 0) {
        earned += inv.harvested * CROP_DEFINITIONS[id].sellPrice;
        inv.harvested = 0;
      }
    }
    if (earned > 0) {
      state.money += earned;
      events.soldProduce = true;
      state.message = `Sold harvested crops to shipping market for +$${earned}!`;

      // Check victory: $5,000 net worth
      if (state.money >= 5000) {
        state.status = "victory";
        events.victory = true;
        state.message = `★ VICTORY! Your flourishing farm reached $${state.money}! Master Farmer Title Achieved!`;
      }
    } else {
      state.message = `No harvested crops in storage to sell.`;
    }
    return { state, events };
  }

  // Sleep: Advance to next day
  if (action.type === "sleep") {
    state.day += 1;
    state.energy = state.maxEnergy; // Full energy restore

    // Weather roll: 20% chance of rain
    const rng = new FarmRng(state.seed + state.day * 1337);
    state.weather = rng.next() < 0.2 ? "rainy" : "sunny";
    events.sleptDay = true;

    // 1. Overnight crop growth & soil absorption from previous day's water
    for (let i = 0; i < state.tiles.length; i++) {
      const crop = state.crops[i];
      if (crop) {
        const isWatered = state.tiles[i] === FarmTileType.TilledWatered || state.weather === "rainy";
        if (isWatered) {
          crop.growthDays += 1;
          const def = CROP_DEFINITIONS[crop.cropId];
          if (crop.growthDays >= def.daysToMature) {
            crop.isMature = true;
          }
          crop.unwateredDays = 0;
        } else {
          crop.unwateredDays += 1;
        }
      }

      // Soil dries as water is absorbed overnight
      if (state.tiles[i] === FarmTileType.TilledWatered) {
        state.tiles[i] = FarmTileType.TilledDry;
      }
    }

    // 2. New morning weather & sprinkler watering
    for (let i = 0; i < state.tiles.length; i++) {
      // Rain waters all dry tilled tiles
      if (state.weather === "rainy" && state.tiles[i] === FarmTileType.TilledDry) {
        state.tiles[i] = FarmTileType.TilledWatered;
      }
    }

    // Sprinklers water 4 adjacent tiles each morning
    for (let y = 0; y < FARM_HEIGHT; y++) {
      for (let x = 0; x < FARM_WIDTH; x++) {
        const idx = getFarmIndex(x, y);
        if (state.sprinklers[idx]) {
          const adj = [
            { x: x + 1, y },
            { x: x - 1, y },
            { x, y: y + 1 },
            { x, y: y - 1 },
          ];
          for (const a of adj) {
            if (isInsideFarm(a.x, a.y)) {
              const aIdx = getFarmIndex(a.x, a.y);
              if (state.tiles[aIdx] === FarmTileType.TilledDry) {
                state.tiles[aIdx] = FarmTileType.TilledWatered;
              }
            }
          }
        }
      }
    }

    state.message =
      state.weather === "rainy"
        ? `Day ${state.day}: It's raining! All crops are automatically watered today.`
        : `Day ${state.day}: Clear sunny morning! Energy fully restored.`;

    return { state, events };
  }

  // Move
  if (action.type === "move") {
    const delta = getDelta(action.dir);
    const targetX = state.farmerX + delta.x;
    const targetY = state.farmerY + delta.y;

    if (isInsideFarm(targetX, targetY)) {
      state.farmerX = targetX;
      state.farmerY = targetY;
      events.moved = true;
    }
    return { state, events };
  }

  // Interact with current tile using selected tool
  if (action.type === "interact") {
    const idx = getFarmIndex(state.farmerX, state.farmerY);
    const tile = state.tiles[idx];
    const crop = state.crops[idx];

    // Check stamina
    if (state.energy <= 0) {
      state.message = `Too exhausted to work! Go to sleep to restore your energy.`;
      return { state, events };
    }

    // 1. Harvest mature crop (Hand or Scythe)
    if (crop && crop.isMature) {
      const def = CROP_DEFINITIONS[crop.cropId];
      state.inventory[crop.cropId].harvested += 1;
      state.totalHarvested += 1;
      events.harvested = true;
      state.energy = Math.max(0, state.energy - 2);

      if (def.regrows) {
        crop.isMature = false;
        crop.growthDays = def.daysToMature - def.regrowDays;
        state.message = `Harvested juicy ${def.name}! Vine will regrow in ${def.regrowDays} days.`;
      } else {
        state.crops[idx] = null;
        state.message = `Harvested fresh ${def.name}! Added to storage.`;
      }
      return { state, events };
    }

    // 2. Hoe: Till Grass into Dry Farmland
    if (state.selectedTool === "hoe") {
      if (tile === FarmTileType.Grass) {
        state.tiles[idx] = FarmTileType.TilledDry;
        state.energy = Math.max(0, state.energy - 4);
        events.tilled = true;
        state.message = `Tilled fresh soil. Ready for planting.`;
      } else if (tile === FarmTileType.Weeds || tile === FarmTileType.Rock) {
        state.tiles[idx] = FarmTileType.Grass;
        state.energy = Math.max(0, state.energy - 6);
        events.clearedObstacle = true;
        state.message = `Cleared obstacle from field!`;
      }
      return { state, events };
    }

    // 3. Watering Can: Water Tilled Soil
    if (state.selectedTool === "can") {
      if (tile === FarmTileType.TilledDry) {
        state.tiles[idx] = FarmTileType.TilledWatered;
        state.energy = Math.max(0, state.energy - 3);
        events.watered = true;
        state.message = `Watered soil! Crops will grow tonight.`;
      }
      return { state, events };
    }

    // 4. Plant Seed: Plant selected crop seed in Tilled Soil
    if (state.selectedTool === "seed") {
      if ((tile === FarmTileType.TilledDry || tile === FarmTileType.TilledWatered) && crop === null) {
        const seedCount = state.inventory[state.selectedSeed].seeds;
        if (seedCount > 0) {
          state.inventory[state.selectedSeed].seeds -= 1;
          state.crops[idx] = {
            cropId: state.selectedSeed,
            growthDays: 0,
            isMature: false,
            unwateredDays: 0,
          };
          state.energy = Math.max(0, state.energy - 2);
          events.planted = true;
          state.message = `Planted ${CROP_DEFINITIONS[state.selectedSeed].name} seed!`;
        } else {
          state.message = `No ${CROP_DEFINITIONS[state.selectedSeed].name} seeds left in inventory!`;
        }
      }
      return { state, events };
    }

    // 5. Scythe: Clear weeds or dead crops
    if (state.selectedTool === "scythe") {
      if (tile === FarmTileType.Weeds) {
        state.tiles[idx] = FarmTileType.Grass;
        state.energy = Math.max(0, state.energy - 3);
        events.clearedObstacle = true;
        state.message = `Cleared weeds with scythe.`;
      } else if (crop && crop.unwateredDays >= 3) {
        state.crops[idx] = null;
        state.energy = Math.max(0, state.energy - 2);
        state.message = `Cleared withered crop.`;
      }
      return { state, events };
    }
  }

  return { state, events };
}

function getDelta(dir: FarmDirection): { x: number; y: number } {
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
