import type { AimMode } from './aim-trainer';

export interface HitSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface RippleRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface FloatingLabel {
  text: string;
  x: number;
  y: number;
  life: number;
  maxLife: number;
  color: string;
}

export const MODE_COLORS: Record<AimMode, { primary: string; glow: string; secondary: string }> = {
  gridshot: { primary: '#38bdf8', glow: 'rgba(56, 189, 248, 0.6)', secondary: '#0284c7' },
  flick: { primary: '#f59e0b', glow: 'rgba(245, 158, 11, 0.6)', secondary: '#d97706' },
  precision: { primary: '#10b981', glow: 'rgba(16, 185, 129, 0.6)', secondary: '#059669' },
  tracking: { primary: '#a855f7', glow: 'rgba(168, 85, 247, 0.6)', secondary: '#7c3aed' },
  recovery: { primary: '#f43f5e', glow: 'rgba(244, 63, 94, 0.6)', secondary: '#e11d48' },
  flash: { primary: '#e2e8f0', glow: 'rgba(226, 232, 240, 0.6)', secondary: '#94a3b8' },
};

/**
 * Calculates whether a pointer tap/click lands inside a target's hitbox.
 * On touch screens, gives a generous threshold so finger pads don't cause missed taps.
 */
export function isTargetHit(
  clickX: number,
  clickY: number,
  targetPxX: number,
  targetPxY: number,
  targetRadiusPx: number,
  isTouch: boolean
): boolean {
  const extraPadding = isTouch ? Math.max(12, 24 - targetRadiusPx) : 4;
  const effectiveRadius = targetRadiusPx + extraPadding;
  const distance = Math.hypot(clickX - targetPxX, clickY - targetPxY);
  return distance <= effectiveRadius;
}

/**
 * Generates an array of radial spark particles bursting outwards from a hit point.
 */
export function createHitSparks(
  x: number,
  y: number,
  color: string,
  count = 10,
  random: () => number = Math.random
): HitSpark[] {
  const sparks: HitSpark[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i * Math.PI * 2) / count + (random() - 0.5) * 0.5;
    const speed = 70 + random() * 120;
    sparks.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.28,
      maxLife: 0.28,
      color,
      size: 2 + random() * 2.5,
    });
  }
  return sparks;
}

/**
 * Updates spark particles, applying velocity, drag, and lifetime decay.
 */
export function updateSparks(sparks: HitSpark[], dt: number): HitSpark[] {
  const result: HitSpark[] = [];
  for (const s of sparks) {
    const nextLife = s.life - dt;
    if (nextLife > 0) {
      result.push({
        ...s,
        x: s.x + s.vx * dt,
        y: s.y + s.vy * dt,
        vx: s.vx * 0.94,
        vy: s.vy * 0.94,
        life: nextLife,
      });
    }
  }
  return result;
}

/**
 * Creates an expanding shockwave ripple at the specified coordinates.
 */
export function createRipple(
  x: number,
  y: number,
  color: string,
  maxRadius = 38
): RippleRing {
  return {
    x,
    y,
    radius: 4,
    maxRadius,
    life: 0.25,
    maxLife: 0.25,
    color,
  };
}

/**
 * Updates shockwave ripples, expanding outwards and fading out.
 */
export function updateRipples(ripples: RippleRing[], dt: number): RippleRing[] {
  const result: RippleRing[] = [];
  for (const r of ripples) {
    const nextLife = r.life - dt;
    if (nextLife > 0) {
      const progress = 1 - nextLife / r.maxLife;
      result.push({
        ...r,
        radius: 4 + progress * (r.maxRadius - 4),
        life: nextLife,
      });
    }
  }
  return result;
}

/**
 * Creates floating text (e.g. "+1" or "180ms") on target hit.
 */
export function createFloatingLabel(
  text: string,
  x: number,
  y: number,
  color = '#ffffff'
): FloatingLabel {
  return {
    text,
    x,
    y,
    life: 0.45,
    maxLife: 0.45,
    color,
  };
}

/**
 * Updates floating labels, rising vertically and fading out.
 */
export function updateFloatingLabels(labels: FloatingLabel[], dt: number): FloatingLabel[] {
  const result: FloatingLabel[] = [];
  for (const l of labels) {
    const nextLife = l.life - dt;
    if (nextLife > 0) {
      result.push({
        ...l,
        y: l.y - dt * 45,
        life: nextLife,
      });
    }
  }
  return result;
}

export interface CanvasTarget {
  id: number;
  x: number; // % of field width
  y: number; // % of field height
  size: number; // px diameter
  born: number;
}

/**
 * High-DPI 120fps Canvas renderer for Aim Trainer firing arena.
 */
