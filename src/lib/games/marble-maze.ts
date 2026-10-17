export interface Cell {
  x: number;
  z: number;
}

export interface MazeConfig {
  width: number;
  height: number;
  grid: number[][]; // 0: empty, 1: wall, 2: hole, 3: gem, 4: start, 5: goal
  startX: number;
  startZ: number;
  goalX: number;
  goalZ: number;
  gemTotal: number;
}

export interface BallPhysics {
  x: number;
  z: number;
  vx: number;
  vz: number;
  radius: number;
}

export interface GameState {
  time: number;
  gemsCollected: number;
  gemTotal: number;
  status: 'playing' | 'cleared' | 'fallen';
  score: number;
}

// Deterministic seedable random for consistent maze generation per level/seed
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateMaze(width = 11, height = 11, seed = 42): MazeConfig {
  const rand = mulberry32(seed);
  // Grid: 1 is wall, 0 is empty
  const grid: number[][] = Array.from({ length: height }, () => Array(width).fill(1));

  // Carve passages using randomized DFS
  function carve(cx: number, cz: number) {
    grid[cz][cx] = 0;
    const directions = [
      [0, -2],
      [0, 2],
      [-2, 0],
      [2, 0],
    ].sort(() => rand() - 0.5);

    for (const [dx, dz] of directions) {
      const nx = cx + dx;
      const nz = cz + dz;
      if (nx > 0 && nx < width - 1 && nz > 0 && nz < height - 1 && grid[nz][nx] === 1) {
        grid[cz + dz / 2][cx + dx / 2] = 0;
        carve(nx, nz);
      }
    }
  }

  carve(1, 1);

  const startX = 1;
  const startZ = 1;
  const goalX = width - 2;
  const goalZ = height - 2;
  grid[startZ][startX] = 4;
  grid[goalZ][goalX] = 5;

  let gemTotal = 0;
  // Place gems and holes in empty dead ends or spots away from start and goal
  for (let z = 1; z < height - 1; z++) {
    for (let x = 1; x < width - 1; x++) {
      if (grid[z][x] === 0) {
        const distFromStart = Math.hypot(x - startX, z - startZ);
        const distFromGoal = Math.hypot(x - goalX, z - goalZ);
        const r = rand();
        if (distFromStart > 2 && distFromGoal > 2) {
          if (r < 0.14) {
            grid[z][x] = 2; // hole trap
          } else if (r > 0.78) {
            grid[z][x] = 3; // gem bonus
            gemTotal++;
          }
        }
      }
    }
  }

  // Ensure at least 3 gems
  if (gemTotal === 0) {
    grid[Math.floor(height / 2)][Math.floor(width / 2)] = 3;
    gemTotal = 1;
  }

  return { width, height, grid, startX, startZ, goalX, goalZ, gemTotal };
}

export function updateBallPhysics(
  ball: BallPhysics,
  tiltX: number, // left-right tilt (-1 to 1)
  tiltZ: number, // forward-backward tilt (-1 to 1)
  config: MazeConfig,
  dt: number = 1 / 60
): { ball: BallPhysics; event?: 'gem' | 'hole' | 'goal'; gemPos?: Cell } {
  const GRAVITY = 22.0;
  const FRICTION = 0.965;
  const BOUNCE = 0.35;

  let { x, z, vx, vz, radius } = ball;

  // Apply tilt acceleration
  vx += tiltX * GRAVITY * dt;
  vz += tiltZ * GRAVITY * dt;

  // Velocity damping
  vx *= FRICTION;
  vz *= FRICTION;

  // Next candidate position
  let nx = x + vx * dt;
  let nz = z + vz * dt;

  // Collision with boundaries and walls
  // Check X movement
  const checkXCells = [
    { cx: Math.floor(nx - radius), cz: Math.floor(z) },
    { cx: Math.floor(nx + radius), cz: Math.floor(z) },
  ];
  for (const { cx, cz } of checkXCells) {
    if (cx < 0 || cx >= config.width || cz < 0 || cz >= config.height || config.grid[cz]?.[cx] === 1) {
      vx = -vx * BOUNCE;
      nx = x; // revert X
      break;
    }
  }

  // Check Z movement
  const checkZCells = [
    { cx: Math.floor(nx), cz: Math.floor(nz - radius) },
    { cx: Math.floor(nx), cz: Math.floor(nz + radius) },
  ];
  for (const { cx, cz } of checkZCells) {
    if (cx < 0 || cx >= config.width || cz < 0 || cz >= config.height || config.grid[cz]?.[cx] === 1) {
      vz = -vz * BOUNCE;
      nz = z; // revert Z
      break;
    }
  }

  // Final updated coordinates
  const updatedBall: BallPhysics = {
    x: nx,
    z: nz,
    vx,
    vz,
    radius,
  };

  // Check interactions (center cell)
  const currentCellX = Math.round(nx);
  const currentCellZ = Math.round(nz);
  const cellType = config.grid[currentCellZ]?.[currentCellX];

  const distToCenter = Math.hypot(nx - currentCellX, nz - currentCellZ);

  if (cellType === 2 && distToCenter < 0.38) {
    return { ball: updatedBall, event: 'hole' };
  }
  if (cellType === 3 && distToCenter < 0.42) {
    config.grid[currentCellZ][currentCellX] = 0; // Gem taken
    return { ball: updatedBall, event: 'gem', gemPos: { x: currentCellX, z: currentCellZ } };
  }
  if (cellType === 5 && distToCenter < 0.45) {
    return { ball: updatedBall, event: 'goal' };
  }

  return { ball: updatedBall };
}

export function calculateScore(timeSeconds: number, gemsCollected: number, gemTotal: number): number {
  const baseScore = 5000;
  const timePenalty = Math.floor(timeSeconds * 50);
  const gemBonus = gemsCollected * 600;
  const allClearBonus = gemsCollected === gemTotal ? 2000 : 0;
  return Math.max(100, baseScore - timePenalty + gemBonus + allClearBonus);
}
