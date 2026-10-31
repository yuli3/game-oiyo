import {
  ArcLengthSpline2D,
  ZeroGcObjectPool,
  type PoolableItem,
} from "./engine";

export type SushiType = "tuna" | "salmon" | "shrimp" | "tamago" | "unagi";

export interface SushiRecipe {
  id: SushiType;
  name: string;
  price: number;
  color: string;
  craftTimeSec: number;
}

export const SUSHI_RECIPES: Record<SushiType, SushiRecipe> = {
  tuna: { id: "tuna", name: "Maguro (Tuna)", price: 120, color: "#dc2626", craftTimeSec: 0.8 },
  salmon: { id: "salmon", name: "Sake (Salmon)", price: 140, color: "#ea580c", craftTimeSec: 0.8 },
  shrimp: { id: "shrimp", name: "Ebi (Shrimp)", price: 110, color: "#f43f5e", craftTimeSec: 0.6 },
  tamago: { id: "tamago", name: "Tamago (Egg)", price: 90, color: "#eab308", craftTimeSec: 0.5 },
  unagi: { id: "unagi", name: "Unagi (Eel)", price: 200, color: "#78350f", craftTimeSec: 1.2 },
};

export interface SushiPlateItem extends PoolableItem {
  id: number;
  sushiType: SushiType;
  distanceAlongSpline: number;
  freshnessTimeSec: number;
  maxFreshnessSec: number;
  lapsCompleted: number;
}

export interface CustomerSeat {
  id: number;
  chairX: number;
  chairY: number;
  beltDistanceTarget: number; // The spline distance adjacent to this seat
  occupied: boolean;
  wantedSushi: SushiType | null;
  patienceTimerSec: number;
  maxPatienceSec: number;
  platesEaten: number;
  targetPlates: number;
  mood: "happy" | "neutral" | "impatient" | "eating";
  eatingTimerSec: number;
}

export interface ConveyorKitchenUpgrades {
  beltSpeedLevel: number; // 1 to 5
  plateValueLevel: number; // 1 to 5
  autoPrepLevel: number; // 0 to 3
}

export interface SushiConveyorState {
  cash: number;
  reputation: number; // 0 to 100
  totalServed: number;
  totalDiscarded: number;
  comboCount: number;
  feverTimeSec: number;

  upgrades: ConveyorKitchenUpgrades;
  seats: CustomerSeat[];
  activePlates: SushiPlateItem[];

  // Conveyor mechanics
  beltSpeedPxPerSec: number;
  splineTotalLength: number;

  // Game flow
  gameTimeSec: number;
  customerSpawnCooldown: number;
  activeLog: string;
  status: "playing" | "fever" | "day_cleared" | "bankrupt";
}

// Fixed 8-point oval counter loop
const CONVEYOR_CONTROL_POINTS = [
  { x: 140, y: 120 },
  { x: 360, y: 80 },
  { x: 580, y: 120 },
  { x: 620, y: 240 },
  { x: 580, y: 360 },
  { x: 360, y: 400 },
  { x: 140, y: 360 },
  { x: 100, y: 240 },
  { x: 140, y: 120 }, // Close loop
];

export const conveyorSpline = new ArcLengthSpline2D(CONVEYOR_CONTROL_POINTS, 20);

// Global Plate Pool with capacity of 40 plates
export const platePool = new ZeroGcObjectPool<SushiPlateItem>(40, (idx) => ({
  id: idx,
  active: false,
  sushiType: "tuna",
  distanceAlongSpline: 0,
  freshnessTimeSec: 0,
  maxFreshnessSec: 60,
  lapsCompleted: 0,
}));

export function createInitialSeats(): CustomerSeat[] {
  // 6 customer counter seats distributed along the outer ring
  const seatSplineRatios = [0.12, 0.28, 0.45, 0.62, 0.78, 0.92];
  const L = conveyorSpline.totalLength;

  return seatSplineRatios.map((ratio, idx) => {
    const targetDist = L * ratio;
    const sample = conveyorSpline.sampleAtDistance(targetDist);
    // Push seat outward along normal
    const normalAngle = sample.headingRad + Math.PI / 2;
    const offset = 48;

    return {
      id: idx,
      chairX: sample.x + Math.cos(normalAngle) * offset,
      chairY: sample.y + Math.sin(normalAngle) * offset,
      beltDistanceTarget: targetDist,
      occupied: false,
      wantedSushi: null,
      patienceTimerSec: 0,
      maxPatienceSec: 25,
      platesEaten: 0,
      targetPlates: 2,
      mood: "happy",
      eatingTimerSec: 0,
    };
  });
}

