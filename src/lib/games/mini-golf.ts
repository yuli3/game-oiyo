export interface CourseTile {
  x: number;
  z: number;
  height: number;
  type: "green" | "fairway" | "sand" | "water" | "wall";
}

export interface GolfHole {
  id: number;
  par: number;
  name: string;
  startPos: { x: number; y: number; z: number };
  holePos: { x: number; y: number; z: number };
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  tiles: CourseTile[];
}

export interface MiniGolfState {
  currentHoleIndex: number;
  ball: {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    radius: number;
  };
  aimAngle: number; // in radians
  aimPower: number; // 0 to 1
  strokesThisHole: number;
  totalStrokes: number;
  totalPar: number;
  scoreCard: { hole: number; par: number; strokes: number }[];
  status: "aiming" | "rolling" | "holed" | "finished";
}

// 3 Curated 3D Voxel Mini Golf Holes
export const COURSES: GolfHole[] = [
  {
    id: 1,
    par: 3,
    name: "Classic Fairway",
    startPos: { x: 0, y: 0.15, z: 6 },
    holePos: { x: 0, y: 0.15, z: -5 },
    bounds: { minX: -2.5, maxX: 2.5, minZ: -7, maxZ: 7.5 },
    tiles: [
      // Straight lane with a gentle rise
      { x: 0, z: 0, height: 0, type: "green" },
      { x: -1, z: 0, height: 0, type: "fairway" },
      { x: 1, z: 0, height: 0, type: "fairway" },
      { x: -1.5, z: -2, height: 0, type: "sand" },
      { x: 1.5, z: -2, height: 0, type: "sand" },
    ],
  },
  {
    id: 2,
    par: 3,
    name: "Twin Bunkers & S-Turn",
    startPos: { x: -1.5, y: 0.15, z: 5.5 },
    holePos: { x: 1.5, y: 0.15, z: -5 },
    bounds: { minX: -3.5, maxX: 3.5, minZ: -7, maxZ: 7 },
    tiles: [
      { x: 0, z: 0, height: 0.2, type: "wall" },
      { x: -1, z: -2, height: 0, type: "sand" },
      { x: 1, z: 2, height: 0, type: "sand" },
    ],
  },
  {
    id: 3,
    par: 4,
    name: "Island Green Bridge",
    startPos: { x: 0, y: 0.15, z: 6 },
    holePos: { x: 0, y: 0.15, z: -5.5 },
    bounds: { minX: -3.5, maxX: 3.5, minZ: -7.5, maxZ: 7.5 },
    tiles: [
      { x: -2, z: 0, height: -0.2, type: "water" },
      { x: 2, z: 0, height: -0.2, type: "water" },
      { x: 0, z: 0, height: 0, type: "green" },
    ],
  },
];

export const HOLE_CUP_RADIUS = 0.35;
export const MAX_PUTT_SPEED = 14;

export function createInitialGolfState(holeIndex = 0): MiniGolfState {
  const hole = COURSES[holeIndex] ?? COURSES[0];
  return {
    currentHoleIndex: holeIndex,
    ball: {
      x: hole.startPos.x,
      y: hole.startPos.y,
      z: hole.startPos.z,
      vx: 0,
      vy: 0,
      vz: 0,
      radius: 0.12,
    },
    aimAngle: -Math.PI / 2, // aiming forward (-Z)
    aimPower: 0.5,
    strokesThisHole: 0,
    totalStrokes: 0,
    totalPar: COURSES.reduce((sum, h) => sum + h.par, 0),
    scoreCard: [],
    status: "aiming",
  };
}

export function executePutt(state: MiniGolfState): MiniGolfState {
  if (state.status !== "aiming") return state;

  const power = Math.max(0.1, Math.min(1.0, state.aimPower));
  const speed = power * MAX_PUTT_SPEED;
  const vx = Math.cos(state.aimAngle) * speed;
  const vz = Math.sin(state.aimAngle) * speed;

  return {
    ...state,
    ball: {
      ...state.ball,
      vx,
      vz,
    },
    strokesThisHole: state.strokesThisHole + 1,
    totalStrokes: state.totalStrokes + 1,
    status: "rolling",
  };
}

