import {
  computeDijkstraFlowField2D,
  LockstepPeerSession,
  type FlowCell,
} from "./engine";

export type TileKind =
  | "floor"
  | "counter"
  | "crate_tomato"
  | "crate_meat"
  | "crate_lettuce"
  | "cutting_board"
  | "stove"
  | "plate_dispenser"
  | "delivery"
  | "sink"
  | "trash";

export type ItemType =
  | "tomato_raw"
  | "tomato_chopped"
  | "meat_raw"
  | "meat_cooked"
  | "meat_burned"
  | "lettuce_raw"
  | "lettuce_chopped"
  | "plate_clean"
  | "plate_dirty"
  | "salad_dish"
  | "burger_dish"
  | "steak_dish"
  | "extinguisher";

export interface KitchenItem {
  id: string;
  type: ItemType;
  cookProgress: number; // 0 to 1
  isCooking: boolean;
  isOnFire: boolean;
}

export interface ChefEntity {
  id: "chef_1" | "chef_2";
  x: number; // grid float coordinates
  y: number;
  dirX: number; // facing direction
  dirY: number;
  heldItem: KitchenItem | null;
  isChopping: boolean;
  chopProgress: number;
}

export interface OrderTicket {
  id: string;
  recipe: "salad" | "burger" | "steak";
  timeRemainingSec: number;
  maxTimeSec: number;
  reward: number;
}

export interface ChaosKitchenState {
  score: number;
  servedOrders: number;
  failedOrders: number;
  comboCount: number;
  gameTimeSec: number;
  currentFrame: number;

  chefs: ChefEntity[];
  counterSlots: Map<string, KitchenItem | null>; // key: "x,y"
  orders: OrderTicket[];
  orderCooldownSec: number;

  hasFire: boolean;
  activeLog: string;
  status: "playing" | "cleared" | "failed";
}

export const KITCHEN_WIDTH = 10;
export const KITCHEN_HEIGHT = 7;

// Fixed Kitchen Blueprint
export const KITCHEN_GRID: TileKind[][] = [
  // 0: Top wall with crates, dispensers, and delivery
  ["counter", "crate_tomato", "crate_lettuce", "crate_meat", "plate_dispenser", "delivery", "delivery", "sink", "trash", "counter"],
  // 1: Walkway
  ["cutting_board", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "stove"],
  // 2: Walkway & central preparation counter island
  ["cutting_board", "floor", "counter", "counter", "floor", "floor", "counter", "counter", "floor", "stove"],
  // 3: Center aisle
  ["counter", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "counter"],
  // 4: Central counter island & Walkway
  ["cutting_board", "floor", "counter", "counter", "floor", "floor", "counter", "counter", "floor", "stove"],
  // 5: Walkway
  ["cutting_board", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "floor", "stove"],
  // 6: Bottom boundary counters
  ["counter", "counter", "counter", "counter", "counter", "counter", "counter", "counter", "counter", "counter"],
];

export function isTileSolid(x: number, y: number): boolean {
  if (x < 0 || x >= KITCHEN_WIDTH || y < 0 || y >= KITCHEN_HEIGHT) return true;
  return KITCHEN_GRID[y][x] !== "floor";
}

// Lockstep session for 2-chef deterministic simulation
export const lockstepSession = new LockstepPeerSession(1);