export function initializeSushiConveyor(): SushiConveyorState {
  // Reset plate pool for fresh game
  platePool.forEachActive((p) => {
    p.active = false;
  });

  const seats = createInitialSeats();
  // Seat first 2 customers immediately
  seats[0].occupied = true;
  seats[0].wantedSushi = "salmon";
  seats[0].patienceTimerSec = 25;
  seats[0].maxPatienceSec = 25;
  seats[0].targetPlates = 2;

  seats[1].occupied = true;
  seats[1].wantedSushi = "tuna";
  seats[1].patienceTimerSec = 25;
  seats[1].maxPatienceSec = 25;
  seats[1].targetPlates = 3;

  return {
    cash: 500,
    reputation: 80,
    totalServed: 0,
    totalDiscarded: 0,
    comboCount: 0,
    feverTimeSec: 0,

    upgrades: {
      beltSpeedLevel: 1,
      plateValueLevel: 1,
      autoPrepLevel: 0,
    },
    seats,
    activePlates: [],

    beltSpeedPxPerSec: 65,
    splineTotalLength: conveyorSpline.totalLength,

    gameTimeSec: 0,
    customerSpawnCooldown: 4.0,
    activeLog: "Welcome to Ginza Conveyor Sushi! Prepare fresh nigiri on the spline belt.",
    status: "playing",
  };
}

export function spawnCustomerInEmptySeat(seats: CustomerSeat[]): boolean {
  const emptySeats = seats.filter((s) => !s.occupied);
  if (emptySeats.length === 0) return false;

  const targetSeat = emptySeats[Math.floor(Math.random() * emptySeats.length)];
  const sushiTypes: SushiType[] = ["tuna", "salmon", "shrimp", "tamago", "unagi"];
  const wanted = sushiTypes[Math.floor(Math.random() * sushiTypes.length)];

  targetSeat.occupied = true;
  targetSeat.wantedSushi = wanted;
  targetSeat.patienceTimerSec = 22 + Math.floor(Math.random() * 8);
  targetSeat.maxPatienceSec = targetSeat.patienceTimerSec;
  targetSeat.platesEaten = 0;
  targetSeat.targetPlates = 2 + Math.floor(Math.random() * 2);
  targetSeat.mood = "happy";
  targetSeat.eatingTimerSec = 0;
  return true;
}

export function craftAndPlaceSushiPlate(
  state: SushiConveyorState,
  type: SushiType
): SushiConveyorState {
  const recipe = SUSHI_RECIPES[type];
  const ingredientCost = Math.floor(recipe.price * 0.3);

  if (state.cash < ingredientCost) {
    return {
      ...state,
      activeLog: `Not enough funds to prep ${recipe.name}! Need ¥${ingredientCost}.`,
    };
  }

  // Acquire plate from ZeroGcObjectPool at chef spawn position (spline distance 0)
  const plate = platePool.acquire((item) => {
    item.sushiType = type;
    item.distanceAlongSpline = 0;
    item.freshnessTimeSec = 0;
    item.maxFreshnessSec = 55;
    item.lapsCompleted = 0;
  });

  return {
    ...state,
    cash: state.cash - ingredientCost,
    activePlates: [...state.activePlates, { ...plate }],
    activeLog: `Chef crafted fresh ${recipe.name} (-¥${ingredientCost}) and placed on belt!`,
  };
}

