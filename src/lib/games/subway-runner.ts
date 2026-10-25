/**
 * Pure 3-lane physics & procedural track engine for
 * 『러너 빌더 3D (Subway Mini-Parkour)』
 *
 * 3-lane swipe runner, spring-damper lane changing, jump/slide mechanics,
 * dynamic speed scaling and collision detection.
 */

export type ObstacleType = "barrier_jump" | "barrier_slide" | "train_block" | "coin";

export interface RunnerObstacle {
  id: string;
  lane: -1 | 0 | 1;
  z: number; // meters ahead of player
  type: ObstacleType;
  collected?: boolean;
}

export interface RunnerPlayer {
  lane: -1 | 0 | 1;
  targetLane: -1 | 0 | 1;
  x: number; // smoothly interpolated between -1 and 1
  y: number; // jump height (0 = ground, > 0 in air)
  vy: number;
  isSliding: boolean;
  slideTimer: number;
}

export type SubwayRunnerStatus = "running" | "gameover";

export interface SubwayRunnerGame {
  player: RunnerPlayer;
  obstacles: RunnerObstacle[];
  speed: number; // meters per second
  distance: number;
  score: number;
  coins: number;
  status: SubwayRunnerStatus;
  hitStopTimer: number;
  nextSpawnZ: number;
}

export const INITIAL_SPEED = 18; // m/s
export const MAX_SPEED = 38;
export const SPEED_ACCELERATION = 0.35; // m/s per second
export const JUMP_IMPULSE = 8.5;
export const RUNNER_GRAVITY = -24;
export const SLIDE_DURATION = 0.65; // seconds
export const LANE_CHANGE_SPEED = 14;

/**
 * Creates initial runner state with clear track and upcoming obstacles
 */
export function createInitialSubwayRunnerGame(): SubwayRunnerGame {
  const obstacles: RunnerObstacle[] = [];
  let curZ = 25;

  for (let i = 0; i < 15; i++) {
    const lane = ([-1, 0, 1] as const)[i % 3];
    const isCoin = i % 2 === 0;

    if (isCoin) {
      obstacles.push({
        id: `coin-${i}-1`,
        lane,
        z: curZ,
        type: "coin",
      });
      obstacles.push({
        id: `coin-${i}-2`,
        lane,
        z: curZ + 4,
        type: "coin",
      });
    } else {
      const type: ObstacleType = i % 4 === 1 ? "barrier_jump" : "barrier_slide";
      obstacles.push({
        id: `obs-${i}`,
        lane,
        z: curZ,
        type,
      });
    }
    curZ += 18;
  }

  return {
    player: {
      lane: 0,
      targetLane: 0,
      x: 0,
      y: 0,
      vy: 0,
      isSliding: false,
      slideTimer: 0,
    },
    obstacles,
    speed: INITIAL_SPEED,
    distance: 0,
    score: 0,
    coins: 0,
    status: "running",
    hitStopTimer: 0,
    nextSpawnZ: curZ,
  };
}

/**
 * Player swipe or key action: Left (-1) or Right (+1)
 */
export function changeRunnerLane(game: SubwayRunnerGame, delta: -1 | 1): SubwayRunnerGame {
  if (game.status !== "running") return game;

  const current = game.player.targetLane;
  const nextLane = Math.max(-1, Math.min(1, current + delta)) as -1 | 0 | 1;

  return {
    ...game,
    player: {
      ...game.player,
      targetLane: nextLane,
    },
  };
}

/**
 * Player swipe up or Up Arrow: Jump
 */
export function jumpRunner(game: SubwayRunnerGame): SubwayRunnerGame {
  if (game.status !== "running") return game;
  if (game.player.y > 0.05) return game; // cannot double jump

  return {
    ...game,
    player: {
      ...game.player,
      isSliding: false,
      slideTimer: 0,
      vy: JUMP_IMPULSE,
    },
  };
}

/**
 * Player swipe down or Down Arrow: Slide
 */
export function slideRunner(game: SubwayRunnerGame): SubwayRunnerGame {
  if (game.status !== "running") return game;

  return {
    ...game,
    player: {
      ...game.player,
      isSliding: true,
      slideTimer: SLIDE_DURATION,
      vy: Math.min(game.player.vy, -12), // fast drop if mid-air
    },
  };
}

export interface RunnerStepResult {
  game: SubwayRunnerGame;
  collectedCoinCount: number;
  crashed: boolean;
}

/**
 * Advance deterministic 3D runner simulation by dt seconds
 */