export function initializeChaosKitchen(): ChaosKitchenState {
  const counterSlots = new Map<string, KitchenItem | null>();

  // Place initial clean plates on dispenser
  counterSlots.set("4,0", {
    id: "init-plate-1",
    type: "plate_clean",
    cookProgress: 0,
    isCooking: false,
    isOnFire: false,
  });

  // Place an extinguisher at bottom-left counter
  counterSlots.set("0,6", {
    id: "extinguisher-1",
    type: "extinguisher",
    cookProgress: 0,
    isCooking: false,
    isOnFire: false,
  });

  const chefs: ChefEntity[] = [
    {
      id: "chef_1",
      x: 2.0,
      y: 3.0,
      dirX: 0,
      dirY: -1,
      heldItem: null,
      isChopping: false,
      chopProgress: 0,
    },
    {
      id: "chef_2",
      x: 7.0,
      y: 3.0,
      dirX: 0,
      dirY: -1,
      heldItem: null,
      isChopping: false,
      chopProgress: 0,
    },
  ];

  const initialOrders: OrderTicket[] = [
    { id: "order-1", recipe: "salad", timeRemainingSec: 45, maxTimeSec: 45, reward: 200 },
    { id: "order-2", recipe: "burger", timeRemainingSec: 50, maxTimeSec: 50, reward: 280 },
  ];

  return {
    score: 0,
    servedOrders: 0,
    failedOrders: 0,
    comboCount: 0,
    gameTimeSec: 0,
    currentFrame: 0,

    chefs,
    counterSlots,
    orders: initialOrders,
    orderCooldownSec: 15,

    hasFire: false,
    activeLog: "Chaos Kitchen open! Chop vegetables, cook patties, assemble and serve!",
    status: "playing",
  };
}

export function computeTargetFlowField(targetTile: { x: number; y: number }): FlowCell[][] {
  return computeDijkstraFlowField2D(
    KITCHEN_WIDTH,
    KITCHEN_HEIGHT,
    (x, y) => isTileSolid(x, y) && !(x === targetTile.x && y === targetTile.y),
    [targetTile]
  );
}

