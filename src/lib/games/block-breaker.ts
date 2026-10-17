/**
 * 3D Block Breaker physics and state engine.
 * Pure TypeScript logic for paddle bounce, AABB block collision, multiball, and powerups.
 */

export interface Block {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  points: number;
  durability: number;
  maxDurability: number;
  hasPowerup?: 'multiball' | 'expand' | 'laser' | 'slow';
}

export interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  speed: number;
}

export interface PowerupItem {
  id: number;
  x: number;
  y: number;
  type: 'multiball' | 'expand' | 'laser' | 'slow';
  vy: number;
}

export interface LaserBeam {
  id: number;
  x: number;
  y: number;
  vy: number;
}

export interface BlockBreakerState {
  playWidth: number;
  playHeight: number;
  paddleX: number;
  paddleY: number;
  paddleWidth: number;
  defaultPaddleWidth: number;
  paddleHeight: number;
  balls: Ball[];
  blocks: Block[];
  powerups: PowerupItem[];
  lasers: LaserBeam[];
  score: number;
  highScore: number;
  lives: number;
  level: number;
  status: 'ready' | 'playing' | 'paused' | 'cleared' | 'gameover';
  combo: number;
  laserAmmo: number;
}

export const PLAY_WIDTH = 10;
export const PLAY_HEIGHT = 14;
export const PADDLE_Y = 1.0;
export const DEFAULT_PADDLE_WIDTH = 2.4;
export const BALL_RADIUS = 0.22;
export const INITIAL_BALL_SPEED = 9.0;

export function createLevelBlocks(level: number): Block[] {
  const blocks: Block[] = [];
  const rows = 4 + Math.min(3, level);
  const cols = 7;
  const blockWidth = 1.25;
  const blockHeight = 0.55;
  const gapX = 0.15;
  const gapY = 0.2;
  const startY = PLAY_HEIGHT - 2.5;

  const totalGridWidth = cols * blockWidth + (cols - 1) * gapX;
  const startX = -totalGridWidth / 2 + blockWidth / 2;

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6'];
  let id = 1;

  for (let r = 0; r < rows; r++) {
    const y = startY - r * (blockHeight + gapY);
    const color = COLORS[r % COLORS.length];
    const isTough = r === 0 && level > 1;

    for (let c = 0; c < cols; c++) {
      const x = startX + c * (blockWidth + gapX);
      let powerup: Block['hasPowerup'];
      if ((r + c + level) % 6 === 0) powerup = 'multiball';
      else if ((r * 2 + c) % 8 === 0) powerup = 'expand';
      else if ((r + c * 3) % 9 === 0) powerup = 'laser';
      else if ((r + c) % 11 === 0) powerup = 'slow';

      blocks.push({
        id: id++,
        x,
        y,
        width: blockWidth,
        height: blockHeight,
        color: isTough ? '#cbd5e1' : color,
        points: (rows - r) * 50,
        durability: isTough ? 2 : 1,
        maxDurability: isTough ? 2 : 1,
        hasPowerup: powerup,
      });
    }
  }

  return blocks;
}

export function createInitialBlockBreakerState(highScore = 0): BlockBreakerState {
  return {
    playWidth: PLAY_WIDTH,
    playHeight: PLAY_HEIGHT,
    paddleX: 0,
    paddleY: PADDLE_Y,
    paddleWidth: DEFAULT_PADDLE_WIDTH,
    defaultPaddleWidth: DEFAULT_PADDLE_WIDTH,
    paddleHeight: 0.35,
    balls: [
      {
        id: 1,
        x: 0,
        y: PADDLE_Y + 0.4,
        vx: 0,
        vy: 0,
        radius: BALL_RADIUS,
        speed: INITIAL_BALL_SPEED,
      },
    ],
    blocks: createLevelBlocks(1),
    powerups: [],
    lasers: [],
    score: 0,
    highScore,
    lives: 3,
    level: 1,
    status: 'ready',
    combo: 0,
    laserAmmo: 0,
  };
}

export function launchBall(state: BlockBreakerState): BlockBreakerState {
  if (state.status !== 'ready' || state.balls.length === 0) return state;

  const angle = (Math.PI / 2) + (Math.random() * 0.4 - 0.2);
  const updatedBalls = state.balls.map((b) => ({
    ...b,
    vx: Math.cos(angle) * b.speed,
    vy: Math.sin(angle) * b.speed,
  }));

  return {
    ...state,
    balls: updatedBalls,
    status: 'playing',
  };
}

export function movePaddle(state: BlockBreakerState, targetX: number): BlockBreakerState {
  const halfPaddle = state.paddleWidth / 2;
  const bound = state.playWidth / 2 - halfPaddle;
  const clampedX = Math.max(-bound, Math.min(bound, targetX));

  let updatedBalls = state.balls;
  if (state.status === 'ready') {
    updatedBalls = state.balls.map((b) => ({
      ...b,
      x: clampedX,
      y: state.paddleY + 0.4,
    }));
  }

  return {
    ...state,
    paddleX: clampedX,
    balls: updatedBalls,
  };
}