export function renderAimField(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  now: number,
  mode: AimMode,
  ttl: number,
  timeRatio: number,
  targets: CanvasTarget[],
  trackingTarget: { x: number; y: number; size: number } | null,
  isTrackingLocked: boolean,
  recoveryObscured: boolean,
  sparks: HitSpark[],
  ripples: RippleRing[],
  labels: FloatingLabel[],
  shakeOffset: { x: number; y: number }
): void {
  ctx.save();
  ctx.clearRect(0, 0, width, height);

  // Apply camera recoil shake
  ctx.translate(shakeOffset.x, shakeOffset.y);

  // 1. High-Tech Cyber Range Grid
  ctx.fillStyle = '#080b12';
  ctx.fillRect(0, 0, width, height);

  // Grid lines
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.07)';
  ctx.lineWidth = 1;
  const gridSize = 40;
  ctx.beginPath();
  for (let x = gridSize; x < width; x += gridSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let y = gridSize; y < height; y += gridSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();

  // Radar range circles
  const cx = width / 2;
  const cy = height / 2;
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
  ctx.beginPath();
  ctx.arc(cx, cy, Math.min(width, height) * 0.38, 0, Math.PI * 2);
  ctx.arc(cx, cy, Math.min(width, height) * 0.20, 0, Math.PI * 2);
  ctx.stroke();

  // Top Progress Bar
  const theme = MODE_COLORS[mode] ?? MODE_COLORS.gridshot;
  const clampedRatio = Math.max(0, Math.min(1, timeRatio));
  ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
  ctx.fillRect(0, 0, width, 4);
  ctx.fillStyle = theme.primary;
  ctx.shadowColor = theme.glow;
  ctx.shadowBlur = 6;
  ctx.fillRect(0, 0, width * clampedRatio, 4);
  ctx.shadowBlur = 0;

  // 2. Recovery Obscured Scanlines
  if (mode === 'recovery' && recoveryObscured) {
    ctx.fillStyle = 'rgba(2, 6, 23, 0.95)';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#f43f5e';
    ctx.shadowColor = 'rgba(244, 63, 94, 0.8)';
    ctx.shadowBlur = 8;
    ctx.font = 'bold 15px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ SENSORS REBOOTING... ⚡', cx, cy);
    ctx.restore();
    return;
  }

  // 3. Targets
  const pulse = Math.sin(now * 0.006) * 1.5;

  if (mode === 'tracking' && trackingTarget) {
    const tx = (trackingTarget.x / 100) * width;
    const ty = (trackingTarget.y / 100) * height;
    const r = trackingTarget.size / 2;
    const color = isTrackingLocked ? '#10b981' : theme.primary;
    const glow = isTrackingLocked ? 'rgba(16, 185, 129, 0.8)' : theme.glow;

    ctx.save();
    ctx.shadowColor = glow;
    ctx.shadowBlur = isTrackingLocked ? 20 : 12;

    // Outer reticle ring
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(tx, ty, r + pulse, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshair tick notches
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tx - r - 6, ty); ctx.lineTo(tx - r + 3, ty);
    ctx.moveTo(tx + r - 3, ty); ctx.lineTo(tx + r + 6, ty);
    ctx.moveTo(tx, ty - r - 6); ctx.lineTo(tx, ty - r + 3);
    ctx.moveTo(tx, ty + r - 3); ctx.lineTo(tx, ty + r + 6);
    ctx.stroke();

    // Inner target core
    ctx.fillStyle = isTrackingLocked ? 'rgba(16, 185, 129, 0.35)' : 'rgba(168, 85, 247, 0.25)';
    ctx.beginPath();
    ctx.arc(tx, ty, r * 0.65, 0, Math.PI * 2);
    ctx.fill();

    // Central core dot
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(tx, ty, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  } else {
    for (const tg of targets) {
      const tx = (tg.x / 100) * width;
      const ty = (tg.y / 100) * height;
      const r = tg.size / 2;

      ctx.save();
      ctx.shadowColor = theme.glow;
      ctx.shadowBlur = 12;

      // Outer ring
      ctx.strokeStyle = theme.primary;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(tx, ty, r, 0, Math.PI * 2);
      ctx.stroke();

      // Middle ring
      ctx.strokeStyle = theme.secondary;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(tx, ty, r * 0.6, 0, Math.PI * 2);
      ctx.stroke();

      // Crosshair notches
      ctx.strokeStyle = theme.primary;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(tx - r, ty); ctx.lineTo(tx - r * 0.6, ty);
      ctx.moveTo(tx + r * 0.6, ty); ctx.lineTo(tx + r, ty);
      ctx.moveTo(tx, ty - r); ctx.lineTo(tx, ty - r * 0.6);
      ctx.moveTo(tx, ty + r * 0.6); ctx.lineTo(tx, ty + r);
      ctx.stroke();

      // Center Bullseye core
      ctx.fillStyle = theme.primary;
      ctx.beginPath();
      ctx.arc(tx, ty, r * 0.25, 0, Math.PI * 2);
      ctx.fill();

      // In Precision mode: shrinking countdown arc timer
      if (mode === 'precision' && ttl > 0) {
        const elapsed = now - tg.born;
        const ttlRatio = Math.max(0, 1 - elapsed / ttl);
        ctx.strokeStyle = ttlRatio < 0.3 ? '#ef4444' : '#34d399';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(tx, ty, r + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ttlRatio);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  // 4. Hit Sparks
  for (const s of sparks) {
    ctx.save();
    ctx.fillStyle = s.color;
    ctx.globalAlpha = Math.max(0, s.life / s.maxLife);
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 5. Shockwave Ripples
  for (const rp of ripples) {
    ctx.save();
    ctx.strokeStyle = rp.color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = Math.max(0, rp.life / rp.maxLife);
    ctx.beginPath();
    ctx.arc(rp.x, rp.y, rp.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 6. Floating Reaction Labels
  ctx.textAlign = 'center';
  ctx.font = 'bold 12px ui-monospace, monospace';
  for (const lb of labels) {
    ctx.save();
    ctx.fillStyle = lb.color;
    ctx.globalAlpha = Math.max(0, lb.life / lb.maxLife);
    ctx.shadowColor = lb.color;
    ctx.shadowBlur = 6;
    ctx.fillText(lb.text, lb.x, lb.y);
    ctx.restore();
  }

  ctx.restore();
}
