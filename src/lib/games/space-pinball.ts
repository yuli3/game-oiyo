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
  tier?: number; // 1: cyan, 2: purple, 3: gold
}

export interface Slingshot {
  id: string;
  side: "left" | "right";
  p1: Vector2D; // top post
  p2: Vector2D; // bottom outer post
  p3: Vector2D; // inner corner post
  hitTimer: number;
}

export interface RolloverLane {
  id: string;
  x: number;
  z: number;
  width: number;
  height: number;
  lit: boolean;
  label: string;
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

export interface HitEffect {
  x: number;
  z: number;
  color: string;
  timer: number;
  label?: string;
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
  slingshots: Slingshot[];
  rolloverLanes: RolloverLane[];
  score: number;
  highScore: number;
  ballsLeft: number;
  multiplier: number;
  combo: number;
  comboTimer: number;
  tiltWarnings: number;
  isTilted: boolean;
  tiltTimer: number;
  status: "idle" | "playing" | "gameover";
  plungerCharge: number; // 0 to 1
  recentHits: HitEffect[];
  lastEvent?: "bumper" | "slingshot" | "flipper" | "lane" | "jackpot" | "drain" | "tilt" | "launch";
  cameraShake: number; // 0 to 1
}

export const TABLE_WIDTH = 8;
export const TABLE_LENGTH = 14;
export const GRAVITY = 19;
export const RESTITUTION = 0.78;

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
      { id: "top-mid", x: 0, z: -3.8, radius: 0.7, points: 500, hitTimer: 0, tier: 3 },
      { id: "top-left", x: -1.8, z: -2.0, radius: 0.58, points: 300, hitTimer: 0, tier: 1 },
      { id: "top-right", x: 1.8, z: -2.0, radius: 0.58, points: 300, hitTimer: 0, tier: 2 },
    ],
    slingshots: [
      {
        id: "sling-left",
        side: "left",
        p1: { x: -2.8, z: 2.8 },
        p2: { x: -2.8, z: 4.6 },
        p3: { x: -1.8, z: 4.2 },
        hitTimer: 0,
      },
      {
        id: "sling-right",
        side: "right",
        p1: { x: 2.8, z: 2.8 },
        p2: { x: 2.8, z: 4.6 },
        p3: { x: 1.8, z: 4.2 },
        hitTimer: 0,
      },
    ],
    rolloverLanes: [
      { id: "lane-1", x: -1.5, z: -5.6, width: 0.9, height: 0.9, lit: false, label: "S" },
      { id: "lane-2", x: 0, z: -5.9, width: 0.9, height: 0.9, lit: false, label: "P" },
      { id: "lane-3", x: 1.5, z: -5.6, width: 0.9, height: 0.9, lit: false, label: "A" },
    ],
    score: 0,
    highScore,
    ballsLeft: 3,
    multiplier: 1,
    combo: 1,
    comboTimer: 0,
    tiltWarnings: 0,
    isTilted: false,
    tiltTimer: 0,
    status: "idle",
    plungerCharge: 0,
    recentHits: [],
    cameraShake: 0,
  };
}

export function launchBall(state: PinballGameState, force = 1): PinballGameState {
  if (state.status !== "idle" && state.ball.active) return state;

  const effectiveForce = force || state.plungerCharge || 1;
  const clampedForce = Math.max(0.4, Math.min(1.2, effectiveForce));
  return {
    ...state,
    status: "playing",
    ball: {
      ...state.ball,
      x: 3.4,
      z: 5.0,
      vx: -0.3,
      vz: -16 * clampedForce - 3,
      active: true,
    },
    plungerCharge: 0,
    lastEvent: "launch",
    cameraShake: 0.2,
  };
}