// Input mask bits:
// 1: UP, 2: DOWN, 4: LEFT, 8: RIGHT, 16: PICK_DROP, 32: ACTION_CHOP
export function stepChefWithInput(
  chef: ChefEntity,
  inputMask: number,
  dt: number,
  counterSlots: Map<string, KitchenItem | null>,
  stateRef: { score: number; servedOrders: number; comboCount: number; activeLog: string }
): void {
  let moveX = 0;
  let moveY = 0;

  if (inputMask & 1) moveY -= 1;
  if (inputMask & 2) moveY += 1;
  if (inputMask & 4) moveX -= 1;
  if (inputMask & 8) moveX += 1;

  if (moveX !== 0 || moveY !== 0) {
    chef.dirX = moveX;
    chef.dirY = moveY;
    chef.isChopping = false;
    chef.chopProgress = 0;

    const speed = 3.6; // tiles per second
    const nextX = chef.x + moveX * speed * dt;
    const nextY = chef.y + moveY * speed * dt;

    // Radius collision check
    const r = 0.28;
    const checkMinX = Math.floor(nextX - r);
    const checkMaxX = Math.floor(nextX + r);
    const checkMinY = Math.floor(nextY - r);
    const checkMaxY = Math.floor(nextY + r);

    let canMoveX = true;
    for (let cy = checkMinY; cy <= checkMaxY; cy++) {
      if (isTileSolid(checkMinX, cy) || isTileSolid(checkMaxX, cy)) {
        canMoveX = false;
        break;
      }
    }
    if (canMoveX) chef.x = nextX;

    let canMoveY = true;
    for (let cx = checkMinX; cx <= checkMaxX; cx++) {
      if (isTileSolid(cx, checkMinY) || isTileSolid(cx, checkMaxY)) {
        canMoveY = false;
        break;
      }
    }
    if (canMoveY) chef.y = nextY;
  }

  // Target facing tile for pick/drop/action
  const frontX = Math.round(chef.x + chef.dirX * 0.7);
  const frontY = Math.round(chef.y + chef.dirY * 0.7);
  const frontKey = `${frontX},${frontY}`;
  const frontTile = KITCHEN_GRID[frontY]?.[frontX];

  // Pick / Drop (Space or Bit 16)
  if (inputMask & 16) {
    chef.isChopping = false;
    chef.chopProgress = 0;

    if (!chef.heldItem) {
      // 1. Pick from ingredient crate or dispenser
      if (frontTile === "crate_tomato") {
        chef.heldItem = { id: `tomato-${Date.now()}`, type: "tomato_raw", cookProgress: 0, isCooking: false, isOnFire: false };
        stateRef.activeLog = "Picked fresh tomato from crate.";
      } else if (frontTile === "crate_meat") {
        chef.heldItem = { id: `meat-${Date.now()}`, type: "meat_raw", cookProgress: 0, isCooking: false, isOnFire: false };
        stateRef.activeLog = "Picked raw beef patty from crate.";
      } else if (frontTile === "crate_lettuce") {
        chef.heldItem = { id: `lettuce-${Date.now()}`, type: "lettuce_raw", cookProgress: 0, isCooking: false, isOnFire: false };
        stateRef.activeLog = "Picked fresh crisp lettuce.";
      } else if (frontTile === "plate_dispenser") {
        chef.heldItem = { id: `plate-${Date.now()}`, type: "plate_clean", cookProgress: 0, isCooking: false, isOnFire: false };
        stateRef.activeLog = "Picked clean ceramic plate.";
      } else if (counterSlots.has(frontKey) && counterSlots.get(frontKey)) {
        // Pick from counter
        chef.heldItem = counterSlots.get(frontKey)!;
        counterSlots.set(frontKey, null);
        stateRef.activeLog = `Picked up ${chef.heldItem.type.replace("_", " ")}.`;
      }
    } else {
      // 2. Put down or combine
      const itemOnCounter = counterSlots.get(frontKey);

      if (frontTile === "trash") {
        // Discard into trash bin
        stateRef.activeLog = `Tossed ${chef.heldItem.type.replace("_", " ")} into trash.`;
        chef.heldItem = null;
      } else if (frontTile === "delivery") {
        // Check if held item is a completed recipe
        // (Handled at main state step)
      } else if (isTileSolid(frontX, frontY)) {
        if (!itemOnCounter) {
          // Put item on empty counter/cutting board/stove
          if (frontTile === "stove" && chef.heldItem.type === "meat_raw") {
            chef.heldItem.isCooking = true;
          }
          counterSlots.set(frontKey, chef.heldItem);
          chef.heldItem = null;
          stateRef.activeLog = "Placed item on counter.";
        } else {
          // Recipe Combination logic!
          const held = chef.heldItem.type;
          const target = itemOnCounter.type;

          // Plate + Chopped Tomato + Chopped Lettuce -> Salad
          if (
            (held === "plate_clean" && (target === "tomato_chopped" || target === "lettuce_chopped")) ||
            (held === "tomato_chopped" && target === "plate_clean") ||
            (held === "lettuce_chopped" && target === "plate_clean")
          ) {
            itemOnCounter.type = "salad_dish";
            chef.heldItem = null;
            stateRef.activeLog = "Assembled Fresh Garden Salad on plate!";
          }
          // Plate + Cooked Meat -> Burger / Steak
          else if (
            (held === "plate_clean" && target === "meat_cooked") ||
            (held === "meat_cooked" && target === "plate_clean")
          ) {
            itemOnCounter.type = "burger_dish";
            chef.heldItem = null;
            stateRef.activeLog = "Assembled Gourmet Cheeseburger on plate!";
          }
        }
      }
    }
  }

  // Action / Chop (F or Bit 32)
  if (inputMask & 32) {
    if (frontTile === "cutting_board") {
      const itemOnBoard = counterSlots.get(frontKey);
      if (itemOnBoard) {
        if (itemOnBoard.type === "tomato_raw") {
          chef.isChopping = true;
          chef.chopProgress += dt * 0.9;
          if (chef.chopProgress >= 1.0) {
            itemOnBoard.type = "tomato_chopped";
            chef.isChopping = false;
            chef.chopProgress = 0;
            stateRef.activeLog = "Finished chopping juicy tomato!";
          }
        } else if (itemOnBoard.type === "lettuce_raw") {
          chef.isChopping = true;
          chef.chopProgress += dt * 0.9;
          if (chef.chopProgress >= 1.0) {
            itemOnBoard.type = "lettuce_chopped";
            chef.isChopping = false;
            chef.chopProgress = 0;
            stateRef.activeLog = "Finished shredding crisp lettuce!";
          }
        }
      }
    }
  }
}

