import {
  solveFabrikChain2D,
  type PendulumBody2D,
  type IkJoint2D,
} from "./engine";
import {
  NewtonianGrapplePhysics2D,
  MagneticTargetSolver2D,
} from "./grappling-engine-pro";

export interface ArenaAnchor {
  id: string;
  x: number;
  y: number;
  radius: number;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  isHostile: boolean;
  lifespanSec: number;
}

export interface BossTentacle {
  id: string;
  rootOffsetX: number;
  rootOffsetY: number;
  joints: IkJoint2D[]; // 5 joints per tentacle
  targetX: number;
  targetY: number;
  strikeTimer: number;
}

export interface BossEntity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  phase: 1 | 2;
  tentacles: BossTentacle[];
  attackCooldownSec: number;
  enragedTimerSec: number;
}

export interface GrapplingBossState {
  player: PendulumBody2D;
  playerHp: number;
  maxPlayerHp: number;
  jumpCount: number;
  isGrounded: boolean;

  boss: BossEntity;
  anchors: ArenaAnchor[];
  projectiles: Projectile[];

  // World Bounds
  arenaWidth: number;
  arenaHeight: number;

  gameTimeSec: number;
  score: number;
  activeLog: string;
  status: "playing" | "victory" | "defeated";
}

export const ARENA_WIDTH = 800;
export const ARENA_HEIGHT = 500;

export function createArenaAnchors(): ArenaAnchor[] {
  return [
    { id: "anchor-1", x: 150, y: 80, radius: 14 },
    { id: "anchor-2", x: 300, y: 70, radius: 14 },
    { id: "anchor-3", x: 450, y: 70, radius: 14 },
    { id: "anchor-4", x: 600, y: 80, radius: 14 },
    { id: "anchor-center-high", x: 375, y: 40, radius: 16 },
    { id: "platform-left", x: 200, y: 220, radius: 12 },
    { id: "platform-right", x: 550, y: 220, radius: 12 },
  ];
}

export function createBossTentacles(): BossTentacle[] {
  const segmentLength = 28;
  const numSegments = 5;

  const offsets = [
    { x: -35, y: -20 },
    { x: 35, y: -20 },
    { x: -45, y: 25 },
    { x: 45, y: 25 },
  ];

  return offsets.map((offset, idx) => {
    const joints: IkJoint2D[] = [];
    for (let i = 0; i < numSegments; i++) {
      joints.push({
        x: 400 + offset.x + i * segmentLength * 0.7,
        y: 180 + offset.y + i * segmentLength * 0.7,
      });
    }
    return {
      id: `tentacle-${idx}`,
      rootOffsetX: offset.x,
      rootOffsetY: offset.y,
      joints,
      targetX: 400 + offset.x,
      targetY: 300,
      strikeTimer: idx * 0.6,
    };
  });
}

export function initializeGrapplingBoss(): GrapplingBossState {
  const anchors = createArenaAnchors();
  const tentacles = createBossTentacles();

  const player: PendulumBody2D = {
    x: 120,
    y: 420,
    vx: 0,
    vy: 0,
    anchorX: 150,
    anchorY: 80,
    ropeLength: 0,
    isHooked: false,
  };

  const boss: BossEntity = {
    x: 400,
    y: 160,
    vx: 0,
    vy: 0,
    hp: 1000,
    maxHp: 1000,
    phase: 1,
    tentacles,
    attackCooldownSec: 1.8,
    enragedTimerSec: 0,
  };

  return {
    player,
    playerHp: 100,
    maxPlayerHp: 100,
    jumpCount: 0,
    isGrounded: false,

    boss,
    anchors,
    projectiles: [],

    arenaWidth: ARENA_WIDTH,
    arenaHeight: ARENA_HEIGHT,

    gameTimeSec: 0,
    score: 0,
    activeLog: "Terraria Grappling Arena! Fire your hook with Space / Click to swing, shoot with F!",
    status: "playing",
  };
}

export function fireGrappleHookToNearestAnchor(
  player: PendulumBody2D,
  anchors: ArenaAnchor[],
  aimX?: number,
  aimY?: number
): void {
  // If already hooked, release hook
  if (player.isHooked) {
    player.isHooked = false;
    player.ropeLength = 0;
    return;
  }

  // Generous Magnetic Target Snapping (Velocity direction + Aim intent + Distance)
  const bestAnchor = MagneticTargetSolver2D.findBestAnchor(
    player.x,
    player.y,
    player.vx,
    player.vy,
    anchors,
    aimX,
    aimY,
    480
  );

  if (bestAnchor) {
    player.isHooked = true;
    player.anchorX = bestAnchor.x;
    player.anchorY = bestAnchor.y;
    player.ropeLength = Math.hypot(bestAnchor.x - player.x, bestAnchor.y - player.y);
    // Gentle upward assist impulse to prevent ground scraping
    player.vy = Math.min(-90, player.vy);
  }
}

