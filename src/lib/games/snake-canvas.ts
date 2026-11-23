import { drawSprite } from "./pixel-kit";
import { APPLE, SNAKE_BACKDROP_TILES, SNAKE_BODY, SNAKE_HEAD, SNAKE_TAIL } from "./pixel-sprites";
/**
 * 100% Canvas GPU 120fps Rendering & VFX Engine for Snake Game
 * Implements smooth sub-grid interpolation, procedural Argon neon aesthetics,
 * holographic food cores, and particle shockwaves.
 *
 * Date: 2026-10-17
 */

import type { SnakeDirection, SnakePoint, SnakeStatus } from "./snake";

export interface SnakeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface SnakeRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
}

export interface SnakeRenderOptions {
  snake: SnakePoint[];
  prevSnake: SnakePoint[];
  progress: number; // 0.0 to 1.0 (sub-grid tick interpolation)
  food: SnakePoint;
  direction: SnakeDirection | null;
  status?: SnakeStatus | "idle";
  particles: SnakeParticle[];
  ripples: SnakeRipple[];
  now: number;
  recoilShake: number;
  gridSize?: number;
  activeTouchDir?: SnakeDirection | null;
}

/**
 * Linearly interpolates between two grid positions.
 */
export function interpolateSegment(
  prev: SnakePoint,
  curr: SnakePoint,
  t: number
): { x: number; y: number } {
  const clampedT = Math.max(0, Math.min(1, t));
  return {
    x: prev.x + (curr.x - prev.x) * clampedT,
    y: prev.y + (curr.y - prev.y) * clampedT,
  };
}

/**
 * Interpolates full snake body between ticks for continuous 120fps fluid slithering.
 * If the snake recently grew (currSnake length > prevSnake length), new tail segments
 * smoothly expand from the prior tail point.
 */
export function interpolateSnake(
  prevSnake: SnakePoint[],
  currSnake: SnakePoint[],
  t: number
): { x: number; y: number }[] {
  if (currSnake.length === 0) return [];
  if (prevSnake.length === 0) {
    return currSnake.map((pt) => ({ x: pt.x, y: pt.y }));
  }

  const result: { x: number; y: number }[] = [];
  const clampedT = Math.max(0, Math.min(1, t));

  for (let i = 0; i < currSnake.length; i++) {
    const curr = currSnake[i];
    const prev = prevSnake[i] ?? prevSnake[prevSnake.length - 1];
    result.push({
      x: prev.x + (curr.x - prev.x) * clampedT,
      y: prev.y + (curr.y - prev.y) * clampedT,
    });
  }

  return result;
}

/**
 * Creates radial burst particles when food is eaten.
 */
export function createEatSparks(
  pixelX: number,
  pixelY: number,
  color = "#38bdf8",
  count = 20
): SnakeParticle[] {
  const sparks: SnakeParticle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
    const speed = 60 + Math.random() * 140;
    const maxLife = 280 + Math.random() * 180;
    sparks.push({
      x: pixelX,
      y: pixelY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      alpha: 1,
      size: 2 + Math.random() * 3,
      color,
      life: maxLife,
      maxLife,
    });
  }
  return sparks;
}

/**
 * Creates dramatic explosive fragmentation on wall/body collision.
 */
export function createDeathExplosion(
  pixelX: number,
  pixelY: number,
  count = 36
): SnakeParticle[] {
  const fragments: SnakeParticle[] = [];
  const colors = ["#ef4444", "#f97316", "#fbbf24", "#ffffff"];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 220;
    const maxLife = 400 + Math.random() * 300;
    const color = colors[Math.floor(Math.random() * colors.length)];
    fragments.push({
      x: pixelX,
      y: pixelY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      alpha: 1,
      size: 2.5 + Math.random() * 4,
      color,
      life: maxLife,
      maxLife,
    });
  }
  return fragments;
}

/**
 * Advances particle physics with drag and alpha dissipation.
 */
export function updateSnakeParticles(
  particles: SnakeParticle[],
  deltaMs: number
): SnakeParticle[] {
  const dt = deltaMs / 1000;
  const alive: SnakeParticle[] = [];

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.life -= deltaMs;
    if (p.life <= 0) continue;

    // Apply linear drag
    p.vx *= 0.94;
    p.vy *= 0.94;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.alpha = Math.max(0, p.life / p.maxLife);

    alive.push(p);
  }

  return alive;
}

/**
 * Creates shockwave ring ripple.
 */
export function createSnakeRipple(
  pixelX: number,
  pixelY: number,
  color = "#38bdf8",
  maxRadius = 48
): SnakeRipple {
  return {
    x: pixelX,
    y: pixelY,
    radius: 4,
    maxRadius,
    color,
    alpha: 0.85,
  };
}

/**
 * Advances shockwave rings.
 */
export function updateSnakeRipples(
  ripples: SnakeRipple[],
  deltaMs: number
): SnakeRipple[] {
  const alive: SnakeRipple[] = [];
  const growSpeed = 90; // px/s

  for (let i = 0; i < ripples.length; i++) {
    const r = ripples[i];
    r.radius += growSpeed * (deltaMs / 1000);
    const progress = r.radius / r.maxRadius;
    if (progress >= 1) continue;

    r.alpha = Math.max(0, (1 - progress) * 0.85);
    alive.push(r);
  }

  return alive;
}

/**
 * Translates swipe delta or touch coordinates to a unit directional vector.
 */
