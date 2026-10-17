export type VehicleType = "sedan" | "truck" | "sport";
export type CollectibleType = "nitro" | "credit" | "repair";

export interface TrafficVehicle {
  id: string;
  lane: number; // -2, -1, 0, 1, 2
  x: number;
  z: number; // ahead of player
  speed: number;
  type: VehicleType;
  width: number;
  length: number;
  color: number;
}

export interface Collectible {
  id: string;
  lane: number;
  x: number;
  z: number;
  type: CollectibleType;
  collected: boolean;
}

export interface CyberHighwayState {
  playerX: number; // current lateral position
  targetLane: number; // target lane index (-2 to 2)
  speed: number; // current speed
  baseSpeed: number; // cruise speed
  maxSpeed: number;
  nitroSpeed: number;
  nitro: number; // 0 to 100
  isBoosting: boolean;
  hp: number; // 0 to 100
  maxHp: number;
  distance: number;
  score: number;
  credits: number;
  combo: number;
  gameOver: boolean;
  paused: boolean;
  traffic: TrafficVehicle[];
  collectibles: Collectible[];
  lastSpawnZ: number;
}

export const LANE_WIDTH = 2.4;
export const TOTAL_LANES = 5; // lanes: -2, -1, 0, 1, 2
export const ROAD_WIDTH = LANE_WIDTH * TOTAL_LANES;

export function laneToX(lane: number): number {
  return lane * LANE_WIDTH;
}

export function createInitialCyberHighwayState(): CyberHighwayState {
  return {
    playerX: 0,
    targetLane: 0,
    speed: 25,
    baseSpeed: 25,
    maxSpeed: 55,
    nitroSpeed: 85,
    nitro: 50,
    isBoosting: false,
    hp: 100,
    maxHp: 100,
    distance: 0,
    score: 0,
    credits: 0,
    combo: 1,
    gameOver: false,
    paused: false,
    traffic: [],
    collectibles: [],
    lastSpawnZ: 20,
  };
}

export function steerPlayer(state: CyberHighwayState, direction: -1 | 1): CyberHighwayState {
  if (state.gameOver || state.paused) return state;
  const newLane = Math.max(-2, Math.min(2, state.targetLane + direction));
  return {
    ...state,
    targetLane: newLane,
  };
}

export function activateNitro(state: CyberHighwayState): CyberHighwayState {
  if (state.gameOver || state.paused || state.nitro < 15) return state;
  return {
    ...state,
    isBoosting: true,
  };
}

export function deactivateNitro(state: CyberHighwayState): CyberHighwayState {
  return {
    ...state,
    isBoosting: false,
  };
}

let nextEntityId = 1;

