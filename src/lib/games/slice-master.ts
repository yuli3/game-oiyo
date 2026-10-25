/**
 * Pure rule engine & deterministic 2D/3D physics simulation for
 * 『슬라이스 마스터 3D (Slice Master 3D)』
 *
 * One-touch knife flip, target slicing, hit-stop feedback, and physics-driven stick mechanics.
 */

export type ObstacleType = "fruit" | "wood" | "metal_hazard" | "finish_target";

export interface SliceObstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: ObstacleType;
  label: string;
  points: number;
  sliced: boolean;
  sliceCutY?: number;
  color: string;
}

export type KnifeState = "flying" | "stuck" | "gameover" | "completed";

export interface Knife {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number; // in radians
  angularVelocity: number; // in radians/sec
  length: number; // blade to handle length
}

export interface SliceMasterGame {
  knife: Knife;
  obstacles: SliceObstacle[];
  cameraX: number;
  score: number;
  combo: number;
  sliceCount: number;
  status: KnifeState;
  finishX: number;
  hitStopRemaining: number; // seconds
}

export const GRAVITY = 1100; // px/s^2
export const FLIP_IMPULSE_Y = -420;
export const FORWARD_SPEED = 240;
export const ANGULAR_IMPULSE = Math.PI * 4.2; // ~2.1 rotations/sec
export const KNIFE_LENGTH = 54;
export const FLOOR_Y = 360;

/**
 * Creates level layout deterministically based on level number
 */
export function createSliceMasterLevel(level: number = 1): SliceMasterGame {
  const obstacles: SliceObstacle[] = [];
  const obstacleSpacing = 160;
  const numObjects = 12 + level * 2;

  const itemTypes: { type: ObstacleType; label: string; color: string; points: number }[] = [
    { type: "fruit", label: "🍎 사과", color: "#ef4444", points: 100 },
    { type: "fruit", label: "🍊 오렌지", color: "#f97316", points: 120 },
    { type: "fruit", label: "🍉 수박", color: "#22c55e", points: 150 },
    { type: "wood", label: "🪵 나무토막", color: "#854d0e", points: 80 },
    { type: "fruit", label: "🍋 레몬", color: "#eab308", points: 110 },
    { type: "metal_hazard", label: "⚙️ 가시철퇴", color: "#64748b", points: 0 },
  ];

  let curX = 300;
  for (let i = 0; i < numObjects; i++) {
    const isHazard = i > 2 && i % 4 === 3;
    const template = isHazard ? itemTypes[5] : itemTypes[i % 5];
    const itemHeight = template.type === "metal_hazard" ? 50 : 44;
    const itemY = FLOOR_Y - itemHeight;

    obstacles.push({
      id: `obs-${i}`,
      x: curX,
      y: itemY,
      width: 44,
      height: itemHeight,
      type: template.type,
      label: template.label,
      points: template.points,
      sliced: false,
      color: template.color,
    });

    curX += obstacleSpacing + (i % 3) * 20;
  }

  // Finish target
  const finishX = curX + 150;
  obstacles.push({
    id: "finish-target",
    x: finishX,
    y: FLOOR_Y - 90,
    width: 60,
    height: 90,
    type: "finish_target",
    label: "🎯 보너스 과녁",
    points: 1000,
    sliced: false,
    color: "#a855f7",
  });

  return {
    knife: {
      x: 100,
      y: FLOOR_Y - 40,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 4,
      angularVelocity: 0,
      length: KNIFE_LENGTH,
    },
    obstacles,
    cameraX: 0,
    score: 0,
    combo: 0,
    sliceCount: 0,
    status: "stuck",
    finishX,
    hitStopRemaining: 0,
  };
}

/**
 * Handle player tap / click / spacebar to flip knife
 */
export function tapFlipKnife(state: SliceMasterGame): SliceMasterGame {
  if (state.status === "gameover" || state.status === "completed") {
    return state;
  }

  return {
    ...state,
    status: "flying",
    knife: {
      ...state.knife,
      vx: FORWARD_SPEED,
      vy: FLIP_IMPULSE_Y,
      angularVelocity: ANGULAR_IMPULSE,
    },
  };
}

