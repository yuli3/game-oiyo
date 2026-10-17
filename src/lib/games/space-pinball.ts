export interface Vector2D {
  x: number;
  z: number;
}

export interface Bumper {
  id: string;
  x: number;
  z: number;
  radius: number;
  points: number;
  hitTimer: number; // for visual flash
}

export interface Flipper {
  side: "left" | "right";
  pivotX: number;
  pivotZ: number;
  length: number;
  restAngle: number;
  upAngle: number;
  currentAngle: number;
  isPressed: boolean;
}

export interface PinballGameState {
  ball: {
    x: number;
    z: number;
    vx: number;
    vz: number;
    radius: number;
    active: boolean;
  };
  leftFlipper: Flipper;
  rightFlipper: Flipper;
  bumpers: Bumper[];
  score: number;
  highScore: number;
  ballsLeft: number;
  multiplier: number;
  status: "idle" | "playing" | "gameover";
  plungerCharge: number; // 0 to 1
  recentHits: { x: number; z: number; color: string; timer: number }[];
}

export const TABLE_WIDTH = 8;
export const TABLE_LENGTH = 14;
export const GRAVITY = 18;
export const RESTITUTION = 0.75;

export function createInitialPinballState(highScore = 0): PinballGameState {
  return {
    ball: {
      x: 3.4,
      z: 5.5,
      vx: 0,
      vz: 0,
      radius: 0.22,
      active: false,
    },
    leftFlipper: {
      side: "left",
      pivotX: -1.8,
      pivotZ: 5.2,
      length: 1.4,
      restAngle: -0.4,
      upAngle: 0.55,
      currentAngle: -0.4,
      isPressed: false,
    },
    rightFlipper: {
      side: "right",
      pivotX: 1.8,
      pivotZ: 5.2,
      length: 1.4,
      restAngle: Math.PI + 0.4,
      upAngle: Math.PI - 0.55,
      currentAngle: Math.PI + 0.4,
      isPressed: false,
    },
    bumpers: [
      { id: "top-mid", x: 0, z: -3.8, radius: 0.65, points: 500, hitTimer: 0 },
      { id: "top-left", x: -1.8, z: -2.0, radius: 0.55, points: 300, hitTimer: 0 },
      { id: "top-right", x: 1.8, z: -2.0, radius: 0.55, points: 300, hitTimer: 0 },
    ],
    score: 0,
    highScore,
    ballsLeft: 3,
    multiplier: 1,
    status: "idle",
    plungerCharge: 0,
    recentHits: [],
  };
}

export function launchBall(state: PinballGameState, force = 1): PinballGameState {
  if (state.status !== "idle" && state.ball.active) return state;

  const clampedForce = Math.max(0.3, Math.min(1.2, force));
  return {
    ...state,
    status: "playing",
    ball: {
      ...state.ball,
      x: 3.4,
      z: 5.0,
      vx: -0.2,
      vz: -16 * clampedForce,
      active: true,
    },
    plungerCharge: 0,
  };
}

export function setFlipperState(
  state: PinballGameState,
  side: "left" | "right",
  isPressed: boolean
): PinballGameState {
  if (side === "left") {
    return {
      ...state,
      leftFlipper: { ...state.leftFlipper, isPressed },
    };
  }
  return {
    ...state,
    rightFlipper: { ...state.rightFlipper, isPressed },
  };
}

