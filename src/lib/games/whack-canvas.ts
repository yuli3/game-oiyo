/**
 * 100% Canvas GPU 120fps Rendering & VFX Engine for Whack-a-Mole (Argon Cyber Edition)
 * Provides smooth portal critter pop-up physics, 0ms mobile touch mapping,
 * plasma shockwaves, and procedural particle bursts.
 *
 * Date: 2026-10-17
 */

import type { WhackCritter, WhackStatus } from "./whack-a-mole";

export interface WhackParticle {
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

export interface WhackShockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
}

export interface WhackFloatingScore {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface WhackRenderOptions {
  cells: WhackCritter[];
  cellProgress: number[]; // 0.0 to 1.0 (smooth vertical pop-up height for each of the 9 cells)
  particles: WhackParticle[];
  shockwaves: WhackShockwave[];
  floatingScores: WhackFloatingScore[];
  now: number;
  recoilShake: number;
  hitIndex: number | null;
  status: WhackStatus | "idle";
}

/**
 * Maps pixel coordinates on the canvas directly to 0..8 hole index with touch padding.
 */
export function getHoleIndexFromPoint(
  clickX: number,
  clickY: number,
  canvasW: number,
  canvasH: number,
  paddingRatio = 0.05
): number | null {
  const padX = canvasW * paddingRatio;
  const padY = canvasH * paddingRatio;
  const arenaW = canvasW - padX * 2;
  const arenaH = canvasH - padY * 2;

  if (clickX < padX || clickX > canvasW - padX || clickY < padY || clickY > canvasH - padY) {
    return null;
  }

  const colW = arenaW / 3;
  const rowH = arenaH / 3;

  const col = Math.floor((clickX - padX) / colW);
  const row = Math.floor((clickY - padY) / rowH);

  if (col < 0 || col > 2 || row < 0 || row > 2) return null;
  return row * 3 + col;
}

/**
 * Calculates center pixel position of a hole index (0..8).
 */
export function getHoleCenter(
  index: number,
  canvasW: number,
  canvasH: number,
  paddingRatio = 0.05
): { x: number; y: number; radius: number } {
  const padX = canvasW * paddingRatio;
  const padY = canvasH * paddingRatio;
  const arenaW = canvasW - padX * 2;
  const arenaH = canvasH - padY * 2;
  const colW = arenaW / 3;
  const rowH = arenaH / 3;

  const col = index % 3;
  const row = Math.floor(index / 3);

  const cx = padX + (col + 0.5) * colW;
  const cy = padY + (row + 0.5) * rowH;
  const radius = Math.min(colW, rowH) * 0.4;

  return { x: cx, y: cy, radius };
}

/**
 * Creates radial electric sparks or fiery explosion on hit.
 */
export function createWhackParticles(
  pixelX: number,
  pixelY: number,
  type: "mole" | "bomb",
  count = 22
): WhackParticle[] {
  const particles: WhackParticle[] = [];
  const colors =
    type === "mole"
      ? ["#38bdf8", "#818cf8", "#a855f7", "#ffffff"]
      : ["#ef4444", "#f97316", "#fbbf24", "#ffffff"];

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = type === "mole" ? 70 + Math.random() * 160 : 100 + Math.random() * 240;
    const maxLife = 260 + Math.random() * 200;
    const color = colors[Math.floor(Math.random() * colors.length)];
    particles.push({
      x: pixelX,
      y: pixelY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      alpha: 1,
      size: 2 + Math.random() * 3.5,
      color,
      life: maxLife,
      maxLife,
    });
  }
  return particles;
}

/**
 * Creates expanding plasma shockwave.
 */
export function createWhackShockwave(
  pixelX: number,
  pixelY: number,
  type: "mole" | "bomb"
): WhackShockwave {
  return {
    x: pixelX,
    y: pixelY,
    radius: 8,
    maxRadius: type === "mole" ? 54 : 76,
    color: type === "mole" ? "#38bdf8" : "#ef4444",
    alpha: 0.9,
  };
}

/**
 * Creates floating combo / point popup.
 */
export function createFloatingScore(
  pixelX: number,
  pixelY: number,
  text: string,
  color = "#38bdf8"
): WhackFloatingScore {
  return {
    x: pixelX,
    y: pixelY,
    vy: -45, // upward speed px/s
    text,
    color,
    alpha: 1,
    life: 500,
    maxLife: 500,
  };
}

/**
 * Updates particle physics.
 */
