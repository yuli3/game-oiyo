export type CellType = 0 | 1 | 2 | 3 | 4 | 5;
// 0: empty, 1: wall, 2: locked gate, 3: key, 4: gem, 5: exit portal

export interface SentinelDrone {
  id: string;
  gx: number;
  gz: number;
  dir: 1 | -1;
  axis: 'x' | 'z';
  minG: number;
  maxG: number;
  timer: number;
}

export interface VoxelMazeState {
  level: number;
  gridSize: number;
  grid: number[][]; // 2D array [z][x]
  player: {
    gx: number;
    gz: number;
    x: number;
    z: number;
    facing: number; // in radians
  };
  keysCollected: number;
  keysRequired: number;
  gemsCollected: number;
  score: number;
  timeLeft: number;
  isGateOpen: boolean;
  levelCleared: boolean;
  gameOver: boolean;
  gameOverReason: "timeout" | "sentinel_caught" | null;
  paused: boolean;
  sentinels: SentinelDrone[];
}

export function createInitialVoxelMazeState(level: number = 1): VoxelMazeState {
  const size = 15;
  // Deterministic procedural grid with walls (1) and paths (0)
  const grid: number[][] = [];
  for (let z = 0; z < size; z++) {
    const row: number[] = [];
    for (let x = 0; x < size; x++) {
      if (x === 0 || x === size - 1 || z === 0 || z === size - 1) {
        row.push(1); // Border wall
      } else if (x % 2 === 0 && z % 2 === 0) {
        row.push(1); // Pillar
      } else {
        row.push(0); // Open corridor
      }
    }
    grid.push(row);
  }

  // Add specific walls to make it a labyrinth
  grid[1][4] = 1; grid[2][4] = 1; grid[3][4] = 1;
  grid[5][2] = 1; grid[5][3] = 1; grid[5][4] = 1;
  grid[7][6] = 1; grid[7][7] = 1; grid[7][8] = 1;
  grid[9][10] = 1; grid[10][10] = 1; grid[11][10] = 1;
  grid[3][10] = 1; grid[4][10] = 1; grid[5][10] = 1;
  grid[11][2] = 1; grid[11][3] = 1; grid[11][4] = 1;

  // Place locked gate (2), key (3), gems (4), exit (5)
  grid[13][13] = 5; // Exit portal at bottom-right
  grid[12][13] = 2; // Locked gate guarding exit
  grid[1][13] = 3;  // Key at top-right
  grid[13][1] = 3;  // Second Key at bottom-left

  // Gems placed in corridors
  grid[3][3] = 4;
  grid[3][11] = 4;
  grid[7][3] = 4;
  grid[7][11] = 4;
  grid[11][7] = 4;

  const playerGx = 1;
  const playerGz = 1;

  const sentinels: SentinelDrone[] = [
    {
      id: "drone-1",
      gx: 7,
      gz: 5,
      dir: 1,
      axis: "x",
      minG: 5,
      maxG: 9,
      timer: 0,
    },
    {
      id: "drone-2",
      gx: 9,
      gz: 7,
      dir: 1,
      axis: "z",
      minG: 5,
      maxG: 11,
      timer: 0,
    },
  ];

  return {
    level,
    gridSize: size,
    grid,
    player: {
      gx: playerGx,
      gz: playerGz,
      x: playerGx,
      z: playerGz,
      facing: 0,
    },
    keysCollected: 0,
    keysRequired: 2,
    gemsCollected: 0,
    score: 0,
    timeLeft: 75,
    isGateOpen: false,
    levelCleared: false,
    gameOver: false,
    gameOverReason: null,
    paused: false,
    sentinels,
  };
}