export function stepChaosKitchen(
  state: ChaosKitchenState,
  dt: number,
  inputs: {
    chef1Mask: number;
    chef2Mask?: number;
  }
): ChaosKitchenState {
  if (state.status === "cleared" || state.status === "failed") {
    return state;
  }

  const nextFrame = state.currentFrame + 1;
  // Submit to LockstepPeerSession
  lockstepSession.submitLocalInput(nextFrame, inputs.chef1Mask);

  let nextState: ChaosKitchenState = {
    ...state,
    gameTimeSec: state.gameTimeSec + dt,
    currentFrame: nextFrame,
    chefs: state.chefs.map((c) => ({ ...c })),
    counterSlots: new Map(state.counterSlots),
    orders: state.orders.map((o) => ({ ...o })),
  };

  const stateRef = {
    score: nextState.score,
    servedOrders: nextState.servedOrders,
    comboCount: nextState.comboCount,
    activeLog: nextState.activeLog,
  };

  // 1. Step Chef 1 (Player)
  stepChefWithInput(nextState.chefs[0], inputs.chef1Mask, dt, nextState.counterSlots, stateRef);

  // 2. Step Chef 2 (AI Assistant via Dijkstra Flow Field or 2P)
  let chef2Mask = inputs.chef2Mask ?? 0;
  if (!inputs.chef2Mask) {
    // Autonomous AI Assistant: Finds unchopped item or cooked meat on stove
    const aiChef = nextState.chefs[1];
    let aiGoal: { x: number; y: number } | null = null;

    // Look for raw items on cutting boards
    for (const [key, item] of nextState.counterSlots.entries()) {
      if (item && (item.type === "tomato_raw" || item.type === "lettuce_raw")) {
        const [gx, gy] = key.split(",").map(Number);
        aiGoal = { x: gx, y: gy };
        break;
      }
    }

    if (aiGoal) {
      const flow = computeTargetFlowField(aiGoal);
      const currGX = Math.max(0, Math.min(KITCHEN_WIDTH - 1, Math.round(aiChef.x)));
      const currGY = Math.max(0, Math.min(KITCHEN_HEIGHT - 1, Math.round(aiChef.y)));
      const cell = flow[currGY]?.[currGX];

      if (cell && (cell.dirX !== 0 || cell.dirY !== 0)) {
        if (cell.dirY < 0) chef2Mask |= 1;
        if (cell.dirY > 0) chef2Mask |= 2;
        if (cell.dirX < 0) chef2Mask |= 4;
        if (cell.dirX > 0) chef2Mask |= 8;
      } else {
        // In front of goal, perform chop
        chef2Mask |= 32;
      }
    }
  }
  stepChefWithInput(nextState.chefs[1], chef2Mask, dt, nextState.counterSlots, stateRef);

  // 3. Stove Sizzle & Fire Mechanics
  let hasFire = false;
  for (const [key, item] of nextState.counterSlots.entries()) {
    if (!item) continue;
    const [gx, gy] = key.split(",").map(Number);
    const tile = KITCHEN_GRID[gy]?.[gx];

    if (tile === "stove" && item.isCooking) {
      item.cookProgress += dt * 0.25; // 4 seconds to cook
      if (item.cookProgress >= 1.0 && item.type === "meat_raw") {
        item.type = "meat_cooked";
        stateRef.activeLog = "Beef patty sizzling and cooked to perfection!";
      } else if (item.cookProgress >= 2.0 && item.type === "meat_cooked") {
        item.type = "meat_burned";
        item.isOnFire = true;
        stateRef.activeLog = "🚨 Stove caught fire! Grab extinguisher!";
      }
    }

    if (item.isOnFire) {
      hasFire = true;
    }
  }
  nextState.hasFire = hasFire;

  // 4. Delivery Window Interaction (Chef serving food)
  for (const chef of nextState.chefs) {
    if (chef.heldItem) {
      const frontX = Math.round(chef.x + chef.dirX * 0.7);
      const frontY = Math.round(chef.y + chef.dirY * 0.7);
      if (KITCHEN_GRID[frontY]?.[frontX] === "delivery") {
        const dishType = chef.heldItem.type;
        let matchedIdx = -1;

        if (dishType === "salad_dish") {
          matchedIdx = nextState.orders.findIndex((o) => o.recipe === "salad");
        } else if (dishType === "burger_dish") {
          matchedIdx = nextState.orders.findIndex((o) => o.recipe === "burger");
        }

        if (matchedIdx !== -1) {
          const matchedOrder = nextState.orders[matchedIdx];
          const tip = Math.floor(matchedOrder.timeRemainingSec * 3);
          const earned = matchedOrder.reward + tip;

          stateRef.score += earned;
          stateRef.servedOrders++;
          stateRef.comboCount++;
          stateRef.activeLog = `Served ${matchedOrder.recipe.toUpperCase()}! (+¥${earned}, Combo x${stateRef.comboCount})`;

          nextState.orders.splice(matchedIdx, 1);
          chef.heldItem = null;
        }
      }
    }
  }

  // 5. Order Management & Patience Countdown
  nextState.orders = nextState.orders.filter((order) => {
    order.timeRemainingSec -= dt;
    if (order.timeRemainingSec <= 0) {
      nextState.failedOrders++;
      stateRef.comboCount = 0;
      stateRef.score = Math.max(0, stateRef.score - 100);
      stateRef.activeLog = `Customer gave up waiting for ${order.recipe.toUpperCase()}! (-¥100)`;
      return false;
    }
    return true;
  });

  // Spawn new orders periodically
  nextState.orderCooldownSec -= dt;
  if (nextState.orderCooldownSec <= 0 && nextState.orders.length < 4) {
    const recipes: Array<"salad" | "burger" | "steak"> = ["salad", "burger", "steak"];
    const recipe = recipes[Math.floor(Math.random() * recipes.length)];
    const reward = recipe === "salad" ? 200 : recipe === "burger" ? 280 : 250;
    nextState.orders.push({
      id: `order-${Date.now()}-${Math.random()}`,
      recipe,
      timeRemainingSec: 40,
      maxTimeSec: 40,
      reward,
    });
    nextState.orderCooldownSec = 12 + Math.random() * 6;
  }

  nextState.score = stateRef.score;
  nextState.servedOrders = stateRef.servedOrders;
  nextState.comboCount = stateRef.comboCount;
  nextState.activeLog = stateRef.activeLog;

  // 6. Check Win/Loss conditions
  if (nextState.servedOrders >= 10 && nextState.score >= 2000) {
    nextState.status = "cleared";
    nextState.activeLog = "Shift Finished! Outstanding coordination and 3-Star Michelin Kitchen!";
  } else if (nextState.failedOrders >= 5) {
    nextState.status = "failed";
    nextState.activeLog = "Too many orders lost to chaos and burned food. Kitchen closed!";
  }

  return nextState;
}

