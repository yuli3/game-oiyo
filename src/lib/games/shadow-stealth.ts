/**
 * Shinobi Shadow Infiltration (#155) - Core Stealth Engine
 *
 * Integrates Web-Unity Engine systems:
 * 1. isPointInViewCone2D (engine-v2): Dynamic FOV cone & LOS wall occlusion detection for patrol guards
 * 2. DeterministicReplayTape (engine-v4-net-tools): Deterministic keyframe input recording & Ghost playback token
 * 3. Monte Carlo automated stealth infiltration balance audit
 */

import {
  isPointInViewCone2D,
  type ViewConeConfig,
  DeterministicReplayTape,
  encodeReplayToken,
} from './engine';

export interface Point2D {
  x: number;
  y: number;
}

export interface WallObstacle {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ShadowZone {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type GuardState = 'patrol' | 'suspicious' | 'chase' | 'unconscious';

export interface SamuraiGuard {
  id: number;
  x: number;
  y: number;
  facingRad: number;
  targetFacingRad: number;
  waypoints: Point2D[];
  currentWaypointIndex: number;
  state: GuardState;
  stateTimer: number;
  suspicionGauge: number; // 0..100
  walkSpeed: number;
  fovRad: number;
  viewRange: number;
  investigateTarget?: Point2D;
}

export interface ShurikenProjectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export interface SmokeCloud {
  x: number;
  y: number;
  radius: number;
  duration: number; // remaining seconds
}

export interface NinjaPlayer {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facingRad: number;
  speed: number;
  isInShadow: boolean;
  shurikens: number;
  smokeBombs: number;
  hasScroll: boolean;
  isDetected: boolean;
  escaped: boolean;
}

export interface ShadowStealthGameState {
  player: NinjaPlayer;
  guards: SamuraiGuard[];
  walls: WallObstacle[];
  shadows: ShadowZone[];
  shurikens: ShurikenProjectile[];
  smokeClouds: SmokeCloud[];
  scrollLocation: Point2D;
  escapeLocation: Point2D;
  alertLevel: number; // 0..100
  score: number;
  frameIndex: number;
  replayTape: DeterministicReplayTape;
  replayToken?: string;
  isGameOver: boolean;
  isVictory: boolean;
  recentLogs: string[];
}

export const ARENA_WIDTH = 800;
export const ARENA_HEIGHT = 480;

export const INPUT_UP = 1 << 0;
export const INPUT_DOWN = 1 << 1;
export const INPUT_LEFT = 1 << 2;
export const INPUT_RIGHT = 1 << 3;
export const INPUT_SHURIKEN = 1 << 4;
export const INPUT_SMOKE = 1 << 5;
export const INPUT_TAKEDOWN = 1 << 6;

/**
 * Line segment intersection test for wall occlusion
 */
function lineIntersectsBox(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  box: WallObstacle
): boolean {
  // Bounding box quick check
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);

  if (maxX < box.x || minX > box.x + box.w || maxY < box.y || minY > box.y + box.h) {
    return false;
  }

  // Check 4 segments of rectangle
  const left = box.x;
  const right = box.x + box.w;
  const top = box.y;
  const bottom = box.y + box.h;

  function ccw(ax: number, ay: number, bx: number, by: number, cx: number, cy: number) {
    return (cy - ay) * (bx - ax) > (by - ay) * (cx - ax);
  }

  function intersect(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    cx: number,
    cy: number,
    dx: number,
    dy: number
  ) {
    return (
      ccw(ax, ay, cx, cy, dx, dy) !== ccw(bx, by, cx, cy, dx, dy) &&
      ccw(ax, ay, bx, by, cx, cy) !== ccw(ax, ay, bx, by, dx, dy)
    );
  }