export function movePlayer(
  state: VoxelMazeState,
  dir: "up" | "down" | "left" | "right"
): VoxelMazeState {
  if (state.gameOver || state.levelCleared || state.paused) return state;

  const next = { ...state };
  const player = { ...next.player };
  let targetGx = player.gx;
  let targetGz = player.gz;
  let facing = player.facing;

  if (dir === "up") {
    targetGz -= 1;
    facing = Math.PI;
  } else if (dir === "down") {
    targetGz += 1;
    facing = 0;
  } else if (dir === "left") {
    targetGx -= 1;
    facing = Math.PI / 2;
  } else if (dir === "right") {
    targetGx += 1;
    facing = -Math.PI / 2;
  }

  // Collision with boundaries and walls
  if (
    targetGx < 0 ||
    targetGx >= next.gridSize ||
    targetGz < 0 ||
    targetGz >= next.gridSize
  ) {
    return state;
  }

  const cell = next.grid[targetGz][targetGx];
  if (cell === 1) {
    // Wall hit
    return state;
  }
  if (cell === 2 && !next.isGateOpen) {
    // Locked gate hit
    return state;
  }

  player.gx = targetGx;
  player.gz = targetGz;
  player.facing = facing;
  next.player = player;

  // Check items at target cell
  if (cell === 3) {
    // Key collected
    next.grid = next.grid.map((r, rIdx) =>
      rIdx === targetGz ? r.map((c, cIdx) => (cIdx === targetGx ? 0 : c)) : [...r]
    );
    next.keysCollected += 1;
    next.score += 500;
    if (next.keysCollected >= next.keysRequired) {
      next.isGateOpen = true;
      // Open gate cell in grid
      next.grid = next.grid.map((r) =>
        r.map((c) => (c === 2 ? 0 : c))
      );
    }
  } else if (cell === 4) {
    // Gem collected
    next.grid = next.grid.map((r, rIdx) =>
      rIdx === targetGz ? r.map((c, cIdx) => (cIdx === targetGx ? 0 : c)) : [...r]
    );
    next.gemsCollected += 1;
    next.score += 200;
    next.timeLeft = Math.min(99, next.timeLeft + 5);
  } else if (cell === 5) {
    // Exit portal reached!
    next.levelCleared = true;
    next.score += 1000 + Math.floor(next.timeLeft * 20);
  }

  return next;
}

export function updateVoxelMaze(
  state: VoxelMazeState,
  dt: number = 0.016
): VoxelMazeState {
  if (state.gameOver || state.levelCleared || state.paused) return state;

  const next = { ...state };
  const player = { ...next.player };

  // Smooth position interpolation
  player.x += (player.gx - player.x) * Math.min(1, dt * 15);
  player.z += (player.gz - player.z) * Math.min(1, dt * 15);
  next.player = player;

  // Countdown timer
  next.timeLeft = Math.max(0, next.timeLeft - dt);
  if (next.timeLeft <= 0) {
    next.gameOver = true;
    next.gameOverReason = "timeout";
    return next;
  }

  // Update Sentinel Drones
  const updatedSentinels = next.sentinels.map((drone) => {
    let timer = drone.timer + dt;
    let gx = drone.gx;
    let gz = drone.gz;
    let dir = drone.dir;

    if (timer >= 0.6) {
      timer = 0;
      if (drone.axis === "x") {
        gx += dir;
        if (gx >= drone.maxG) {
          gx = drone.maxG;
          dir = -1;
        } else if (gx <= drone.minG) {
          gx = drone.minG;
          dir = 1;
        }
      } else {
        gz += dir;
        if (gz >= drone.maxG) {
          gz = drone.maxG;
          dir = -1;
        } else if (gz <= drone.minG) {
          gz = drone.minG;
          dir = 1;
        }
      }
    }

    // Check collision with player
    const distToPlayer = Math.sqrt(
      Math.pow(gx - player.x, 2) + Math.pow(gz - player.z, 2)
    );
    if (distToPlayer < 0.8) {
      next.gameOver = true;
      next.gameOverReason = "sentinel_caught";
    }

    return {
      ...drone,
      gx,
      gz,
      dir,
      timer,
    };
  });

  next.sentinels = updatedSentinels;
  return next;
}