export function updateWhackParticles(
  particles: WhackParticle[],
  deltaMs: number
): WhackParticle[] {
  const dt = deltaMs / 1000;
  const alive: WhackParticle[] = [];

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.life -= deltaMs;
    if (p.life <= 0) continue;

    p.vx *= 0.93;
    p.vy *= 0.93;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.alpha = Math.max(0, p.life / p.maxLife);
    alive.push(p);
  }

  return alive;
}

/**
 * Updates shockwaves.
 */
export function updateWhackShockwaves(
  waves: WhackShockwave[],
  deltaMs: number
): WhackShockwave[] {
  const dt = deltaMs / 1000;
  const alive: WhackShockwave[] = [];
  const speed = 120; // px/s

  for (let i = 0; i < waves.length; i++) {
    const w = waves[i];
    w.radius += speed * dt;
    const progress = w.radius / w.maxRadius;
    if (progress >= 1) continue;

    w.alpha = Math.max(0, (1 - progress) * 0.9);
    alive.push(w);
  }

  return alive;
}

/**
 * Updates floating scores.
 */
export function updateWhackFloatingScores(
  scores: WhackFloatingScore[],
  deltaMs: number
): WhackFloatingScore[] {
  const dt = deltaMs / 1000;
  const alive: WhackFloatingScore[] = [];

  for (let i = 0; i < scores.length; i++) {
    const s = scores[i];
    s.life -= deltaMs;
    if (s.life <= 0) continue;

    s.y += s.vy * dt;
    s.alpha = Math.max(0, s.life / s.maxLife);
    alive.push(s);
  }

  return alive;
}

/**
 * Main 120fps Canvas GPU rendering loop for Whack-a-Mole.
 */
