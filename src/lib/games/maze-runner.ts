/**
 * 3D Voxel Maze Runner engine.
 * Procedural recursive-backtracking maze generator, player movement, collision detection, and gem collection.
 */

export interface Gem {
  id: number;
  x: number;
  z: number;
  collected: boolean;
}

export interface MazeRunnerState {
  gridSize: number;
  grid: number[][]; // 0 = path, 1 = wall
  playerX: number;
  playerZ: number;
  targetX: number;
  targetZ: number;
  playerAngle: number;
  gems: Gem[];
  gemsCollected: number;
  totalGems: number;
  exitX: number;
  exitZ: number;
  timeLeft: number;
  score: number;
  highScore: number;
  level: number;
  status: 'playing' | 'escaped' | 'timeout';
}

/**
 * Generate an odd-sized maze using recursive backtracking.
 * 1 = wall, 0 = path.
 */
export function generateMaze(size: number): { grid: number[][]; exitX: number; exitZ: number } {
  const actualSize = size % 2 === 0 ? size + 1 : size;
  const grid: number[][] = Array.from({ length: actualSize }, () => Array(actualSize).fill(1));

  function carve(cx: number, cz: number) {
    grid[cz][cx] = 0;
    const directions = [
      [0, -2],
      [0, 2],
      [-2, 0],
      [2, 0],
    ].sort(() => Math.random() - 0.5);

    for (const [dx, dz] of directions) {
      const nx = cx + dx;
      const nz = cz + dz;
      if (nx > 0 && nx < actualSize - 1 && nz > 0 && nz < actualSize - 1 && grid[nz][nx] === 1) {
        grid[cz + dz / 2][cx + dx / 2] = 0;
        carve(nx, nz);
      }
    }
  }

  carve(1, 1);

  const exitX = actualSize - 2;
  const exitZ = actualSize - 2;
  grid[exitZ][exitX] = 0;

  return { grid, exitX, exitZ };
}

export function createInitialMazeRunnerState(level = 1, highScore = 0): MazeRunnerState {
  const size = 11 + (level - 1) * 2; // 11, 13, 15...
  const { grid, exitX, exitZ } = generateMaze(size);

  const gems: Gem[] = [];
  let gemId = 1;
  for (let z = 1; z < size - 1; z++) {
    for (let x = 1; x < size - 1; x++) {
      if (grid[z][x] === 0 && !(x === 1 && z === 1) && !(x === exitX && z === exitZ)) {
        if ((x * 3 + z * 5 + level) % 7 === 0) {
          gems.push({ id: gemId++, x, z, collected: false });
        }
      }
    }
  }

  return {
    gridSize: size,
    grid,
    playerX: 1,
    playerZ: 1,
    targetX: 1,
    targetZ: 1,
    playerAngle: 0,
    gems,
    gemsCollected: 0,
    totalGems: gems.length,
    exitX,
    exitZ,
    timeLeft: 60 + level * 10,
    score: (level - 1) * 500,
    highScore,
    level,
    status: 'playing',
  };
}

export function tryMovePlayer(
  state: MazeRunnerState,
  dirX: number,
  dirZ: number,
): MazeRunnerState {
  if (state.status !== 'playing') return state;

  const nx = Math.round(state.playerX + dirX);
  const nz = Math.round(state.playerZ + dirZ);

  if (nx < 0 || nx >= state.gridSize || nz < 0 || nz >= state.gridSize) return state;
  if (state.grid[nz][nx] === 1) return state; // Blocked by wall

  let angle = state.playerAngle;
  if (dirX === 1) angle = Math.PI / 2;
  else if (dirX === -1) angle = -Math.PI / 2;
  else if (dirZ === 1) angle = 0;
  else if (dirZ === -1) angle = Math.PI;

  return {
    ...state,
    targetX: nx,
    targetZ: nz,
    playerAngle: angle,
  };
}

export function updateMazeRunner(state: MazeRunnerState, dt: number): MazeRunnerState {
  if (state.status !== 'playing') return state;

  // Move smoothly towards target
  const speed = 7.0;
  const dx = state.targetX - state.playerX;
  const dz = state.targetZ - state.playerZ;
  const dist = Math.hypot(dx, dz);

  let nextPx = state.playerX;
  let nextPz = state.playerZ;

  if (dist > 0.01) {
    const step = Math.min(dist, speed * dt);
    nextPx += (dx / dist) * step;
    nextPz += (dz / dist) * step;
  } else {
    nextPx = state.targetX;
    nextPz = state.targetZ;
  }

  // Check Gem collection
  let scoreGain = 0;
  let newlyCollected = 0;
  const updatedGems = state.gems.map((g) => {
    if (!g.collected && Math.hypot(nextPx - g.x, nextPz - g.z) < 0.5) {
      scoreGain += 100;
      newlyCollected++;
      return { ...g, collected: true };
    }
    return g;
  });

  const gemsCollected = state.gemsCollected + newlyCollected;
  const newScore = state.score + scoreGain;
  const newHighScore = Math.max(state.highScore, newScore);

  // Check Exit Reach
  if (Math.hypot(nextPx - state.exitX, nextPz - state.exitZ) < 0.45) {
    const timeBonus = Math.floor(state.timeLeft * 25);
    const finalLevelScore = newScore + 500 + timeBonus;
    return {
      ...state,
      playerX: nextPx,
      playerZ: nextPz,
      gems: updatedGems,
      gemsCollected,
      score: finalLevelScore,
      highScore: Math.max(newHighScore, finalLevelScore),
      status: 'escaped',
    };
  }

  // Timer countdown
  const nextTime = Math.max(0, state.timeLeft - dt);
  if (nextTime <= 0) {
    return {
      ...state,
      playerX: nextPx,
      playerZ: nextPz,
      gems: updatedGems,
      gemsCollected,
      score: newScore,
      highScore: newHighScore,
      timeLeft: 0,
      status: 'timeout',
    };
  }

  return {
    ...state,
    playerX: nextPx,
    playerZ: nextPz,
    gems: updatedGems,
    gemsCollected,
    score: newScore,
    highScore: newHighScore,
    timeLeft: nextTime,
  };
}