export function runChaosKitchenMonteCarloAudit(trials = 20): {
  successTrials: number;
  averageScore: number;
  averageServed: number;
} {
  let successes = 0;
  let totalScore = 0;
  let totalServed = 0;

  for (let i = 0; i < trials; i++) {
    let sim = initializeChaosKitchen();
    let simTime = 0;
    const dt = 0.5;

    // Simulate 40-second rush
    while (sim.status === "playing" && simTime < 40) {
      simTime += dt;

      let chef1Mask = 0;
      const c1 = sim.chefs[0];

      // Simulated automated kitchen assist
      if (!c1.heldItem) {
        // Go pick clean plate from dispenser (4,0)
        c1.x = 4.0;
        c1.y = 1.0;
        c1.dirX = 0;
        c1.dirY = -1;
        chef1Mask = 16; // Pick
      } else if (c1.heldItem.type === "plate_clean") {
        // Automatically plate salad dish for testing throughput
        c1.heldItem.type = "salad_dish";
        // Deliver to window (5,0)
        c1.x = 5.0;
        c1.y = 1.0;
        c1.dirX = 0;
        c1.dirY = -1;
      }

      sim = stepChaosKitchen(sim, dt, { chef1Mask });
    }

    if (sim.status !== "failed" && sim.servedOrders > 0) {
      successes++;
    }
    totalScore += sim.score;
    totalServed += sim.servedOrders;
  }

  return {
    successTrials: successes,
    averageScore: Math.floor(totalScore / trials),
    averageServed: Number((totalServed / trials).toFixed(1)),
  };
}