export function updatePinballPhysics(
  state: PinballGameState,
  dt: number
): PinballGameState {
  if (state.status !== "playing" || !state.ball.active) {
    return state;
  }

  const clampedDt = Math.min(dt, 0.033);
  let { ball, leftFlipper, rightFlipper, bumpers, score, multiplier, ballsLeft, status, recentHits } = state;

  // 1. Update flippers angles
  const flipperSpeed = 18;
  const updateFlipper = (f: Flipper) => {
    const target = f.isPressed ? f.upAngle : f.restAngle;
    const diff = target - f.currentAngle;
    const move = Math.sign(diff) * Math.min(Math.abs(diff), flipperSpeed * clampedDt);
    return { ...f, currentAngle: f.currentAngle + move };
  };

  leftFlipper = updateFlipper(leftFlipper);
  rightFlipper = updateFlipper(rightFlipper);

  // 2. Ball movement with gravity
  let vx = ball.vx;
  let vz = ball.vz + GRAVITY * clampedDt;
  let x = ball.x + vx * clampedDt;
  let z = ball.z + vz * clampedDt;

  // 3. Wall collisions
  const halfW = TABLE_WIDTH / 2;
  const topZ = -TABLE_LENGTH / 2;
  const bottomZ = TABLE_LENGTH / 2;

  // Left wall
  if (x - ball.radius < -halfW) {
    x = -halfW + ball.radius;
    vx = Math.abs(vx) * RESTITUTION;
  }
  // Right wall (outer boundary)
  if (x + ball.radius > halfW) {
    x = halfW - ball.radius;
    vx = -Math.abs(vx) * RESTITUTION;
  }
  // Top wall
  if (z - ball.radius < topZ) {
    z = topZ + ball.radius;
    vz = Math.abs(vz) * RESTITUTION;
  }

  // 4. Bumper collisions
  const updatedBumpers = bumpers.map((b) => {
    let hitTimer = Math.max(0, b.hitTimer - clampedDt);
    const dx = x - b.x;
    const dz = z - b.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const minDist = ball.radius + b.radius;

    if (dist < minDist && dist > 0) {
      // Repel ball with strong bounce
      const nx = dx / dist;
      const nz = dz / dist;
      const bounceSpeed = 10;
      vx = nx * bounceSpeed;
      vz = nz * bounceSpeed;
      x = b.x + nx * minDist;
      z = b.z + nz * minDist;

      hitTimer = 0.25;
      score += b.points * multiplier;
      recentHits = [...recentHits, { x: b.x, z: b.z, color: "#38bdf8", timer: 0.3 }];
    }

    return { ...b, hitTimer };
  });

  // 5. Flipper collisions
  const testFlipperCollision = (f: Flipper) => {
    const tipX = f.pivotX + Math.cos(f.currentAngle) * f.length;
    const tipZ = f.pivotZ + Math.sin(f.currentAngle) * f.length;

    // Segment from pivot to tip
    const segX = tipX - f.pivotX;
    const segZ = tipZ - f.pivotZ;
    const segLenSq = segX * segX + segZ * segZ;

    if (segLenSq > 0) {
      const u = Math.max(0, Math.min(1, ((x - f.pivotX) * segX + (z - f.pivotZ) * segZ) / segLenSq));
      const closestX = f.pivotX + u * segX;
      const closestZ = f.pivotZ + u * segZ;

      const distX = x - closestX;
      const distZ = z - closestZ;
      const dist = Math.sqrt(distX * distX + distZ * distZ);
      const flipperRadius = 0.15;

      if (dist < ball.radius + flipperRadius) {
        // Normal pointing outwards
        const nx = dist > 0 ? distX / dist : 0;
        const nz = dist > 0 ? distZ / dist : -1;

        // Flipper impulse when active
        const kickSpeed = f.isPressed ? 14 : 4;
        vx = nx * kickSpeed + (f.side === "left" ? 2 : -2);
        vz = Math.min(-6, nz * kickSpeed);

        x = closestX + nx * (ball.radius + flipperRadius);
        z = closestZ + nz * (ball.radius + flipperRadius);

        score += 50 * multiplier;
      }
    }
  };

  testFlipperCollision(leftFlipper);
  testFlipperCollision(rightFlipper);

  // 6. Gutter / Out-of-bounds drain
  let newBallsLeft = ballsLeft;
  let newStatus: "idle" | "playing" | "gameover" = status;
  let ballActive = true;

  if (z > bottomZ) {
    newBallsLeft -= 1;
    if (newBallsLeft <= 0) {
      newStatus = "gameover";
      ballActive = false;
    } else {
      newStatus = "idle";
      ballActive = false;
      x = 3.4;
      z = 5.5;
      vx = 0;
      vz = 0;
    }
  }

  // Decay hits
  const updatedHits = recentHits
    .map((h) => ({ ...h, timer: h.timer - clampedDt }))
    .filter((h) => h.timer > 0);

  return {
    ...state,
    ball: {
      ...ball,
      x,
      z,
      vx,
      vz,
      active: ballActive,
    },
    leftFlipper,
    rightFlipper,
    bumpers: updatedBumpers,
    score,
    highScore: Math.max(state.highScore, score),
    ballsLeft: newBallsLeft,
    status: newStatus,
    recentHits: updatedHits,
  };
}
