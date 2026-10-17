export interface PlayerCar {
  x: number;
  lane: -1 | 0 | 1;
  targetLane: -1 | 0 | 1;
  speed: number;
  boostEnergy: number;
  isBoosting: boolean;
  score: number;
  distance: number;
  nearMissCount: number;
  status: 'ready' | 'playing' | 'gameover';
}

export interface TrafficCar {
  id: number;
  lane: -1 | 0 | 1;
  z: number; // distance relative to player
  speed: number;
  color: string;
}

export interface PowerCell {
  id: number;
  lane: -1 | 0 | 1;
  z: number;
  collected: boolean;
}

export interface HighwayState {
  player: PlayerCar;
  traffic: TrafficCar[];
  powerCells: PowerCell[];
  nextTrafficId: number;
  nextPowerId: number;
  elapsedTime: number;
}

export const LANE_WIDTH = 3.2;
export const BASE_SPEED = 35; // km/h base scale
export const MAX_SPEED = 90;
export const BOOST_SPEED = 145;
export const CAR_LENGTH = 3.6;
export const CAR_WIDTH = 1.8;

export function getLaneX(lane: -1 | 0 | 1): number {
  return lane * LANE_WIDTH;
}

export function createInitialHighwayState(): HighwayState {
  return {
    player: {
      x: 0,
      lane: 0,
      targetLane: 0,
      speed: BASE_SPEED,
      boostEnergy: 100,
      isBoosting: false,
      score: 0,
      distance: 0,
      nearMissCount: 0,
      status: 'ready',
    },
    traffic: [
      { id: 1, lane: -1, z: 45, speed: 25, color: '#ec4899' },
      { id: 2, lane: 1, z: 80, speed: 30, color: '#3b82f6' },
      { id: 3, lane: 0, z: 120, speed: 20, color: '#eab308' },
    ],
    powerCells: [
      { id: 1, lane: 0, z: 60, collected: false },
      { id: 2, lane: -1, z: 100, collected: false },
    ],
    nextTrafficId: 4,
    nextPowerId: 3,
    elapsedTime: 0,
  };
}

export interface HighwayInput {
  steer: -1 | 0 | 1; // -1 for left lane, 1 for right lane
  boost: boolean;
  brake: boolean;
}

export function updateHighway(
  state: HighwayState,
  input: HighwayInput,
  dt: number
): HighwayState {
  if (state.player.status === 'gameover') {
    return state;
  }

  const safeDt = Math.min(dt, 0.05);
  let status: PlayerCar['status'] = state.player.status;

  if (status === 'ready' && (input.steer !== 0 || input.boost || input.brake)) {
    status = 'playing';
  }

  // Handle lane change
  let targetLane = state.player.targetLane;
  if (input.steer === -1 && targetLane > -1) {
    targetLane = (targetLane - 1) as -1 | 0 | 1;
  } else if (input.steer === 1 && targetLane < 1) {
    targetLane = (targetLane + 1) as -1 | 0 | 1;
  }

  // Smooth lane transition
  const targetX = getLaneX(targetLane);
  const x = state.player.x + (targetX - state.player.x) * Math.min(1, safeDt * 14);

  // Speed and Boost logic
  let speed = state.player.speed;
  let boostEnergy = state.player.boostEnergy;
  let isBoosting = false;

  if (status === 'playing') {
    if (input.boost && boostEnergy > 0) {
      isBoosting = true;
      speed = Math.min(BOOST_SPEED, speed + safeDt * 65);
      boostEnergy = Math.max(0, boostEnergy - safeDt * 30);
    } else if (input.brake) {
      speed = Math.max(BASE_SPEED * 0.6, speed - safeDt * 50);
      boostEnergy = Math.min(100, boostEnergy + safeDt * 8);
    } else {
      // Normal cruising speed acceleration over time
      speed = Math.min(MAX_SPEED, speed + safeDt * 10);
      boostEnergy = Math.min(100, boostEnergy + safeDt * 10);
    }
  }

  const distanceTraveled = (speed * 0.28) * safeDt; // in meters
  const distance = state.player.distance + distanceTraveled;
  let score = state.player.score + Math.floor(distanceTraveled * (isBoosting ? 2.5 : 1));
  let nearMissCount = state.player.nearMissCount;

  // Move traffic
  let nextTrafficId = state.nextTrafficId;
  const traffic: TrafficCar[] = [];
  const relativeSpeedPlayer = speed * 0.28;

  for (const car of state.traffic) {
    const relSpeed = relativeSpeedPlayer - car.speed * 0.28;
    const newZ = car.z - relSpeed * safeDt;

    // Check collision with player
    const carX = getLaneX(car.lane);
    const distZ = Math.abs(newZ);
    const distX = Math.abs(x - carX);

    if (distZ < CAR_LENGTH * 0.8 && distX < CAR_WIDTH * 0.75) {
      // Crash!
      status = 'gameover';
    } else if (newZ < 0 && car.z >= 0 && distX < LANE_WIDTH * 1.3 && distX > CAR_WIDTH * 0.75) {
      // Near miss bonus!
      nearMissCount += 1;
      score += 100;
    }

    if (newZ > -25) {
      traffic.push({ ...car, z: newZ });
    }
  }

  // Spawn new traffic cars ahead
  if (traffic.length < 4) {
    const maxZ = traffic.reduce((max, c) => Math.max(max, c.z), 40);
    const spawnZ = maxZ + 25 + Math.random() * 20;
    const lanes: (-1 | 0 | 1)[] = [-1, 0, 1];
    const lane = lanes[Math.floor(Math.random() * lanes.length)];
    const colors = ['#ec4899', '#3b82f6', '#eab308', '#a855f7', '#06b6d4'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    traffic.push({
      id: nextTrafficId++,
      lane,
      z: spawnZ,
      speed: 25 + Math.random() * 20,
      color,
    });
  }

  // Move and collect power cells
  let nextPowerId = state.nextPowerId;
  const powerCells: PowerCell[] = [];

  for (const cell of state.powerCells) {
    const newZ = cell.z - relativeSpeedPlayer * safeDt;
    const cellX = getLaneX(cell.lane);

    if (!cell.collected && Math.abs(newZ) < 2.2 && Math.abs(x - cellX) < 1.4) {
      // Collected power cell!
      boostEnergy = Math.min(100, boostEnergy + 35);
      score += 50;
      powerCells.push({ ...cell, z: newZ, collected: true });
    } else if (newZ > -20) {
      powerCells.push({ ...cell, z: newZ });
    }
  }

  // Spawn new power cells
  if (powerCells.filter((p) => !p.collected).length < 2) {
    const lanes: (-1 | 0 | 1)[] = [-1, 0, 1];
    const lane = lanes[Math.floor(Math.random() * lanes.length)];
    const spawnZ = 80 + Math.random() * 50;
    powerCells.push({
      id: nextPowerId++,
      lane,
      z: spawnZ,
      collected: false,
    });
  }

  return {
    player: {
      x,
      lane: targetLane,
      targetLane,
      speed,
      boostEnergy,
      isBoosting,
      score,
      distance,
      nearMissCount,
      status,
    },
    traffic,
    powerCells,
    nextTrafficId,
    nextPowerId,
    elapsedTime: status === 'playing' ? state.elapsedTime + safeDt : state.elapsedTime,
  };
}