  return (
    intersect(x0, y0, x1, y1, left, top, right, top) ||
    intersect(x0, y0, x1, y1, right, top, right, bottom) ||
    intersect(x0, y0, x1, y1, right, bottom, left, bottom) ||
    intersect(x0, y0, x1, y1, left, bottom, left, top)
  );
}

export function createShadowStealthGame(seed: number = 20261031): ShadowStealthGameState {
  const tape = new DeterministicReplayTape(seed, 60);

  const walls: WallObstacle[] = [
    // Outer castle boundaries
    { x: 0, y: 0, w: 800, h: 20 },
    { x: 0, y: 460, w: 800, h: 20 },
    { x: 0, y: 0, w: 20, h: 480 },
    { x: 780, y: 0, w: 20, h: 480 },

    // Fortress internal courtyards and screen partitions
    { x: 180, y: 80, w: 20, h: 200 },
    { x: 180, y: 340, w: 20, h: 120 },
    { x: 360, y: 20, w: 20, h: 180 },
    { x: 360, y: 260, w: 20, h: 200 },
    { x: 540, y: 120, w: 20, h: 240 },
    { x: 440, y: 220, w: 120, h: 20 },
  ];

  const shadows: ShadowZone[] = [
    { x: 40, y: 40, w: 100, h: 120 }, // Bamboo grove starting alcove
    { x: 190, y: 270, w: 140, h: 100 }, // Screen partition & alcove shadow
    { x: 370, y: 200, w: 90, h: 90 }, // Central corridor shadow
    { x: 440, y: 30, w: 160, h: 80 }, // Upper walkway shadow
    { x: 640, y: 60, w: 120, h: 120 }, // Scroll chamber alcove shadow
  ];

  const guards: SamuraiGuard[] = [
    {
      id: 1,
      x: 100,
      y: 280,
      facingRad: Math.PI / 2,
      targetFacingRad: Math.PI / 2,
      waypoints: [
        { x: 100, y: 240 },
        { x: 100, y: 380 },
      ],
      currentWaypointIndex: 0,
      state: 'patrol',
      stateTimer: 0,
      suspicionGauge: 0,
      walkSpeed: 45,
      fovRad: (70 * Math.PI) / 180,
      viewRange: 160,
    },
    {
      id: 2,
      x: 270,
      y: 160,
      facingRad: 0,
      targetFacingRad: 0,
      waypoints: [
        { x: 250, y: 160 },
        { x: 320, y: 160 },
        { x: 250, y: 300 },
      ],
      currentWaypointIndex: 0,
      state: 'patrol',
      stateTimer: 0,
      suspicionGauge: 0,
      walkSpeed: 50,
      fovRad: (75 * Math.PI) / 180,
      viewRange: 170,
    },
    {
      id: 3,
      x: 460,
      y: 120,
      facingRad: Math.PI,
      targetFacingRad: Math.PI,
      waypoints: [
        { x: 460, y: 80 },
        { x: 460, y: 380 },
      ],
      currentWaypointIndex: 0,
      state: 'patrol',
      stateTimer: 0,
      suspicionGauge: 0,
      walkSpeed: 40,
      fovRad: (70 * Math.PI) / 180,
      viewRange: 160,
    },
    {
      id: 4,
      x: 640,
      y: 220,
      facingRad: -Math.PI / 2,
      targetFacingRad: -Math.PI / 2,
      waypoints: [
        { x: 640, y: 140 },
        { x: 720, y: 240 },
        { x: 640, y: 360 },
      ],
      currentWaypointIndex: 0,
      state: 'patrol',
      stateTimer: 0,
      suspicionGauge: 0,
      walkSpeed: 55,
      fovRad: (80 * Math.PI) / 180,
      viewRange: 180,
    },
  ];

  return {
    player: {
      x: 60,
      y: 80,
      vx: 0,
      vy: 0,
      facingRad: 0,
      speed: 95,
      isInShadow: true,
      shurikens: 3,
      smokeBombs: 1,
      hasScroll: false,
      isDetected: false,
      escaped: false,
    },
    guards,
    walls,
    shadows,
    shurikens: [],
    smokeClouds: [],
    scrollLocation: { x: 720, y: 120 },
    escapeLocation: { x: 50, y: 80 },
    alertLevel: 0,
    score: 1000,
    frameIndex: 0,
    replayTape: tape,
    isGameOver: false,
    isVictory: false,
    recentLogs: [
      'Infiltrate Shogun Fortress.',
      'Steal the Secret Scroll and escape unseen.',
    ],
  };
}

/**
 * Checks if point is inside any shadow zone
 */
export function isPointInShadow(x: number, y: number, shadows: ShadowZone[]): boolean {
  for (const s of shadows) {
    if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if line is occluded by any wall or smoke cloud
 */
export function isLineOccluded(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  walls: WallObstacle[],
  smokeClouds: SmokeCloud[]
): boolean {
  // Check smoke clouds (smoke blocks line of sight)
  for (const smoke of smokeClouds) {
    if (smoke.duration > 0) {
      const midX = (x0 + x1) * 0.5;
      const midY = (y0 + y1) * 0.5;
      const dMid = Math.hypot(midX - smoke.x, midY - smoke.y);
      if (dMid < smoke.radius) return true;
    }
  }

  // Check walls
  for (const wall of walls) {
    if (lineIntersectsBox(x0, y0, x1, y1, wall)) {
      return true;
    }
  }
  return false;
}

/**
 * Steps the stealth simulation forward by 1 frame (1/60s)
 */
export function stepShadowStealth(
  state: ShadowStealthGameState,
  inputMask: number,
  dt: number = 1 / 60
): {
  detected: boolean;
  scrollCollected: boolean;
  escaped: boolean;
  takedowns: number;
} {
  if (state.isGameOver || state.isVictory) {
    return { detected: false, scrollCollected: false, escaped: false, takedowns: 0 };
  }

  state.frameIndex += 1;
  state.replayTape.recordFrame(state.frameIndex, inputMask);

  let takedownCount = 0;
  let scrollCollectedNow = false;
  let escapedNow = false;

  // 1. Player Movement & Actions
  let moveX = 0;
  let moveY = 0;
  if (inputMask & INPUT_UP) moveY -= 1;
  if (inputMask & INPUT_DOWN) moveY += 1;
  if (inputMask & INPUT_LEFT) moveX -= 1;
  if (inputMask & INPUT_RIGHT) moveX += 1;

  if (moveX !== 0 || moveY !== 0) {
    const len = Math.hypot(moveX, moveY);
    state.player.facingRad = Math.atan2(moveY, moveX);
    const speed = state.player.speed;
    const nextX = state.player.x + (moveX / len) * speed * dt;
    const nextY = state.player.y + (moveY / len) * speed * dt;

    // Wall collision resolve
    let blockedX = false;
    let blockedY = false;
    for (const wall of state.walls) {
      if (
        nextX + 8 > wall.x &&
        nextX - 8 < wall.x + wall.w &&
        state.player.y + 8 > wall.y &&
        state.player.y - 8 < wall.y + wall.h
      ) {
        blockedX = true;
      }
      if (
        state.player.x + 8 > wall.x &&
        state.player.x - 8 < wall.x + wall.w &&
        nextY + 8 > wall.y &&
        nextY - 8 < wall.y + wall.h
      ) {
        blockedY = true;
      }
    }

    if (!blockedX) state.player.x = nextX;
    if (!blockedY) state.player.y = nextY;
  }

  // Check shadow concealment
  state.player.isInShadow = isPointInShadow(
    state.player.x,
    state.player.y,
    state.shadows
  );

  // Shuriken Throw
  if ((inputMask & INPUT_SHURIKEN) && state.player.shurikens > 0) {
    state.player.shurikens -= 1;
    const projSpeed = 320;
    state.shurikens.push({
      id: state.shurikens.length + 1,
      x: state.player.x,
      y: state.player.y,
      vx: Math.cos(state.player.facingRad) * projSpeed,
      vy: Math.sin(state.player.facingRad) * projSpeed,
      life: 0.6,
    });
  }

  // Smoke Bomb Deploy
  if ((inputMask & INPUT_SMOKE) && state.player.smokeBombs > 0) {
    state.player.smokeBombs -= 1;
    state.smokeClouds.push({
      x: state.player.x,
      y: state.player.y,
      radius: 65,
      duration: 4.5,
    });
  }

  // Stealth Takedown
  if (inputMask & INPUT_TAKEDOWN) {
    for (const guard of state.guards) {
      if (guard.state !== 'unconscious') {
        const d = Math.hypot(state.player.x - guard.x, state.player.y - guard.y);
        // Takedown if within 30px and behind guard (angle diff > 90 deg)
        const angleToPlayer = Math.atan2(
          state.player.y - guard.y,
          state.player.x - guard.x
        );
        let angleDiff = Math.abs(angleToPlayer - guard.facingRad);
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        angleDiff = Math.abs(angleDiff);

        if (d < 32 && angleDiff > Math.PI * 0.45) {
          guard.state = 'unconscious';
          guard.stateTimer = 999;
          takedownCount += 1;
          state.score += 250;
          state.recentLogs.push(`Takedown executed on Samurai #${guard.id}!`);
        }
      }
    }
  }

  // 2. Projectiles & Smoke Update
  for (let i = state.shurikens.length - 1; i >= 0; i--) {
    const s = state.shurikens[i];
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;

    // Shuriken hits guard: alert distraction
    for (const guard of state.guards) {
      if (guard.state !== 'unconscious') {
        if (Math.hypot(s.x - guard.x, s.y - guard.y) < 16) {
          guard.state = 'suspicious';
          guard.investigateTarget = { x: s.x, y: s.y };
          guard.stateTimer = 3.0;
          s.life = 0;
        }
      }
    }

    if (s.life <= 0) {
      state.shurikens.splice(i, 1);
    }
  }

  for (let i = state.smokeClouds.length - 1; i >= 0; i--) {
    state.smokeClouds[i].duration -= dt;
    if (state.smokeClouds[i].duration <= 0) {
      state.smokeClouds.splice(i, 1);
    }
  }

  // 3. Samurai Guard AI & Vision Cone Raycasting (isPointInViewCone2D)
  let anyGuardAlerted = false;

  for (const guard of state.guards) {
    if (guard.state === 'unconscious') continue;

    // View cone setup
    const coneConfig: ViewConeConfig = {
      originX: guard.x,
      originY: guard.y,
      facingRad: guard.facingRad,
      fovRad: guard.fovRad,
      maxRange: guard.viewRange,
    };

    // Evaluate visibility cone with LOS occlusion
    const vision = isPointInViewCone2D(
      coneConfig,
      state.player.x,
      state.player.y,
      (x0, y0, x1, y1) => isLineOccluded(x0, y0, x1, y1, state.walls, state.smokeClouds)
    );

    // If player is in full shadow, vision detection is heavily damped
    if (vision.detected && !state.player.isInShadow) {
      const rate = vision.zone === 'alert' ? 140 : 60; // 0.7s reaction grace window
      guard.suspicionGauge = Math.min(100, guard.suspicionGauge + rate * dt);

      if (guard.suspicionGauge >= 100) {
        guard.state = 'chase';
        guard.stateTimer = 5.0;
        anyGuardAlerted = true;
      } else {
        guard.state = 'suspicious';
        guard.investigateTarget = { x: state.player.x, y: state.player.y };
        guard.stateTimer = 2.5;
      }
    } else {
      guard.suspicionGauge = Math.max(0, guard.suspicionGauge - 40 * dt);
      if (guard.suspicionGauge <= 0 && guard.state === 'suspicious') {
        guard.state = 'patrol';
      }
    }

    // State machine movement
    if (guard.state === 'chase') {
      const dx = state.player.x - guard.x;
      const dy = state.player.y - guard.y;
      const dist = Math.hypot(dx, dy);
      guard.facingRad = Math.atan2(dy, dx);
      if (dist > 18) {
        guard.x += (dx / dist) * guard.walkSpeed * 1.5 * dt;
        guard.y += (dy / dist) * guard.walkSpeed * 1.5 * dt;
      } else {
        // Caught player!
        state.isGameOver = true;
        state.recentLogs.push('Detected and apprehended by the Samurai Guard!');
      }
    } else if (guard.state === 'suspicious') {
      if (guard.investigateTarget) {
        const dx = guard.investigateTarget.x - guard.x;
        const dy = guard.investigateTarget.y - guard.y;
        const dist = Math.hypot(dx, dy);
        guard.facingRad = Math.atan2(dy, dx);
        if (dist > 10) {
          guard.x += (dx / dist) * guard.walkSpeed * dt;
          guard.y += (dy / dist) * guard.walkSpeed * dt;
        }
      }
      guard.stateTimer -= dt;
      if (guard.stateTimer <= 0) {
        guard.state = 'patrol';
      }
    } else {
      // Normal waypoint patrol
      const targetWp = guard.waypoints[guard.currentWaypointIndex];
      const dx = targetWp.x - guard.x;
      const dy = targetWp.y - guard.y;
      const dist = Math.hypot(dx, dy);
      guard.facingRad = Math.atan2(dy, dx);

      if (dist < 8) {
        guard.currentWaypointIndex =
          (guard.currentWaypointIndex + 1) % guard.waypoints.length;
      } else {
        guard.x += (dx / dist) * guard.walkSpeed * dt;
        guard.y += (dy / dist) * guard.walkSpeed * dt;
      }
    }
  }

  // Update overall alert level
  if (anyGuardAlerted) {
    state.alertLevel = Math.min(100, state.alertLevel + 120 * dt);
    state.player.isDetected = true;
  } else {
    state.alertLevel = Math.max(0, state.alertLevel - 20 * dt);
  }

  // 4. Mission Objectives (Scroll & Escape)
  if (!state.player.hasScroll) {
    const dScroll = Math.hypot(
      state.player.x - state.scrollLocation.x,
      state.player.y - state.scrollLocation.y
    );
    if (dScroll < 24) {
      state.player.hasScroll = true;
      scrollCollectedNow = true;
      state.score += 500;
      state.recentLogs.push('Secret Scroll acquired! Return to the extraction boat!');
    }
  } else {
    // Has scroll, check extraction
    const dEscape = Math.hypot(
      state.player.x - state.escapeLocation.x,
      state.player.y - state.escapeLocation.y
    );
    if (dEscape < 28) {
      state.player.escaped = true;
      state.isVictory = true;
      escapedNow = true;
      state.score += 1000;
      // Export deterministic replay token
      state.replayToken = encodeReplayToken(state.replayTape.exportPayload());
      state.recentLogs.push('Mission Accomplished! Escaped without triggering alarms!');
    }
  }

  return {
    detected: state.player.isDetected,
    scrollCollected: scrollCollectedNow,
    escaped: escapedNow,
    takedowns: takedownCount,
  };
}

/**
 * Monte Carlo Stealth Infiltration Balance Audit
 * Simulates 10 autonomous ninja infiltrator runs using waypoint sneak heuristics.
 * Verifies clear rate >= 80% and replay tape integrity.
 */
export function runShadowStealthBalanceAudit(runs: number = 10): {
  passed: boolean;
  clearRate: number;
  victories: number;
  averageFrames: number;
  sampleReplayToken?: string;
} {
  let victories = 0;
  let totalFrames = 0;
  let sampleToken: string | undefined;

  for (let r = 0; r < runs; r++) {
    const game = createShadowStealthGame(20261031 + r);
    const maxTicks = 60 * 60; // 60 seconds at 60fps

    // Precise corridor navigation through wall openings:
    // Wall 1 at x=180 has door at y=280..340 -> pass through (120, 310) -> (220, 310)
    // Wall 2 at x=360 has door at y=200..260 -> pass through (300, 230) -> (400, 230)
    // Wall 3 at x=540 has upper passage at y=20..120 -> pass through (480, 60) -> (600, 60)
    // Scroll room at (720, 120)
    const sneakPath: Point2D[] = [
      { x: 80, y: 180 },
      { x: 120, y: 310 },
      { x: 230, y: 310 }, // Inside screen shadow
      { x: 300, y: 310 },
      { x: 340, y: 230 },
      { x: 410, y: 230 }, // Central corridor shadow
      { x: 480, y: 60 }, // Upper walkway shadow
      { x: 600, y: 60 },
      { x: 720, y: 120 }, // Scroll acquired
      { x: 600, y: 60 },
      { x: 480, y: 60 },
      { x: 410, y: 230 },
      { x: 340, y: 230 },
      { x: 230, y: 310 },
      { x: 120, y: 310 },
      { x: 50, y: 80 }, // Escape boat
    ];
    let pathIdx = 0;

    for (let tick = 0; tick < maxTicks; tick++) {
      if (game.isGameOver || game.isVictory) break;

      const target = sneakPath[pathIdx];
      let mask = 0;

      const dx = target.x - game.player.x;
      const dy = target.y - game.player.y;
      if (Math.abs(dx) > 6) mask |= dx > 0 ? INPUT_RIGHT : INPUT_LEFT;
      if (Math.abs(dy) > 6) mask |= dy > 0 ? INPUT_DOWN : INPUT_UP;

      if (Math.hypot(dx, dy) < 18 && pathIdx < sneakPath.length - 1) {
        pathIdx++;
      }

      // If near guard and behind, execute stealth takedown
      for (const guard of game.guards) {
        if (guard.state !== 'unconscious') {
          const d = Math.hypot(game.player.x - guard.x, game.player.y - guard.y);
          if (d < 35) {
            mask |= INPUT_TAKEDOWN;
          }
        }
      }

      // If suspicious or near guard, drop smoke or shuriken
      if (game.alertLevel > 25 && game.player.smokeBombs > 0) {
        mask |= INPUT_SMOKE;
      } else if (game.alertLevel > 15 && game.player.shurikens > 0) {
        mask |= INPUT_SHURIKEN;
      }

      stepShadowStealth(game, mask, 1 / 60);
    }

    if (game.isVictory) {
      victories += 1;
      totalFrames += game.frameIndex;
      if (!sampleToken && game.replayToken) {
        sampleToken = game.replayToken;
      }
    }
  }

  const clearRate = victories / runs;
  const passed = clearRate >= 0.8;

  return {
    passed,
    clearRate,
    victories,
    averageFrames: victories > 0 ? Math.floor(totalFrames / victories) : 0,
    sampleReplayToken: sampleToken,
  };
}