export function calculateSwipeDirection(
  dx: number,
  dy: number,
  minDistance?: number
): SnakeDirection | null;
export function calculateSwipeDirection(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  minDistance?: number
): SnakeDirection | null;
export function calculateSwipeDirection(
  a: number,
  b: number,
  c?: number,
  d?: number,
  e?: number
): SnakeDirection | null {
  let dx: number;
  let dy: number;
  let minDistance = 24;

  if (typeof d === "number") {
    dx = c! - a;
    dy = d - b;
    if (typeof e === "number") minDistance = e;
  } else {
    dx = a;
    dy = b;
    if (typeof c === "number") minDistance = c;
  }

  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  if (Math.max(absX, absY) < minDistance) return null;

  if (absX > absY) {
    return { x: dx > 0 ? 1 : -1, y: 0 };
  }
  return { x: 0, y: dy > 0 ? 1 : -1 };
}

/**
 * Main 120fps Canvas GPU rendering loop for Snake.
 */
export function renderSnakeCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: SnakeRenderOptions
): void {
  const {
    snake,
    prevSnake,
    progress,
    food,
    direction,
    status,
    particles,
    ripples,
    now,
    recoilShake,
    gridSize = 20,
    activeTouchDir,
  } = options;

  ctx.save();

  // 1. Camera Trauma Shake
  if (recoilShake > 0.01) {
    const shakeMagnitude = Math.min(recoilShake, 12);
    const offsetX = (Math.random() - 0.5) * shakeMagnitude * 2;
    const offsetY = (Math.random() - 0.5) * shakeMagnitude * 2;
    ctx.translate(offsetX, offsetY);
  }

  // 2. Pixel garden: checker grass with seeded tufts and flowers
  const cellW = width / gridSize;
  const cellH = height / gridSize;
  const T = SNAKE_BACKDROP_TILES;
  for (let gy = 0; gy < gridSize; gy++) {
    for (let gx = 0; gx < gridSize; gx++) {
      const x0 = Math.floor(gx * cellW);
      const y0 = Math.floor(gy * cellH);
      const w = Math.ceil((gx + 1) * cellW) - x0;
      const h = Math.ceil((gy + 1) * cellH) - y0;
      ctx.fillStyle = (gx + gy) % 2 === 0 ? T.light : T.dark;
      ctx.fillRect(x0, y0, w, h);
      const hsh = (gx * 73856093) ^ (gy * 19349663);
      const u = Math.max(2, Math.floor(Math.min(cellW, cellH) / 8));
      if ((hsh & 7) === 0) {
        ctx.fillStyle = T.tuft;
        ctx.fillRect(x0 + u * 2, y0 + u * 4, u, u * 2);
        ctx.fillRect(x0 + u * 3, y0 + u * 3, u, u * 3);
        ctx.fillRect(x0 + u * 4, y0 + u * 4, u, u * 2);
      } else if ((hsh & 31) === 9) {
        ctx.fillStyle = T.flower[(hsh >>> 5) % T.flower.length];
        ctx.fillRect(x0 + u * 3, y0 + u * 2, u, u);
        ctx.fillRect(x0 + u * 2, y0 + u * 3, u * 3, u);
        ctx.fillRect(x0 + u * 3, y0 + u * 4, u, u);
      }
    }
  }

  // 3. Hedge border (red when the run ends)
  ctx.strokeStyle = status === "over" ? "#b91c1c" : "#1f3d17";
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, width - 4, height - 4);

  // 4. Apple with a little hop
  const spriteScale = Math.max(1, Math.floor(Math.min(cellW, cellH) / 8));
  const foodPxX = (food.x + 0.5) * cellW;
  const foodPxY = (food.y + 0.5) * cellH;
  const hop = Math.round(Math.abs(Math.sin(now * 0.005)) * -spriteScale * 1.5);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(Math.round(foodPxX - cellW * 0.3), Math.round(foodPxY + cellH * 0.32), Math.round(cellW * 0.6), Math.max(2, spriteScale));
  drawSprite(ctx, APPLE, foodPxX, foodPxY + hop, { scale: spriteScale });

  // 7. Shockwave Ripples
  for (let i = 0; i < ripples.length; i++) {
    const r = ripples[i];
    ctx.save();
    ctx.strokeStyle = r.color;
    ctx.globalAlpha = r.alpha;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = r.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 8. Render Snake (pixel sprites) with sub-grid interpolation
  const interpolated = interpolateSnake(prevSnake, snake, progress);
  const snakeLen = interpolated.length;
  for (let i = snakeLen - 1; i >= 0; i--) {
    const pt = interpolated[i];
    const pxX = (pt.x + 0.5) * cellW;
    const pxY = (pt.y + 0.5) * cellH;
    if (i === 0) {
      const dir = direction ?? { x: 1, y: 0 };
      drawSprite(ctx, SNAKE_HEAD, pxX, pxY, { scale: spriteScale, rotate: Math.atan2(dir.y, dir.x) });
    } else {
      drawSprite(ctx, i === snakeLen - 1 && snakeLen > 2 ? SNAKE_TAIL : SNAKE_BODY, pxX, pxY, { scale: spriteScale });
    }
  }

  // 9. Sparks / Particles
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    const ps = Math.max(2, Math.round(p.size * 1.5));
    ctx.fillRect(Math.round(p.x - ps / 2), Math.round(p.y - ps / 2), ps, ps);
    ctx.restore();
  }

  // 10. Active Touch Indicator (0ms Visual Feedback)
  if (activeTouchDir) {
    ctx.save();
    const cx = width / 2;
    const cy = height / 2;
    const arrowX = cx + activeTouchDir.x * (width * 0.28);
    const arrowY = cy + activeTouchDir.y * (height * 0.28);

    ctx.fillStyle = "rgba(56, 189, 248, 0.35)";
    ctx.strokeStyle = "rgba(56, 189, 248, 0.8)";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.arc(arrowX, arrowY, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}