export interface StepResult {
  state: SliceMasterGame;
  slicedObstacles: SliceObstacle[];
  hitHazard: boolean;
  hitTarget: boolean;
  stuckFloor: boolean;
}

/**
 * Compute the knife's blade tip position from position and angle
 */
export function getKnifeBladeTip(knife: Knife): { x: number; y: number } {
  return {
    x: knife.x + Math.cos(knife.angle) * knife.length,
    y: knife.y + Math.sin(knife.angle) * knife.length,
  };
}

/**
 * Advances physics by dt seconds
 */
export function stepSliceMaster(state: SliceMasterGame, dt: number): StepResult {
  const result: StepResult = {
    state,
    slicedObstacles: [],
    hitHazard: false,
    hitTarget: false,
    stuckFloor: false,
  };

  if (state.status !== "flying") {
    return result;
  }

  // If hit-stop is active, pause simulation frame
  if (state.hitStopRemaining > 0) {
    const nextHitStop = Math.max(0, state.hitStopRemaining - dt);
    result.state = {
      ...state,
      hitStopRemaining: nextHitStop,
    };
    return result;
  }

  const knife = { ...state.knife };
  let status: KnifeState = state.status;
  let score = state.score;
  let combo = state.combo;
  let sliceCount = state.sliceCount;
  let hitStop = 0;

  // Integrate velocity & angular velocity
  knife.vy += GRAVITY * dt;
  knife.x += knife.vx * dt;
  knife.y += knife.vy * dt;
  knife.angle += knife.angularVelocity * dt;

  const tip = getKnifeBladeTip(knife);

  // Check obstacle collisions
  const updatedObstacles = state.obstacles.map((obs) => {
    if (obs.sliced) return obs;

    const inX = tip.x >= obs.x && tip.x <= obs.x + obs.width;
    const inY = tip.y >= obs.y && tip.y <= obs.y + obs.height;

    if (inX && inY) {
      if (obs.type === "metal_hazard") {
        result.hitHazard = true;
        status = "gameover";
        return obs;
      }

      if (obs.type === "finish_target") {
        result.hitTarget = true;
        status = "completed";
        score += obs.points * Math.max(1, combo);
        hitStop = 0.12; // satisfying finish freeze
        return { ...obs, sliced: true };
      }

      // Sliceable fruit or wood
      result.slicedObstacles.push(obs);
      combo += 1;
      sliceCount += 1;
      score += obs.points * combo;
      hitStop = 0.06; // 60ms micro hit-stop

      // Small bounce/boost upon clean slicing
      knife.vy = Math.min(knife.vy, -120);

      return {
        ...obs,
        sliced: true,
        sliceCutY: tip.y,
      };
    }

    return obs;
  });

  // Floor collision
  if (status === "flying" && knife.y >= FLOOR_Y) {
    knife.y = FLOOR_Y;
    // Normalize angle to [0, 2pi)
    const normalizedAngle = ((knife.angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    // Tip pointing downward roughly between 45 deg and 135 deg
    const isBladeSticking = normalizedAngle >= Math.PI * 0.15 && normalizedAngle <= Math.PI * 0.85;

    if (isBladeSticking) {
      status = "stuck";
      knife.vx = 0;
      knife.vy = 0;
      knife.angularVelocity = 0;
      combo = 0; // Combo resets on landing
      result.stuckFloor = true;
    } else {
      // Bounced or fallen flat on handle -> game over
      status = "gameover";
      knife.vx = 0;
      knife.vy = 0;
      knife.angularVelocity = 0;
    }
  }

  // Camera follows knife smoothly
  const targetCamX = Math.max(0, knife.x - 180);

  result.state = {
    ...state,
    knife,
    obstacles: updatedObstacles,
    cameraX: targetCamX,
    score,
    combo,
    sliceCount,
    status,
    hitStopRemaining: hitStop,
  };

  return result;
}
