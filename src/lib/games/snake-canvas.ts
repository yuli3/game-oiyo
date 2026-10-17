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

  // 2. Cyberpunk Dark Base Background
  const bgGrad = ctx.createRadialGradient(
    width / 2,
    height / 2,
    width * 0.1,
    width / 2,
    height / 2,
    width * 0.75
  );
  bgGrad.addColorStop(0, "#0a101f");
  bgGrad.addColorStop(1, "#03060c");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 3. Grid Metrics
  const cellW = width / gridSize;
  const cellH = height / gridSize;

  // 4. Subtle Neon Grid Lines
  ctx.strokeStyle = "rgba(6, 182, 212, 0.07)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 1; x < gridSize; x++) {
    ctx.moveTo(x * cellW, 0);
    ctx.lineTo(x * cellW, height);
  }
  for (let y = 1; y < gridSize; y++) {
    ctx.moveTo(0, y * cellH);
    ctx.lineTo(width, y * cellH);
  }
  ctx.stroke();

  // 5. Outer Cyber Arena Perimeter Glow
  ctx.strokeStyle = status === "over" ? "rgba(239, 68, 68, 0.45)" : "rgba(56, 189, 248, 0.25)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  // Corner highlights
  const cornerSize = Math.min(width, height) * 0.05;
  ctx.strokeStyle = "rgba(56, 189, 248, 0.7)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  // Top-left
  ctx.moveTo(1, cornerSize);
  ctx.lineTo(1, 1);
  ctx.lineTo(cornerSize, 1);
  // Top-right
  ctx.moveTo(width - cornerSize, 1);
  ctx.lineTo(width - 1, 1);
  ctx.lineTo(width - 1, cornerSize);
  // Bottom-left
  ctx.moveTo(1, height - cornerSize);
  ctx.lineTo(1, height - 1);
  ctx.lineTo(cornerSize, height - 1);
  // Bottom-right
  ctx.moveTo(width - cornerSize, height - 1);
  ctx.lineTo(width - 1, height - 1);
  ctx.lineTo(width - 1, height - cornerSize);
  ctx.stroke();

  // 6. Holographic Food (Argon Energy Core)
  const foodPxX = (food.x + 0.5) * cellW;
  const foodPxY = (food.y + 0.5) * cellH;
  const foodRadius = Math.min(cellW, cellH) * 0.42;
  const pulse = Math.sin(now * 0.006) * 0.12;
  const currentRadius = foodRadius * (1 + pulse);

  // Food outer rotating orbital ring
  const orbitAngle = now * 0.003;
  ctx.save();
  ctx.translate(foodPxX, foodPxY);
  ctx.rotate(orbitAngle);
  ctx.strokeStyle = "rgba(244, 63, 94, 0.6)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, currentRadius * 1.35, 0, Math.PI * 1.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, currentRadius * 1.35, Math.PI * 1.6, Math.PI * 1.95);
  ctx.stroke();
  ctx.restore();

  // Food Core Glow
  ctx.save();
  ctx.shadowColor = "#f43f5e";
  ctx.shadowBlur = 16;
  const foodGrad = ctx.createRadialGradient(
    foodPxX,
    foodPxY,
    1,
    foodPxX,
    foodPxY,
    currentRadius
  );
  foodGrad.addColorStop(0, "#ffe4e6");
  foodGrad.addColorStop(0.4, "#f43f5e");
  foodGrad.addColorStop(1, "#be123c");
  ctx.fillStyle = foodGrad;
  ctx.beginPath();
  ctx.arc(foodPxX, foodPxY, currentRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

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

  // 8. Render Snake with 120fps Sub-Grid Interpolation
  const interpolated = interpolateSnake(prevSnake, snake, progress);
  const snakeLen = interpolated.length;

  if (snakeLen > 0) {
    // A. Connect body segments with smooth glowing ribbon
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Draw from tail to head
    for (let i = snakeLen - 1; i >= 0; i--) {
      const pt = interpolated[i];
      const pxX = (pt.x + 0.5) * cellW;
      const pxY = (pt.y + 0.5) * cellH;

      const isHead = i === 0;
      const ratio = 1 - i / Math.max(snakeLen, 1); // 1.0 at head, ~0.2 at tail

      // Pulsing organic spine effect
      const spineWave = Math.sin(now * 0.008 + i * 0.4) * 0.08;
      const segRadius = (Math.min(cellW, cellH) * 0.38 * (0.65 + ratio * 0.35)) * (1 + spineWave);

      ctx.save();
      if (isHead) {
        ctx.shadowColor = "#38bdf8";
        ctx.shadowBlur = 18;

        // Head Gradient
        const headGrad = ctx.createRadialGradient(
          pxX,
          pxY,
          2,
          pxX,
          pxY,
          segRadius * 1.2
        );
        headGrad.addColorStop(0, "#e0f2fe");
        headGrad.addColorStop(0.4, "#38bdf8");
        headGrad.addColorStop(1, "#0284c7");
        ctx.fillStyle = headGrad;

        // Draw Head Shape
        ctx.beginPath();
        ctx.arc(pxX, pxY, segRadius * 1.15, 0, Math.PI * 2);
        ctx.fill();

        // Cyber Eyes pointing in direction
        const dir = direction ?? { x: 1, y: 0 };
        const eyeAngle = Math.atan2(dir.y, dir.x);
        const eyeDist = segRadius * 0.6;
        const eyeOffset = segRadius * 0.45;

        // Left eye
        const leX = pxX + Math.cos(eyeAngle) * eyeDist - Math.sin(eyeAngle) * eyeOffset;
        const leY = pxY + Math.sin(eyeAngle) * eyeDist + Math.cos(eyeAngle) * eyeOffset;
        // Right eye
        const reX = pxX + Math.cos(eyeAngle) * eyeDist + Math.sin(eyeAngle) * eyeOffset;
        const reY = pxY + Math.sin(eyeAngle) * eyeDist - Math.cos(eyeAngle) * eyeOffset;

        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "#ffffff";
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(leX, leY, 2.4, 0, Math.PI * 2);
        ctx.arc(reX, reY, 2.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Body Segment
        const bodyGrad = ctx.createRadialGradient(
          pxX,
          pxY,
          1,
          pxX,
          pxY,
          segRadius
        );
        bodyGrad.addColorStop(0, "#38bdf8");
        bodyGrad.addColorStop(0.6, "#0284c7");
        bodyGrad.addColorStop(1, "#0f172a");
        ctx.fillStyle = bodyGrad;
        ctx.shadowColor = "#0284c7";
        ctx.shadowBlur = 8;

        ctx.beginPath();
        ctx.arc(pxX, pxY, segRadius, 0, Math.PI * 2);
        ctx.fill();

        // Neon outline
        ctx.strokeStyle = "rgba(56, 189, 248, 0.85)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  // 9. Sparks / Particles
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
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
