export type Lane = -1 | 0 | 1;
export type ObstacleType = 'barrier_low' | 'barrier_high' | 'cube_collectible';

export interface Obstacle {
  id: string;
  lane: Lane;
  z: number;
  type: ObstacleType;
  collected?: boolean;
}

export interface PlayerState {
  lane: Lane;
  currentX: number;
  y: number;
  vy: number;
  isJumping: boolean;
  isDucking: boolean;
  duckTimer: number;
}

export const LANE_WIDTH = 2.5;
export const GRAVITY = 32;
export const JUMP_VELOCITY = 10.5;
export const DUCK_DURATION = 0.6;
export const SPAWN_DISTANCE = -80;
export const DESPAWN_DISTANCE = 10;
export const PLAYER_Z = 0;

export function getLaneX(lane: Lane): number {
  return lane * LANE_WIDTH;
}

export function createInitialPlayer(): PlayerState {
  return {
    lane: 0,
    currentX: 0,
    y: 0,
    vy: 0,
    isJumping: false,
    isDucking: false,
    duckTimer: 0,
  };
}

export function jump(player: PlayerState): PlayerState {
  if (player.isJumping || player.y > 0.05) return player;
  return {
    ...player,
    isJumping: true,
    isDucking: false,
    duckTimer: 0,
    vy: JUMP_VELOCITY,
  };
}

export function duck(player: PlayerState): PlayerState {
  if (player.isJumping) {
    // Quick drop from jump
    return {
      ...player,
      vy: -15,
      isDucking: true,
      duckTimer: DUCK_DURATION,
    };
  }
  return {
    ...player,
    isDucking: true,
    duckTimer: DUCK_DURATION,
  };
}

export function switchLane(player: PlayerState, direction: 'left' | 'right'): PlayerState {
  let nextLane: Lane = player.lane;
  if (direction === 'left') {
    nextLane = Math.max(-1, player.lane - 1) as Lane;
  } else {
    nextLane = Math.min(1, player.lane + 1) as Lane;
  }
  return {
    ...player,
    lane: nextLane,
  };
}

export function updatePlayer(player: PlayerState, delta: number): PlayerState {
  const targetX = getLaneX(player.lane);
  const nextX = player.currentX + (targetX - player.currentX) * Math.min(1, delta * 15);

  let nextY = player.y + player.vy * delta;
  let nextVy = player.vy - GRAVITY * delta;
  let nextJumping = player.isJumping;

  if (nextY <= 0) {
    nextY = 0;
    nextVy = 0;
    nextJumping = false;
  }

  let nextDuckTimer = Math.max(0, player.duckTimer - delta);
  let nextDucking = nextDuckTimer > 0;

  return {
    ...player,
    currentX: nextX,
    y: nextY,
    vy: nextVy,
    isJumping: nextJumping,
    isDucking: nextDucking,
    duckTimer: nextDuckTimer,
  };
}

export function checkCollision(
  player: PlayerState,
  obstacle: Obstacle
): { collision: boolean; collect: boolean } {
  if (obstacle.collected) return { collision: false, collect: false };

  const zDiff = Math.abs(obstacle.z - PLAYER_Z);
  if (zDiff > 0.9) return { collision: false, collect: false };

  // Lane alignment: check if player is close to obstacle's lane
  const targetX = getLaneX(obstacle.lane);
  if (Math.abs(player.currentX - targetX) > 1.2) {
    return { collision: false, collect: false };
  }

  if (obstacle.type === 'cube_collectible') {
    return { collision: false, collect: true };
  }

  if (obstacle.type === 'barrier_low') {
    // Must jump over
    const safe = player.y > 0.7;
    return { collision: !safe, collect: false };
  }

  if (obstacle.type === 'barrier_high') {
    // Must duck under
    const safe = player.isDucking && player.y < 0.4;
    return { collision: !safe, collect: false };
  }

  return { collision: false, collect: false };
}

export function spawnObstacleWave(spawnZ: number, seed: number): Obstacle[] {
  const lanes: Lane[] = [-1, 0, 1];
  const items: Obstacle[] = [];
  const primaryLane = lanes[Math.floor(Math.abs(Math.sin(seed * 999)) * 3)];
  const typeRoll = Math.abs(Math.cos(seed * 777));

  const obstacleType: ObstacleType = typeRoll > 0.5 ? 'barrier_low' : 'barrier_high';
  items.push({
    id: `obs-${seed}-${primaryLane}`,
    lane: primaryLane,
    z: spawnZ,
    type: obstacleType,
  });

  // Collectible in a different lane
  const otherLanes = lanes.filter((l) => l !== primaryLane);
  const crystalLane = otherLanes[seed % otherLanes.length];
  items.push({
    id: `crys-${seed}-${crystalLane}`,
    lane: crystalLane,
    z: spawnZ,
    type: 'cube_collectible',
  });

  return items;
}
