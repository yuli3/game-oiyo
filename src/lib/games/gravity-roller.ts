export interface Vec2 {
  x: number;
  z: number;
}

export interface Wall {
  x: number;
  z: number;
  width: number; // along X
  depth: number; // along Z
}

export interface Hole {
  x: number;
  z: number;
  radius: number;
}

export interface Gem {
  id: string;
  x: number;
  z: number;
  collected: boolean;
}

export interface Ball {
  x: number;
  y: number; // 0 is resting on board, negative is falling into hole
  z: number;
  vx: number;
  vz: number;
  radius: number;
}

export interface LevelConfig {
  id: number;
  name: string;
  boardSize: number; // half-size, e.g. 6.0 => -6 to +6
  ballStart: Vec2;
  goal: Vec2;
  timeLimit: number;
  walls: Wall[];
  holes: Hole[];
  gems: Vec2[];
}

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: "Gentle Descent",
    boardSize: 6.0,
    ballStart: { x: -4.5, z: -4.5 },
    goal: { x: 4.5, z: 4.5 },
    timeLimit: 45,
    walls: [
      // Outer boundaries
      { x: 0, z: -6.0, width: 12.0, depth: 0.4 },
      { x: 0, z: 6.0, width: 12.0, depth: 0.4 },
      { x: -6.0, z: 0, width: 0.4, depth: 12.0 },
      { x: 6.0, z: 0, width: 0.4, depth: 12.0 },
      // Interior maze walls
      { x: -2.0, z: -2.0, width: 6.0, depth: 0.4 },
      { x: 2.0, z: 2.0, width: 6.0, depth: 0.4 },
      { x: 0, z: 0, width: 0.4, depth: 4.0 },
    ],
    holes: [
      { x: -2.0, z: 1.5, radius: 0.45 },
      { x: 2.0, z: -1.5, radius: 0.45 },
    ],
    gems: [
      { x: -4.5, z: 0 },
      { x: 0, z: 3.5 },
      { x: 4.5, z: -3.5 },
    ],
  },
  {
    id: 2,
    name: "Vortex Cross",
    boardSize: 6.0,
    ballStart: { x: -4.5, z: 4.5 },
    goal: { x: 4.5, z: -4.5 },
    timeLimit: 50,
    walls: [
      { x: 0, z: -6.0, width: 12.0, depth: 0.4 },
      { x: 0, z: 6.0, width: 12.0, depth: 0.4 },
      { x: -6.0, z: 0, width: 0.4, depth: 12.0 },
      { x: 6.0, z: 0, width: 0.4, depth: 12.0 },
      { x: -2.5, z: 1.0, width: 0.4, depth: 6.0 },
      { x: 2.5, z: -1.0, width: 0.4, depth: 6.0 },
      { x: 0, z: 3.0, width: 4.0, depth: 0.4 },
      { x: 0, z: -3.0, width: 4.0, depth: 0.4 },
    ],
    holes: [
      { x: 0, z: 0, radius: 0.5 },
      { x: -3.5, z: -2.0, radius: 0.45 },
      { x: 3.5, z: 2.0, radius: 0.45 },
    ],
    gems: [
      { x: -4.5, z: -4.5 },
      { x: 0, z: -1.5 },
      { x: 0, z: 1.5 },
      { x: 4.5, z: 4.5 },
    ],
  },
];

export interface GravityRollerState {
  currentLevelIndex: number;
  status: "ready" | "playing" | "cleared" | "failed";
  ball: Ball;
  tilt: {
    pitch: number; // rotation around X (-0.35 to 0.35 rad)
    roll: number;  // rotation around Z (-0.35 to 0.35 rad)
  };
  gems: Gem[];
  timeRemaining: number;
  score: number;
  highScore: number;
}

export const GRAVITY = 18.0;
export const FRICTION = 0.985;
export const RESTITUTION = 0.45;
export const MAX_TILT = 0.32;