export function setFlipperState(
  state: PinballGameState,
  side: "left" | "right",
  isPressed: boolean
): PinballGameState {
  if (state.isTilted) return state; // flippers are locked during tilt

  if (side === "left") {
    return {
      ...state,
      leftFlipper: { ...state.leftFlipper, isPressed },
      lastEvent: isPressed ? "flipper" : state.lastEvent,
    };
  }
  return {
    ...state,
    rightFlipper: { ...state.rightFlipper, isPressed },
    lastEvent: isPressed ? "flipper" : state.lastEvent,
  };
}

export function nudgeTable(
  state: PinballGameState,
  direction: "left" | "right"
): PinballGameState {
  if (state.status !== "playing" || !state.ball.active || state.isTilted) {
    return state;
  }

  const newWarnings = state.tiltWarnings + 1;
  if (newWarnings >= 3) {
    return {
      ...state,
      isTilted: true,
      tiltTimer: 3.5,
      tiltWarnings: 0,
      leftFlipper: { ...state.leftFlipper, isPressed: false },
      rightFlipper: { ...state.rightFlipper, isPressed: false },
      lastEvent: "tilt",
      cameraShake: 0.7,
      recentHits: [
        ...state.recentHits,
        { x: 0, z: 0, color: "#ef4444", timer: 1.5, label: "TILT!" },
      ],
    };
  }

  const impulseX = direction === "left" ? -2.2 : 2.2;
  return {
    ...state,
    ball: {
      ...state.ball,
      vx: state.ball.vx + impulseX,
      vz: state.ball.vz - 0.8,
    },
    tiltWarnings: newWarnings,
    cameraShake: 0.35,
    recentHits: [
      ...state.recentHits,
      {
        x: state.ball.x,
        z: state.ball.z,
        color: "#fbbf24",
        timer: 0.5,
        label: `NUDGE ${direction.toUpperCase()}`,
      },
    ],
  };
}

