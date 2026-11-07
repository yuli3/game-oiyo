/**
 * Pure rule engine & deterministic 2D/3D physics simulation for
 * 『슬라이스 마스터 3D (Slice Master 3D)』
 *
 * One-touch knife flip, target slicing, hit-stop feedback, and physics-driven stick mechanics.
 */

import { type SliceMetaModifiers } from "./slice-master-meta";

export type ObstacleType = "fruit" | "wood" | "metal_hazard" | "finish_target";

export type ObstacleMutation = "golden" | "diamond" | "bomb";

export interface SliceObstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: ObstacleType;
  mutation?: ObstacleMutation;
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
  stonesEarned: number;
  perfectCenterCount: number;
  hasEncounteredGolden: boolean;
  activeCommsLogId: string;
  metaModifiers?: SliceMetaModifiers;
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
export function createSliceMasterLevel(
  level: number = 1,
  modifiers?: SliceMetaModifiers
): SliceMasterGame {
  const obstacles: SliceObstacle[] = [];
  const obstacleSpacing = 160;
  const numObjects = 12 + level * 2;
  let hasEncounteredGolden = false;

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
    let template = isHazard ? itemTypes[5] : itemTypes[i % 5];
    let mutation: ObstacleMutation | undefined = undefined;

    // Mutated objects: Golden Piñata, Diamond, or Bomb
    if (i === Math.floor(numObjects / 2)) {
      mutation = "golden";
      template = { type: "fruit", label: "✨ 황금 피냐타", color: "#eab308", points: 500 };
      hasEncounteredGolden = true;
    } else if (!isHazard && i % 6 === 2) {
      mutation = "diamond";
      template = { type: "wood", label: "💎 다이아몬드", color: "#38bdf8", points: 300 };
    } else if (!isHazard && i > 3 && i % 7 === 5) {
      mutation = "bomb";
      template = { type: "wood", label: "💣 폭탄 피냐타", color: "#f43f5e", points: 150 };
    }

    const itemHeight = template.type === "metal_hazard" ? 50 : 44;
    const itemY = FLOOR_Y - itemHeight;

    obstacles.push({
      id: `obs-${i}`,
      x: curX,
      y: itemY,
      width: 44,
      height: itemHeight,
      type: template.type,
      mutation,
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
    stonesEarned: 0,
    perfectCenterCount: 0,
    hasEncounteredGolden,
    activeCommsLogId: "start",
    metaModifiers: modifiers,
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
  let stonesEarned = state.stonesEarned;
  let perfectCenterCount = state.perfectCenterCount;
  let activeCommsLogId = state.activeCommsLogId;
  let hitStop = 0;

  const mods = state.metaModifiers;
  const windPadding = mods?.windSlashPadding || 0;
  const rewardMult = mods?.rewardMultiplier || 1;
  const hitStopMult = mods?.hitStopMultiplier || 1;

  // Integrate velocity & angular velocity
  knife.vy += GRAVITY * dt;
  knife.x += knife.vx * dt;
  knife.y += knife.vy * dt;
  knife.angle += knife.angularVelocity * dt;

  const tip = getKnifeBladeTip(knife);

  // Check obstacle collisions
  const updatedObstacles = state.obstacles.map((obs) => {
    if (obs.sliced) return obs;

    const inX = tip.x >= obs.x - windPadding && tip.x <= obs.x + obs.width + windPadding;
    const inY = tip.y >= obs.y - windPadding && tip.y <= obs.y + obs.height + windPadding;

    if (inX && inY) {
      if (obs.type === "metal_hazard") {
        result.hitHazard = true;
        status = "gameover";
        activeCommsLogId = "failed";
        return obs;
      }

      if (obs.type === "finish_target") {
        result.hitTarget = true;
        status = "completed";
        score += Math.round(obs.points * Math.max(1, combo) * rewardMult);
        stonesEarned += Math.round(25 * rewardMult);
        hitStop = 0.14 * hitStopMult; // satisfying finish freeze
        activeCommsLogId = "finish";
        return { ...obs, sliced: true };
      }

      // Check center cut
      const targetCenterY = obs.y + obs.height / 2;
      const isCenter = Math.abs(tip.y - targetCenterY) <= 10;
      if (isCenter) {
        perfectCenterCount += 1;
        activeCommsLogId = "center_cut";
      }

      // Sliceable fruit or wood or mutation
      result.slicedObstacles.push(obs);
      combo += 1;
      sliceCount += 1;
      score += Math.round(obs.points * combo * rewardMult);

      let stoneReward = 1;
      if (obs.mutation === "golden") {
        stoneReward = 15;
        activeCommsLogId = "golden_found";
      } else if (obs.mutation === "diamond") {
        stoneReward = 4;
      } else if (obs.mutation === "bomb") {
        // Bomb knocks knife upward violently
        knife.vy = -350;
      }

      stonesEarned += Math.round(stoneReward * rewardMult);

      if (combo >= 4 && activeCommsLogId !== "golden_found") {
        activeCommsLogId = "combo_streak";
      }

      hitStop = (isCenter ? 0.09 : 0.06) * hitStopMult;

      // Small bounce/boost upon clean slicing
      knife.vy = Math.min(knife.vy, -130);

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
    
    // Angle tolerance expanded with ebony_hilt upgrade
    const angleToleranceMod = mods?.landingAngleToleranceMultiplier || 1;
    const minAngle = Math.max(0.08, Math.PI * (0.15 - (angleToleranceMod - 1) * 0.05));
    const maxAngle = Math.min(Math.PI * 0.95, Math.PI * (0.85 + (angleToleranceMod - 1) * 0.05));
    const isBladeSticking = normalizedAngle >= minAngle && normalizedAngle <= maxAngle;

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
      activeCommsLogId = "failed";
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
    stonesEarned,
    perfectCenterCount,
    activeCommsLogId,
  };

  return result;
}