export function stepGrapplingBoss(
  state: GrapplingBossState,
  dt: number,
  input: {
    moveAxis: -1 | 0 | 1;
    jump?: boolean;
    fireHook?: boolean;
    aimX?: number;
    aimY?: number;
    fireWeapon?: boolean;
  }
): GrapplingBossState {
  if (state.status === "victory" || state.status === "defeated") {
    return state;
  }

  let nextState: GrapplingBossState = {
    ...state,
    gameTimeSec: state.gameTimeSec + dt,
    player: { ...state.player },
    boss: {
      ...state.boss,
      tentacles: state.boss.tentacles.map((t) => ({
        ...t,
        joints: t.joints.map((j) => ({ ...j })),
      })),
    },
    projectiles: [...state.projectiles],
  };

  const p = nextState.player;
  const b = nextState.boss;

  // 1. Hook Input
  if (input.fireHook) {
    fireGrappleHookToNearestAnchor(p, nextState.anchors, input.aimX, input.aimY);
    nextState.activeLog = p.isHooked ? "Hook attached! Pendulum swing active." : "Hook released!";
  }

  const newtonianSim = new NewtonianGrapplePhysics2D(460, 0.0006, 0.015);

  // 2. Player Horizontal Jet Thrusters
  let thrustX = 0;
  if (input.moveAxis !== 0) {
    thrustX = input.moveAxis * (p.isHooked ? 480 : 620);
  }

  // 3. Jump / Momentum Slingshot Release
  if (input.jump && (nextState.isGrounded || p.isHooked)) {
    if (p.isHooked) {
      // Natural momentum conservation: releases along current tangential velocity vector!
      const released = newtonianSim.releaseWithMomentum(p, 120);
      p.x = released.x;
      p.y = released.y;
      p.vx = released.vx;
      p.vy = released.vy;
      p.isHooked = false;
      p.ropeLength = 0;
      nextState.activeLog = "Grapple Slingshot Momentum Boost!";
    } else {
      p.vy = -380;
      nextState.isGrounded = false;
    }
  }

  // 4. Step Physical Dynamics (Lagrangian Pendulum & Aerodynamic Flight)
  const steppedBody = newtonianSim.step(p, dt, thrustX, 0);
  p.x = steppedBody.x;
  p.y = steppedBody.y;
  p.vx = steppedBody.vx;
  p.vy = steppedBody.vy;

  // Arena floor & wall collision
  const floorY = ARENA_HEIGHT - 45;
  if (p.y >= floorY) {
    p.y = floorY;
    p.vy = 0;
    nextState.isGrounded = true;
  } else {
    nextState.isGrounded = false;
  }

  if (p.x < 30) {
    p.x = 30;
    p.vx = Math.abs(p.vx) * 0.4;
  } else if (p.x > ARENA_WIDTH - 30) {
    p.x = ARENA_WIDTH - 30;
    p.vx = -Math.abs(p.vx) * 0.4;
  }

  // 4. Player Weapon Shooting
  if (input.fireWeapon) {
    const aimTargetX = input.aimX ?? b.x;
    const aimTargetY = input.aimY ?? b.y;
    const dx = aimTargetX - p.x;
    const dy = aimTargetY - p.y;
    const dist = Math.max(0.001, Math.hypot(dx, dy));
    const speed = 480;

    nextState.projectiles.push({
      id: `arrow-${Date.now()}-${Math.random()}`,
      x: p.x,
      y: p.y - 10,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      damage: 45,
      isHostile: false,
      lifespanSec: 2.5,
    });
  }

  // 5. Boss AI & FABRIK Tentacles
  b.enragedTimerSec += dt;
  if (b.hp <= b.maxHp * 0.5 && b.phase === 1) {
    b.phase = 2;
    nextState.activeLog = "⚠️ WARNING: Boss ENRAGED! Mechanical Tentacles Whirling!";
  }

  // Boss hovering pattern
  const hoverY = 160 + Math.sin(nextState.gameTimeSec * 1.5) * 45;
  const hoverX = 400 + Math.cos(nextState.gameTimeSec * 0.8) * (b.phase === 2 ? 140 : 80);
  b.x += (hoverX - b.x) * 1.8 * dt;
  b.y += (hoverY - b.y) * 1.8 * dt;

  // Boss attack cooldown (fires plasma bolts at player)
  b.attackCooldownSec -= dt;
  if (b.attackCooldownSec <= 0) {
    b.attackCooldownSec = b.phase === 2 ? 1.0 : 1.8;
    const bdx = p.x - b.x;
    const bdy = p.y - b.y;
    const bdist = Math.max(0.001, Math.hypot(bdx, bdy));
    const bSpeed = 220;

    nextState.projectiles.push({
      id: `plasma-${Date.now()}-${Math.random()}`,
      x: b.x,
      y: b.y,
      vx: (bdx / bdist) * bSpeed,
      vy: (bdy / bdist) * bSpeed,
      damage: 18,
      isHostile: true,
      lifespanSec: 3.5,
    });
  }

  // Solve FABRIK IK for all tentacles
  for (const tentacle of b.tentacles) {
    // Root anchor moves with boss body
    tentacle.joints[0].x = b.x + tentacle.rootOffsetX;
    tentacle.joints[0].y = b.y + tentacle.rootOffsetY;

    tentacle.strikeTimer += dt;
    // Whip towards player position or sweep
    const targetX = p.x + Math.sin(tentacle.strikeTimer * 2.5) * 40;
    const targetY = p.y + Math.cos(tentacle.strikeTimer * 2.5) * 40;

    const ikResult = solveFabrikChain2D(tentacle.joints, targetX, targetY, 6, 1.0);
    tentacle.joints = ikResult.joints;

    // Tentacle Tip collision with player
    const tip = tentacle.joints[tentacle.joints.length - 1];
    if (tip && Math.hypot(tip.x - p.x, tip.y - p.y) < 24) {
      nextState.playerHp -= 12 * dt;
      p.vx += (p.x - tip.x) * 5;
      p.vy -= 40;
    }
  }

  // 6. Step Projectiles
  const nextProjectiles: Projectile[] = [];
  for (const proj of nextState.projectiles) {
    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;
    proj.lifespanSec -= dt;

    if (proj.lifespanSec <= 0) continue;

    if (!proj.isHostile) {
      // Player projectile vs Boss body
      const distToBoss = Math.hypot(b.x - proj.x, b.y - proj.y);
      if (distToBoss < 45) {
        b.hp = Math.max(0, b.hp - proj.damage);
        // Kinetic Siphon: Offensive aggression restores shield!
        nextState.playerHp = Math.min(nextState.maxPlayerHp, nextState.playerHp + 4);
        nextState.score += Math.floor(proj.damage * 10);
        continue; // Projectile absorbed
      }
    } else {
      // Hostile projectile vs Player (Generous 10px Core Micro-Hurtbox)
      const distToPlayer = Math.hypot(p.x - proj.x, p.y - proj.y);
      if (distToPlayer < 10) {
        nextState.playerHp = Math.max(0, nextState.playerHp - proj.damage);
        continue; // Projectile absorbed
      }
    }

    // Keep if within arena
    if (proj.x >= 0 && proj.x <= ARENA_WIDTH && proj.y >= 0 && proj.y <= ARENA_HEIGHT) {
      nextProjectiles.push(proj);
    }
  }
  nextState.projectiles = nextProjectiles;

  // 7. Check Victory & Defeat
  if (b.hp <= 0) {
    nextState.status = "victory";
    nextState.score += 5000;
    nextState.activeLog = "🏆 MECHANICAL BEHOLDER FELLED! Valhalla Arena Mastered!";
  } else if (nextState.playerHp <= 0) {
    nextState.status = "defeated";
    nextState.activeLog = "💀 Slain by the Beholder. Use grapple swings to evade attacks!";
  }

  return nextState;
}