export function fireLasers(state: BlockBreakerState): BlockBreakerState {
  if (state.laserAmmo <= 0 || state.status !== 'playing') return state;

  const half = state.paddleWidth * 0.4;
  const newLasers: LaserBeam[] = [
    { id: Date.now(), x: state.paddleX - half, y: state.paddleY + 0.4, vy: 16.0 },
    { id: Date.now() + 1, x: state.paddleX + half, y: state.paddleY + 0.4, vy: 16.0 },
  ];

  return {
    ...state,
    laserAmmo: state.laserAmmo - 1,
    lasers: [...state.lasers, ...newLasers],
  };
}

export function updateBlockBreaker(state: BlockBreakerState, dt: number): BlockBreakerState {
  if (state.status !== 'playing') return state;

  const halfWidth = state.playWidth / 2;
  const paddleHalfW = state.paddleWidth / 2;
  const paddleHalfH = state.paddleHeight / 2;

  let scoreGain = 0;
  let combo = state.combo;
  const newPowerups: PowerupItem[] = [];
  const remainingBlocks = [...state.blocks];

  // 1. Update Lasers
  const activeLasers: LaserBeam[] = [];
  for (const laser of state.lasers) {
    const nextY = laser.y + laser.vy * dt;
    let hitBlock = false;

    for (let i = 0; i < remainingBlocks.length; i++) {
      const block = remainingBlocks[i];
      if (
        laser.x >= block.x - block.width / 2 &&
        laser.x <= block.x + block.width / 2 &&
        nextY >= block.y - block.height / 2 &&
        nextY <= block.y + block.height / 2
      ) {
        hitBlock = true;
        block.durability--;
        if (block.durability <= 0) {
          scoreGain += block.points;
          if (block.hasPowerup) {
            newPowerups.push({
              id: Date.now() + Math.random(),
              x: block.x,
              y: block.y,
              type: block.hasPowerup,
              vy: -3.5,
            });
          }
          remainingBlocks.splice(i, 1);
        }
        break;
      }
    }

    if (!hitBlock && nextY < state.playHeight) {
      activeLasers.push({ ...laser, y: nextY });
    }
  }

  // 2. Update Balls and Collisions
  const survivingBalls: Ball[] = [];

  for (const ball of state.balls) {
    let nextX = ball.x + ball.vx * dt;
    let nextY = ball.y + ball.vy * dt;
    let vx = ball.vx;
    let vy = ball.vy;

    // Wall bounce (Left / Right)
    if (nextX - ball.radius <= -halfWidth) {
      nextX = -halfWidth + ball.radius;
      vx = Math.abs(vx);
    } else if (nextX + ball.radius >= halfWidth) {
      nextX = halfWidth - ball.radius;
      vx = -Math.abs(vx);
    }

    // Wall bounce (Top)
    if (nextY + ball.radius >= state.playHeight) {
      nextY = state.playHeight - ball.radius;
      vy = -Math.abs(vy);
    }

    // Paddle bounce
    if (
      nextY - ball.radius <= state.paddleY + paddleHalfH &&
      nextY + ball.radius >= state.paddleY - paddleHalfH &&
      nextX >= state.paddleX - paddleHalfW - 0.1 &&
      nextX <= state.paddleX + paddleHalfW + 0.1 &&
      vy < 0
    ) {
      nextY = state.paddleY + paddleHalfH + ball.radius;
      const hitOffset = (nextX - state.paddleX) / paddleHalfW; // -1.0 to 1.0
      const maxAngle = Math.PI * 0.42; // Up to ~75 degrees
      const bounceAngle = (Math.PI / 2) - hitOffset * maxAngle;

      const currentSpeed = Math.min(ball.speed * 1.02, 14.0); // Slight speed up on paddle hit
      vx = Math.cos(bounceAngle) * currentSpeed;
      vy = Math.sin(bounceAngle) * currentSpeed;
      combo = 0; // Reset combo on paddle touch
    }

    // Block collision
    for (let i = 0; i < remainingBlocks.length; i++) {
      const b = remainingBlocks[i];
      const bHalfW = b.width / 2;
      const bHalfH = b.height / 2;

      // Find closest point on block to ball center
      const closestX = Math.max(b.x - bHalfW, Math.min(nextX, b.x + bHalfW));
      const closestY = Math.max(b.y - bHalfH, Math.min(nextY, b.y + bHalfH));
      const distX = nextX - closestX;
      const distY = nextY - closestY;
      const distSq = distX * distX + distY * distY;

      if (distSq <= ball.radius * ball.radius) {
        // Hit detected!
        combo++;
        const comboBonus = Math.floor(b.points * (1 + combo * 0.1));
        b.durability--;

        if (b.durability <= 0) {
          scoreGain += comboBonus;
          if (b.hasPowerup) {
            newPowerups.push({
              id: Date.now() + Math.random(),
              x: b.x,
              y: b.y,
              type: b.hasPowerup,
              vy: -3.5,
            });
          }
          remainingBlocks.splice(i, 1);
        } else {
          scoreGain += 25;
        }

        // Determine bounce axis
        if (Math.abs(distX) > Math.abs(distY)) {
          vx = -vx;
        } else {
          vy = -vy;
        }
        break; // Only one block collision per frame per ball
      }
    }

    // Bottom boundary check (ball lost)
    if (nextY - ball.radius > 0) {
      survivingBalls.push({
        ...ball,
        x: nextX,
        y: nextY,
        vx,
        vy,
      });
    }
  }

  // 3. Update Falling Powerups
  const activePowerups: PowerupItem[] = [];
  let paddleWidth = state.paddleWidth;
  let laserAmmo = state.laserAmmo;
  const spawnedBalls: Ball[] = [];

  for (const powerup of [...state.powerups, ...newPowerups]) {
    const nextY = powerup.y + powerup.vy * dt;

    // Check catch by paddle
    if (
      nextY <= state.paddleY + paddleHalfH &&
      nextY >= state.paddleY - paddleHalfH &&
      powerup.x >= state.paddleX - paddleHalfW &&
      powerup.x <= state.paddleX + paddleHalfW
    ) {
      // Caught!
      scoreGain += 100;
      if (powerup.type === 'expand') {
        paddleWidth = Math.min(state.defaultPaddleWidth * 1.5, paddleWidth + 0.5);
      } else if (powerup.type === 'laser') {
        laserAmmo += 8;
      } else if (powerup.type === 'multiball' && survivingBalls.length > 0) {
        const base = survivingBalls[0];
        spawnedBalls.push(
          {
            id: Date.now() + 1,
            x: base.x,
            y: base.y,
            vx: -base.vx * 0.8 + 2.0,
            vy: Math.abs(base.vy),
            radius: base.radius,
            speed: base.speed,
          },
          {
            id: Date.now() + 2,
            x: base.x,
            y: base.y,
            vx: base.vx * 0.8 - 2.0,
            vy: Math.abs(base.vy),
            radius: base.radius,
            speed: base.speed,
          },
        );
      } else if (powerup.type === 'slow') {
        for (const b of survivingBalls) {
          b.vx *= 0.75;
          b.vy *= 0.75;
        }
      }
    } else if (nextY > 0) {
      activePowerups.push({ ...powerup, y: nextY });
    }
  }

  const allCurrentBalls = [...survivingBalls, ...spawnedBalls];
  const newScore = state.score + scoreGain;
  const newHighScore = Math.max(state.highScore, newScore);

  // 4. Level Cleared Check
  if (remainingBlocks.length === 0) {
    return {
      ...state,
      blocks: [],
      score: newScore,
      highScore: newHighScore,
      status: 'cleared',
    };
  }

  // 5. Ball Loss / Game Over Check
  if (allCurrentBalls.length === 0) {
    const nextLives = state.lives - 1;
    if (nextLives <= 0) {
      return {
        ...state,
        balls: [],
        lives: 0,
        score: newScore,
        highScore: newHighScore,
        status: 'gameover',
      };
    }
    return {
      ...state,
      balls: [
        {
          id: Date.now(),
          x: state.paddleX,
          y: state.paddleY + 0.4,
          vx: 0,
          vy: 0,
          radius: BALL_RADIUS,
          speed: INITIAL_BALL_SPEED,
        },
      ],
      powerups: [],
      lasers: [],
      lives: nextLives,
      score: newScore,
      highScore: newHighScore,
      status: 'ready',
      combo: 0,
    };
  }

  return {
    ...state,
    balls: allCurrentBalls,
    blocks: remainingBlocks,
    powerups: activePowerups,
    lasers: activeLasers,
    paddleWidth,
    laserAmmo,
    score: newScore,
    highScore: newHighScore,
    combo,
  };
}

export function nextLevel(state: BlockBreakerState): BlockBreakerState {
  const nextLvl = state.level + 1;
  return {
    ...state,
    level: nextLvl,
    blocks: createLevelBlocks(nextLvl),
    balls: [
      {
        id: Date.now(),
        x: 0,
        y: PADDLE_Y + 0.4,
        vx: 0,
        vy: 0,
        radius: BALL_RADIUS,
        speed: INITIAL_BALL_SPEED + Math.min(3.0, nextLvl * 0.5),
      },
    ],
    paddleX: 0,
    paddleWidth: state.defaultPaddleWidth,
    powerups: [],
    lasers: [],
    status: 'ready',
    combo: 0,
  };
}