export function renderWhackCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: WhackRenderOptions
): void {
  const {
    cells,
    cellProgress,
    particles,
    shockwaves,
    floatingScores,
    now,
    recoilShake,
    hitIndex,
    status,
  } = options;

  ctx.save();

  // 1. Camera Recoil Trauma
  if (recoilShake > 0.01) {
    const shake = Math.min(recoilShake, 14);
    const ox = (Math.random() - 0.5) * shake * 2;
    const oy = (Math.random() - 0.5) * shake * 2;
    ctx.translate(ox, oy);
  }

  // 2. Cyberpunk Background
  const bgGrad = ctx.createRadialGradient(
    width / 2,
    height / 2,
    width * 0.1,
    width / 2,
    height / 2,
    width * 0.75
  );
  bgGrad.addColorStop(0, "#0b1329");
  bgGrad.addColorStop(1, "#040711");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 3. Grid Chambers (9 portals)
  for (let i = 0; i < 9; i++) {
    const { x, y, radius } = getHoleCenter(i, width, height);
    const critter = cells[i];
    const progress = cellProgress[i] ?? (critter ? 1 : 0);
    const isHit = hitIndex === i;

    // A. Portal Chamber Base
    ctx.save();
    // Base Chamber Hole (Dark Depths)
    const holeGrad = ctx.createRadialGradient(x, y + radius * 0.1, 2, x, y, radius);
    holeGrad.addColorStop(0, "#020408");
    holeGrad.addColorStop(0.7, "#060b18");
    holeGrad.addColorStop(1, "#111827");
    ctx.fillStyle = holeGrad;
    ctx.beginPath();
    ctx.ellipse(x, y + radius * 0.15, radius, radius * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();

    // Portal Rim Glow
    const rimPulse = Math.sin(now * 0.005 + i * 0.7) * 0.1;
    ctx.strokeStyle = critter === "bomb"
      ? "rgba(239, 68, 68, 0.7)"
      : critter === "mole"
      ? "rgba(56, 189, 248, 0.75)"
      : "rgba(99, 102, 241, 0.25)";
    ctx.lineWidth = 2.5;
    ctx.shadowColor = critter === "bomb" ? "#ef4444" : critter === "mole" ? "#38bdf8" : "#6366f1";
    ctx.shadowBlur = critter ? 14 : 6;
    ctx.beginPath();
    ctx.ellipse(x, y + radius * 0.15, radius * (1 + rimPulse), radius * 0.65 * (1 + rimPulse), 0, 0, Math.PI * 2);
    ctx.stroke();

    // Chamber Number Hint (1..9)
    ctx.fillStyle = "rgba(148, 163, 184, 0.35)";
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${i + 1}`, x, y + radius * 0.72);

    ctx.restore();

    // B. Critter Pop-Up inside Clip Region
    if (progress > 0.01 && critter) {
      ctx.save();
      // Clip to above portal bottom lip so critter appears emerging from chamber
      ctx.beginPath();
      ctx.rect(x - radius * 1.3, y - radius * 2, radius * 2.6, radius * 2.15);
      ctx.clip();

      // Critter Y position based on progress (0 = hidden below rim, 1 = fully popped)
      const popOffset = (1 - progress) * radius * 1.2;
      const critterY = y - radius * 0.2 + popOffset;

      if (critter === "mole") {
        // Render Cyber Mole
        ctx.save();
        ctx.translate(x, critterY);

        // Mole Body
        const bodyGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, radius * 0.65);
        bodyGrad.addColorStop(0, isHit ? "#fed7aa" : "#38bdf8");
        bodyGrad.addColorStop(0.6, isHit ? "#f97316" : "#0284c7");
        bodyGrad.addColorStop(1, "#0369a1");
        ctx.fillStyle = bodyGrad;
        ctx.shadowColor = isHit ? "#f97316" : "#38bdf8";
        ctx.shadowBlur = isHit ? 20 : 12;

        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.58, 0, Math.PI * 2);
        ctx.fill();

        // Mole Cyber Visor / Eyes
        if (isHit) {
          // X X hit eyes
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          // Left X
          ctx.moveTo(-radius * 0.28, -radius * 0.12);
          ctx.lineTo(-radius * 0.12, -radius * 0.28);
          ctx.moveTo(-radius * 0.12, -radius * 0.12);
          ctx.lineTo(-radius * 0.28, -radius * 0.28);
          // Right X
          ctx.moveTo(radius * 0.12, -radius * 0.12);
          ctx.lineTo(radius * 0.28, -radius * 0.28);
          ctx.moveTo(radius * 0.28, -radius * 0.12);
          ctx.lineTo(radius * 0.12, -radius * 0.28);
          ctx.stroke();
        } else {
          // Glowing Neon Visor
          ctx.fillStyle = "#ffffff";
          ctx.shadowColor = "#ffffff";
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.roundRect(-radius * 0.3, -radius * 0.25, radius * 0.6, radius * 0.18, 4);
          ctx.fill();

          // Cyber Nose / Muzzle
          ctx.fillStyle = "#fbcfe8";
          ctx.beginPath();
          ctx.arc(0, -radius * 0.02, radius * 0.1, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      } else if (critter === "bomb") {
        // Render Cyber Bomb
        ctx.save();
        ctx.translate(x, critterY);

        // Bomb Hull
        const bombGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, radius * 0.6);
        bombGrad.addColorStop(0, "#475569");
        bombGrad.addColorStop(0.5, "#1e293b");
        bombGrad.addColorStop(1, "#090d16");
        ctx.fillStyle = bombGrad;
        ctx.shadowColor = "#ef4444";
        ctx.shadowBlur = 14;

        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.55, 0, Math.PI * 2);
        ctx.fill();

        // Hazard Warning Band
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.55, 0, Math.PI * 2);
        ctx.stroke();

        // Pulsing Warning Beacon
        const beaconPulse = Math.sin(now * 0.012) * 0.25 + 0.75;
        ctx.fillStyle = `rgba(239, 68, 68, ${beaconPulse})`;
        ctx.shadowColor = "#ef4444";
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(0, -radius * 0.05, radius * 0.16, 0, Math.PI * 2);
        ctx.fill();

        // Fuse Spark
        const fuseX = 0;
        const fuseY = -radius * 0.65;
        ctx.fillStyle = "#fbbf24";
        ctx.shadowColor = "#fbbf24";
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(fuseX, fuseY, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      ctx.restore();
    }
  }

  // 4. Shockwaves
  for (let i = 0; i < shockwaves.length; i++) {
    const sw = shockwaves[i];
    ctx.save();
    ctx.strokeStyle = sw.color;
    ctx.globalAlpha = sw.alpha;
    ctx.lineWidth = 3;
    ctx.shadowColor = sw.color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 5. Particles
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

  // 6. Floating Scores (+10, +20, BOMB)
  for (let i = 0; i < floatingScores.length; i++) {
    const s = floatingScores[i];
    ctx.save();
    ctx.globalAlpha = s.alpha;
    ctx.fillStyle = s.color;
    ctx.shadowColor = s.color;
    ctx.shadowBlur = 10;
    ctx.font = "black 16px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(s.text, s.x, s.y);
    ctx.restore();
  }

  // 7. Outer Arena Glow
  ctx.strokeStyle = status === "over" ? "rgba(239, 68, 68, 0.4)" : "rgba(99, 102, 241, 0.3)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  ctx.restore();
}