export function runGrapplingBossMonteCarloAudit(trials = 20): {
  survivedTrials: number;
  averageDamageDealt: number;
  averageSurvivalTimeSec: number;
} {
  let survived = 0;
  let totalDamage = 0;
  let totalTime = 0;

  for (let i = 0; i < trials; i++) {
    let sim = initializeGrapplingBoss();
    let simTime = 0;
    const dt = 0.5;

    // Simulate 30 seconds of high-intensity aerial combat
    while (sim.status === "playing" && simTime < 30) {
      simTime += dt;

      // Smart Player Bot: Swing across anchors and fire arrows
      const needHook = !sim.player.isHooked && sim.player.y > 300;
      const needJump = sim.player.isHooked && Math.abs(sim.player.vx) > 180;
      const moveAxis = sim.player.x < sim.boss.x ? 1 : -1;

      sim = stepGrapplingBoss(sim, dt, {
        moveAxis,
        fireHook: needHook,
        jump: needJump,
        fireWeapon: true,
        aimX: sim.boss.x,
        aimY: sim.boss.y,
      });

      if (sim.status === "victory") break;
    }

    if (sim.status !== "defeated") {
      survived++;
    }
    totalDamage += sim.boss.maxHp - sim.boss.hp;
    totalTime += simTime;
  }

  return {
    survivedTrials: survived,
    averageDamageDealt: Math.floor(totalDamage / trials),
    averageSurvivalTimeSec: Number((totalTime / trials).toFixed(1)),
  };
}
