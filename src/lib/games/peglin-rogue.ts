/**
 * Pure simulation & 2D physics engine for 『페글린 로그 (Peglin Roguelike)』
 *
 * Pachinko ball drop deckbuilder roguelike:
 * Elastic pinball peg bounces, bomb & crit augments, turn-based RPG enemy battles.
 */

export type PegType = "normal" | "crit" | "refresh" | "bomb";

export interface Peg {
  id: string;
  x: number;
  y: number;
  type: PegType;
  hit: boolean;
  radius: number;
}

export interface PachinkoBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface PeglinEnemy {
  name: string;
  maxHp: number;
  hp: number;
  attack: number;
  emoji: string;
}

export type PeglinStatus = "aiming" | "firing" | "won" | "gameover";

export interface PeglinGame {
  stage: number;
  playerHp: number;
  maxPlayerHp: number;
  enemy: PeglinEnemy;
  pegs: Peg[];
  aimAngle: number; // in radians (-PI to 0, shooting downwards)
  activeBall: PachinkoBall | null;
  currentTurnDamage: number;
  isCritActive: boolean;
  status: PeglinStatus;
  ballsFiredCount: number;
}

export const PEGLIN_GRAVITY = 750; // px/s^2
export const BALL_INITIAL_SPEED = 420;
export const BOARD_WIDTH = 480;
export const BOARD_HEIGHT = 380;
export const CANNON_X = 240;
export const CANNON_Y = 30;

/**
 * Creates deterministically configured pachinko board & enemy for a stage
 */
export function createInitialPeglinGame(stage: number = 1): PeglinGame {
  const enemies: PeglinEnemy[] = [
    { name: "숲의 고블린 (Goblin)", maxHp: 80, hp: 80, attack: 12, emoji: "👺" },
    { name: "동굴 슬라임 (Slime)", maxHp: 140, hp: 140, attack: 18, emoji: "🟢" },
    { name: "숲의 수호 골렘 (Golem Boss)", maxHp: 240, hp: 240, attack: 28, emoji: "🗿" },
  ];

  const enemy = enemies[(stage - 1) % enemies.length];

  // Generate grid of pegs
  const pegs: Peg[] = [];
  const rows = 7;
  const cols = 9;
  const startX = 60;
  const startY = 80;
  const spacingX = 45;
  const spacingY = 36;

  let pegIdx = 0;
  for (let r = 0; r < rows; r++) {
    const rowOffset = r % 2 === 1 ? spacingX / 2 : 0;
    for (let c = 0; c < cols; c++) {
      const x = startX + c * spacingX + rowOffset;
      const y = startY + r * spacingY;

      // Deterministic peg types
      let type: PegType = "normal";
      if (r === 2 && (c === 2 || c === 6)) type = "crit";
      else if (r === 4 && c === 4) type = "refresh";
      else if (r === 3 && (c === 1 || c === 7)) type = "bomb";

      pegs.push({
        id: `peg-${pegIdx++}`,
        x,
        y,
        type,
        hit: false,
        radius: 7,
      });
    }
  }

  return {
    stage,
    playerHp: 100,
    maxPlayerHp: 100,
    enemy: { ...enemy },
    pegs,
    aimAngle: Math.PI / 2, // aiming straight down
    activeBall: null,
    currentTurnDamage: 0,
    isCritActive: false,
    status: "aiming",
    ballsFiredCount: 0,
  };
}

/**
 * Launch ball towards aimAngle
 */
export function firePeglinBall(game: PeglinGame, angle: number): PeglinGame {
  if (game.status !== "aiming") return game;

  const vx = Math.cos(angle) * BALL_INITIAL_SPEED;
  const vy = Math.sin(angle) * BALL_INITIAL_SPEED;

  return {
    ...game,
    aimAngle: angle,
    status: "firing",
    currentTurnDamage: 0,
    isCritActive: false,
    activeBall: {
      x: CANNON_X,
      y: CANNON_Y,
      vx,
      vy,
      radius: 6,
    },
    ballsFiredCount: game.ballsFiredCount + 1,
  };
}

export interface PeglinStepResult {
  game: PeglinGame;
  pegHitCount: number;
  bombExploded: boolean;
  critActivated: boolean;
  refreshed: boolean;
  enemyDamaged: number;
  playerDamaged: number;
}