export function stepSubwayRunner(game: SubwayRunnerGame, dt: number): RunnerStepResult {
  const result: RunnerStepResult = {
    game,
    collectedCoinCount: 0,
    crashed: false,
  };

  if (game.status !== "running") return result;

  // Handle hit-stop freeze
  if (game.hitStopTimer > 0) {
    result.game = {
      ...game,
      hitStopTimer: Math.max(0, game.hitStopTimer - dt),
    };
    return result;
  }

  const speed = Math.min(MAX_SPEED, game.speed + SPEED_ACCELERATION * dt);
  const distance = game.distance + speed * dt;
  let score = game.score + Math.round(speed * dt * 8);
  let coins = game.coins;
  let status: SubwayRunnerStatus = "running";

  // 1. Update Player Lane interpolation (spring damper)
  const player = { ...game.player };
  const targetX = player.targetLane;
  const diffX = targetX - player.x;
  player.x += diffX * Math.min(1, LANE_CHANGE_SPEED * dt);
  if (Math.abs(diffX) < 0.01) {
    player.x = targetX;
    player.lane = player.targetLane;
  }

  // 2. Update Jump & Gravity
  player.y += player.vy * dt;
  player.vy += RUNNER_GRAVITY * dt;
  if (player.y <= 0) {
    player.y = 0;
    player.vy = 0;
  }

  // 3. Update Slide
  if (player.isSliding) {
    player.slideTimer -= dt;
    if (player.slideTimer <= 0) {
      player.isSliding = false;
      player.slideTimer = 0;
    }
  }

  // 4. Update obstacles & check collision at player Z plane (Z ~ 0)
  const playerLaneApprox = Math.round(player.x);
  const updatedObstacles: RunnerObstacle[] = [];

  for (const obs of game.obstacles) {
    const nextZ = obs.z - speed * dt;

    if (nextZ > -10) {
      // Check collision window when obstacle reaches player Z (-0.8m to +0.8m)
      const inZWindow = nextZ >= -1.0 && nextZ <= 1.0;
      const inSameLane = obs.lane === playerLaneApprox;

      if (inZWindow && inSameLane) {
        if (obs.type === "coin" && !obs.collected) {
          result.collectedCoinCount += 1;
          coins += 1;
          score += 100;
          updatedObstacles.push({ ...obs, z: nextZ, collected: true });
          continue;
        }

        if (obs.type === "barrier_jump") {
          // Must jump over (y > 0.6)
          if (player.y < 0.6) {
            result.crashed = true;
            status = "gameover";
          }
        } else if (obs.type === "barrier_slide") {
          // Must slide under
          if (!player.isSliding) {
            result.crashed = true;
            status = "gameover";
          }
        } else if (obs.type === "train_block") {
          // Solid block
          result.crashed = true;
          status = "gameover";
        }
      }

      updatedObstacles.push({ ...obs, z: nextZ });
    }
  }

  // 5. Procedurally spawn new obstacles ahead
  let nextSpawnZ = game.nextSpawnZ - speed * dt;
  while (nextSpawnZ < 160) {
    const lane = ([-1, 0, 1] as const)[Math.floor(Math.random() * 3)];
    const roll = Math.random();

    if (roll < 0.45) {
      // Coin trail
      updatedObstacles.push({
        id: `coin-${distance.toFixed(0)}-1`,
        lane,
        z: nextSpawnZ,
        type: "coin",
      });
      updatedObstacles.push({
        id: `coin-${distance.toFixed(0)}-2`,
        lane,
        z: nextSpawnZ + 3.5,
        type: "coin",
      });
    } else if (roll < 0.72) {
      updatedObstacles.push({
        id: `jump-${distance.toFixed(0)}`,
        lane,
        z: nextSpawnZ,
        type: "barrier_jump",
      });
    } else if (roll < 0.9) {
      updatedObstacles.push({
        id: `slide-${distance.toFixed(0)}`,
        lane,
        z: nextSpawnZ,
        type: "barrier_slide",
      });
    } else {
      updatedObstacles.push({
        id: `train-${distance.toFixed(0)}`,
        lane,
        z: nextSpawnZ,
        type: "train_block",
      });
    }

    nextSpawnZ += 18 + Math.random() * 12;
  }

  result.game = {
    ...game,
    player,
    obstacles: updatedObstacles,
    speed,
    distance,
    score,
    coins,
    status,
    nextSpawnZ,
    hitStopTimer: result.crashed ? 0.08 : 0,
  };

  return result;
}