export function stepSushiConveyor(
  state: SushiConveyorState,
  dt: number,
  input?: {
    craftSushi?: SushiType;
    buyUpgrade?: "beltSpeed" | "plateValue" | "autoPrep";
  }
): SushiConveyorState {
  if (state.status === "bankrupt" || state.status === "day_cleared") {
    return state;
  }

  let nextState: SushiConveyorState = {
    ...state,
    gameTimeSec: state.gameTimeSec + dt,
    seats: state.seats.map((s) => ({ ...s })),
    upgrades: { ...state.upgrades },
  };

  // Handle Chef Crafting Input
  if (input?.craftSushi) {
    nextState = craftAndPlaceSushiPlate(nextState, input.craftSushi);
  }

  // Handle Kitchen Upgrades
  if (input?.buyUpgrade) {
    if (input.buyUpgrade === "beltSpeed" && nextState.upgrades.beltSpeedLevel < 5) {
      const cost = nextState.upgrades.beltSpeedLevel * 300;
      if (nextState.cash >= cost) {
        nextState.cash -= cost;
        nextState.upgrades.beltSpeedLevel++;
        nextState.beltSpeedPxPerSec = 65 + (nextState.upgrades.beltSpeedLevel - 1) * 20;
        nextState.activeLog = `Upgraded Belt Motor (Lv.${nextState.upgrades.beltSpeedLevel})! Speed +20 px/s.`;
      }
    } else if (input.buyUpgrade === "plateValue" && nextState.upgrades.plateValueLevel < 5) {
      const cost = nextState.upgrades.plateValueLevel * 350;
      if (nextState.cash >= cost) {
        nextState.cash -= cost;
        nextState.upgrades.plateValueLevel++;
        nextState.activeLog = `Upgraded Ingredient Grade (Lv.${nextState.upgrades.plateValueLevel})! Selling price +20%.`;
      }
    } else if (input.buyUpgrade === "autoPrep" && nextState.upgrades.autoPrepLevel < 3) {
      const cost = (nextState.upgrades.autoPrepLevel + 1) * 600;
      if (nextState.cash >= cost) {
        nextState.cash -= cost;
        nextState.upgrades.autoPrepLevel++;
        nextState.activeLog = `Installed Automatic Rice Shaper (Lv.${nextState.upgrades.autoPrepLevel})!`;
      }
    }
  }

  // Auto Rice Shaper periodic automated prep
  if (nextState.upgrades.autoPrepLevel > 0) {
    const autoInterval = 10 - nextState.upgrades.autoPrepLevel * 2.5;
    if (Math.floor(nextState.gameTimeSec / autoInterval) > Math.floor((nextState.gameTimeSec - dt) / autoInterval)) {
      const autoChoices: SushiType[] = ["tuna", "salmon", "tamago"];
      const randomChoice = autoChoices[Math.floor(Math.random() * autoChoices.length)];
      nextState = craftAndPlaceSushiPlate(nextState, randomChoice);
    }
  }

  // Fever Mode countdown
  if (nextState.feverTimeSec > 0) {
    nextState.feverTimeSec = Math.max(0, nextState.feverTimeSec - dt);
    nextState.status = nextState.feverTimeSec > 0 ? "fever" : "playing";
  }

  // 1. Customer Spawner
  nextState.customerSpawnCooldown -= dt;
  if (nextState.customerSpawnCooldown <= 0) {
    spawnCustomerInEmptySeat(nextState.seats);
    nextState.customerSpawnCooldown = 3.5 + Math.random() * 3.5;
  }

  // 2. Advance Conveyor Spline Plates
  const currentSpeed = nextState.feverTimeSec > 0 ? nextState.beltSpeedPxPerSec * 1.3 : nextState.beltSpeedPxPerSec;
  const moveDist = currentSpeed * dt;
  const L = nextState.splineTotalLength;

  platePool.forEachActive((plate) => {
    plate.distanceAlongSpline += moveDist;
    plate.freshnessTimeSec += dt;

    if (plate.distanceAlongSpline >= L) {
      plate.distanceAlongSpline -= L;
      plate.lapsCompleted++;
    }

    // Plate expired after 2 laps or 55 seconds
    if (plate.lapsCompleted >= 2 || plate.freshnessTimeSec >= plate.maxFreshnessSec) {
      plate.active = false;
      nextState.totalDiscarded++;
      nextState.reputation = Math.max(0, nextState.reputation - 2);
      nextState.comboCount = 0;
      nextState.activeLog = `A plate of ${SUSHI_RECIPES[plate.sushiType].name} lost freshness and was discarded (-2 Rep).`;
    }
  });

  // 3. Customer Eating & Plate Pickup Detection
  for (const seat of nextState.seats) {
    if (!seat.occupied) continue;

    // If eating, tick down eating timer
    if (seat.mood === "eating") {
      seat.eatingTimerSec -= dt;
      if (seat.eatingTimerSec <= 0) {
        seat.platesEaten++;
        if (seat.platesEaten >= seat.targetPlates) {
          // Customer satisfied! Leaves tip
          const tip = 50 + Math.floor(nextState.reputation * 0.5);
          nextState.cash += tip;
          nextState.reputation = Math.min(100, nextState.reputation + 3);
          seat.occupied = false;
          seat.wantedSushi = null;
          nextState.activeLog = `Customer finished meal happily! Left ¥${tip} tip (+3 Rep).`;
        } else {
          // Ready for next plate
          const sushiList: SushiType[] = ["tuna", "salmon", "shrimp", "tamago", "unagi"];
          seat.wantedSushi = sushiList[Math.floor(Math.random() * sushiList.length)];
          seat.patienceTimerSec = 20;
          seat.maxPatienceSec = 20;
          seat.mood = "happy";
        }
      }
      continue;
    }

    // Tick patience timer (paused during fever)
    if (nextState.feverTimeSec <= 0) {
      seat.patienceTimerSec -= dt;
    }

    const patienceRatio = seat.patienceTimerSec / seat.maxPatienceSec;
    if (patienceRatio < 0.3) {
      seat.mood = "impatient";
    } else if (patienceRatio < 0.6) {
      seat.mood = "neutral";
    }

    if (seat.patienceTimerSec <= 0) {
      // Customer left angry!
      seat.occupied = false;
      seat.wantedSushi = null;
      nextState.reputation = Math.max(0, nextState.reputation - 10);
      nextState.comboCount = 0;
      nextState.activeLog = "Customer storm out hungry! (-10 Rep, Combo Reset)";
      continue;
    }

    // Check if matching plate passes by seat
    const seatDist = seat.beltDistanceTarget;
    const grabTolerance = 25; // 25px tolerance around customer seat

    platePool.forEachActive((plate) => {
      if (!seat.occupied || seat.mood === "eating") return;

      if (plate.sushiType === seat.wantedSushi) {
        const distDiff = Math.abs(plate.distanceAlongSpline - seatDist);
        if (distDiff < grabTolerance) {
          // Match made! Plate eaten
          plate.active = false;
          seat.mood = "eating";
          seat.eatingTimerSec = 1.8;

          const basePrice = SUSHI_RECIPES[plate.sushiType].price;
          const valueMultiplier = 1 + (nextState.upgrades.plateValueLevel - 1) * 0.2;
          const feverMultiplier = nextState.feverTimeSec > 0 ? 2.0 : 1.0;
          const earned = Math.floor(basePrice * valueMultiplier * feverMultiplier);

          nextState.cash += earned;
          nextState.totalServed++;
          nextState.comboCount++;

          // Trigger Fever mode at 5 combos
          if (nextState.comboCount >= 5 && nextState.feverTimeSec <= 0) {
            nextState.feverTimeSec = 12.0;
            nextState.status = "fever";
            nextState.activeLog = "🔥 FEVER TIME! Double revenue and patience freeze for 12 seconds!";
          } else {
            nextState.activeLog = `Served ${SUSHI_RECIPES[plate.sushiType].name}! (+¥${earned}, Combo x${nextState.comboCount})`;
          }
        }
      }
    });
  }

  // Refresh activePlates snapshot from pool
  const syncedPlates: SushiPlateItem[] = [];
  platePool.forEachActive((p) => {
    syncedPlates.push({ ...p });
  });
  nextState.activePlates = syncedPlates;

  // 4. Check End Game Conditions
  if (nextState.cash < 50 && nextState.activePlates.length === 0 && nextState.reputation <= 10) {
    nextState.status = "bankrupt";
    nextState.activeLog = "The restaurant ran out of capital and reputation. Bankrupt!";
  } else if (nextState.totalServed >= 25 && nextState.cash >= 3000) {
    nextState.status = "day_cleared";
    nextState.activeLog = "Day Service Cleared! Ginza Michelin Star rating achieved!";
  }

  return nextState;
}