export function setAim(state: MiniGolfState, angle: number, power?: number): MiniGolfState {
  if (state.status !== "aiming") return state;
  return {
    ...state,
    aimAngle: angle,
    aimPower: power !== undefined ? Math.max(0.1, Math.min(1.0, power)) : state.aimPower,
  };
}

export function updateGolfPhysics(state: MiniGolfState, dt: number): MiniGolfState {
  if (state.status !== "rolling") return state;

  const clampedDt = Math.min(dt, 0.033);
  const hole = COURSES[state.currentHoleIndex] ?? COURSES[0];

  let { x, y, z, vx, vy, vz, radius } = state.ball;

  // Move
  x += vx * clampedDt;
  z += vz * clampedDt;

  // Friction & surface resistance
  let friction = 0.982;

  // Check if ball is in sand
  for (const t of hole.tiles) {
    if (t.type === "sand") {
      const dx = x - t.x;
      const dz = z - t.z;
      if (Math.abs(dx) < 1.0 && Math.abs(dz) < 1.0) {
        friction = 0.94; // heavy sand drag
      }
    }
  }

  vx *= Math.pow(friction, clampedDt * 60);
  vz *= Math.pow(friction, clampedDt * 60);

  // Boundary wall bounces
  const { minX, maxX, minZ, maxZ } = hole.bounds;
  const restitution = 0.65;

  if (x - radius < minX) {
    x = minX + radius;
    vx = Math.abs(vx) * restitution;
  } else if (x + radius > maxX) {
    x = maxX - radius;
    vx = -Math.abs(vx) * restitution;
  }

  if (z - radius < minZ) {
    z = minZ + radius;
    vz = Math.abs(vz) * restitution;
  } else if (z + radius > maxZ) {
    z = maxZ - radius;
    vz = -Math.abs(vz) * restitution;
  }

  // Hole check
  const distToHole = Math.sqrt(
    Math.pow(x - hole.holePos.x, 2) + Math.pow(z - hole.holePos.z, 2)
  );
  const currentSpeed = Math.sqrt(vx * vx + vz * vz);

  if (distToHole < HOLE_CUP_RADIUS && currentSpeed < 4.5) {
    // Holed!
    const newScoreCard = [
      ...state.scoreCard,
      {
        hole: hole.id,
        par: hole.par,
        strokes: state.strokesThisHole,
      },
    ];

    const isLastHole = state.currentHoleIndex >= COURSES.length - 1;

    return {
      ...state,
      ball: {
        x: hole.holePos.x,
        y: -0.1, // drops into cup
        z: hole.holePos.z,
        vx: 0,
        vy: 0,
        vz: 0,
        radius,
      },
      scoreCard: newScoreCard,
      status: isLastHole ? "finished" : "holed",
    };
  }

  // Stop check
  if (currentSpeed < 0.08) {
    vx = 0;
    vz = 0;
    return {
      ...state,
      ball: { x, y, z, vx: 0, vy: 0, vz: 0, radius },
      status: "aiming",
    };
  }

  return {
    ...state,
    ball: { x, y, z, vx, vz, vy, radius },
  };
}

export function advanceToNextHole(state: MiniGolfState): MiniGolfState {
  if (state.currentHoleIndex >= COURSES.length - 1) {
    return { ...state, status: "finished" };
  }
  const nextHoleIndex = state.currentHoleIndex + 1;
  const nextHole = COURSES[nextHoleIndex];

  return {
    ...state,
    currentHoleIndex: nextHoleIndex,
    ball: {
      x: nextHole.startPos.x,
      y: nextHole.startPos.y,
      z: nextHole.startPos.z,
      vx: 0,
      vy: 0,
      vz: 0,
      radius: 0.12,
    },
    aimAngle: -Math.PI / 2,
    aimPower: 0.5,
    strokesThisHole: 0,
    status: "aiming",
  };
}