export function setPlungerCharge(
  state: PinballGameState,
  charge: number
): PinballGameState {
  return {
    ...state,
    plungerCharge: Math.max(0, Math.min(1, charge)),
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
  let {
    ball,
    leftFlipper,
    rightFlipper,
    bumpers,
    slingshots,
    rolloverLanes,
    score,
    multiplier,
    combo,
    comboTimer,
    tiltWarnings,
    isTilted,
    tiltTimer,
    ballsLeft,
    status,
    recentHits,
    cameraShake,
  } = state;

  let lastEvent: PinballGameState["lastEvent"] = undefined;

  // 1. Tilt decay
  if (isTilted) {
    tiltTimer -= clampedDt;
    if (tiltTimer <= 0) {
      isTilted = false;
      tiltTimer = 0;
    }
  }

  // Decay tilt warnings slowly over time
  if (tiltWarnings > 0 && Math.random() < clampedDt * 0.2) {
    tiltWarnings = Math.max(0, tiltWarnings - 1);
  }

  // Camera shake decay
  cameraShake = Math.max(0, cameraShake - clampedDt * 3.5);

  // Combo timer decay
  if (comboTimer > 0) {
    comboTimer -= clampedDt;
    if (comboTimer <= 0) {
      combo = 1;
      comboTimer = 0;
    }
  }

  // 2. Update flippers angles
  const flipperSpeed = 22;
  const updateFlipper = (f: Flipper) => {
    const target = (!isTilted && f.isPressed) ? f.upAngle : f.restAngle;
    const diff = target - f.currentAngle;
    const move = Math.sign(diff) * Math.min(Math.abs(diff), flipperSpeed * clampedDt);
    return { ...f, currentAngle: f.currentAngle + move };
  };

  leftFlipper = updateFlipper(leftFlipper);
  rightFlipper = updateFlipper(rightFlipper);

  // 3. Ball movement with gravity
  let vx = ball.vx;
  let vz = ball.vz + GRAVITY * clampedDt;
  let x = ball.x + vx * clampedDt;
  let z = ball.z + vz * clampedDt;

  // 4. Wall collisions
  const halfW = TABLE_WIDTH / 2;
  const topZ = -TABLE_LENGTH / 2;
  const bottomZ = TABLE_LENGTH / 2;

  // Left wall
  if (x - ball.radius < -halfW) {
    x = -halfW + ball.radius;
    vx = Math.abs(vx) * RESTITUTION;
  }
  // Right outer wall
  if (x + ball.radius > halfW) {
    x = halfW - ball.radius;
    vx = -Math.abs(vx) * RESTITUTION;
  }
  // Top curved arch / wall
  if (z - ball.radius < topZ) {
    z = topZ + ball.radius;
    vz = Math.abs(vz) * RESTITUTION;
  }

  // Right plunger divider wall: from z = -4.0 to z = 5.5 at x = 2.85
  const dividerX = 2.85;
  const dividerTopZ = -3.8;
  const dividerBottomZ = 5.8;
  if (z > dividerTopZ && z < dividerBottomZ) {
    // Left side of divider
    if (x + ball.radius > dividerX && ball.x <= dividerX) {
      x = dividerX - ball.radius;
      vx = -Math.abs(vx) * RESTITUTION;
    }
    // Right side of divider (inside plunger lane)
    else if (x - ball.radius < dividerX && ball.x >= dividerX) {
      x = dividerX + ball.radius;
      vx = Math.abs(vx) * RESTITUTION;
    }
  }

  // 5. Bumper collisions
  const updatedBumpers = bumpers.map((b) => {
    let hitTimer = Math.max(0, b.hitTimer - clampedDt);
    const dx = x - b.x;
    const dz = z - b.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const minDist = ball.radius + b.radius;

    if (dist < minDist && dist > 0) {
      const nx = dx / dist;
      const nz = dz / dist;
      const bounceSpeed = 12;
      vx = nx * bounceSpeed;
      vz = nz * bounceSpeed;
      x = b.x + nx * minDist;
      z = b.z + nz * minDist;

      hitTimer = 0.25;
      combo = Math.min(10, combo + 1);
      comboTimer = 2.5;
      const pts = b.points * multiplier * combo;
      score += pts;
      lastEvent = "bumper";
      cameraShake = Math.min(1, cameraShake + 0.35);

      recentHits = [
        ...recentHits,
        {
          x: b.x,
          z: b.z,
          color: b.tier === 3 ? "#f59e0b" : b.tier === 2 ? "#a855f7" : "#38bdf8",
          timer: 0.35,
          label: `+${pts}`,
        },
      ];
    }

    return { ...b, hitTimer };
  });

  // 6. Slingshots collisions (angled rubber band kicking)
  const updatedSlingshots = slingshots.map((sling) => {
    let hitTimer = Math.max(0, sling.hitTimer - clampedDt);

    // Segment between p1 (top) and p3 (inner tip)
    const segX = sling.p3.x - sling.p1.x;
    const segZ = sling.p3.z - sling.p1.z;
    const segLenSq = segX * segX + segZ * segZ;

    if (segLenSq > 0) {
      const u = Math.max(0, Math.min(1, ((x - sling.p1.x) * segX + (z - sling.p1.z) * segZ) / segLenSq));
      const closestX = sling.p1.x + u * segX;
      const closestZ = sling.p1.z + u * segZ;

      const distX = x - closestX;
      const distZ = z - closestZ;
      const dist = Math.sqrt(distX * distX + distZ * distZ);
      const rubberRadius = 0.12;

      if (dist < ball.radius + rubberRadius) {
        // Kick direction perpendicular to slingshot band towards center table
        const kickDirX = sling.side === "left" ? 1.0 : -1.0;
        const kickSpeed = 13;
        vx = kickDirX * kickSpeed;
        vz = -9;

        x = closestX + (kickDirX > 0 ? 1 : -1) * (ball.radius + rubberRadius + 0.05);
        z = closestZ - 0.1;

        hitTimer = 0.25;
        combo = Math.min(10, combo + 1);
        comboTimer = 2.5;
        const pts = 250 * multiplier * combo;
        score += pts;
        lastEvent = "slingshot";
        cameraShake = Math.min(1, cameraShake + 0.4);

        recentHits = [
          ...recentHits,
          {
            x: closestX,
            z: closestZ,
            color: sling.side === "left" ? "#f43f5e" : "#06b6d4",
            timer: 0.35,
            label: `+${pts}`,
          },
        ];
      }
    }

    return { ...sling, hitTimer };
  });

  // 7. Rollover Lanes
  let allLit = true;
  let laneHit = false;
  const updatedLanes = rolloverLanes.map((lane) => {
    const inX = Math.abs(x - lane.x) < lane.width / 2;
    const inZ = Math.abs(z - lane.z) < lane.height / 2;

    if (inX && inZ && !lane.lit) {
      laneHit = true;
      const pts = 500 * multiplier * combo;
      score += pts;
      recentHits = [
        ...recentHits,
        { x: lane.x, z: lane.z, color: "#10b981", timer: 0.4, label: `+${pts}` },
      ];
      return { ...lane, lit: true };
    }

    if (!lane.lit) allLit = false;
    return lane;
  });

  if (laneHit) {
    lastEvent = "lane";
    cameraShake = Math.min(1, cameraShake + 0.2);
  }

  // If all 3 lanes are lit: JACKPOT & MULTIPLIER UP!
  let nextMultiplier = multiplier;
  let finalLanes = updatedLanes;
  if (allLit && updatedLanes.length > 0) {
    nextMultiplier = Math.min(5, multiplier + 1);
    const jackpotPts = 5000 * nextMultiplier;
    score += jackpotPts;
    lastEvent = "jackpot";
    cameraShake = 0.8;
    recentHits = [
      ...recentHits,
      { x: 0, z: -5.5, color: "#fbbf24", timer: 1.2, label: `JACKPOT! +${jackpotPts}` },
    ];
    // Reset lanes
    finalLanes = updatedLanes.map((l) => ({ ...l, lit: false }));
  }

  // 8. Flipper collisions
  const testFlipperCollision = (f: Flipper) => {
    const tipX = f.pivotX + Math.cos(f.currentAngle) * f.length;
    const tipZ = f.pivotZ + Math.sin(f.currentAngle) * f.length;

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
        const nx = dist > 0 ? distX / dist : 0;
        const nz = dist > 0 ? distZ / dist : -1;

        const kickSpeed = (!isTilted && f.isPressed) ? 15 : 4;
        vx = nx * kickSpeed + (f.side === "left" ? 2.5 : -2.5);
        vz = Math.min(-7, nz * kickSpeed);

        x = closestX + nx * (ball.radius + flipperRadius);
        z = closestZ + nz * (ball.radius + flipperRadius);

        score += 50 * nextMultiplier;
        lastEvent = "flipper";
        cameraShake = Math.min(1, cameraShake + 0.25);
      }
    }
  };

  testFlipperCollision(leftFlipper);
  testFlipperCollision(rightFlipper);

  // 9. Gutter / Out-of-bounds drain
  let newBallsLeft = ballsLeft;
  let newStatus: "idle" | "playing" | "gameover" = status;
  let ballActive = true;

  if (z > bottomZ) {
    newBallsLeft -= 1;
    lastEvent = "drain";
    combo = 1;
    comboTimer = 0;
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
    slingshots: updatedSlingshots,
    rolloverLanes: finalLanes,
    score,
    highScore: Math.max(state.highScore, score),
    ballsLeft: newBallsLeft,
    multiplier: nextMultiplier,
    combo,
    comboTimer,
    tiltWarnings,
    isTilted,
    tiltTimer,
    status: newStatus,
    recentHits: updatedHits,
    lastEvent: lastEvent ?? state.lastEvent,
    cameraShake,
  };
}