export function runSushiMonteCarloAudit(trials = 50): {
  clearedTrials: number;
  averageServed: number;
  averageCash: number;
} {
  let cleared = 0;
  let totalServed = 0;
  let totalCash = 0;

  for (let i = 0; i < trials; i++) {
    let sim = initializeSushiConveyor();
    let simTime = 0;
    const dt = 0.5;

    while ((sim.status === "playing" || sim.status === "fever") && simTime < 120) {
      simTime += dt;

      // Smart Chef Bot: Check customer orders and craft needed sushi
      const neededOrder = sim.seats.find((s) => s.occupied && s.mood !== "eating")?.wantedSushi;
      let craft: SushiType | undefined;

      // If needed order exists and not already on the belt, craft it
      if (neededOrder) {
        const onBelt = sim.activePlates.some((p) => p.sushiType === neededOrder);
        if (!onBelt && sim.cash >= 100) {
          craft = neededOrder;
        }
      }

      // Upgrade belt speed if surplus cash
      let buyUpgrade: "beltSpeed" | "plateValue" | "autoPrep" | undefined;
      if (sim.cash > 1000 && sim.upgrades.beltSpeedLevel < 2) {
        buyUpgrade = "beltSpeed";
      }

      sim = stepSushiConveyor(sim, dt, {
        craftSushi: craft,
        buyUpgrade,
      });

      if (sim.status === "day_cleared") break;
    }

    if (sim.status !== "bankrupt") {
      cleared++;
    }
    totalServed += sim.totalServed;
    totalCash += sim.cash;
  }

  return {
    clearedTrials: cleared,
    averageServed: Number((totalServed / trials).toFixed(1)),
    averageCash: Math.floor(totalCash / trials),
  };
}