export function updateCyberHighway(state: CyberHighwayState, dt: number): CyberHighwayState {
  if (state.gameOver || state.paused) return state;

  const targetX = laneToX(state.targetLane);
  const playerX = state.playerX + (targetX - state.playerX) * Math.min(1, dt * 10);

  // Speed & Nitro management
  let speed = state.speed;
  let nitro = state.nitro;
  let isBoosting = state.isBoosting;

  if (isBoosting) {
    nitro = Math.max(0, nitro - dt * 25);
    speed = Math.min(state.nitroSpeed, speed + dt * 45);
    if (nitro <= 0) {
      isBoosting = false;
    }
  } else {
    // Normal acceleration towards cruise speed
    nitro = Math.min(100, nitro + dt * 5); // passive nitro recharge
    if (speed > state.baseSpeed) {
      speed = Math.max(state.baseSpeed, speed - dt * 20);
    } else {
      speed = Math.min(state.baseSpeed, speed + dt * 15);
    }
  }

  const forwardDist = speed * dt;
  const distance = state.distance + forwardDist;
  let score = state.score + Math.round(forwardDist * 2 * (isBoosting ? 2 : 1));
  let credits = state.credits;
  let hp = state.hp;
  let gameOver = false;
  let combo = state.combo;

  // Update existing traffic vehicles
  const playerZ = 0; // player is always at z=0 in relative local view
  const updatedTraffic: TrafficVehicle[] = [];
  const playerW = 1.6;
  const playerL = 3.2;

  for (const v of state.traffic) {
    // Relative movement: traffic moves forward at (v.speed - player.speed)
    const newZ = v.z + (v.speed - speed) * dt;

    // Check collision with player around z = 0
    const xOverlap = Math.abs(playerX - v.x) < (playerW + v.width) * 0.5 * 0.85;
    const zOverlap = Math.abs(newZ - playerZ) < (playerL + v.length) * 0.5 * 0.85;

    if (xOverlap && zOverlap) {
      // Crash!
      const damage = v.type === "truck" ? 40 : v.type === "sedan" ? 25 : 20;
      hp = Math.max(0, hp - damage);
      speed = Math.max(10, speed * 0.4);
      isBoosting = false;
      combo = 1;
      if (hp <= 0) {
        gameOver = true;
      }
      continue; // Remove collided vehicle
    }

    // Keep if within visibility window (-20 to +180)
    if (newZ > -25 && newZ < 190) {
      updatedTraffic.push({
        ...v,
        z: newZ,
      });
    }
  }

  // Update collectibles
  const updatedCollectibles: Collectible[] = [];
  for (const c of state.collectibles) {
    const newZ = c.z - speed * dt;

    // Check pickup
    const xDist = Math.abs(playerX - c.x);
    const zDist = Math.abs(newZ - playerZ);

    if (xDist < 1.4 && zDist < 2.0 && !c.collected) {
      if (c.type === "nitro") {
        nitro = Math.min(100, nitro + 35);
        score += 100 * combo;
      } else if (c.type === "credit") {
        credits += 25;
        score += 250 * combo;
        combo = Math.min(10, combo + 1);
      } else if (c.type === "repair") {
        hp = Math.min(state.maxHp, hp + 30);
        score += 50;
      }
      continue; // collected
    }

    if (newZ > -10 && !c.collected) {
      updatedCollectibles.push({
        ...c,
        z: newZ,
      });
    }
  }

  // Spawning new entities ahead (z: 100 to 180)
  let lastSpawnZ = state.lastSpawnZ - speed * dt;
  if (lastSpawnZ < 100 && updatedTraffic.length < 8) {
    const lane = Math.floor(Math.random() * TOTAL_LANES) - 2;
    const spawnZ = 120 + Math.random() * 40;
    const typeRoll = Math.random();
    const type: VehicleType = typeRoll < 0.25 ? "truck" : typeRoll < 0.65 ? "sedan" : "sport";
    const vSpeed = type === "truck" ? 16 + Math.random() * 4 : type === "sport" ? 32 + Math.random() * 8 : 22 + Math.random() * 5;
    const width = type === "truck" ? 2.0 : 1.5;
    const length = type === "truck" ? 5.2 : 3.4;
    const color = type === "truck" ? 0xef4444 : type === "sport" ? 0x06b6d4 : 0xeab308;

    updatedTraffic.push({
      id: `traffic-${nextEntityId++}`,
      lane,
      x: laneToX(lane),
      z: spawnZ,
      speed: vSpeed,
      type,
      width,
      length,
      color,
    });

    // Maybe spawn collectible alongside
    if (Math.random() < 0.5) {
      const cLane = Math.floor(Math.random() * TOTAL_LANES) - 2;
      const cTypeRoll = Math.random();
      const cType: CollectibleType = cTypeRoll < 0.4 ? "nitro" : cTypeRoll < 0.8 ? "credit" : "repair";
      updatedCollectibles.push({
        id: `collectible-${nextEntityId++}`,
        lane: cLane,
        x: laneToX(cLane),
        z: spawnZ + 25,
        type: cType,
        collected: false,
      });
    }

    lastSpawnZ = spawnZ;
  }

  return {
    ...state,
    playerX,
    speed,
    nitro,
    isBoosting,
    hp,
    distance,
    score,
    credits,
    combo,
    gameOver,
    traffic: updatedTraffic,
    collectibles: updatedCollectibles,
    lastSpawnZ,
  };
}