export function createInitialState(levelIndex = 0): GravityRollerState {
  const level = LEVELS[levelIndex % LEVELS.length];
  return {
    currentLevelIndex: levelIndex,
    status: "ready",
    ball: {
      x: level.ballStart.x,
      y: 0.35,
      z: level.ballStart.z,
      vx: 0,
      vz: 0,
      radius: 0.35,
    },
    tilt: {
      pitch: 0,
      roll: 0,
    },
    gems: level.gems.map((g, idx) => ({
      id: `gem-${idx}`,
      x: g.x,
      z: g.z,
      collected: false,
    })),
    timeRemaining: level.timeLimit,
    score: 0,
    highScore: 0,
  };
}

export function setTilt(
  state: GravityRollerState,
  targetPitch: number,
  targetRoll: number
): void {
  state.tilt.pitch = Math.max(-MAX_TILT, Math.min(MAX_TILT, targetPitch));
  state.tilt.roll = Math.max(-MAX_TILT, Math.min(MAX_TILT, targetRoll));
}

export function updatePhysics(
  state: GravityRollerState,
  dt: number
): void {
  if (state.status !== "playing") return;

  const level = LEVELS[state.currentLevelIndex % LEVELS.length];
  const ball = state.ball;

  // 1. Time countdown
  state.timeRemaining = Math.max(0, state.timeRemaining - dt);
  if (state.timeRemaining <= 0) {
    state.status = "failed";
    return;
  }

  // 2. Acceleration derived from gravity on tilted plane
  // roll tilts Z axis, pitch tilts X axis
  const ax = Math.sin(state.tilt.roll) * GRAVITY;
  const az = -Math.sin(state.tilt.pitch) * GRAVITY;

  ball.vx = (ball.vx + ax * dt) * FRICTION;
  ball.vz = (ball.vz + az * dt) * FRICTION;

  // Predict new position
  let newX = ball.x + ball.vx * dt;
  let newZ = ball.z + ball.vz * dt;

  // 3. Wall collisions (AABB vs sphere)
  for (const wall of level.walls) {
    const minX = wall.x - wall.width / 2;
    const maxX = wall.x + wall.width / 2;
    const minZ = wall.z - wall.depth / 2;
    const maxZ = wall.z + wall.depth / 2;

    // Closest point on wall box to ball
    const closestX = Math.max(minX, Math.min(newX, maxX));
    const closestZ = Math.max(minZ, Math.min(newZ, maxZ));

    const distX = newX - closestX;
    const distZ = newZ - closestZ;
    const distance = Math.hypot(distX, distZ);

    if (distance < ball.radius) {
      // Collision detected! Push ball back and bounce
      const overlap = ball.radius - distance;
      const nx = distance > 0 ? distX / distance : 1;
      const nz = distance > 0 ? distZ / distance : 0;

      newX += nx * overlap;
      newZ += nz * overlap;

      // Reflect velocity along normal
      const dot = ball.vx * nx + ball.vz * nz;
      if (dot < 0) {
        ball.vx -= (1 + RESTITUTION) * dot * nx;
        ball.vz -= (1 + RESTITUTION) * dot * nz;
      }
    }
  }

  ball.x = newX;
  ball.z = newZ;

  // 4. Hole trap detection
  for (const hole of level.holes) {
    const distToHole = Math.hypot(ball.x - hole.x, ball.z - hole.z);
    if (distToHole < hole.radius) {
      // Sucked into hole
      ball.y = -1.0;
      state.status = "failed";
      return;
    }
  }

  // 5. Gem collection
  for (const gem of state.gems) {
    if (!gem.collected) {
      const distToGem = Math.hypot(ball.x - gem.x, ball.z - gem.z);
      if (distToGem < ball.radius + 0.3) {
        gem.collected = true;
        state.score += 150;
      }
    }
  }

  // 6. Goal detection
  const distToGoal = Math.hypot(ball.x - level.goal.x, ball.z - level.goal.z);
  if (distToGoal < 0.6) {
    // Reached destination!
    const timeBonus = Math.round(state.timeRemaining * 20);
    state.score += 500 + timeBonus;
    state.highScore = Math.max(state.highScore, state.score);
    state.status = "cleared";
  }
}