/**
 * Advance ball physics simulation by dt seconds
 */
export function stepPeglinPhysics(game: PeglinGame, dt: number): PeglinStepResult {
  const result: PeglinStepResult = {
    game,
    pegHitCount: 0,
    bombExploded: false,
    critActivated: false,
    refreshed: false,
    enemyDamaged: 0,
    playerDamaged: 0,
  };

  if (game.status !== "firing" || !game.activeBall) {
    return result;
  }

  const ball = { ...game.activeBall };
  let currentTurnDamage = game.currentTurnDamage;
  let isCritActive = game.isCritActive;
  let playerHp = game.playerHp;
  let enemyHp = game.enemy.hp;
  let status: PeglinStatus = "firing";

  // Integrate ball physics
  ball.vy += PEGLIN_GRAVITY * dt;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  // Boundary wall reflections (left, right, top)
  if (ball.x - ball.radius < 10) {
    ball.x = 10 + ball.radius;
    ball.vx = Math.abs(ball.vx) * 0.85;
  } else if (ball.x + ball.radius > BOARD_WIDTH - 10) {
    ball.x = BOARD_WIDTH - 10 - ball.radius;
    ball.vx = -Math.abs(ball.vx) * 0.85;
  }

  if (ball.y - ball.radius < 10) {
    ball.y = 10 + ball.radius;
    ball.vy = Math.abs(ball.vy) * 0.85;
  }

  // Peg collisions
  let refreshedTriggered = false;
  const updatedPegs = game.pegs.map((peg) => {
    const dx = ball.x - peg.x;
    const dy = ball.y - peg.y;
    const dist = Math.hypot(dx, dy);
    const minDist = ball.radius + peg.radius;

    if (dist < minDist && dist > 0.001) {
      // Elastic reflection vector
      const nx = dx / dist;
      const ny = dy / dist;
      const dot = ball.vx * nx + ball.vy * ny;

      // Only bounce if moving towards each other
      if (dot < 0) {
        ball.vx = (ball.vx - 2 * dot * nx) * 0.82;
        ball.vy = (ball.vy - 2 * dot * ny) * 0.82;

        // Minimum bounce energy to prevent sluggish sticking
        if (Math.hypot(ball.vx, ball.vy) < 140) {
          ball.vx += nx * 100;
          ball.vy += ny * 100;
        }

        if (!peg.hit) {
          result.pegHitCount += 1;
          const pegBaseDamage = peg.type === "bomb" ? 30 : 6;
          currentTurnDamage += pegBaseDamage;

          if (peg.type === "crit") {
            isCritActive = true;
            result.critActivated = true;
          }

          if (peg.type === "bomb") {
            result.bombExploded = true;
          }

          if (peg.type === "refresh") {
            refreshedTriggered = true;
            result.refreshed = true;
          }

          return { ...peg, hit: true };
        }
      }
    }

    return peg;
  });

  // Handle board refresh if refresh peg was hit
  let finalPegs = updatedPegs;
  if (refreshedTriggered) {
    finalPegs = finalPegs.map((p) => (p.type !== "bomb" ? { ...p, hit: false } : p));
  }

  // Ball exits through the bottom drain -> turn ends & attack resolves
  if (ball.y > BOARD_HEIGHT) {
    const mult = isCritActive ? 1.6 : 1.0;
    const finalDamage = Math.round(currentTurnDamage * mult);
    result.enemyDamaged = finalDamage;
    enemyHp = Math.max(0, enemyHp - finalDamage);

    if (enemyHp <= 0) {
      status = "won";
    } else {
      // Enemy counter-attacks
      playerHp = Math.max(0, playerHp - game.enemy.attack);
      result.playerDamaged = game.enemy.attack;

      if (playerHp <= 0) {
        status = "gameover";
      } else {
        status = "aiming";
        // Reset pegs for next turn
        finalPegs = finalPegs.map((p) => ({ ...p, hit: false }));
      }
    }

    result.game = {
      ...game,
      playerHp,
      enemy: { ...game.enemy, hp: enemyHp },
      pegs: finalPegs,
      activeBall: null,
      currentTurnDamage: 0,
      isCritActive: false,
      status,
    };
    return result;
  }

  result.game = {
    ...game,
    pegs: finalPegs,
    activeBall: ball,
    currentTurnDamage,
    isCritActive,
    status,
  };

  return result;
}
